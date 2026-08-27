<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PerjalananDinas;
use App\Models\TandaTangan;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * Aplikasi Perjalanan Dinas (Fungsi Tata Usaha). Membuat dokumen Surat Tugas
 * & SPPD secara cepat, output PDF siap tanda tangan.
 */
class PerjalananDinasController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $q = PerjalananDinas::with(['user:id,name', 'penandatangan:id,name'])->orderByDesc('tanggal_berangkat')->orderByDesc('id');
        // Pegawai biasa hanya melihat miliknya; pimpinan/TU melihat semua.
        if (! $user->hasAnyRole(['superadmin', 'kepala_balai', 'kepala_subag_tu'])) {
            $q->where('user_id', $user->id);
        }
        if ($from = $request->query('dari')) {
            $q->whereDate('tanggal_berangkat', '>=', $from);
        }
        if ($to = $request->query('sampai')) {
            $q->whereDate('tanggal_berangkat', '<=', $to);
        }

        return response()->json([
            'data' => $q->get()->map(fn ($p) => $this->serialize($p)),
            'penandatangan' => User::whereHas('roles', fn ($r) => $r->whereIn('name', ['kepala_balai', 'kepala_subag_tu']))
                ->orderBy('name')->get(['id', 'name', 'jabatan'])
                ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'jabatan' => $u->jabatan]),
        ]);
    }

    public function store(Request $request)
    {
        $v = $request->validate([
            'dasar' => ['nullable', 'string', 'max:1000'],
            'maksud' => ['required', 'string', 'max:1000'],
            'tujuan' => ['required', 'string', 'max:190'],
            'tempat_berangkat' => ['nullable', 'string', 'max:190'],
            'alat_angkut' => ['nullable', 'string', 'max:120'],
            'tanggal_berangkat' => ['required', 'date'],
            'tanggal_kembali' => ['required', 'date', 'after_or_equal:tanggal_berangkat'],
            'pembebanan_anggaran' => ['nullable', 'string', 'max:190'],
            'tingkat_biaya' => ['nullable', 'string', 'max:120'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
            'pegawai' => ['required', 'array', 'min:1'],
            'pegawai.*.nama' => ['required', 'string', 'max:190'],
            'pegawai.*.nip' => ['nullable', 'string', 'max:40'],
            'pegawai.*.jabatan' => ['nullable', 'string', 'max:190'],
            'pegawai.*.pangkat' => ['nullable', 'string', 'max:120'],
            'penandatangan_id' => ['nullable', 'integer', 'exists:users,id'],
            'penandatangan_jabatan' => ['nullable', 'string', 'max:120'],
        ]);

        $u = $request->user();
        $berangkat = Carbon::parse($v['tanggal_berangkat']);
        $kembali = Carbon::parse($v['tanggal_kembali']);
        $lama = $berangkat->diffInDays($kembali) + 1;

        $record = PerjalananDinas::create([
            'nomor_surat' => $this->generateNomor(),
            'user_id' => $u->id,
            'dasar' => $v['dasar'] ?? null,
            'maksud' => $v['maksud'],
            'tujuan' => $v['tujuan'],
            'tempat_berangkat' => $v['tempat_berangkat'] ?? 'Jember',
            'alat_angkut' => $v['alat_angkut'] ?? 'Kendaraan Dinas/Umum',
            'tanggal_berangkat' => $berangkat,
            'tanggal_kembali' => $kembali,
            'lama_hari' => $lama,
            'pembebanan_anggaran' => $v['pembebanan_anggaran'] ?? null,
            'tingkat_biaya' => $v['tingkat_biaya'] ?? null,
            'keterangan' => $v['keterangan'] ?? null,
            'pegawai' => $v['pegawai'],
            'penandatangan_id' => $v['penandatangan_id'] ?? null,
            'penandatangan_jabatan' => $v['penandatangan_jabatan'] ?? 'Kepala Balai POM di Jember',
        ]);
        AuditLog::catat($u->id, 'perjalanan_dinas.simpan', 'tata_usaha', "Dokumen perjalanan dinas {$record->nomor_surat} dibuat.");

        return response()->json(['data' => $this->serialize($record->load(['user:id,name', 'penandatangan:id,name'])), 'message' => 'Dokumen perjalanan dinas dibuat.'], 201);
    }

    public function destroy(Request $request, PerjalananDinas $perjalananDina)
    {
        $u = $request->user();
        abort_unless($perjalananDina->user_id === $u->id || $u->hasAnyRole(['superadmin', 'kepala_subag_tu']), 403);
        $perjalananDina->delete();

        return response()->json(['message' => 'Dokumen dihapus.']);
    }

    /** PDF: Surat Tugas + SPPD dalam satu berkas. */
    public function pdf(Request $request, PerjalananDinas $perjalananDina)
    {
        $u = $request->user();
        abort_unless(
            $perjalananDina->user_id === $u->id || $u->hasAnyRole(['superadmin', 'kepala_balai', 'kepala_subag_tu']),
            403
        );
        $perjalananDina->load(['penandatangan:id,name,nip_nik', 'user:id,name']);
        $qr = $this->qrDataUri($perjalananDina->penandatangan);
        $pdf = Pdf::loadView('pdf.perjalanan-dinas', [
            'p' => $perjalananDina,
            'qr' => $qr,
            'logo' => $this->logoDataUri(),
        ])->setPaper('A4');

        return $pdf->download('SPPD-'.str_replace('/', '-', $perjalananDina->nomor_surat).'.pdf');
    }

    private function generateNomor(): string
    {
        $now = now();
        $urut = PerjalananDinas::whereYear('created_at', $now->year)->count() + 1;
        $romawi = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][$now->month];

        return sprintf('%03d/SPPD/%s/%d', $urut, $romawi, $now->year);
    }

    private function logoDataUri(): ?string
    {
        $path = resource_path('views/pdf/badanpom.png');

        return is_file($path) ? 'data:image/png;base64,'.base64_encode(file_get_contents($path)) : null;
    }

    private function qrDataUri(?User $u): ?string
    {
        if (! $u) {
            return null;
        }
        $ttd = TandaTangan::where('user_id', $u->id)->where('is_active', true)->first();
        if (! $ttd) {
            return null;
        }
        $url = rtrim(config('app.url'), '/').'/ttd/'.$ttd->kode;

        return 'data:image/svg+xml;base64,'.base64_encode(QrCode::format('svg')->size(64)->margin(0)->generate($url));
    }

    private function serialize(PerjalananDinas $p): array
    {
        return [
            'id' => $p->id,
            'nomor_surat' => $p->nomor_surat,
            'pembuat' => $p->user?->name,
            'maksud' => $p->maksud,
            'tujuan' => $p->tujuan,
            'tempat_berangkat' => $p->tempat_berangkat,
            'tanggal_berangkat' => $p->tanggal_berangkat?->toDateString(),
            'tanggal_kembali' => $p->tanggal_kembali?->toDateString(),
            'tanggal_berangkat_label' => $p->tanggal_berangkat?->locale('id')->translatedFormat('d F Y'),
            'tanggal_kembali_label' => $p->tanggal_kembali?->locale('id')->translatedFormat('d F Y'),
            'lama_hari' => $p->lama_hari,
            'alat_angkut' => $p->alat_angkut,
            'dasar' => $p->dasar,
            'pembebanan_anggaran' => $p->pembebanan_anggaran,
            'tingkat_biaya' => $p->tingkat_biaya,
            'keterangan' => $p->keterangan,
            'pegawai' => $p->pegawai,
            'penandatangan' => $p->penandatangan?->name,
            'penandatangan_jabatan' => $p->penandatangan_jabatan,
            'created_at' => $p->created_at?->toIso8601String(),
        ];
    }
}
