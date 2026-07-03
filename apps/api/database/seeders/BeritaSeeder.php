<?php

namespace Database\Seeders;

use App\Models\Berita;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BeritaSeeder extends Seeder
{
    public function run(): void
    {
        $penulis = User::where('email', 'kepala.balai@bpomjember.go.id')->first()
            ?? User::first();

        $items = [
            [
                'judul' => 'Waspada Obat Tanpa Izin Edar Beredar di Pasar Tradisional Jember',
                'ringkasan' => 'Balai POM di Jember menemukan sejumlah produk obat tanpa izin edar dalam operasi pengawasan rutin.',
                'kategori' => 'obat',
                'konten' => '<p>Balai Pengawas Obat dan Makanan di Jember melaksanakan operasi pengawasan rutin di beberapa pasar tradisional dan menemukan sejumlah produk obat tanpa izin edar resmi dari BPOM RI. Masyarakat diimbau untuk selalu memeriksa nomor izin edar sebelum membeli produk obat.</p><p>Cek legalitas produk melalui aplikasi BPOM Mobile atau situs resmi cekbpom.pom.go.id.</p>',
            ],
            [
                'judul' => 'Tips Memilih Makanan Kemasan yang Aman Menjelang Hari Raya',
                'ringkasan' => 'Perhatikan label, tanggal kedaluwarsa, dan izin edar sebelum membeli makanan kemasan.',
                'kategori' => 'makanan',
                'konten' => '<p>Menjelang hari raya, permintaan makanan kemasan dan olahan meningkat tajam. Balai POM di Jember mengingatkan masyarakat untuk selalu memeriksa label kemasan, tanggal kedaluwarsa, dan nomor izin edar (BPOM RI MD/ML) sebelum membeli.</p>',
            ],
            [
                'judul' => 'Sosialisasi Kosmetik Aman: Kenali Ciri Kosmetik Ilegal',
                'ringkasan' => 'Kosmetik ilegal seringkali mengandung merkuri dan bahan berbahaya lain yang merusak kulit.',
                'kategori' => 'kosmetik',
                'konten' => '<p>Dalam rangka melindungi masyarakat dari peredaran kosmetik ilegal, Balai POM di Jember menggelar sosialisasi di beberapa kecamatan. Kosmetik ilegal seringkali mengandung merkuri, hidrokuinon tinggi, dan pewarna berbahaya.</p>',
            ],
            [
                'judul' => 'Pengumuman: Jadwal Layanan Konsultasi Publik Bulan Ini',
                'ringkasan' => 'Layanan konsultasi dan pengaduan kini dapat diajukan secara online melalui aplikasi SIGAP Jember.',
                'kategori' => 'pengumuman',
                'konten' => '<p>Balai POM di Jember kini menyediakan layanan booking konsultasi dan pengaduan secara online melalui platform SIGAP Jember. Masyarakat dapat mengajukan jadwal konsultasi tanpa perlu datang langsung ke kantor untuk mengambil nomor antrean.</p>',
            ],
        ];

        foreach ($items as $item) {
            Berita::updateOrCreate(
                ['slug' => Str::slug($item['judul'])],
                [
                    'judul' => $item['judul'],
                    'ringkasan' => $item['ringkasan'],
                    'konten' => $item['konten'],
                    'kategori' => $item['kategori'],
                    'status' => 'terbit',
                    'penulis_id' => $penulis->id,
                    'published_at' => now()->subDays(random_int(0, 10)),
                ]
            );
        }
    }
}
