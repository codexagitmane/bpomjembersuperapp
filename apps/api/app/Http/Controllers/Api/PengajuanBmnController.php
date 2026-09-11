<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\BmnItem;
use App\Models\PengajuanBmn;
use App\Models\TandaTangan;
use App\Models\User;
use App\Services\BmnExcelService;
use App\Services\NotifikasiService;
use App\Services\PemeliharaanExportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * Pengajuan & Pemeliharaan (PnP) BMN — Fungsi Tata Usaha.
 * Alur 3 tanda tangan: Pemohon → Pengelola BMN (Qithfirul/Yulia) → Kasubag TU.
 */
class PengajuanBmnController extends Controller
{
    /** Daftar permohonan milik pemohon sendiri. */
    public function index(Request $request)
    {
        $items = PengajuanBmn::with(['user:id,name', 'pengelolaBmn:id,name', 'bmnItem:id,nama_barang'])
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')->get();

        return response()->json(['data' => $items->map(fn ($p) => $this->serialize($p))]);
    }

    /** Antrean seluruh permohonan (Kasubag TU / Superadmin / Pengelola BMN). */
    public function semua(Request $request)
    {
        $user = $request->user();
        $isPimpinan = $user->hasAnyRole(['superadmin', 'kepala_balai', 'kepala_subag_tu']);
        abort_unless($isPimpinan || $user->is_pengelola_bmn, 403);

        $q = PengajuanBmn::with(['user:id,name', 'pengelolaBmn:id,name', 'bmnItem:id,nama_barang'])->orderByDesc('created_at');
        // Pengelola BMN (ASN) hanya melihat yang ditujukan kepadanya; pimpinan/TU melihat semua.
        if (! $isPimpinan) {
            $q->where('pengelola_bmn_id', $user->id);
        }
        if ($request->filled('status')) {
            $q->where('status', $request->input('status'));
        }

        return response()->json(['data' => $q->get()->map(fn ($p) => $this->serialize($p))]);
    }

    public function bmnList()
    {
        return response()->json([
            'data' => BmnItem::orderBy('nama_barang')->get(['id', 'kode_barang', 'nup', 'nama_barang', 'jenis_bmn', 'lokasi', 'kondisi', 'tahun_perolehan', 'foto_path', 'bast_path']),
        ]);
    }

    /** Unduh template Excel impor BMN. */
    public function bmnTemplate(BmnExcelService $svc)
    {
        return $svc->template();
    }

    /** Tambah BMN manual (Pengelola BMN / TU / Superadmin). */
    public function storeBmn(Request $request)
    {
        $this->authorizeBmn($request->user());
        $v = $this->validateBmn($request);
        if ($request->hasFile('foto')) {
            $v['foto_path'] = $request->file('foto')->store('bmn', 'public');
        }
        if ($request->hasFile('bast')) {
            $v['bast_path'] = $request->file('bast')->store('bmn-bast', 'public');
        }
        $item = BmnItem::create($v);
        AuditLog::catat($request->user()->id, 'bmn_tambah', 'tata_usaha', "Menambah BMN {$item->nama_barang}.");

        return response()->json(['data' => $item, 'message' => 'BMN ditambahkan.'], 201);
    }

    public function updateBmn(Request $request, BmnItem $bmnItem)
    {
        $this->authorizeBmn($request->user());
        $v = $this->validateBmn($request, $bmnItem->id);
        if ($request->hasFile('foto')) {
            if ($bmnItem->foto_path) {
                Storage::disk('public')->delete($bmnItem->foto_path);
            }
            $v['foto_path'] = $request->file('foto')->store('bmn', 'public');
        }
        if ($request->hasFile('bast')) {
            if ($bmnItem->bast_path) {
                Storage::disk('public')->delete($bmnItem->bast_path);
            }
            $v['bast_path'] = $request->file('bast')->store('bmn-bast', 'public');
        }
        $bmnItem->update($v);

        return response()->json(['data' => $bmnItem->fresh(), 'message' => 'BMN diperbarui.']);
    }

    public function deleteBmn(Request $request, BmnItem $bmnItem)
    {
        $this->authorizeBmn($request->user());
        if ($bmnItem->foto_path) {
            Storage::disk('public')->delete($bmnItem->foto_path);
        }
        $bmnItem->delete();

        return response()->json(['message' => 'BMN dihapus.']);
    }

    /** Detail BMN publik (hasil scan QR aset). */
    public function publicBmn(BmnItem $bmnItem)
    {
        $selesai = PengajuanBmn::where('bmn_item_id', $bmnItem->id)->where('status', 'selesai')->count();

        return response()->json(['data' => [
            'nama' => $bmnItem->nama_barang,
            'nup' => $bmnItem->nup,
            'no_bmn' => $bmnItem->kode_barang,
            'jenis_bmn' => $bmnItem->jenis_bmn,
            'lokasi' => $bmnItem->lokasi,
            'kondisi' => $this->labelKondisi($bmnItem->kondisi),
            'tahun_perolehan' => $bmnItem->tahun_perolehan,
            'foto_url' => $bmnItem->foto_path ? asset('storage/'.$bmnItem->foto_path) : null,
            'bast_url' => $bmnItem->bast_path ? asset('storage/'.$bmnItem->bast_path) : null,
            'total_perbaikan_selesai' => $selesai,
        ]]);
    }

    private function authorizeBmn($u): void
    {
        abort_unless($u->is_pengelola_bmn || $u->hasAnyRole(['superadmin', 'kepala_subag_tu']), 403, 'Hanya Pengelola BMN / TU.');
    }

    private function validateBmn(Request $request, ?int $ignoreId = null): array
    {
        $data = $request->validate([
            'nama_barang' => ['required', 'string', 'max:150'],
            'kode_barang' => ['required', 'string', 'max:60', Rule::unique('bmn_items', 'kode_barang')->ignore($ignoreId)],
            'nup' => ['nullable', 'string', 'max:40'],
            'jenis_bmn' => ['nullable', 'string', 'max:120'],
            'lokasi' => ['nullable', 'string', 'max:150'],
            'kondisi' => ['nullable', Rule::in(['baik', 'rusak_ringan', 'rusak_sedang', 'rusak_berat'])],
            'tahun_perolehan' => ['nullable', 'integer', 'min:1950', 'max:2100'],
            'foto' => ['nullable', 'image', 'max:2048'],
            'bast' => ['nullable', 'file', 'mimes:pdf', 'max:2048'],
        ]);
        unset($data['foto'], $data['bast']);
        $data['kondisi'] = $data['kondisi'] ?? 'baik';

        return $data;
    }

    /** Impor katalog BMN dari Excel (Pengelola BMN / TU / Superadmin). */
    public function importBmn(Request $request, BmnExcelService $svc)
    {
        $u = $request->user();
        abort_unless($u->is_pengelola_bmn || $u->hasAnyRole(['superadmin', 'kepala_subag_tu']), 403);
        $request->validate(['file' => ['required', 'file', 'max:5120']]);
        try {
            $hasil = $svc->import($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'File tidak dapat dibaca. Pastikan format Excel (.xlsx) sesuai template.'], 422);
        }
        AuditLog::catat($u->id, 'bmn_import', 'tata_usaha', "Impor katalog BMN: {$hasil['berhasil']} berhasil, {$hasil['gagal']} gagal.");

        return response()->json(['message' => "Impor selesai: {$hasil['berhasil']} data tersimpan.".($hasil['gagal'] ? " {$hasil['gagal']} baris dilewati." : ''), ...$hasil]);
    }

    /** Ekspor seluruh data pemeliharaan/perbaikan ke Excel. */
    public function exportPemeliharaan(Request $request, BmnExcelService $svc)
    {
        $user = $request->user();
        $isPimpinan = $user->hasAnyRole(['superadmin', 'kepala_balai', 'kepala_subag_tu']);
        abort_unless($isPimpinan || $user->is_pengelola_bmn, 403);
        $q = PengajuanBmn::with($this->rel())->orderByDesc('created_at');
        if (! $isPimpinan) {
            $q->where('pengelola_bmn_id', $user->id);
        }
        AuditLog::catat($user->id, 'bmn_export', 'tata_usaha', 'Ekspor Excel data pemeliharaan BMN.');

        return $svc->exportPemeliharaan($q->get());
    }

    /** Riwayat pemeliharaan sebuah BMN (klik dari Daftar BMN). */
    public function riwayatBmn(Request $request, BmnItem $bmnItem)
    {
        $tgl = fn ($d) => $d?->locale('id')->translatedFormat('d F Y');
        $riwayat = PengajuanBmn::where('bmn_item_id', $bmnItem->id)
            ->orderByDesc('created_at')->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'nomor' => $p->nomor_permohonan,
                'judul' => $p->deskripsi_kerusakan,
                'kondisi' => $this->labelKondisi($p->kondisi),
                'tanggal' => $tgl($p->tanggal_permohonan ?? $p->created_at),
                'tanggal_diperbaiki' => $tgl($p->tanggal_diperbaiki),
                'status' => $p->status,
            ]);

        $urlDetail = rtrim(config('app.url'), '/').'/bmn/'.$bmnItem->id;
        $qr = 'data:image/svg+xml;base64,'.base64_encode(QrCode::format('svg')->size(160)->margin(1)->generate($urlDetail));

        return response()->json([
            'data' => [
                'id' => $bmnItem->id,
                'nama' => $bmnItem->nama_barang,
                'nup' => $bmnItem->nup,
                'no_bmn' => $bmnItem->kode_barang,
                'jenis_bmn' => $bmnItem->jenis_bmn,
                'lokasi' => $bmnItem->lokasi,
                'kondisi' => $this->labelKondisi($bmnItem->kondisi),
                'tahun_perolehan' => $bmnItem->tahun_perolehan,
                'foto_url' => $bmnItem->foto_path ? asset('storage/'.$bmnItem->foto_path) : null,
                'bast_url' => $bmnItem->bast_path ? asset('storage/'.$bmnItem->bast_path) : null,
                'qr' => $qr,
                'total_perbaikan' => $riwayat->count(),
                'riwayat' => $riwayat,
            ],
        ]);
    }

    /**
     * QR master aset untuk diunduh. Error-correction tinggi (H) agar tetap
     * terbaca meski diberi logo internal (Si Pandu Aja) di tengah oleh klien.
     */
    public function qrAset(Request $request, BmnItem $bmnItem)
    {
        $this->authorizeBmn($request->user());
        $url = rtrim(config('app.url'), '/').'/bmn/'.$bmnItem->id;
        $svg = QrCode::format('svg')->size(360)->margin(1)->errorCorrection('H')->generate($url);

        return response()->json([
            'data' => [
                'id' => $bmnItem->id,
                'nama' => $bmnItem->nama_barang,
                'no_bmn' => $bmnItem->kode_barang,
                'nup' => $bmnItem->nup,
                'url' => $url,
                'qr' => 'data:image/svg+xml;base64,'.base64_encode($svg),
            ],
        ]);
    }

    private function labelKondisi(?string $v): string
    {
        return match ($v) {
            'rusak_ringan' => 'Rusak Ringan',
            'rusak_sedang' => 'Rusak Sedang',
            'rusak_berat' => 'Rusak Berat',
            'baik' => 'Baik',
            default => '-',
        };
    }

    // ===================== Jadwal Pemeliharaan BMN =====================

    private function bulanKosong(): array
    {
        $b = [];
        foreach (range(1, 12) as $m) {
            $b[$m] = ['r' => 0, 'e' => 0];
        }

        return $b;
    }

    /** Daftar tahun jadwal yang tersedia (2020 s/d tahun berjalan, minimal s/d 2026). */
    public function jadwalTahun()
    {
        $max = max((int) now()->year, 2026);
        $tahun = range(2020, $max);
        rsort($tahun);

        return response()->json(['data' => $tahun]);
    }

    /** Matriks jadwal pemeliharaan per tahun (Rencana/Realisasi 12 bulan), sinkron master BMN. */
    public function jadwalIndex(Request $request)
    {
        $tahun = (int) $request->query('tahun', now()->year);
        $jadwal = \App\Models\JadwalPemeliharaanBmn::where('tahun', $tahun)->get()->keyBy('bmn_item_id');
        $rows = BmnItem::orderBy('lokasi')->orderBy('nama_barang')->get()->map(function ($b) use ($jadwal) {
            $j = $jadwal->get($b->id);

            return [
                'bmn_item_id' => $b->id,
                'nama' => $b->nama_barang,
                'no_bmn' => $b->kode_barang,
                'nup' => $b->nup,
                'lokasi' => $b->lokasi ?: 'Lainnya',
                'jumlah' => $j?->jumlah ?? 1,
                'bulan' => $j?->bulan ?? $this->bulanKosong(),
                'keterangan' => $j?->keterangan,
            ];
        });

        return response()->json([
            'data' => $rows,
            'tahun' => $tahun,
            'can_manage' => (bool) $request->user()->is_pengelola_bmn || $request->user()->hasAnyRole(['superadmin', 'kepala_subag_tu']),
        ]);
    }

    /** Simpan matriks rencana/realisasi 12 bulan untuk satu BMN pada satu tahun. */
    public function jadwalUpsert(Request $request, BmnItem $bmnItem)
    {
        $this->authorizeBmn($request->user());
        $v = $request->validate([
            'tahun' => ['required', 'integer', 'min:2015', 'max:2100'],
            'jumlah' => ['nullable', 'integer', 'min:0'],
            'keterangan' => ['nullable', 'string', 'max:255'],
            'bulan' => ['nullable', 'array'],
        ]);
        $bulan = $this->bulanKosong();
        foreach ((array) ($v['bulan'] ?? []) as $m => $val) {
            $m = (int) $m;
            if ($m >= 1 && $m <= 12) {
                $bulan[$m] = ['r' => ! empty($val['r']) ? 1 : 0, 'e' => ! empty($val['e']) ? 1 : 0];
            }
        }
        \App\Models\JadwalPemeliharaanBmn::updateOrCreate(
            ['bmn_item_id' => $bmnItem->id, 'tahun' => (int) $v['tahun']],
            ['jumlah' => $v['jumlah'] ?? 1, 'bulan' => $bulan, 'keterangan' => $v['keterangan'] ?? null, 'user_id' => $request->user()->id]
        );

        return response()->json(['message' => 'Jadwal pemeliharaan disimpan.']);
    }

    // ===================== Laporan Pemeliharaan =====================

    /** Validasi & normalisasi parameter periode laporan. */
    private function periodeLaporan(Request $request): array
    {
        $v = $request->validate([
            'tahun' => ['nullable', 'integer', 'min:2015', 'max:2100'],
            'periode' => ['nullable', Rule::in(['bulan', 'semester', 'tahun'])],
            'bulan' => ['nullable', 'integer', 'min:1', 'max:12'],
            'semester' => ['nullable', 'integer', 'min:1', 'max:2'],
        ]);

        return [
            'tahun' => (int) ($v['tahun'] ?? now()->year),
            'periode' => $v['periode'] ?? 'bulan',
            'bulan' => (int) ($v['bulan'] ?? now()->month),
            'semester' => (int) ($v['semester'] ?? 1),
        ];
    }

    /** Pratinjau laporan pemeliharaan (JSON) untuk tabel di web. */
    public function laporan(Request $request, PemeliharaanExportService $svc)
    {
        $p = $this->periodeLaporan($request);

        return response()->json([
            'data' => $svc->laporanData($p['tahun'], $p['periode'], $p['bulan'], $p['semester']),
        ]);
    }

    /** Unduh laporan pemeliharaan sebagai PDF. */
    public function laporanPdf(Request $request, PemeliharaanExportService $svc)
    {
        $p = $this->periodeLaporan($request);
        $data = $svc->laporanData($p['tahun'], $p['periode'], $p['bulan'], $p['semester']);
        $pdf = Pdf::loadView('pdf.laporan-pemeliharaan', [
            'data' => $data, 'logo' => $this->logoDataUri(),
        ])->setPaper('A4', 'portrait');

        return $pdf->download('Laporan-Pemeliharaan-BMN-'.now()->format('Ymd-His').'.pdf');
    }

    /** Unduh laporan pemeliharaan sebagai Excel. */
    public function laporanExcel(Request $request, PemeliharaanExportService $svc)
    {
        $p = $this->periodeLaporan($request);
        $data = $svc->laporanData($p['tahun'], $p['periode'], $p['bulan'], $p['semester']);

        return $svc->laporanExcel($data);
    }

    // ===================== Kartu Pemeliharaan =====================

    private function tahunKartu(Request $request): int
    {
        $v = $request->validate(['tahun' => ['nullable', 'integer', 'min:2015', 'max:2100']]);

        return (int) ($v['tahun'] ?? now()->year);
    }

    /** Unduh kartu pemeliharaan satu BMN sebagai PDF (format Formulir F.01). */
    public function kartuPdf(Request $request, BmnItem $bmnItem, PemeliharaanExportService $svc)
    {
        $data = $svc->kartuData($bmnItem, $this->tahunKartu($request));
        // Ukuran F4/Folio (215 × 330 mm) lanskap — satu triwulan satu halaman.
        $pdf = Pdf::loadView('pdf.kartu-pemeliharaan', [
            'data' => $data, 'logo' => $this->logoDataUri(),
        ])->setPaper([0, 0, 609.45, 935.43], 'landscape');

        return $pdf->download('Kartu-Pemeliharaan-'.str_replace(['/', ' '], '-', $bmnItem->nama_barang).'-'.$data['tahun'].'.pdf');
    }

    /** Unduh kartu pemeliharaan satu BMN sebagai Excel. */
    public function kartuExcel(Request $request, BmnItem $bmnItem, PemeliharaanExportService $svc)
    {
        $data = $svc->kartuData($bmnItem, $this->tahunKartu($request));

        return $svc->kartuExcel($data);
    }

    /** Unduh template Excel jadwal pemeliharaan untuk satu tahun. */
    public function jadwalTemplate(Request $request, \App\Services\JadwalExcelService $svc)
    {
        return $svc->template((int) $request->query('tahun', now()->year));
    }

    /** Impor jadwal pemeliharaan dari Excel (matriks bulanan) — bisa membuat BMN baru. */
    public function jadwalImport(Request $request, \App\Services\JadwalExcelService $svc)
    {
        $this->authorizeBmn($request->user());
        $request->validate([
            'file' => ['required', 'file', 'max:5120'],
            'tahun' => ['nullable', 'integer', 'min:2015', 'max:2100'],
        ]);
        try {
            $hasil = $svc->import($request->file('file'), $request->user()->id, $request->filled('tahun') ? (int) $request->input('tahun') : null);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'File tidak dapat dibaca. Pastikan format sesuai template.'], 422);
        }
        AuditLog::catat($request->user()->id, 'jadwal_import', 'tata_usaha', "Impor jadwal {$hasil['tahun']}: {$hasil['berhasil']} berhasil.");

        return response()->json(['message' => "Impor jadwal {$hasil['tahun']} selesai: {$hasil['berhasil']} BMN.".($hasil['gagal'] ? " {$hasil['gagal']} gagal." : ''), ...$hasil]);
    }

    public function pengelolaBmn()
    {
        return response()->json([
            'data' => User::where('is_pengelola_bmn', true)->orderBy('name')->get(['id', 'name', 'jabatan'])
                ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'jabatan' => $u->jabatan]),
        ]);
    }

    /** Cari pegawai berdasarkan NIP → auto-isi Nama & Jabatan (dari data pegawai). */
    public function cariPegawai(Request $request)
    {
        $nip = trim((string) $request->query('nip', ''));
        if (strlen($nip) < 3) {
            return response()->json(['data' => null]);
        }
        $u = User::where('account_type', 'internal')->where('nip_nik', $nip)->first();

        return response()->json([
            'data' => $u ? ['name' => $u->name, 'jabatan' => $u->jabatan, 'nip_nik' => $u->nip_nik] : null,
        ]);
    }

    public function store(Request $request, NotifikasiService $notif)
    {
        $v = $request->validate([
            'pengelola_bmn_id' => ['required', 'integer', Rule::exists('users', 'id')->where('is_pengelola_bmn', true)],
            'nama_pemohon' => ['nullable', 'string', 'max:190'],
            'nip' => ['nullable', 'string', 'max:40'],
            'jabatan' => ['nullable', 'string', 'max:190'],
            'kelompok_substansi' => ['nullable', 'string', 'max:190'],
            'bmn_item_id' => ['nullable', 'exists:bmn_items,id'],
            'nama_barang_lain' => ['required_without:bmn_item_id', 'nullable', 'string', 'max:150'],
            'no_bmn' => ['nullable', 'string', 'max:80'],
            'lokasi' => ['nullable', 'string', 'max:190'],
            'kerusakan_mulai' => ['required', 'date'],
            'kondisi' => ['nullable', Rule::in(['rusak_ringan', 'rusak_sedang', 'rusak_berat'])],
            'deskripsi_kerusakan' => ['required', 'string', 'min:5', 'max:1500'],
            'foto' => ['nullable', 'image', 'max:2048'],
        ]);

        $u = $request->user();
        $fotoPath = null;
        if ($request->hasFile('foto')) {
            $fotoPath = $request->file('foto')->store('pengajuan-bmn', 'public');
        }

        // Lengkapi nama & lokasi dari katalog bila memilih dari daftar.
        $namaBarang = $v['nama_barang_lain'] ?? null;
        if (! empty($v['bmn_item_id'])) {
            $item = BmnItem::find($v['bmn_item_id']);
            $namaBarang = $namaBarang ?: $item?->nama_barang;
            $v['no_bmn'] = $v['no_bmn'] ?? $item?->kode_barang;
            $v['lokasi'] = $v['lokasi'] ?? $item?->lokasi;
        }

        $pengajuan = PengajuanBmn::create([
            'nomor_permohonan' => $this->generateNomor(),
            'tanggal_permohonan' => now()->toDateString(),
            'user_id' => $u->id,
            'pengelola_bmn_id' => (int) $v['pengelola_bmn_id'],
            'pemohon_nama' => $v['nama_pemohon'] ?? $u->name,
            'pemohon_nip' => $v['nip'] ?? $u->nip_nik,
            'jabatan' => $v['jabatan'] ?? $u->jabatan,
            'kelompok_substansi' => $v['kelompok_substansi'] ?? $u->penugasan,
            'bmn_item_id' => $v['bmn_item_id'] ?? null,
            'nama_barang_lain' => $namaBarang,
            'no_bmn' => $v['no_bmn'] ?? null,
            'lokasi' => $v['lokasi'] ?? null,
            'kerusakan_mulai' => $v['kerusakan_mulai'],
            'kondisi' => $v['kondisi'] ?? null,
            'jenis_pengajuan' => 'perbaikan',
            'deskripsi_kerusakan' => $v['deskripsi_kerusakan'],
            'foto_path' => $fotoPath,
            'prioritas' => 'sedang',
            'status' => 'diajukan',
            'ttd_pemohon_at' => now(), // Pemohon menandatangani saat mengirim.
        ]);

        AuditLog::catat($u->id, 'bmn_diajukan', 'tata_usaha', "Permohonan perbaikan BMN {$pengajuan->nomor_permohonan} dibuat.");
        $notif->kirim([(int) $v['pengelola_bmn_id']], 'Permohonan Perbaikan BMN Baru',
            "{$u->name} mengajukan perbaikan {$namaBarang} — menunggu tindak lanjut Pengelola BMN.", '/pengajuan-bmn');

        return response()->json(['data' => $this->serialize($pengajuan->load(['user:id,name', 'pengelolaBmn:id,name', 'bmnItem:id,nama_barang'])), 'message' => 'Permohonan terkirim & ditandatangani.'], 201);
    }

    public function show(Request $request, PengajuanBmn $pengajuan)
    {
        $u = $request->user();
        $boleh = $pengajuan->user_id === $u->id
            || $pengajuan->pengelola_bmn_id === $u->id
            || $u->hasAnyRole(['superadmin', 'kepala_balai', 'kepala_subag_tu']);
        abort_unless($boleh, 403);

        return response()->json(['data' => $this->serialize($pengajuan->load($this->rel()), true)]);
    }

    /** Pengelola BMN menindaklanjuti & menandatangani → status diperbaiki. */
    public function proses(Request $request, PengajuanBmn $pengajuan, NotifikasiService $notif)
    {
        $u = $request->user();
        abort_unless($pengajuan->pengelola_bmn_id === $u->id || $u->hasRole('superadmin'), 403, 'Hanya Pengelola BMN terpilih.');
        if ($pengajuan->status !== 'diajukan') {
            return response()->json(['message' => 'Permohonan ini sudah diproses.'], 422);
        }
        $v = $request->validate([
            'tindakan' => ['required', 'string', 'max:1500'],
            'tanggal_diperbaiki' => ['required', 'date'],
        ]);
        $pengajuan->update([
            'tindakan' => $v['tindakan'],
            'tanggal_diperbaiki' => $v['tanggal_diperbaiki'],
            'status' => 'diperbaiki',
            'ttd_pengelola_at' => now(),
        ]);
        AuditLog::catat($u->id, 'bmn_diproses', 'tata_usaha', "Permohonan BMN {$pengajuan->nomor_permohonan} ditindaklanjuti Pengelola BMN.");
        $notif->kirimKeRole(['kepala_subag_tu', 'superadmin'], 'Perbaikan BMN Menunggu Pengesahan',
            "Permohonan {$pengajuan->nomor_permohonan} telah diperbaiki — menunggu pengesahan Kasubag TU.", '/pengajuan-bmn');
        $notif->kirim([$pengajuan->user_id], 'Perbaikan BMN Ditindaklanjuti',
            "Permohonan {$pengajuan->nomor_permohonan} Anda sedang/telah diperbaiki.", '/pengajuan-bmn');

        return response()->json(['data' => $this->serialize($pengajuan->fresh()->load($this->rel()), true), 'message' => 'Ditindaklanjuti & ditandatangani Pengelola BMN.']);
    }

    /** Kasubag TU mengesahkan & menandatangani → status selesai. */
    public function selesaikan(Request $request, PengajuanBmn $pengajuan, NotifikasiService $notif)
    {
        $u = $request->user();
        abort_unless($u->hasAnyRole(['kepala_subag_tu', 'superadmin']), 403, 'Hanya Kasubag TU.');
        if ($pengajuan->status !== 'diperbaiki') {
            return response()->json(['message' => 'Permohonan belum siap disahkan.'], 422);
        }
        $v = $request->validate([
            'keterangan_perbaikan' => ['nullable', 'string', 'max:1500'],
            'selesai_tanggal' => ['nullable', 'date'],
        ]);
        $pengajuan->update([
            'keterangan_perbaikan' => $v['keterangan_perbaikan'] ?? $pengajuan->tindakan,
            // Tanggal selesai = tanggal diperbaiki (diisi Pengelola BMN); Kasubag tak perlu input.
            'selesai_tanggal' => $v['selesai_tanggal'] ?? $pengajuan->tanggal_diperbaiki,
            'status' => 'selesai',
            'kasubag_id' => $u->id,
            'ttd_kasubag_at' => now(),
            'selesai_at' => now(),
        ]);
        AuditLog::catat($u->id, 'bmn_selesai', 'tata_usaha', "Permohonan BMN {$pengajuan->nomor_permohonan} disahkan selesai.");
        $notif->kirim([$pengajuan->user_id], 'Perbaikan BMN Selesai',
            "Permohonan {$pengajuan->nomor_permohonan} Anda telah selesai & disahkan Kasubag TU.", '/pengajuan-bmn');

        return response()->json(['data' => $this->serialize($pengajuan->fresh()->load($this->rel()), true), 'message' => 'Permohonan disahkan selesai.']);
    }

    /** Penolakan oleh Pengelola BMN / Kasubag TU. */
    public function tolak(Request $request, PengajuanBmn $pengajuan, NotifikasiService $notif)
    {
        $u = $request->user();
        $boleh = $pengajuan->pengelola_bmn_id === $u->id || $u->hasAnyRole(['kepala_subag_tu', 'superadmin']);
        abort_unless($boleh, 403);
        $v = $request->validate(['alasan' => ['required', 'string', 'max:500']]);
        $pengajuan->update(['status' => 'ditolak', 'catatan_penyelesaian' => $v['alasan']]);
        $notif->kirim([$pengajuan->user_id], 'Permohonan BMN Ditolak',
            "Permohonan {$pengajuan->nomor_permohonan} ditolak: {$v['alasan']}", '/pengajuan-bmn');

        return response()->json(['data' => $this->serialize($pengajuan->fresh()->load($this->rel()), true), 'message' => 'Permohonan ditolak.']);
    }

    /** Cetak Form Permohonan Perbaikan (PDF) sesuai format resmi. */
    public function pdf(Request $request, PengajuanBmn $pengajuan)
    {
        $u = $request->user();
        $boleh = $pengajuan->user_id === $u->id || $pengajuan->pengelola_bmn_id === $u->id
            || $u->hasAnyRole(['superadmin', 'kepala_balai', 'kepala_subag_tu']);
        abort_unless($boleh, 403);
        $pengajuan->load($this->rel());
        $qr = [
            'pemohon' => $this->qrDataUri($pengajuan->user, $pengajuan->ttd_pemohon_at),
            'pengelola' => $this->qrDataUri($pengajuan->pengelolaBmn, $pengajuan->ttd_pengelola_at),
            'kasubag' => $this->qrDataUri($pengajuan->kasubag, $pengajuan->ttd_kasubag_at),
        ];
        $pdf = Pdf::loadView('pdf.permohonan-perbaikan', [
            'p' => $pengajuan, 'qr' => $qr, 'logo' => $this->logoDataUri(),
        ])->setPaper('A4');

        return $pdf->download('Permohonan-Perbaikan-'.str_replace('/', '-', $pengajuan->nomor_permohonan).'.pdf');
    }

    private function logoDataUri(): ?string
    {
        $path = resource_path('views/pdf/badanpom.png');

        return is_file($path) ? 'data:image/png;base64,'.base64_encode(file_get_contents($path)) : null;
    }

    private function generateNomor(): string
    {
        $now = now();
        $urut = PengajuanBmn::whereYear('created_at', $now->year)
            ->whereMonth('created_at', $now->month)->count() + 1;

        return sprintf('%03d/%02d/%d', $urut, $now->month, $now->year);
    }

    private function rel(): array
    {
        return ['user:id,name,nip_nik', 'pengelolaBmn:id,name,nip_nik', 'kasubag:id,name,nip_nik', 'bmnItem:id,kode_barang,nama_barang,lokasi'];
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

        return 'data:image/svg+xml;base64,'.base64_encode(QrCode::format('svg')->size(80)->margin(0)->generate($url));
    }

    private function serialize(PengajuanBmn $p, bool $full = false): array
    {
        $tgl = fn ($d) => $d?->locale('id')->translatedFormat('d F Y');
        $data = [
            'id' => $p->id,
            'nomor_permohonan' => $p->nomor_permohonan,
            'tanggal_permohonan' => $tgl($p->tanggal_permohonan),
            'nama_bmn' => $p->nama_barang_lain ?? $p->bmnItem?->nama_barang,
            'no_bmn' => $p->no_bmn,
            'lokasi' => $p->lokasi,
            'deskripsi_kerusakan' => $p->deskripsi_kerusakan,
            'status' => $p->status,
            'pemohon' => $p->pemohon_nama ?? $p->user?->name,
            'pengelola_bmn' => $p->pengelolaBmn?->name,
            'pengelola_bmn_id' => $p->pengelola_bmn_id,
            'created_at' => $p->created_at?->toIso8601String(),
        ];
        if (! $full) {
            return $data;
        }

        return array_merge($data, [
            'nip' => $p->pemohon_nip ?? $p->user?->nip_nik,
            'jabatan' => $p->jabatan,
            'kelompok_substansi' => $p->kelompok_substansi,
            'kondisi' => $this->labelKondisi($p->kondisi),
            'kerusakan_mulai' => $tgl($p->kerusakan_mulai),
            'tindakan' => $p->tindakan,
            'tanggal_diperbaiki' => $tgl($p->tanggal_diperbaiki),
            'selesai_tanggal' => $tgl($p->selesai_tanggal),
            'keterangan_perbaikan' => $p->keterangan_perbaikan,
            'catatan_penyelesaian' => $p->catatan_penyelesaian,
            'foto_url' => $p->foto_path ? asset('storage/'.$p->foto_path) : null,
            'ttd' => [
                'pemohon' => ['nama' => $p->user?->name, 'signed' => (bool) $p->ttd_pemohon_at, 'qr' => $this->qrDataUri($p->user, $p->ttd_pemohon_at)],
                'pengelola' => ['nama' => $p->pengelolaBmn?->name, 'signed' => (bool) $p->ttd_pengelola_at, 'qr' => $this->qrDataUri($p->pengelolaBmn, $p->ttd_pengelola_at)],
                'kasubag' => ['nama' => $p->kasubag?->name, 'signed' => (bool) $p->ttd_kasubag_at, 'qr' => $this->qrDataUri($p->kasubag, $p->ttd_kasubag_at)],
            ],
            'timeline' => array_values(array_filter([
                $p->created_at ? ['label' => 'Dibuat', 'at' => $p->created_at->timezone('Asia/Jakarta')->locale('id')->translatedFormat('d M Y H.i').' WIB'] : null,
                $p->ttd_pemohon_at ? ['label' => 'Permohonan', 'at' => $tgl($p->tanggal_permohonan)] : null,
                $p->ttd_pengelola_at ? ['label' => 'Diperbaiki', 'at' => $tgl($p->tanggal_diperbaiki)] : null,
                $p->ttd_kasubag_at ? ['label' => 'Selesai', 'at' => $tgl($p->selesai_tanggal)] : null,
            ])),
        ]);
    }
}
