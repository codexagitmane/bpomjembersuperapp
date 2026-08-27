<?php

namespace Database\Seeders;

use App\Models\Aplikasi;
use App\Models\Fungsi;
use Illuminate\Database\Seeder;

class FungsiAplikasiSeeder extends Seeder
{
    public function run(): void
    {
        $fungsiList = [
            ['slug' => 'pemeriksaan', 'nama' => 'Fungsi Pemeriksaan', 'icon' => 'SearchCheck', 'urutan' => 1,
                'deskripsi' => 'Pengawasan dan pemeriksaan sarana distribusi obat & makanan.'],
            ['slug' => 'infokom', 'nama' => 'Fungsi Informasi dan Komunikasi', 'icon' => 'MessageCircle', 'urutan' => 2,
                'deskripsi' => 'Layanan informasi, konsultasi, dan pengaduan masyarakat.'],
            ['slug' => 'penindakan', 'nama' => 'Fungsi Penindakan', 'icon' => 'ShieldAlert', 'urutan' => 3,
                'deskripsi' => 'Penindakan pelanggaran dan pengelolaan barang bukti.'],
            ['slug' => 'tata_usaha', 'nama' => 'Fungsi Tata Usaha', 'icon' => 'Building2', 'urutan' => 4,
                'deskripsi' => 'Administrasi kepegawaian, sarana, dan operasional kantor.'],
            ['slug' => 'pengujian', 'nama' => 'Fungsi Pengujian', 'icon' => 'FlaskConical', 'urutan' => 5,
                'deskripsi' => 'Pengujian laboratorium dan manajemen bahan analisis (SIMBA).'],
        ];

        foreach ($fungsiList as $data) {
            Fungsi::updateOrCreate(['slug' => $data['slug']], $data);
        }

        $aplikasiList = [
            [
                'fungsi' => 'infokom', 'slug' => 'booking_konsultasi',
                'nama' => 'Booking Layanan Konsultasi & Pengaduan',
                'deskripsi' => 'Reservasi jadwal konsultasi dan pengaduan masyarakat terkait obat dan makanan.',
                'icon' => 'CalendarCheck', 'is_external_access' => true, 'urutan' => 1,
            ],
            [
                'fungsi' => 'infokom', 'slug' => 'layanan_konsumen',
                'nama' => 'Layanan Informasi Konsumen',
                'deskripsi' => 'Pencatatan record layanan informasi, konsultasi & pengaduan konsumen — form bertahap, ekspor Word/PDF.',
                'icon' => 'ClipboardList', 'is_external_access' => false, 'urutan' => 2,
            ],
            [
                'fungsi' => 'infokom', 'slug' => 'si_pandu_aja',
                'nama' => 'Si Pandu Aja',
                'deskripsi' => 'Formulir layanan pengaduan konsumen daring (Office Forms) — membuka di jendela baru.',
                'icon' => 'MessageSquareText', 'is_external_access' => true, 'urutan' => 3,
            ],
            [
                'fungsi' => 'pemeriksaan', 'slug' => 'sig_apotek',
                'nama' => 'SIG Monitoring & Pemetaan Distribusi Apotek',
                'deskripsi' => 'Pemetaan geografis sebaran dan status pengawasan apotek se-Kabupaten Jember.',
                'icon' => 'MapPinned', 'is_external_access' => false, 'urutan' => 2,
            ],
            [
                'fungsi' => 'tata_usaha', 'slug' => 'presensi',
                'nama' => 'ONTIME — Presensi & Kehadiran',
                'deskripsi' => 'Absensi berbasis lokasi (geofence) & selfie, rekap kehadiran, dan manajemen jadwal.',
                'icon' => 'Fingerprint', 'is_external_access' => false, 'urutan' => 3,
            ],
            [
                'fungsi' => 'tata_usaha', 'slug' => 'izin_keluar_masuk',
                'nama' => 'Izin Keluar Masuk Kantor',
                'deskripsi' => 'Pengajuan dan persetujuan izin keluar/masuk kantor pegawai.',
                'icon' => 'DoorOpen', 'is_external_access' => false, 'urutan' => 4,
            ],
            [
                'fungsi' => 'tata_usaha', 'slug' => 'pengajuan_bmn',
                'nama' => 'Pengajuan Pemeliharaan & Perbaikan BMN',
                'deskripsi' => 'Pengajuan tiket pemeliharaan dan perbaikan Barang Milik Negara.',
                'icon' => 'Wrench', 'is_external_access' => false, 'urutan' => 5,
            ],
            [
                'fungsi' => 'tata_usaha', 'slug' => 'persediaan_bmn',
                'nama' => 'Persediaan Barang Milik Negara',
                'deskripsi' => 'Permintaan persediaan pegawai, monitoring stok & kedaluwarsa reagen/test kit, persetujuan berjenjang.',
                'icon' => 'PackageOpen', 'is_external_access' => false, 'urutan' => 6,
            ],
            [
                'fungsi' => 'tata_usaha', 'slug' => 'perjalanan_dinas',
                'nama' => 'Perjalanan Dinas',
                'deskripsi' => 'Pembuatan dokumen Surat Tugas & SPPD perjalanan dinas secara cepat, output PDF siap tanda tangan.',
                'icon' => 'Plane', 'is_external_access' => false, 'urutan' => 7,
            ],
            [
                'fungsi' => 'tata_usaha', 'slug' => 'peminjaman_arsip',
                'nama' => 'Peminjaman & Pengembalian Arsip',
                'deskripsi' => 'Peminjaman arsip aktif & inaktif full aplikasi: formulir, persetujuan petugas arsip, dua TTD QR, dan bukti peminjaman/pengembalian PDF.',
                'icon' => 'Archive', 'is_external_access' => false, 'urutan' => 8,
            ],
            [
                'fungsi' => 'penindakan', 'slug' => 'barang_bukti',
                'nama' => 'Monitoring Barang Bukti',
                'deskripsi' => 'Pelacakan status dan rantai pengelolaan barang bukti penindakan.',
                'icon' => 'Boxes', 'is_external_access' => false, 'urutan' => 6,
            ],
            [
                'fungsi' => 'pengujian', 'slug' => 'manajemen_bahan_lab',
                'nama' => 'Dashboard SIMBA — Manajemen Bahan Laboratorium',
                'deskripsi' => 'Pencatatan stok, pemakaian, dan analitik bahan/reagen laboratorium pengujian.',
                'icon' => 'TestTube2', 'is_external_access' => false, 'urutan' => 7,
            ],
            [
                'fungsi' => 'infokom', 'slug' => 'si_pandu_ai',
                'nama' => 'SI PANDU AI — Asisten Pintar Pelaku Usaha',
                'deskripsi' => 'Pendampingan pelaku usaha memahami regulasi, menyiapkan produk, meninjau label, dan menyusun CAPA.',
                'icon' => 'Sparkles', 'is_external_access' => true, 'urutan' => 9,
            ],
        ];

        foreach ($aplikasiList as $data) {
            $fungsiId = Fungsi::where('slug', $data['fungsi'])->value('id');
            Aplikasi::updateOrCreate(
                ['slug' => $data['slug']],
                [
                    'fungsi_id' => $fungsiId,
                    'nama' => $data['nama'],
                    'deskripsi' => $data['deskripsi'],
                    'icon' => $data['icon'],
                    'is_external_access' => $data['is_external_access'],
                    'is_active' => true,
                    'urutan' => $data['urutan'],
                ]
            );
        }
    }
}
