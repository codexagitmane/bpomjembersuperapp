<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PeminjamanArsip;
use App\Models\TandaTangan;
use App\Models\User;
use App\Services\NotifikasiService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * Peminjaman & Pengembalian Arsip Aktif/Inaktif (Fungsi Tata Usaha / Kearsipan).
 * Alur sesuai SOP: Pegawai mengajukan → Petugas Arsip verifikasi & setujui →
 * arsip dipinjam → Pegawai mengembalikan → Petugas memeriksa & mengesahkan.
 * Dua penandatangan (peminjam & petugas arsip) via TTE QR TTD.
 */
class PeminjamanArsipController extends Controller
{
    private const ROMAWI = [1 => 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

    private const FUNGSI_LABEL = [
        'tata_usaha' => 'Tata Usaha',
        'pemeriksaan' => 'Pemeriksaan',
        'infokom' => 'Informasi & Komunikasi',
        'pengujian' => 'Pengujian',
        'penindakan' => 'Penindakan',
    ];

    // Peta email → fungsi untuk penetapan petugas arsip (fallback bila penanda belum terisi).
    private const ARSIP_AKTIF = [
        'qithfirul.bahrowi@pom.go.id' => 'tata_usaha',
        'yodi.setiadi@pom.go.id' => 'pemeriksaan',
        'Rianita.pambukowati@pom.go.id' => 'infokom',
        'tiara.hapsari@pom.go.id' => 'pengujian',
        'yonanda.christiadi@pom.go.id' => 'penindakan',
    ];
    private const ARSIPARIS_EMAIL = 'tasya.tamara@pom.go.id';

    /** Daftar petugas arsip penandatangan sesuai jenis (aktif per Tim Kerja / inaktif = arsiparis). */
    public function petugas(Request $request)
    {
        $jenis = $request->query('jenis', 'aktif');
        if ($jenis === 'inaktif') {
            $list = User::where('is_arsiparis', true)->orderBy('name')->get(['id', 'name', 'jabatan']);
            if ($list->isEmpty()) { // fallback by email
                $list = User::where('email', self::ARSIPARIS_EMAIL)->get(['id', 'name', 'jabatan']);
            }

            return response()->json(['data' => $list->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'tim_kerja' => null, 'tim_label' => 'Arsiparis'])]);
        }
        $list = User::where('is_pengelola_arsip', true)->orderBy('fungsi_arsip')->get(['id', 'name', 'jabatan', 'fungsi_arsip']);
        if ($list->isEmpty()) { // fallback by email map
            $list = User::whereIn('email', array_keys(self::ARSIP_AKTIF))->get(['id', 'name', 'jabatan', 'email'])
                ->map(function ($u) {
                    $u->fungsi_arsip = self::ARSIP_AKTIF[$u->email] ?? null;

                    return $u;
                });
        }

        return response()->json(['data' => $list->map(fn ($u) => [
            'id' => $u->id, 'name' => $u->name, 'tim_kerja' => $u->fungsi_arsip,
            'tim_label' => self::FUNGSI_LABEL[$u->fungsi_arsip] ?? $u->fungsi_arsip,
        ])]);
    }

    private function isPetugas(User $u): bool
    {
        return $u->is_pengelola_arsip || $u->is_arsiparis || $u->hasAnyRole(['superadmin', 'kepala_subag_tu', 'kepala_balai']);
    }

    /** Daftar peminjaman: peminjam melihat miliknya; petugas/pimpinan melihat yang ditugaskan / semua. */
    public function index(Request $request)
    {
        $u = $request->user();
        $q = PeminjamanArsip::with(['peminjam:id,name,nip_nik', 'petugas:id,name'])->orderByDesc('created_at');
        if (! $u->hasAnyRole(['superadmin', 'kepala_subag_tu', 'kepala_balai'])) {
            $q->where(function ($w) use ($u) {
                $w->where('user_id', $u->id)->orWhere('petugas_id', $u->id);
            });
        }
        if ($jenis = $request->query('jenis')) {
            $q->where('jenis', $jenis);
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }

        return response()->json(['data' => $q->get()->map(fn ($p) => $this->serialize($p))]);
    }

    /** Pegawai mengajukan peminjaman arsip (formulir dibedakan aktif/inaktif). */
    public function store(Request $request, NotifikasiService $notif)
    {
        $v = $request->validate([
            'jenis' => ['required', Rule::in(['aktif', 'inaktif'])],
            'petugas_id' => ['required', 'integer', Rule::exists('users', 'id')],
            'keperluan' => ['required', 'string', 'min:5', 'max:1000'],
            'tanggal_pinjam' => ['required', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.uraian' => ['required', 'string', 'max:255'],
            'items.*.jumlah' => ['required', 'integer', 'min:1'],
        ]);
        $u = $request->user();
        $petugas = User::findOrFail($v['petugas_id']);
        // Validasi petugas sesuai jenis (dengan fallback email bila penanda belum terisi).
        if ($v['jenis'] === 'inaktif') {
            abort_unless($petugas->is_arsiparis || $petugas->email === self::ARSIPARIS_EMAIL, 422, 'Petugas arsip inaktif tidak valid.');
        } else {
            abort_unless($petugas->is_pengelola_arsip || isset(self::ARSIP_AKTIF[$petugas->email]), 422, 'Petugas arsip aktif tidak valid.');
        }
        $fungsiPetugas = $petugas->fungsi_arsip ?: (self::ARSIP_AKTIF[$petugas->email] ?? null);

        [$nomor, $urut] = $this->generateNomor($v['jenis']);
        $arsip = PeminjamanArsip::create([
            'nomor' => $nomor,
            'nomor_urut' => $urut,
            'user_id' => $u->id,
            'jenis' => $v['jenis'],
            'petugas_id' => $petugas->id,
            'tim_kerja' => $v['jenis'] === 'aktif' ? $fungsiPetugas : null,
            'unit_pengolah' => $u->kelompok_substansi ?: '—',
            'keperluan' => $v['keperluan'],
            // Peminjam mengisi uraian & jumlah; nomor/klasifikasi/tahun diisi petugas saat verifikasi.
            'daftar_arsip' => array_map(fn ($it) => [
                'uraian' => $it['uraian'], 'jumlah' => (int) $it['jumlah'],
                'nomor' => null, 'kode' => null, 'tahun' => null, 'nomor_boks' => null,
            ], $v['items']),
            'tanggal_pinjam' => $v['tanggal_pinjam'],
            // Wajib kembali maksimal 5 hari kerja sejak tanggal peminjaman.
            'tanggal_harus_kembali' => $this->tambahHariKerja($v['tanggal_pinjam'], 5),
            'status' => 'diajukan',
            'ttd_peminjam_at' => now(), // pemohon menandatangani permohonan.
        ]);
        AuditLog::catat($u->id, 'arsip.ajukan', 'tata_usaha', "Peminjaman arsip {$nomor} diajukan.");
        $notif->kirim([$petugas->id], 'Permohonan Peminjaman Arsip',
            "{$u->name} mengajukan peminjaman arsip {$nomor} ({$v['jenis']}).", '/peminjaman-arsip');

        return response()->json(['data' => $this->serialize($arsip->load(['peminjam', 'petugas'])), 'message' => 'Permohonan peminjaman diajukan.'], 201);
    }

    /** Petugas arsip memverifikasi & menyetujui → Bukti Peminjaman siap. */
    public function setujui(Request $request, PeminjamanArsip $peminjaman, NotifikasiService $notif)
    {
        $this->authorizePetugas($request, $peminjaman);
        abort_unless($peminjaman->status === 'diajukan', 422, 'Status permohonan tidak dapat disetujui.');
        // Petugas melengkapi nomor/klasifikasi/tahun (dan No. Boks utk inaktif) tiap arsip.
        $v = $request->validate([
            'catatan' => ['nullable', 'string', 'max:1000'],
            'items' => ['nullable', 'array'],
            'items.*.nomor' => ['nullable', 'string', 'max:100'],
            'items.*.kode' => ['nullable', 'string', 'max:100'],
            'items.*.tahun' => ['nullable', 'string', 'max:20'],
            'items.*.nomor_boks' => ['nullable', 'string', 'max:60'],
        ]);
        $arsip = $peminjaman->daftar_arsip;
        foreach ((array) ($v['items'] ?? []) as $i => $det) {
            if (isset($arsip[$i])) {
                $arsip[$i] = array_merge($arsip[$i], [
                    'nomor' => $det['nomor'] ?? $arsip[$i]['nomor'] ?? null,
                    'kode' => $det['kode'] ?? $arsip[$i]['kode'] ?? null,
                    'tahun' => $det['tahun'] ?? $arsip[$i]['tahun'] ?? null,
                    'nomor_boks' => $det['nomor_boks'] ?? $arsip[$i]['nomor_boks'] ?? null,
                ]);
            }
        }
        $peminjaman->update(['status' => 'disetujui', 'ttd_petugas_at' => now(), 'daftar_arsip' => $arsip, 'catatan_petugas' => $v['catatan'] ?? null]);
        $notif->kirim([$peminjaman->user_id], 'Peminjaman Arsip Disetujui',
            "Peminjaman arsip {$peminjaman->nomor} disetujui. Bukti Peminjaman dapat dicetak.", '/peminjaman-arsip');

        return response()->json(['data' => $this->serialize($peminjaman->fresh()->load(['peminjam', 'petugas'])), 'message' => 'Peminjaman disetujui.']);
    }

    public function tolak(Request $request, PeminjamanArsip $peminjaman, NotifikasiService $notif)
    {
        $this->authorizePetugas($request, $peminjaman);
        abort_unless($peminjaman->status === 'diajukan', 422, 'Status tidak dapat ditolak.');
        $v = $request->validate(['alasan' => ['required', 'string', 'max:500']]);
        $peminjaman->update(['status' => 'ditolak', 'alasan_tolak' => $v['alasan']]);
        $notif->kirim([$peminjaman->user_id], 'Peminjaman Arsip Ditolak',
            "Peminjaman arsip {$peminjaman->nomor} ditolak: {$v['alasan']}", '/peminjaman-arsip');

        return response()->json(['data' => $this->serialize($peminjaman->fresh()->load(['peminjam', 'petugas'])), 'message' => 'Permohonan ditolak.']);
    }

    /** Peminjam menandai arsip telah dikembalikan. */
    public function kembalikan(Request $request, PeminjamanArsip $peminjaman)
    {
        abort_unless($peminjaman->user_id === $request->user()->id, 403);
        abort_unless($peminjaman->status === 'disetujui', 422, 'Hanya peminjaman aktif yang dapat dikembalikan.');
        // Peminjam menandatangani pengembalian.
        $peminjaman->update(['status' => 'dikembalikan', 'tanggal_dikembalikan' => now()->toDateString(), 'ttd_kembali_peminjam_at' => now()]);
        app(NotifikasiService::class)->kirim([$peminjaman->petugas_id], 'Pengembalian Arsip',
            "Arsip {$peminjaman->nomor} dikembalikan peminjam, menunggu pemeriksaan petugas.", '/peminjaman-arsip');

        return response()->json(['data' => $this->serialize($peminjaman->fresh()->load(['peminjam', 'petugas'])), 'message' => 'Arsip ditandai dikembalikan.']);
    }

    /** Petugas memeriksa kondisi & mengesahkan pengembalian → Bukti Pengembalian. */
    public function selesaikan(Request $request, PeminjamanArsip $peminjaman, NotifikasiService $notif)
    {
        $this->authorizePetugas($request, $peminjaman);
        abort_unless($peminjaman->status === 'dikembalikan', 422, 'Belum ada pengembalian untuk disahkan.');
        $peminjaman->update([
            'status' => 'selesai',
            'ttd_kembali_at' => now(),
            'catatan_petugas' => $request->input('catatan', $peminjaman->catatan_petugas),
            'tanggal_dikembalikan' => $peminjaman->tanggal_dikembalikan ?? now()->toDateString(),
        ]);
        $notif->kirim([$peminjaman->user_id], 'Pengembalian Arsip Selesai',
            "Pengembalian arsip {$peminjaman->nomor} disahkan. Bukti Pengembalian dapat dicetak.", '/peminjaman-arsip');

        return response()->json(['data' => $this->serialize($peminjaman->fresh()->load(['peminjam', 'petugas'])), 'message' => 'Pengembalian disahkan.']);
    }

    /** Cetak SATU file PDF berisi Bukti Peminjaman + Bukti Pengembalian (empat TTD QR). */
    public function pdf(Request $request, PeminjamanArsip $peminjaman)
    {
        $this->authorizeLihat($request, $peminjaman);
        if (! in_array($peminjaman->status, ['disetujui', 'dikembalikan', 'selesai'], true)) {
            return response()->json(['message' => 'Bukti tersedia setelah disetujui petugas arsip.'], 422);
        }
        $peminjaman->load(['peminjam', 'petugas']);
        $qr = [
            'pinjam_peminjam' => $this->qrDataUri($peminjaman->peminjam, $peminjaman->ttd_peminjam_at),
            'pinjam_petugas' => $this->qrDataUri($peminjaman->petugas, $peminjaman->ttd_petugas_at),
            'kembali_peminjam' => $this->qrDataUri($peminjaman->peminjam, $peminjaman->ttd_kembali_peminjam_at),
            'kembali_petugas' => $this->qrDataUri($peminjaman->petugas, $peminjaman->ttd_kembali_at),
        ];
        $pdf = Pdf::loadView('pdf.peminjaman-arsip', [
            'p' => $peminjaman, 'qr' => $qr, 'logo' => $this->logoDataUri(),
            'fungsiLabel' => self::FUNGSI_LABEL[$peminjaman->tim_kerja] ?? '—',
        ])->setPaper('a4', 'portrait');

        $filename = 'Form-Peminjaman-Arsip-'.str_replace('/', '-', $peminjaman->nomor).'.pdf';

        // ?preview=1 → tampilkan inline (pratinjau di tab baru) tanpa memaksa unduh.
        return $request->boolean('preview') ? $pdf->stream($filename) : $pdf->download($filename);
    }

    /** Tambah N hari kerja (lewati Sabtu & Minggu) dari sebuah tanggal. */
    private function tambahHariKerja(string $tanggal, int $n): string
    {
        $d = \Illuminate\Support\Carbon::parse($tanggal);
        $ditambah = 0;
        while ($ditambah < $n) {
            $d->addDay();
            if (! $d->isWeekend()) {
                $ditambah++;
            }
        }

        return $d->toDateString();
    }

    private function authorizePetugas(Request $request, PeminjamanArsip $p): void
    {
        $u = $request->user();
        abort_unless($p->petugas_id === $u->id || $u->hasAnyRole(['superadmin', 'kepala_subag_tu']), 403, 'Hanya petugas arsip terkait.');
    }

    private function authorizeLihat(Request $request, PeminjamanArsip $p): void
    {
        $u = $request->user();
        abort_unless($p->user_id === $u->id || $p->petugas_id === $u->id || $u->hasAnyRole(['superadmin', 'kepala_subag_tu', 'kepala_balai']), 403);
    }

    private function generateNomor(string $jenis): array
    {
        // Format: urutan/bulan/tahun → 001/07/2026. Nomor dipisah per jenis:
        // Arsip Aktif punya urutan sendiri (mulai 001), Arsip Inaktif sendiri (mulai 001).
        // Reset ke 001 tiap tahun baru.
        $now = now();
        $urut = ((int) PeminjamanArsip::where('jenis', $jenis)
            ->whereYear('created_at', $now->year)
            ->max('nomor_urut')) + 1;
        $nomor = sprintf('%03d/%02d/%d', $urut, $now->month, $now->year);

        return [$nomor, $urut];
    }

    private function qrDataUri(?User $u, $signedAt): ?string
    {
        if (! $u || ! $signedAt) {
            return null;
        }
        $ttd = TandaTangan::where('user_id', $u->id)->where('is_active', true)->first();
        if (! $ttd) {
            return null;
        }
        $url = rtrim(config('app.url'), '/').'/ttd/'.$ttd->kode;

        return 'data:image/svg+xml;base64,'.base64_encode(QrCode::format('svg')->size(90)->margin(0)->generate($url));
    }

    private function logoDataUri(): ?string
    {
        $path = resource_path('views/pdf/badanpom.png');

        return is_file($path) ? 'data:image/png;base64,'.base64_encode(file_get_contents($path)) : null;
    }

    private function serialize(PeminjamanArsip $p): array
    {
        return [
            'id' => $p->id,
            'nomor' => $p->nomor,
            'jenis' => $p->jenis,
            'peminjam' => $p->relationLoaded('peminjam') && $p->peminjam ? ['id' => $p->peminjam->id, 'name' => $p->peminjam->name, 'nip' => $p->peminjam->nip_nik] : null,
            'petugas' => $p->petugas?->name,
            'petugas_id' => $p->petugas_id,
            'tim_kerja' => $p->tim_kerja,
            'tim_label' => self::FUNGSI_LABEL[$p->tim_kerja] ?? ($p->jenis === 'inaktif' ? 'Arsiparis' : null),
            'unit_pengolah' => $p->unit_pengolah,
            'keperluan' => $p->keperluan,
            'daftar_arsip' => $p->daftar_arsip,
            'tanggal_pinjam' => $p->tanggal_pinjam?->toDateString(),
            'tanggal_harus_kembali' => $p->tanggal_harus_kembali?->toDateString(),
            'tanggal_dikembalikan' => $p->tanggal_dikembalikan?->toDateString(),
            'status' => $p->status,
            'alasan_tolak' => $p->alasan_tolak,
            'catatan_petugas' => $p->catatan_petugas,
            'ttd_peminjam' => (bool) $p->ttd_peminjam_at,
            'ttd_petugas' => (bool) $p->ttd_petugas_at,
            'ttd_kembali_peminjam' => (bool) $p->ttd_kembali_peminjam_at,
            'ttd_kembali' => (bool) $p->ttd_kembali_at,
            'created_at' => $p->created_at?->toIso8601String(),
        ];
    }
}
