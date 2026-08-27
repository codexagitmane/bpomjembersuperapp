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
            'catatan' => 'Layanan pengeditan gambar otomatis belum aktif, sehingga Si Pandu AI menyusun rencana perubahan yang dapat Anda serahkan kepada desainer. Si Pandu AI tidak membuat logo sertifikasi maupun nomor sertifikat.',
        ];
    }
}
