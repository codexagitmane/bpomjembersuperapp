<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApotekAudit;
use App\Models\ApotekDistribusi;
use App\Models\ApotekPemeriksaan;
use App\Models\ApotekTemuan;
use App\Models\ApotekTindakLanjut;
use App\Models\AuditLog;
use App\Models\SigApotek;
use App\Rules\EmailAman;
use App\Services\Sig\AnalitikApotekService;
use App\Services\Sig\ApotekBerkasService;
use App\Services\Sig\PrioritasMonitoringService;
use App\Services\Sig\WilayahService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * SIG Monitoring Distribusi Apotek.
 *
 * Modul bersifat monitoring dan analitik: menyajikan data sarana, riwayat
 * pemeriksaan, temuan, tindak lanjut, serta hubungan distribusi. Seluruh
 * status dan skor yang dihasilkan bersifat ADMINISTRATIF dan bukan
 * keputusan regulator.
 */
class SigApotekController extends Controller
{
    public const DISCLAIMER = 'SIG Monitoring Distribusi Apotek merupakan alat bantu visualisasi, monitoring, dan analisis data. Informasi yang ditampilkan bergantung pada data yang tersedia dan bukan merupakan keputusan regulator.';

    public function __construct(
        private readonly AnalitikApotekService $analitik,
        private readonly PrioritasMonitoringService $prioritas,
        private readonly WilayahService $wilayah,
        private readonly ApotekBerkasService $berkas,
    ) {}

    // ── Data awal ────────────────────────────────────────────────────────

    /** Data pendukung UI: wilayah, opsi, titik tengah peta, disclaimer. */
    public function bootstrap(Request $request)
    {
        return response()->json(['data' => [
            'kabupaten' => $this->wilayah->getKabupaten(),
            'kecamatan' => $this->wilayah->getKecamatan($request->query('kabupaten')),
            'pusat_peta' => $this->wilayah->pusatPeta($request->query('kabupaten')),
            'status_sarana' => SigApotek::STATUS_SARANA,
            'jenis_sarana' => ['apotek', 'toko_obat', 'distributor', 'klinik', 'lainnya'],
            'kategori_temuan' => ['sarana', 'dokumen', 'penyimpanan', 'penyaluran', 'penandaan', 'lainnya'],
            'peran' => $this->peran($request),
            'disclaimer' => self::DISCLAIMER,
        ]]);
    }

    /** Batas wilayah GeoJSON bila berkasnya tersedia. */
    public function geojson(Request $request)
    {
        return response()->json($this->wilayah->loadGeoJSON($request->query('tingkat', 'kabupaten')));
    }

    // ── Daftar & peta ────────────────────────────────────────────────────

    /** Daftar sarana dengan penyaringan lengkap. */
    public function index(Request $request)
    {
        $q = $this->saring($request);
        $semua = (clone $q)->orderBy('nama_apotek')->get();
        $agregat = $this->analitik->agregatPerApotek($semua->pluck('id')->all());

        return response()->json([
            'data' => $semua->map(fn ($a) => $this->serialize($a, $agregat[$a->id] ?? [])),
            'total' => $semua->count(),
            'disclaimer' => self::DISCLAIMER,
        ]);
    }

    /** Ringkasan KPI + peringatan monitoring. */
    public function ringkasan(Request $request)
    {
        $q = $this->saring($request);

        return response()->json([
            'kpi' => $this->analitik->kpi($q),
            'peringatan' => $this->analitik->peringatan($q),
            'disclaimer' => self::DISCLAIMER,
        ]);
    }

    /** Analisis spasial: rekap kabupaten, kecamatan, dan cakupan periode. */
    public function analisis(Request $request)
    {
        $q = $this->saring($request);

        return response()->json([
            'per_kabupaten' => $this->analitik->perKabupaten($q),
            'per_kecamatan' => $this->analitik->perKecamatan($q),
            'cakupan_pemeriksaan' => $this->analitik->cakupanPemeriksaan(),
            'catatan' => 'Angka pada halaman ini merupakan indikator monitoring, bukan indikator pelanggaran.',
        ]);
    }

    /** Daftar prioritas monitoring beserta rincian skornya. */
    public function prioritas(Request $request)
    {
        return response()->json([
            'data' => $this->analitik->prioritas($this->saring($request)),
            'catatan' => 'Skor Prioritas Monitoring adalah alat bantu administratif untuk menyusun urutan kunjungan. Skor tinggi tidak berarti sarana melakukan pelanggaran.',
        ]);
    }

    /** Indikator kualitas data & potensi duplikat. */
    public function kualitasData(Request $request)
    {
        return response()->json([
            'data' => $this->analitik->kualitasData($this->saring($request)),
            'catatan' => 'Potensi duplikat hanya ditandai untuk dikonfirmasi. Sistem tidak menghapus data secara otomatis.',
        ]);
    }

    // ── Rincian sarana ───────────────────────────────────────────────────

    public function show(SigApotek $sigApotek)
    {
        $sigApotek->load([
            'pemeriksaan' => fn ($q) => $q->orderByDesc('tanggal'),
            'pemeriksaan.temuan',
            'temuan' => fn ($q) => $q->orderByDesc('tanggal'),
            'temuan.tindakLanjut' => fn ($q) => $q->orderBy('tanggal'),
            'distribusiKeluar.penerima:id,nama_apotek',
            'distribusiMasuk.sumber:id,nama_apotek',
            'audit' => fn ($q) => $q->latest()->limit(50),
            'audit.user:id,name',
        ]);

        $agregat = $this->analitik->agregatPerApotek([$sigApotek->id]);
        $skor = $this->prioritas->hitung($sigApotek, $agregat[$sigApotek->id] ?? []);

        return response()->json(['data' => [
            'profil' => $this->serialize($sigApotek, $agregat[$sigApotek->id] ?? []),
            'prioritas' => $skor,
            'pemeriksaan' => $sigApotek->pemeriksaan->map(fn ($p) => [
                'id' => $p->id,
                'tanggal' => $p->tanggal?->toDateString(),
                'jenis' => $p->jenis,
                'petugas' => $p->petugas,
                'hasil' => $p->hasil,
                'jumlah_temuan' => $p->jumlah_temuan,
                'status_tindak_lanjut' => $p->status_tindak_lanjut,
                'target_penyelesaian' => $p->target_penyelesaian?->toDateString(),
                'catatan' => $p->catatan,
                'temuan_selesai' => $p->temuan->where('status', 'selesai')->count(),
                'temuan_proses' => $p->temuan->whereIn('status', ['belum', 'proses'])->count(),
            ]),
            'temuan' => $sigApotek->temuan->map(fn ($t) => $this->serializeTemuan($t)),
            'distribusi' => $this->distribusiSarana($sigApotek),
            'audit' => $sigApotek->audit->map(fn ($a) => [
                'id' => $a->id,
                'aksi' => $a->aksi,
                'user' => $a->user?->name,
                'sebelum' => $a->sebelum,
                'sesudah' => $a->sesudah,
                'waktu' => $a->created_at?->toIso8601String(),
            ]),
            'disclaimer' => self::DISCLAIMER,
        ]]);
    }

    // ── Tambah / ubah sarana ─────────────────────────────────────────────

    public function store(Request $request)
    {
        $this->pastikanBolehUbah($request);
        $v = $request->validate($this->aturan());

        $apotek = SigApotek::create([
            ...$v,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $this->catatAudit($request, $apotek, 'dibuat', null, $apotek->only(array_keys($v)));
        AuditLog::catat($request->user()->id, 'sig_apotek_dibuat', 'pemeriksaan', "Sarana '{$apotek->nama_apotek}' ditambahkan.");

        return response()->json(['data' => $this->serialize($apotek), 'message' => 'Data sarana disimpan.'], 201);
    }

    public function update(Request $request, SigApotek $sigApotek)
    {
        $this->pastikanBolehUbah($request);
        $v = $request->validate($this->aturan($sigApotek->id));

        $sebelum = $sigApotek->only(array_keys($v));
        $sigApotek->update([...$v, 'updated_by' => $request->user()->id]);

        $this->catatAudit($request, $sigApotek, 'diubah', $sebelum, $sigApotek->only(array_keys($v)));

        return response()->json(['data' => $this->serialize($sigApotek->fresh()), 'message' => 'Data sarana diperbarui.']);
    }

    public function destroy(Request $request, SigApotek $sigApotek)
    {
        abort_unless($this->peran($request) === 'admin', 403, 'Hanya admin yang dapat menghapus data sarana.');
        $nama = $sigApotek->nama_apotek;
        $sigApotek->delete();
        AuditLog::catat($request->user()->id, 'sig_apotek_dihapus', 'pemeriksaan', "Sarana '{$nama}' dihapus.");

        return response()->json(['message' => 'Data sarana dihapus.']);
    }

    // ── Pemeriksaan, temuan, tindak lanjut ───────────────────────────────

    public function simpanPemeriksaan(Request $request, SigApotek $sigApotek)
    {
        $this->pastikanBolehUbah($request);
        $v = $request->validate([
            'tanggal' => ['required', 'date'],
            'jenis' => ['nullable', 'string', 'max:60'],
            'petugas' => ['nullable', 'string', 'max:200'],
            'hasil' => ['nullable', 'string', 'max:2000'],
            'catatan' => ['nullable', 'string', 'max:2000'],
            'status_tindak_lanjut' => ['nullable', Rule::in(['belum', 'proses', 'selesai', 'perlu_verifikasi'])],
            'target_penyelesaian' => ['nullable', 'date'],
            'temuan' => ['nullable', 'array'],
            'temuan.*.kategori' => ['nullable', 'string', 'max:80'],
            'temuan.*.deskripsi' => ['required_with:temuan', 'string', 'max:1000'],
            'temuan.*.target' => ['nullable', 'date'],
            'temuan.*.pic' => ['nullable', 'string', 'max:150'],
        ]);

        $pemeriksaan = DB::transaction(function () use ($v, $sigApotek, $request) {
            $p = ApotekPemeriksaan::create([
                'apotek_id' => $sigApotek->id,
                'tanggal' => $v['tanggal'],
                'jenis' => $v['jenis'] ?? 'pemeriksaan_sarana',
                'petugas' => $v['petugas'] ?? null,
                'hasil' => $v['hasil'] ?? null,
                'catatan' => $v['catatan'] ?? null,
                'status_tindak_lanjut' => $v['status_tindak_lanjut'] ?? 'belum',
                'target_penyelesaian' => $v['target_penyelesaian'] ?? null,
                'jumlah_temuan' => count($v['temuan'] ?? []),
                'user_id' => $request->user()->id,
            ]);

            foreach (($v['temuan'] ?? []) as $t) {
                ApotekTemuan::create([
                    'pemeriksaan_id' => $p->id,
                    'apotek_id' => $sigApotek->id,
                    'tanggal' => $v['tanggal'],
                    'kategori' => $t['kategori'] ?? null,
                    'deskripsi' => $t['deskripsi'],
                    'status' => 'belum',
                    'target' => $t['target'] ?? ($v['target_penyelesaian'] ?? null),
                    'pic' => $t['pic'] ?? null,
                ]);
            }

            // Tanggal pemeriksaan terakhir mengikuti catatan terbaru.
            $terbaru = ApotekPemeriksaan::where('apotek_id', $sigApotek->id)->max('tanggal');
            $sigApotek->update([
                'tanggal_pemeriksaan_terakhir' => $terbaru,
                'hasil_pemeriksaan_terakhir' => $v['hasil'] ?? $sigApotek->hasil_pemeriksaan_terakhir,
                'updated_by' => $request->user()->id,
            ]);

            return $p;
        });

        return response()->json(['data' => ['id' => $pemeriksaan->id], 'message' => 'Pemeriksaan tercatat.'], 201);
    }

    /** Daftar temuan lintas sarana (modul Monitoring Temuan). */
    public function temuan(Request $request)
    {
        $q = ApotekTemuan::with('apotek:id,nama_apotek,kabupaten,kecamatan')->orderByDesc('tanggal');

        if ($s = $request->query('status')) {
            $q->where('status', $s);
        }
        if ($kab = $request->query('kabupaten')) {
            $q->whereHas('apotek', fn ($w) => $w->where('kabupaten', $kab));
        }
        if ($cari = trim((string) $request->query('q', ''))) {
            $q->where(fn ($w) => $w->where('deskripsi', 'like', "%{$cari}%")
                ->orWhere('kategori', 'like', "%{$cari}%"));
        }

        return response()->json([
            'data' => $q->limit(500)->get()->map(fn ($t) => $this->serializeTemuan($t, true)),
            'catatan' => 'Status temuan merupakan status administratif pada sistem.',
        ]);
    }

    public function ubahStatusTemuan(Request $request, ApotekTemuan $temuan)
    {
        $this->pastikanBolehUbah($request);
        $v = $request->validate([
            'status' => ['required', Rule::in(['belum', 'proses', 'selesai'])],
            'pic' => ['nullable', 'string', 'max:150'],
            'target' => ['nullable', 'date'],
        ]);
        $temuan->update($v);

        return response()->json(['data' => $this->serializeTemuan($temuan->fresh()), 'message' => 'Status temuan diperbarui.']);
    }

    public function simpanTindakLanjut(Request $request, ApotekTemuan $temuan)
    {
        $this->pastikanBolehUbah($request);
        $v = $request->validate([
            'tanggal' => ['required', 'date'],
            'uraian' => ['required', 'string', 'max:2000'],
            'bukti' => ['nullable', 'string', 'max:255'],
            'tahap' => ['nullable', Rule::in(['tindakan', 'bukti', 'verifikasi', 'selesai'])],
            'pic' => ['nullable', 'string', 'max:150'],
        ]);

        $tl = ApotekTindakLanjut::create([
            'temuan_id' => $temuan->id,
            'tanggal' => $v['tanggal'],
            'uraian' => $v['uraian'],
            'bukti' => $v['bukti'] ?? null,
            'tahap' => $v['tahap'] ?? 'tindakan',
            'pic' => $v['pic'] ?? null,
            'status' => 'proses',
            'user_id' => $request->user()->id,
        ]);

        // Status temuan mengikuti tahap tindak lanjut terakhir, sebagai status
        // administratif — bukan pernyataan bahwa tindakan telah sah menurut regulator.
        if (($v['tahap'] ?? '') === 'selesai') {
            $temuan->update(['status' => 'selesai']);
            $tl->update(['status' => 'selesai']);
        } elseif ($temuan->status === 'belum') {
            $temuan->update(['status' => 'proses']);
        }

        return response()->json([
            'data' => $this->serializeTemuan($temuan->fresh()),
            'message' => 'Tindak lanjut tercatat. Status ini bersifat administratif pada sistem.',
        ], 201);
    }

    // ── Distribusi ───────────────────────────────────────────────────────

    /** Jaringan hubungan distribusi antar sarana. */
    public function distribusi(Request $request)
    {
        $q = ApotekDistribusi::with(['sumber:id,nama_apotek,latitude,longitude,kabupaten', 'penerima:id,nama_apotek,latitude,longitude,kabupaten'])
            ->orderByDesc('tanggal');

        if ($kab = $request->query('kabupaten')) {
            $q->where(fn ($w) => $w->whereHas('sumber', fn ($s) => $s->where('kabupaten', $kab))
                ->orWhereHas('penerima', fn ($s) => $s->where('kabupaten', $kab)));
        }

        $rows = $q->limit(500)->get();

        // Simpul & garis untuk visualisasi jaringan.
        $simpul = [];
        $garis = [];
        foreach ($rows as $r) {
            foreach ([['sumber', $r->sumber, $r->sumber_nama], ['penerima', $r->penerima, $r->penerima_nama]] as [$peran, $rel, $nama]) {
                $id = $rel?->id ? 'a'.$rel->id : 'x'.md5((string) $nama);
                $simpul[$id] ??= [
                    'id' => $id,
                    'apotek_id' => $rel?->id,
                    'nama' => $rel?->nama_apotek ?? ($nama ?: 'Sarana tidak dikenal'),
                    'kabupaten' => $rel?->kabupaten,
                    'latitude' => $rel?->latitude,
                    'longitude' => $rel?->longitude,
                    'terdata' => (bool) $rel?->id,
                    'peran' => $peran,
                ];
            }
            $garis[] = [
                'id' => $r->id,
                'dari' => $r->sumber?->id ? 'a'.$r->sumber->id : 'x'.md5((string) $r->sumber_nama),
                'ke' => $r->penerima?->id ? 'a'.$r->penerima->id : 'x'.md5((string) $r->penerima_nama),
                'tanggal' => $r->tanggal?->toDateString(),
                'produk' => $r->produk,
                'kategori' => $r->kategori,
                'jumlah' => $r->jumlah,
                'satuan' => $r->satuan,
                'referensi' => $r->referensi,
                'status' => $r->status,
                'lengkap' => filled($r->produk) && $r->tanggal !== null,
            ];
        }

        return response()->json([
            'simpul' => array_values($simpul),
            'garis' => $garis,
            'catatan' => 'Hubungan distribusi hanya ditampilkan bila datanya tercatat. Sistem tidak menyimpulkan hubungan berdasarkan kedekatan lokasi.',
        ]);
    }

    public function simpanDistribusi(Request $request)
    {
        $this->pastikanBolehUbah($request);
        $v = $request->validate([
            'sumber_id' => ['nullable', 'integer', Rule::exists('sig_apotek', 'id')],
            'penerima_id' => ['nullable', 'integer', Rule::exists('sig_apotek', 'id')],
            'sumber_nama' => ['nullable', 'string', 'max:180'],
            'penerima_nama' => ['nullable', 'string', 'max:180'],
            'tanggal' => ['nullable', 'date'],
            'produk' => ['nullable', 'string', 'max:180'],
            'kategori' => ['nullable', 'string', 'max:80'],
            'jumlah' => ['nullable', 'numeric', 'min:0'],
            'satuan' => ['nullable', 'string', 'max:30'],
            'referensi' => ['nullable', 'string', 'max:120'],
        ]);

        abort_if(blank($v['sumber_id'] ?? null) && blank($v['sumber_nama'] ?? null), 422, 'Sumber distribusi wajib diisi.');
        abort_if(blank($v['penerima_id'] ?? null) && blank($v['penerima_nama'] ?? null), 422, 'Penerima distribusi wajib diisi.');

        $d = ApotekDistribusi::create($v + ['status' => 'tercatat']);

        return response()->json(['data' => ['id' => $d->id], 'message' => 'Data distribusi tercatat.'], 201);
    }

    // ── Impor & ekspor ───────────────────────────────────────────────────

    public function template()
    {
        return response($this->berkas->template(), 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="Template-Data-Apotek.xlsx"',
        ]);
    }

    /** Tahap 1: pratinjau & validasi tanpa menyimpan. */
    public function pratinjauImpor(Request $request)
    {
        $this->pastikanBolehUbah($request);
        $request->validate(['file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:10240']]);

        try {
            $hasil = $this->berkas->pratinjau($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Sebagian data tidak dapat diproses. Periksa format dan kolom.'], 422);
        }

        return response()->json([
            ...$hasil,
            'message' => "{$hasil['valid']} baris siap diimpor, {$hasil['galat']} baris perlu diperbaiki.",
        ]);
    }

    /** Tahap 2: simpan setelah dikonfirmasi pengguna. */
    public function simpanImpor(Request $request)
    {
        $this->pastikanBolehUbah($request);
        $v = $request->validate([
            'baris' => ['required', 'array', 'min:1'],
            'baris.*.data' => ['required', 'array'],
        ]);

        $hasil = $this->berkas->simpan($v['baris'], $request->user()->id);
        AuditLog::catat($request->user()->id, 'sig_apotek_impor', 'pemeriksaan', "Impor sarana: {$hasil['disimpan']} tersimpan.");

        return response()->json([
            ...$hasil,
            'message' => "{$hasil['disimpan']} data tersimpan, {$hasil['dilewati']} dilewati.",
        ]);
    }

    public function ekspor(Request $request)
    {
        $format = $request->query('format') === 'csv' ? 'csv' : 'xlsx';
        $hasil = $this->berkas->ekspor($this->saring($request), $format);
        $nama = 'Data-Apotek'.($request->query('kabupaten') ? '-'.$request->query('kabupaten') : '');

        return response($hasil['isi'], 200, [
            'Content-Type' => $hasil['mime'],
            'Content-Disposition' => 'attachment; filename="'.$nama.'.'.$hasil['ext'].'"',
        ]);
    }

    // ── Pembantu ─────────────────────────────────────────────────────────

    /** Terapkan seluruh saringan dari kueri permintaan. */
    private function saring(Request $r): Builder
    {
        $q = SigApotek::query();

        foreach (['kabupaten', 'kecamatan', 'desa', 'jenis_sarana'] as $medan) {
            if ($nilai = $r->query($medan)) {
                $q->where($medan, $nilai);
            }
        }
        if ($s = $r->query('status_sarana')) {
            $q->where('status_sarana', $s);
        }

        // Status monitoring: sudah / belum / perlu (lebih dari 12 bulan).
        match ($r->query('monitoring')) {
            'sudah' => $q->whereNotNull('tanggal_pemeriksaan_terakhir'),
            'belum' => $q->whereNull('tanggal_pemeriksaan_terakhir'),
            'perlu' => $q->where(fn ($w) => $w->whereNull('tanggal_pemeriksaan_terakhir')
                ->orWhere('tanggal_pemeriksaan_terakhir', '<', now()->subMonths(12)->toDateString())),
            default => null,
        };

        if ($dari = $r->query('tanggal_dari')) {
            $q->whereDate('tanggal_pemeriksaan_terakhir', '>=', $dari);
        }
        if ($sampai = $r->query('tanggal_sampai')) {
            $q->whereDate('tanggal_pemeriksaan_terakhir', '<=', $sampai);
        }

        // Saringan berbasis temuan & tindak lanjut.
        match ($r->query('temuan')) {
            'ada' => $q->whereHas('temuan'),
            'aktif' => $q->whereHas('temuan', fn ($w) => $w->whereIn('status', ['belum', 'proses'])),
            'tidak_ada' => $q->whereDoesntHave('temuan'),
            default => null,
        };
        if ($r->query('tindak_lanjut') === 'belum_selesai') {
            $q->whereHas('temuan', fn ($w) => $w->whereIn('status', ['belum', 'proses']));
        }
        if ($r->boolean('tanpa_koordinat')) {
            $q->where(fn ($w) => $w->whereNull('latitude')->orWhereNull('longitude'));
        }

        if ($cari = trim((string) $r->query('q', ''))) {
            $q->where(function ($w) use ($cari) {
                foreach (['nama_apotek', 'alamat', 'nib', 'nomor_identitas', 'nomor_izin', 'kecamatan'] as $m) {
                    $w->orWhere($m, 'like', "%{$cari}%");
                }
            });
        }

        return $q;
    }

    /** @return array<string,mixed> */
    private function aturan(?int $abaikanId = null): array
    {
        return [
            'nama_apotek' => ['required', 'string', 'max:150'],
            'alamat' => ['required', 'string', 'max:500'],
            'kabupaten' => ['nullable', 'string', 'max:60'],
            'kecamatan' => ['nullable', 'string', 'max:80'],
            'desa' => ['nullable', 'string', 'max:80'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'nib' => ['nullable', 'string', 'max:60'],
            'nomor_identitas' => ['nullable', 'string', 'max:80'],
            'pemilik' => ['nullable', 'string', 'max:150'],
            'penanggung_jawab' => ['nullable', 'string', 'max:150'],
            'telepon' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:120', new EmailAman],
            'jenis_sarana' => ['nullable', 'string', 'max:40'],
            'status_sarana' => ['nullable', Rule::in(SigApotek::STATUS_SARANA)],
            'keterangan' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * Peran pengguna pada modul ini.
     * TODO: bila kelak ada peran khusus SIG, petakan di sini.
     */
    private function peran(Request $r): string
    {
        $u = $r->user();
        if ($u->hasAnyRole(['superadmin', 'kepala_balai'])) {
            return 'admin';
        }
        if ($u->hasAnyRole(['kepala_subag_tu', 'pegawai_asn_pppk'])) {
            return 'operator';
        }

        return 'viewer';
    }

    private function pastikanBolehUbah(Request $r): void
    {
        abort_if($this->peran($r) === 'viewer', 403, 'Peran Anda hanya dapat melihat data.');
    }

    private function catatAudit(Request $r, SigApotek $a, string $aksi, ?array $sebelum, ?array $sesudah): void
    {
        ApotekAudit::create([
            'apotek_id' => $a->id,
            'user_id' => $r->user()->id,
            'aksi' => $aksi,
            'sebelum' => $sebelum,
            'sesudah' => $sesudah,
        ]);
    }

    /** Hubungan distribusi milik satu sarana. */
    private function distribusiSarana(SigApotek $a): array
    {
        $map = fn ($d, string $arah) => [
            'id' => $d->id,
            'arah' => $arah,
            'lawan' => $arah === 'keluar'
                ? ($d->penerima?->nama_apotek ?? $d->penerima_nama)
                : ($d->sumber?->nama_apotek ?? $d->sumber_nama),
            'tanggal' => $d->tanggal?->toDateString(),
            'produk' => $d->produk,
            'kategori' => $d->kategori,
            'jumlah' => $d->jumlah,
            'satuan' => $d->satuan,
            'referensi' => $d->referensi,
            'status' => $d->status,
        ];

        return [
            ...$a->distribusiKeluar->map(fn ($d) => $map($d, 'keluar'))->all(),
            ...$a->distribusiMasuk->map(fn ($d) => $map($d, 'masuk'))->all(),
        ];
    }

    private function serializeTemuan(ApotekTemuan $t, bool $sertakanApotek = false): array
    {
        $data = [
            'id' => $t->id,
            'pemeriksaan_id' => $t->pemeriksaan_id,
            'apotek_id' => $t->apotek_id,
            'tanggal' => $t->tanggal?->toDateString(),
            'kategori' => $t->kategori,
            'deskripsi' => $t->deskripsi,
            'status' => $t->status,
            'target' => $t->target?->toDateString(),
            'lewat_target' => $t->target && $t->target->isPast() && $t->status !== 'selesai',
            'pic' => $t->pic,
            'tindak_lanjut' => $t->relationLoaded('tindakLanjut')
                ? $t->tindakLanjut->map(fn ($x) => [
                    'id' => $x->id,
                    'tanggal' => $x->tanggal?->toDateString(),
                    'uraian' => $x->uraian,
                    'bukti' => $x->bukti,
                    'tahap' => $x->tahap,
                    'status' => $x->status,
                    'pic' => $x->pic,
                ])->all()
                : [],
        ];

        if ($sertakanApotek) {
            $data['apotek'] = [
                'id' => $t->apotek?->id,
                'nama_apotek' => $t->apotek?->nama_apotek,
                'kabupaten' => $t->apotek?->kabupaten,
                'kecamatan' => $t->apotek?->kecamatan,
            ];
        }

        return $data;
    }

    private function serialize(SigApotek $a, array $agregat = []): array
    {
        $temuanAktif = $agregat['temuan_aktif'] ?? 0;
        $sudahDiperiksa = $a->tanggal_pemeriksaan_terakhir !== null;

        // Status peta: menggambarkan keadaan DATA, bukan penilaian sarana.
        $statusPeta = match (true) {
            ! $a->punyaKoordinat() || $a->status_sarana === 'belum_diverifikasi' => 'belum_lengkap',
            $temuanAktif > 0 => 'ada_temuan',
            ! $sudahDiperiksa || ($a->tanggal_pemeriksaan_terakhir?->lt(now()->subMonths(12)) ?? false) => 'perlu_monitoring',
            default => 'baik',
        };

        return [
            'id' => $a->id,
            'nama_apotek' => $a->nama_apotek,
            'alamat' => $a->alamat,
            'kabupaten' => $a->kabupaten,
            'kecamatan' => $a->kecamatan,
            'desa' => $a->desa,
            'latitude' => $a->latitude,
            'longitude' => $a->longitude,
            'punya_koordinat' => $a->punyaKoordinat(),
            'nib' => $a->nib,
            'nomor_identitas' => $a->nomor_identitas ?? $a->nomor_izin,
            'pemilik' => $a->pemilik,
            'penanggung_jawab' => $a->penanggung_jawab,
            'telepon' => $a->telepon,
            'email' => $a->email,
            'jenis_sarana' => $a->jenis_sarana,
            'status_sarana' => $a->status_sarana,
            'status_peta' => $statusPeta,
            'keterangan' => $a->keterangan,
            'tanggal_pemeriksaan_terakhir' => $a->tanggal_pemeriksaan_terakhir?->toDateString(),
            'hasil_pemeriksaan_terakhir' => $a->hasil_pemeriksaan_terakhir,
            'temuan_total' => $agregat['temuan_total'] ?? 0,
            'temuan_aktif' => $temuanAktif,
            'tindak_lanjut_belum' => $agregat['tindak_lanjut_belum'] ?? 0,
            'is_demo' => (bool) $a->is_demo,
            'tanggal_input' => $a->created_at?->toIso8601String(),
            'tanggal_update' => $a->updated_at?->toIso8601String(),
        ];
    }
}
