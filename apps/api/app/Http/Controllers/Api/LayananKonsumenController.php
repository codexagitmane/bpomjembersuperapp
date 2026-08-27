<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\LayananKonsumen;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Sistem Informasi Record Data Pelayanan Informasi, Konsultasi & Pengaduan
 * (Fungsi Infokom). Semua pegawai dapat mengisi formulir bertahap. Data
 * tersimpan seperti tabel spreadsheet, dapat difilter (tanggal, petugas,
 * tempat layanan) & diekspor ke Word / PDF.
 */
class LayananKonsumenController extends Controller
{
    private const UNIT = ['balai_pom_jember', 'mpp_banyuwangi'];

    private const UNIT_LABEL = [
        'balai_pom_jember' => 'Balai POM di Jember',
        'mpp_banyuwangi' => 'MPP Banyuwangi',
    ];

    private const JENIS_LAYANAN = ['permintaan_informasi', 'pengaduan'];

    /** Daftar record + filter (tanggal, petugas, unit) + statistik ringkas. */
    public function index(Request $request)
    {
        $q = LayananKonsumen::with('user:id,name')->orderByDesc('tanggal_layanan')->orderByDesc('id');

        if ($from = $request->query('dari')) {
            $q->whereDate('tanggal_layanan', '>=', $from);
        }
        if ($to = $request->query('sampai')) {
            $q->whereDate('tanggal_layanan', '<=', $to);
        }
        if ($unit = $request->query('unit')) {
            $q->where('unit_pelayanan', $unit);
        }
        if ($petugas = trim((string) $request->query('petugas', ''))) {
            $q->where(function ($w) use ($petugas) {
                $w->where('petugas_1', 'like', "%{$petugas}%")
                    ->orWhere('petugas_2', 'like', "%{$petugas}%")
                    ->orWhere('petugas_3', 'like', "%{$petugas}%");
            });
        }
        if ($cari = trim((string) $request->query('q', ''))) {
            $q->where(function ($w) use ($cari) {
                $w->where('nama_konsumen', 'like', "%{$cari}%")->orWhere('nomor', 'like', "%{$cari}%");
            });
        }

        $all = $q->get();

        return response()->json([
            'data' => $all->map(fn ($r) => $this->serialize($r)),
            'ringkasan' => [
                'total' => $all->count(),
                'permintaan_informasi' => $all->where('jenis_layanan', 'permintaan_informasi')->count(),
                'pengaduan' => $all->where('jenis_layanan', 'pengaduan')->count(),
                'perlu_rujuk' => $all->where('perlu_rujuk', true)->count(),
            ],
            'opsi' => $this->opsi(),
        ]);
    }

    /** Opsi dropdown untuk formulir (nama petugas dari pegawai, dsb). */
    public function opsi()
    {
        $petugas = \App\Models\User::where('account_type', 'internal')
            ->where('is_active', true)->orderBy('name')->pluck('name');

        return [
            'unit' => collect(self::UNIT)->map(fn ($u) => ['value' => $u, 'label' => self::UNIT_LABEL[$u]]),
            'petugas' => $petugas,
            'pekerjaan' => ['Nakes Lain', 'Dokter', 'Apoteker', 'Perawat', 'Bidan', 'ASN/PNS', 'TNI/Polri',
                'Wiraswasta', 'Karyawan Swasta', 'Pelajar/Mahasiswa', 'Ibu Rumah Tangga', 'Pelaku Usaha', 'Lainnya'],
            'jenis_komoditi' => ['Obat', 'Obat Tradisional', 'Suplemen Kesehatan', 'Kosmetik', 'Pangan Olahan',
                'Napza', 'Bahan Berbahaya', 'Lainnya'],
            'layanan_melalui' => ['Datang Langsung', 'Telepon', 'Surat', 'Email', 'WhatsApp', 'Media Sosial',
                'Website', 'MPP', 'Lainnya'],
            'klasifikasi' => [
                'LEGALITAS' => ['Periklanan', 'Public Warning', 'Produk Terdaftar', 'Sertifikasi', 'Inspeksi', 'Proses pendaftaran'],
                'KEAMANAN & MUTU' => ['Kandungan', 'Efek Samping', 'Kedaluwarsa', 'Kemasan Rusak', 'Cara Penggunaan'],
                'DISTRIBUSI' => ['Sarana Distribusi', 'Peredaran Ilegal', 'Harga'],
                'LAINNYA' => ['Umum', 'Saran/Masukan'],
            ],
        ];
    }

    public function store(Request $request)
    {
        $v = $request->validate([
            'unit_pelayanan' => ['required', Rule::in(self::UNIT)],
            'nama_konsumen' => ['required', 'string', 'max:190'],
            'tanggal_layanan' => ['required', 'date'],
            'jam_layanan' => ['nullable', 'string', 'max:8'],
            'jenis_layanan' => ['required', Rule::in(self::JENIS_LAYANAN)],
            'klasifikasi' => ['required', 'string', 'max:60'],
            'petugas_1' => ['required', 'string', 'max:120'],
            'petugas_2' => ['nullable', 'string', 'max:120'],
            'petugas_3' => ['nullable', 'string', 'max:120'],
            'perlu_rujuk' => ['required', 'boolean'],
            // Identitas konsumen (detail).
            'konsumen' => ['required', 'array'],
            'konsumen.jenis_kelamin' => ['required', 'string', 'max:20'],
            'konsumen.alamat' => ['required', 'string', 'max:500'],
            'konsumen.no_telp' => ['required', 'string', 'max:40'],
            'konsumen.pekerjaan' => ['required', 'string', 'max:80'],
            // Blok opsional (produk, layanan detail, tindak lanjut).
            'produk' => ['nullable', 'array'],
            'layanan' => ['required', 'array'],
            'layanan.inti_masalah' => ['required', 'string', 'max:2000'],
            'layanan.pertanyaan' => ['required', 'string', 'max:2000'],
            'layanan.jawaban' => ['required', 'string', 'max:2000'],
            'tindak_lanjut' => ['nullable', 'array'],
        ]);

        $u = $request->user();
        $nomor = $this->generateNomor();

        $record = LayananKonsumen::create([
            'nomor' => $nomor,
            'user_id' => $u->id,
            'unit_pelayanan' => $v['unit_pelayanan'],
            'nama_konsumen' => $v['nama_konsumen'],
            'tanggal_layanan' => $v['tanggal_layanan'],
            'jam_layanan' => $v['jam_layanan'] ?? null,
            'jenis_layanan' => $v['jenis_layanan'],
            'klasifikasi' => $v['klasifikasi'],
            'petugas_1' => $v['petugas_1'],
            'petugas_2' => $v['petugas_2'] ?? null,
            'petugas_3' => $v['petugas_3'] ?? null,
            'perlu_rujuk' => (bool) $v['perlu_rujuk'],
            'data' => [
                'konsumen' => $v['konsumen'],
                'produk' => $v['produk'] ?? [],
                'layanan' => $v['layanan'],
                'tindak_lanjut' => $v['tindak_lanjut'] ?? [],
            ],
        ]);
        AuditLog::catat($u->id, 'layanan_konsumen.simpan', 'infokom', "Record layanan konsumen {$nomor} disimpan.");

        return response()->json(['data' => $this->serialize($record->load('user:id,name')), 'message' => 'Data layanan tersimpan.'], 201);
    }

    public function show(LayananKonsumen $layananKonsumen)
    {
        return response()->json(['data' => $this->serialize($layananKonsumen->load('user:id,name'), true)]);
    }

    public function word(LayananKonsumen $layananKonsumen)
    {
        $html = view('export.layanan-konsumen', [
            'r' => $this->serialize($layananKonsumen->load('user:id,name'), true),
            'logo' => $this->logoDataUri(),
        ])->render();
        $file = 'Layanan-'.str_replace('/', '-', $layananKonsumen->nomor).'.doc';

        return response($html, 200, [
            'Content-Type' => 'application/msword',
            'Content-Disposition' => 'attachment; filename="'.$file.'"',
        ]);
    }

    public function pdf(LayananKonsumen $layananKonsumen)
    {
        $pdf = Pdf::loadView('pdf.layanan-konsumen', [
            'r' => $this->serialize($layananKonsumen->load('user:id,name'), true),
            'logo' => $this->logoDataUri(),
        ]);

        return $pdf->download('Layanan-'.str_replace('/', '-', $layananKonsumen->nomor).'.pdf');
    }

    private function logoDataUri(): ?string
    {
        $path = resource_path('views/pdf/badanpom.png');

        return is_file($path) ? 'data:image/png;base64,'.base64_encode(file_get_contents($path)) : null;
    }

    /** Nomor: 001/LIK/VII/2026 — urut per bulan, format romawi bulan. */
    private function generateNomor(): string
    {
        $now = now();
        $urut = LayananKonsumen::whereYear('created_at', $now->year)
            ->whereMonth('created_at', $now->month)->count() + 1;
        $romawi = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][$now->month];

        return sprintf('%03d/LIK/%s/%d', $urut, $romawi, $now->year);
    }

    private function serialize(LayananKonsumen $r, bool $full = false): array
    {
        $base = [
            'id' => $r->id,
            'nomor' => $r->nomor,
            'petugas_input' => $r->user?->name,
            'unit_pelayanan' => $r->unit_pelayanan,
            'unit_pelayanan_label' => self::UNIT_LABEL[$r->unit_pelayanan] ?? $r->unit_pelayanan,
            'nama_konsumen' => $r->nama_konsumen,
            'tanggal_layanan' => $r->tanggal_layanan?->toDateString(),
            'tanggal_layanan_label' => $r->tanggal_layanan?->locale('id')->translatedFormat('d F Y'),
            'jam_layanan' => $r->jam_layanan ? Str::of($r->jam_layanan)->substr(0, 5) : null,
            'jenis_layanan' => $r->jenis_layanan,
            'jenis_layanan_label' => $r->jenis_layanan === 'pengaduan' ? 'Pengaduan' : 'Permintaan Informasi',
            'klasifikasi' => $r->klasifikasi,
            'petugas' => array_values(array_filter([$r->petugas_1, $r->petugas_2, $r->petugas_3])),
            'perlu_rujuk' => $r->perlu_rujuk,
            'created_at' => $r->created_at?->toIso8601String(),
        ];
        if ($full) {
            $base['detail'] = $r->data;
        }

        return $base;
    }
}
