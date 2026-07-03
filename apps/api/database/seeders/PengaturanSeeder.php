<?php

namespace Database\Seeders;

use App\Models\Pengaturan;
use Illuminate\Database\Seeder;

class PengaturanSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            // ⚠️ PLACEHOLDER — ganti dengan koordinat GPS hasil survei lapangan
            // titik depan Kantor Balai POM di Jember sebelum dipakai di produksi.
            ['key' => 'kantor.nama', 'value' => 'Kantor Balai POM di Jember', 'tipe' => 'string'],
            ['key' => 'kantor.latitude', 'value' => '-8.1723', 'tipe' => 'number'],
            ['key' => 'kantor.longitude', 'value' => '113.7002', 'tipe' => 'number'],
            ['key' => 'kantor.radius_meter', 'value' => '150', 'tipe' => 'number'],

            ['key' => 'jam_kerja.mulai', 'value' => '08:00', 'tipe' => 'string'],
            ['key' => 'jam_kerja.selesai', 'value' => '16:00', 'tipe' => 'string'],
            ['key' => 'jam_kerja.toleransi_menit', 'value' => '15', 'tipe' => 'number'],

            // Jika true, check-in/out DITOLAK saat di luar radius kantor.
            ['key' => 'presensi.strict_geofence', 'value' => 'true', 'tipe' => 'boolean'],
        ];

        foreach ($items as $item) {
            Pengaturan::updateOrCreate(['key' => $item['key']], $item);
        }
    }
}
