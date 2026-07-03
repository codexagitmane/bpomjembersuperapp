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
                'fungsi' => 'pemeriksaan', 'slug' => 'sig_apotek',
                'nama' => 'SIG Monitoring & Pemetaan Distribusi Apotek',
                'deskripsi' => 'Pemetaan geografis sebaran dan status pengawasan apotek se-Kabupaten Jember.',
                'icon' => 'MapPinned', 'is_external_access' => false, 'urutan' => 2,
            ],
            [
                'fungsi' => 'tata_usaha', 'slug' => 'presensi',
                'nama' => 'Presensi Berbasis Lokasi & Selfie',
                'deskripsi' => 'Absensi pegawai dengan validasi titik lokasi (geofence) dan foto selfie.',
                'icon' => 'ScanFace', 'is_external_access' => false, 'urutan' => 3,
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
                'fungsi' => 'penindakan', 'slug' => 'barang_bukti',
                'nama' => 'Monitoring Barang Bukti',
                'deskripsi' => 'Pelacakan status dan rantai pengelolaan barang bukti penindakan.',
                'icon' => 'Boxes', 'is_external_access' => false, 'urutan' => 6,
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
