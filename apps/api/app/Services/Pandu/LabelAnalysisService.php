<?php

namespace App\Services\Pandu;

/**
 * Review label — dipisah tegas menjadi dua sudut pandang:
 *   1) REGULASI  : kelengkapan informasi pada label.
 *   2) DESAIN    : keterbacaan dan kerapian tata letak.
 *
 * Catatan penting soal kejujuran hasil:
 * Tanpa layanan visi komputer, sistem TIDAK dapat "melihat" isi tulisan pada
 * gambar. Karena itu status tiap elemen regulasi berasal dari pernyataan
 * pengguna (self-check), sedangkan catatan desain dihitung dari properti
 * gambar yang benar-benar terukur (dimensi, rasio, resolusi, ukuran berkas).
 * Sistem tidak pernah mengaku telah memverifikasi isi label.
 *
 * TODO: HUBUNGKAN KE GEMINI VISION API.
 *  - Kirim gambar + daftar elemen dari KnowledgeService::elemenLabel().
 *  - Minta model MENGUTIP teks yang terbaca untuk tiap elemen; bila tidak
 *    terbaca, tandai 'tidak_terbaca' — jangan menebak.
 *  - Hasil model menggantikan status self-check, format keluaran tetap sama.
 */
class LabelAnalysisService
{
    /** Elemen yang dianggap berlaku umum untuk hampir semua kategori. */
    private const BOBOT_INTI = ['nama_produk', 'komposisi', 'netto', 'produsen', 'alamat', 'kedaluwarsa'];

    public function __construct(private readonly KnowledgeService $knowledge) {}

    /**
     * @param  string|null  $path       lokasi berkas label pada storage
     * @param  array<string,string>  $checklist  id elemen => ada|tidak_yakin|belum
     * @param  array<string,mixed>  $produk     info produk (kategori dll)
     */
    public function analyzeLabel(?string $path, array $checklist, array $produk = []): array
    {
        $kategori = strtolower((string) ($produk['kategori'] ?? ''));
        $elemen = $this->knowledge->elemenLabel();

        $terlihat = [];
        $perluVerifikasi = [];
        $perluDiperbaiki = [];

        $totalBobot = 0;
        $skor = 0;

        foreach ($elemen as $e) {
            $id = (string) ($e['id'] ?? '');
            if ($id === '') {
                continue;
            }
            // Elemen khusus pangan hanya dinilai bila kategori produk pangan.
            if (($e['kategori'] ?? 'umum') === 'pangan' && ! str_contains($kategori, 'pangan')) {
                continue;
            }
            // Bobot memakai skala genap agar nilai separuh tetap bilangan bulat.
            $bobot = in_array($id, self::BOBOT_INTI, true) ? 4 : 2;
            $totalBobot += $bobot;

            $status = $checklist[$id] ?? 'tidak_yakin';
            $item = [
                'id' => $id,
                'nama' => $e['nama'] ?? $id,
                'status' => $status,
            ];

            if ($status === 'ada') {
                $skor += $bobot;
                $item['penjelasan'] = 'Anda menyatakan informasi ini sudah tercantum pada label.';
                $item['saran'] = 'Pastikan penulisannya jelas terbaca dan sesuai dokumen resmi produk Anda.';
                $terlihat[] = $item;
            } elseif ($status === 'belum') {
                $item['penjelasan'] = 'Informasi ini dinyatakan belum tercantum pada desain yang diunggah.';
                $item['saran'] = 'Tambahkan informasi ini bila memang dipersyaratkan untuk kategori produk Anda.';
                $perluDiperbaiki[] = $item;
            } else {
                $skor += intdiv($bobot, 2);
                $item['penjelasan'] = 'Status informasi ini belum dipastikan.';
                $item['saran'] = 'Periksa kembali desain label Anda, lalu konfirmasi ketentuan yang berlaku untuk kategori produk Anda.';
                $perluVerifikasi[] = $item;
            }
        }

        $nilai = $totalBobot > 0 ? (int) round($skor / $totalBobot * 100) : 0;

        return [
            'skor' => $nilai,
            'skor_label' => $this->labelSkor($nilai),
            'overall_status' => $perluDiperbaiki === [] ? ($perluVerifikasi === [] ? 'lengkap' : 'perlu_verifikasi') : 'perlu_perbaikan',
            'visible_elements' => $terlihat,
            'verification_items' => $perluVerifikasi,
            'missing_elements' => $perluDiperbaiki,
            'regulatory_notes' => $this->catatanRegulasi($kategori, $perluDiperbaiki),
            'design_notes' => $this->catatanDesain($path),
            'catatan' => 'Hasil ini merupakan self-check edukatif berdasarkan pernyataan Anda dan bukan persetujuan resmi BPOM. Kelengkapan yang dipersyaratkan berbeda menurut kategori produk.',
        ];
    }

    private function labelSkor(int $n): string
    {
        return match (true) {
            $n >= 90 => 'Kelengkapan terlihat baik',
            $n >= 70 => 'Perlu beberapa perbaikan',
            $n >= 50 => 'Perlu cukup banyak pelengkapan',
            default => 'Banyak informasi yang masih perlu dilengkapi',
        };
    }

    private function catatanRegulasi(string $kategori, array $kurang): array
    {
        $catatan = [];
        if ($kurang !== []) {
            $nama = implode(', ', array_map(fn ($i) => $i['nama'], $kurang));
            $catatan[] = "Informasi berikut dinyatakan belum tercantum: {$nama}.";
        }
        $catatan[] = 'Kelengkapan wajib pada label berbeda menurut kategori produk, sehingga perlu diverifikasi pada ketentuan yang berlaku.';
        if (str_contains($kategori, 'pangan')) {
            $catatan[] = 'Untuk pangan olahan, informasi nilai gizi dan keterangan tertentu dapat dipersyaratkan sesuai jenis produk.';
        }
        $catatan[] = 'Klaim pada label harus benar, tidak menyesatkan, dan didukung bukti sesuai ketentuan.';

        return $catatan;
    }

    /** Catatan desain dihitung dari properti gambar yang benar-benar terukur. */
    private function catatanDesain(?string $path): array
    {
        $catatan = [];
        $abs = $path ? storage_path('app/public/'.$path) : null;

        if (! $abs || ! is_file($abs)) {
            return ['Gambar label tidak dapat dibaca untuk analisis teknis.'];
        }
        $info = @getimagesize($abs);
        if (! $info) {
            return ['Gambar label tidak dapat dibaca untuk analisis teknis.'];
        }

        [$w, $h] = $info;
        $ukuran = @filesize($abs) ?: 0;
        $catatan[] = "Dimensi gambar terbaca {$w} × {$h} piksel (".number_format($ukuran / 1024, 0, ',', '.').' KB).';

        if ($w < 800 || $h < 800) {
            $catatan[] = 'Resolusi tergolong kecil. Teks berukuran kecil berisiko sulit terbaca saat dicetak — pertimbangkan mengunggah berkas resolusi lebih tinggi.';
        } else {
            $catatan[] = 'Resolusi cukup memadai untuk memeriksa keterbacaan teks pada desain.';
        }

        $rasio = $h > 0 ? $w / $h : 0;
        if ($rasio > 2.5 || ($rasio > 0 && $rasio < 0.4)) {
            $catatan[] = 'Rasio desain sangat memanjang. Pastikan area informasi wajib tetap memperoleh ruang yang cukup dan tidak terpotong saat diaplikasikan ke kemasan.';
        }

        $catatan[] = 'Periksa hierarki visual: nama produk sebaiknya menjadi elemen paling menonjol, diikuti informasi pendukung.';
        $catatan[] = 'Jaga jarak antar blok informasi (spacing) dan perataan (alignment) agar label terlihat rapi dan mudah dipindai mata.';
        $catatan[] = 'Pastikan kontras warna teks terhadap latar cukup tinggi agar informasi tetap terbaca.';
        $catatan[] = 'Catatan desain bersifat estetika dan keterbacaan — desain yang rapi tidak dengan sendirinya berarti label telah memenuhi ketentuan.';

        return $catatan;
    }
}
