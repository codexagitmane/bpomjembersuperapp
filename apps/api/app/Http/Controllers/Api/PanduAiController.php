<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PanduProfilUsaha;
use App\Models\PanduRiwayat;
use App\Services\Pandu\ImageEditService;
use App\Services\Pandu\KnowledgeService;
use App\Services\Pandu\LabelAnalysisService;
use App\Services\Pandu\PanduAiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * SI PANDU AI — Asisten Pintar Pelaku Usaha.
 *
 * Seluruh jawaban bersumber dari knowledge resmi (KnowledgeService). Bila
 * informasi tidak tersedia, dikembalikan kalimat baku "perlu diverifikasi"
 * alih-alih mengarang regulasi, persyaratan, biaya, atau kontak.
 */
class PanduAiController extends Controller
{
    public function __construct(
        private readonly KnowledgeService $knowledge,
        private readonly PanduAiService $ai,
        private readonly LabelAnalysisService $label,
        private readonly ImageEditService $editor,
    ) {}

    /** Data awal aplikasi: kontak, wilayah, topik populer, disclaimer. */
    public function bootstrap()
    {
        return response()->json(['data' => [
            'kontak' => $this->knowledge->kontak(),
            'wilayah_kerja' => $this->knowledge->wilayahKerja(),
            'sumber_resmi' => $this->knowledge->sumberResmi(),
            'topik_populer' => array_map(
                fn ($t) => ['id' => $t['id'], 'nama' => $t['nama'], 'kategori' => $t['kategori'] ?? null],
                array_slice($this->knowledge->topik(), 0, 8)
            ),
            'elemen_label' => $this->knowledge->elemenLabel(),
            'disclaimer' => PanduAiService::DISCLAIMER,
        ]]);
    }

    /** Konsultasi: tanya jawab berbasis knowledge. */
    public function chat(Request $request)
    {
        $v = $request->validate([
            'pertanyaan' => ['required', 'string', 'min:3', 'max:1000'],
            'simpan' => ['nullable', 'boolean'],
        ]);

        $hasil = $this->ai->askAssistant($v['pertanyaan']);

        if ($request->boolean('simpan', true) && ! $hasil['di_luar_lingkup']) {
            $this->simpan($request, 'konsultasi', mb_substr($v['pertanyaan'], 0, 200),
                ['pertanyaan' => $v['pertanyaan']], $hasil);
        }

        return response()->json(['data' => $hasil]);
    }

    /** Cek Produk: analisis awal kesiapan (self-assessment). */
    public function cekProduk(Request $request)
    {
        $v = $request->validate([
            'nama_produk' => ['required', 'string', 'max:150'],
            'jenis_produk' => ['nullable', 'string', 'max:100'],
            'kategori' => ['nullable', 'string', 'max:100'],
            'komposisi' => ['nullable', 'string', 'max:2000'],
            'cara_produksi' => ['nullable', 'string', 'max:1000'],
            'lokasi_produksi' => ['nullable', 'string', 'max:200'],
            'produksi_sendiri' => ['nullable', Rule::in(['sendiri', 'maklon', 'tidak_tahu'])],
            'nib' => ['nullable', 'string', 'max:60'],
            'punya_izin' => ['nullable', Rule::in(['sudah', 'belum', 'tidak_tahu'])],
            'sudah_beredar' => ['nullable', Rule::in(['ya', 'belum'])],
        ]);

        $hasil = $this->ai->analyzeProduct($v);
        $this->simpan($request, 'cek_produk', $v['nama_produk'], $v, $hasil);

        return response()->json(['data' => $hasil]);
    }

    /** Cek Label: self-check kelengkapan + catatan desain terukur. */
    public function cekLabel(Request $request)
    {
        $v = $request->validate([
            'label' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'kategori' => ['nullable', 'string', 'max:100'],
            'nama_produk' => ['nullable', 'string', 'max:150'],
            'checklist' => ['nullable', 'array'],
            'checklist.*' => [Rule::in(['ada', 'tidak_yakin', 'belum'])],
        ]);

        $path = $request->file('label')->store('pandu/label', 'public');

        $hasil = $this->label->analyzeLabel(
            $path,
            (array) ($v['checklist'] ?? []),
            ['kategori' => $v['kategori'] ?? '', 'nama_produk' => $v['nama_produk'] ?? '']
        );
        $hasil['label_url'] = Storage::disk('public')->url($path);

        $this->simpan($request, 'cek_label', $v['nama_produk'] ?? 'Review label',
            ['kategori' => $v['kategori'] ?? null, 'checklist' => $v['checklist'] ?? []], $hasil, $path);

        return response()->json(['data' => $hasil]);
    }

    /** Edit Label: rencana perubahan visual (image editing belum aktif). */
    public function editLabel(Request $request)
    {
        $v = $request->validate([
            'label' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'instruksi' => ['required', 'string', 'min:5', 'max:1000'],
            'aset_resmi' => ['nullable', 'boolean'],
        ]);

        $path = $request->file('label')->store('pandu/label', 'public');
        $hasil = $this->editor->editLabel($path, $v['instruksi'], $request->boolean('aset_resmi'));
        $hasil['sumber_url'] = Storage::disk('public')->url($path);

        $this->simpan($request, 'edit_label', mb_substr($v['instruksi'], 0, 200),
            ['instruksi' => $v['instruksi']], $hasil, $path);

        return response()->json(['data' => $hasil]);
    }

    /** Bantuan CAPA: susun draft dari temuan & kondisi aktual. */
    public function capa(Request $request)
    {
        $v = $request->validate([
            'temuan' => ['required', 'string', 'min:5', 'max:2000'],
            'kondisi_aktual' => ['nullable', 'string', 'max:2000'],
            'bukti' => ['nullable', 'string', 'max:2000'],
            'pic' => ['nullable', 'string', 'max:150'],
            'target' => ['nullable', 'string', 'max:150'],
        ]);

        $hasil = $this->ai->generateCAPA($v);
        $this->simpan($request, 'capa', mb_substr($v['temuan'], 0, 200), $v, $hasil);

        return response()->json(['data' => $hasil]);
    }

    /** Daftar regulasi per kategori (tanpa mengarang nomor peraturan). */
    public function regulasi(Request $request)
    {
        $kategori = $request->query('kategori');
        $topik = collect($this->knowledge->topik())->keyBy('id');

        $data = collect($this->knowledge->regulasiKategori())
            ->when($kategori, fn ($c) => $c->where('id', $kategori))
            ->map(fn ($k) => [
                'id' => $k['id'],
                'nama' => $k['nama'],
                'deskripsi' => $k['deskripsi'] ?? '',
                'topik' => collect($k['topik'] ?? [])
                    ->map(fn ($id) => $topik->get($id))
                    ->filter()
                    ->values()
                    ->all(),
            ])->values();

        return response()->json([
            'data' => $data,
            'regulasi' => $this->knowledge->all()['regulasi'] ?? [],
            'catatan' => 'Verifikasi regulasi terbaru melalui JDIH BPOM.',
            'jdih' => $this->knowledge->sumberResmi()['jdih'] ?? 'https://jdih.pom.go.id/',
        ]);
    }

    /** FAQ dengan pencarian & filter kategori. */
    public function faq(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $kategori = $request->query('kategori');

        $data = collect($this->knowledge->faq())
            ->when($kategori, fn ($c) => $c->where('kategori', $kategori))
            ->when($q !== '', function ($c) use ($q) {
                $t = mb_strtolower($q);

                return $c->filter(function ($e) use ($t) {
                    $gabung = mb_strtolower(($e['pertanyaan'] ?? '').' '.($e['jawaban'] ?? '').' '.implode(' ', (array) ($e['kata_kunci'] ?? [])));

                    return str_contains($gabung, $t);
                });
            })
            ->values();

        return response()->json([
            'data' => $data,
            'kategori' => collect($this->knowledge->faq())->pluck('kategori')->unique()->values(),
        ]);
    }

    /** Kontak & wilayah kerja Balai POM di Jember. */
    public function kontak()
    {
        return response()->json(['data' => [
            'kontak' => $this->knowledge->kontak(),
            'wilayah_kerja' => $this->knowledge->wilayahKerja(),
            'sumber_resmi' => $this->knowledge->sumberResmi(),
        ]]);
    }

    /** Riwayat interaksi milik pengguna. */
    public function riwayat(Request $request)
    {
        $q = PanduRiwayat::where('user_id', $request->user()->id)->latest();
        if ($jenis = $request->query('jenis')) {
            $q->where('jenis', $jenis);
        }

        return response()->json(['data' => $q->limit(100)->get()->map(fn ($r) => [
            'id' => $r->id,
            'jenis' => $r->jenis,
            'judul' => $r->judul,
            'masukan' => $r->masukan,
            'hasil' => $r->hasil,
            'berkas_url' => $r->berkas_path ? Storage::disk('public')->url($r->berkas_path) : null,
            'created_at' => $r->created_at,
        ])]);
    }

    /** Hapus satu entri riwayat atau seluruhnya. */
    public function hapusRiwayat(Request $request, ?PanduRiwayat $riwayat = null)
    {
        $u = $request->user();
        if ($riwayat && $riwayat->exists) {
            abort_unless($riwayat->user_id === $u->id, 403);
            $this->hapusBerkas($riwayat);
            $riwayat->delete();

            return response()->json(['message' => 'Riwayat dihapus.']);
        }

        PanduRiwayat::where('user_id', $u->id)->get()->each(function ($r) {
            $this->hapusBerkas($r);
            $r->delete();
        });

        return response()->json(['message' => 'Seluruh riwayat dihapus.']);
    }

    /** Profil usaha milik pengguna. */
    public function profil(Request $request)
    {
        $p = PanduProfilUsaha::firstWhere('user_id', $request->user()->id);

        return response()->json(['data' => $p]);
    }

    public function simpanProfil(Request $request)
    {
        $v = $request->validate([
            'nama_usaha' => ['nullable', 'string', 'max:150'],
            'nama_pemilik' => ['nullable', 'string', 'max:150'],
            'jenis_usaha' => ['nullable', 'string', 'max:100'],
            'lokasi' => ['nullable', 'string', 'max:200'],
            'kabupaten' => ['nullable', 'string', 'max:100'],
            'komoditas' => ['nullable', 'string', 'max:150'],
            'nib' => ['nullable', 'string', 'max:60'],
            'status_sertifikasi' => ['nullable', 'string', 'max:150'],
            'produk' => ['nullable', 'string', 'max:2000'],
        ]);

        $p = PanduProfilUsaha::updateOrCreate(['user_id' => $request->user()->id], $v);

        return response()->json(['data' => $p, 'message' => 'Profil usaha disimpan.']);
    }

    private function simpan(Request $request, string $jenis, string $judul, array $masukan, array $hasil, ?string $berkas = null): void
    {
        PanduRiwayat::create([
            'user_id' => $request->user()->id,
            'jenis' => $jenis,
            'judul' => $judul !== '' ? $judul : ucfirst($jenis),
            'masukan' => $masukan,
            'hasil' => $hasil,
            'berkas_path' => $berkas,
        ]);
    }

    private function hapusBerkas(PanduRiwayat $r): void
    {
        if ($r->berkas_path && Storage::disk('public')->exists($r->berkas_path)) {
            Storage::disk('public')->delete($r->berkas_path);
        }
    }
}
