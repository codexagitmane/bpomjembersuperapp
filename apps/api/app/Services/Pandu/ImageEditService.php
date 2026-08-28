<?php

namespace App\Services\Pandu;

use Illuminate\Support\Str;

/**
 * Abstraksi layanan edit desain label.
 *
 * Belum terhubung ke layanan image generation/editing, sehingga layanan ini
 * TIDAK menghasilkan gambar baru dan tidak berpura-pura telah mengeditnya.
 * Yang dihasilkan adalah rencana perubahan (design brief) yang terstruktur,
 * ditambah penjagaan agar informasi regulatori tidak diubah sembarangan.
 *
 * Sebagai gantinya layanan ini menyusun DENAH TATA LETAK: urutan blok
 * informasi beserta porsi ruang dan tingkat penekanannya. Denah itu digambar
 * ulang oleh antarmuka sebagai kerangka desain yang dapat langsung diserahkan
 * kepada desainer — bukan hasil suntingan atas karya pengguna, dan disebut
 * demikian secara terang-terangan.
 *
 * TODO: HUBUNGKAN KE LAYANAN IMAGE EDITING.
 *  - Gunakan gambar asli sebagai base image.
 *  - Pertahankan bentuk kemasan, brand, tipografi, dan seluruh informasi produk.
 *  - Terapkan hanya perubahan visual yang diminta, lalu kembalikan berkas hasil
 *    pada 'hasil_path' agar UI dapat menampilkan perbandingan Sebelum/Sesudah.
 */
class ImageEditService
{
    /** Kata yang menandakan permintaan menyentuh informasi regulatori. */
    private const KATA_REGULATORI = [
        'komposisi', 'netto', 'berat bersih', 'isi bersih', 'alamat', 'produsen',
        'nomor izin', 'izin edar', 'kode produksi', 'kedaluwarsa', 'expired',
        'klaim', 'halal', 'bpom', 'sertifikat', 'nilai gizi', 'tanggal',
    ];

    /** Kata yang menandakan permintaan menambah logo/tanda sertifikasi. */
    private const KATA_SERTIFIKASI = ['halal', 'bpom', 'sni', 'sertifikat', 'logo sertifikasi', 'iso'];

    /**
     * @param  string|null  $path         berkas label pada storage
     * @param  string  $instruksi         perintah edit dari pengguna
     * @param  bool  $adaAsetResmi        pengguna menyertakan aset/logo resmi miliknya
     */
    public function editLabel(?string $path, string $instruksi, bool $adaAsetResmi = false): array
    {
        $teks = Str::lower($instruksi);

        $peringatan = [];
        foreach (self::KATA_REGULATORI as $k) {
            if (str_contains($teks, $k)) {
                $peringatan[] = 'Perubahan ini menyangkut informasi produk. Pastikan data yang digunakan benar dan sesuai dokumen resmi Anda.';
                break;
            }
        }

        $ditolak = [];
        foreach (self::KATA_SERTIFIKASI as $k) {
            if (str_contains($teks, $k) && ! $adaAsetResmi) {
                $ditolak[] = 'Permintaan menambahkan logo/tanda sertifikasi tidak dapat dipenuhi tanpa aset resmi. Tolong unggah aset/logo resmi yang memang Anda miliki. Si Pandu AI tidak membuat logo sertifikasi atau nomor sertifikat.';
                break;
            }
        }

        // Terjemahkan instruksi menjadi rencana perubahan visual yang konkret.
        $peta = [
            'rapikan' => 'Rapikan perataan (alignment) dan konsistensi jarak antar blok informasi.',
            'layout' => 'Tata ulang layout agar alur baca mengikuti hierarki: nama produk, varian, informasi pendukung.',
            'spacing' => 'Seragamkan jarak antar elemen dan beri ruang kosong (white space) yang cukup.',
            'logo' => 'Tempatkan logo usaha pada posisi yang diminta dengan ukuran proporsional terhadap nama produk.',
            'perbesar' => 'Perbesar elemen yang diminta tanpa menutupi informasi lain.',
            'perjelas' => 'Tingkatkan keterbacaan teks melalui ukuran, ketebalan, dan kontras terhadap latar.',
            'warna' => 'Sesuaikan palet warna dengan menjaga kontras teks agar tetap terbaca.',
            'modern' => 'Terapkan gaya modern: tipografi bersih, ruang kosong lega, elemen dekoratif dikurangi.',
            'minimalis' => 'Sederhanakan elemen dekoratif dan fokuskan pada informasi utama.',
            'mockup' => 'Siapkan tampilan mockup kemasan untuk melihat hasil desain pada bentuk produk.',
        ];
        $rencana = [];
        foreach ($peta as $kunci => $langkah) {
            if (str_contains($teks, $kunci)) {
                $rencana[] = $langkah;
            }
        }
        if ($rencana === []) {
            $rencana[] = 'Terapkan perubahan visual sesuai deskripsi Anda dengan mempertahankan seluruh informasi produk yang sudah ada.';
        }

        return [
            'status' => 'rencana',
            'instruksi' => $instruksi,
            'rencana_perubahan' => $rencana,
            'dipertahankan' => [
                'Bentuk kemasan dan identitas visual merek',
                'Seluruh informasi produk (komposisi, netto, produsen, alamat, kode produksi, tanggal)',
                'Tipografi khas merek bila sudah digunakan konsisten',
            ],
            'peringatan' => array_values(array_unique($peringatan)),
            'ditolak' => $ditolak,
            'sumber_path' => $path,
            'hasil_path' => null,
            'denah' => $this->denah($teks),
            'catatan' => 'Si Pandu AI tidak menyunting karya Anda secara otomatis. Yang disusun adalah denah tata letak dan rencana perubahan yang dapat langsung diserahkan kepada desainer. Si Pandu AI juga tidak membuat logo sertifikasi maupun nomor sertifikat.',
        ];
    }

    /**
     * Denah tata letak label: urutan blok, porsi ruang, dan penekanannya.
     *
     * Urutan bakunya mengikuti alur baca kemasan pada umumnya — identitas
     * merek, nama produk, visual, lalu informasi wajib di bagian bawah.
     * Instruksi pengguna hanya menggeser penekanan dan menambah catatan;
     * blok informasi wajib tidak pernah dihilangkan.
     *
     * @return array{catatan:string,blok:array<int,array<string,mixed>>}
     */
    private function denah(string $teks): array
    {
        $minimalis = str_contains($teks, 'minimalis') || str_contains($teks, 'modern')
            || str_contains($teks, 'bersih') || str_contains($teks, 'simpel');

        $blok = [
            [
                'peran' => 'merek',
                'judul' => 'Logo & Nama Merek',
                'porsi' => 14,
                'penekanan' => str_contains($teks, 'logo') ? 'kuat' : 'sedang',
                'catatan' => str_contains($teks, 'logo')
                    ? 'Tempatkan pada posisi yang Anda minta, ukurannya proporsional terhadap nama produk.'
                    : 'Ukuran proporsional, tidak menyaingi nama produk.',
            ],
            [
                'peran' => 'nama_produk',
                'judul' => 'Nama Produk & Varian',
                'porsi' => 20,
                'penekanan' => 'kuat',
                'catatan' => 'Elemen paling menonjol; varian dibuat satu tingkat lebih kecil.',
            ],
            [
                'peran' => 'visual',
                'judul' => 'Visual Produk',
                'porsi' => $minimalis ? 28 : 24,
                'penekanan' => 'sedang',
                'catatan' => $minimalis
                    ? 'Beri ruang kosong lebih lega; kurangi elemen dekoratif di sekitarnya.'
                    : 'Jaga agar visual tidak menutupi teks informasi.',
            ],
            [
                'peran' => 'pendukung',
                'judul' => 'Klaim & Informasi Pendukung',
                'porsi' => $minimalis ? 8 : 12,
                'penekanan' => 'lemah',
                'catatan' => 'Hanya klaim yang benar-benar dapat Anda dukung dengan bukti.',
            ],
            [
                'peran' => 'komposisi',
                'judul' => 'Komposisi & Informasi Nilai Gizi',
                'porsi' => 12,
                'penekanan' => 'sedang',
                'catatan' => 'Isi tetap seperti aslinya; hanya keterbacaannya yang ditingkatkan.',
            ],
            [
                'peran' => 'netto',
                'judul' => 'Berat / Isi Bersih',
                'porsi' => 6,
                'penekanan' => 'sedang',
                'catatan' => 'Ditempatkan agar mudah ditemukan, tidak tertimpa elemen lain.',
            ],
            [
                'peran' => 'produsen',
                'judul' => 'Produsen, Alamat, Kode Produksi & Tanggal',
                'porsi' => 12,
                'penekanan' => 'lemah',
                'catatan' => 'Informasi wajib; boleh kecil, tetapi harus tetap terbaca jelas.',
            ],
        ];

        return [
            'catatan' => 'Denah ini adalah kerangka tata letak, bukan hasil suntingan atas desain Anda. '
                .'Angka persentase menunjukkan porsi ruang yang disarankan, bukan ukuran mutlak.',
            'blok' => $blok,
        ];
    }
}
