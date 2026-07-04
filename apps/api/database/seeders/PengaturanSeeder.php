<?php

namespace Database\Seeders;

use App\Models\Pengaturan;
use Illuminate\Database\Seeder;

class PengaturanSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            // Dua titik lokasi kantor untuk geofence presensi (radius 100 m).
            [
                'key' => 'kantor.lokasi',
                'value' => json_encode([
                    [
                        'slug' => 'kantor_utama',
                        'nama' => 'Kantor Utama BPOM Jember',
                        'latitude' => -8.178740897147627,
                        'longitude' => 113.70649700614,
                    ],
                    [
                        'slug' => 'gedung_lab',
                        'nama' => 'Gedung Laboratorium',
                        'latitude' => -8.18323735847084,
                        'longitude' => 113.67008016307047,
                    ],
                ]),
                'tipe' => 'json',
            ],
            ['key' => 'kantor.radius_meter', 'value' => '100', 'tipe' => 'number'],

            // Jam kerja per kelompok hari (WIB).
            ['key' => 'jam_kerja.senin_kamis.mulai', 'value' => '07:30', 'tipe' => 'string'],
            ['key' => 'jam_kerja.senin_kamis.selesai', 'value' => '16:00', 'tipe' => 'string'],
            ['key' => 'jam_kerja.jumat.mulai', 'value' => '07:30', 'tipe' => 'string'],
            ['key' => 'jam_kerja.jumat.selesai', 'value' => '16:30', 'tipe' => 'string'],
            ['key' => 'jam_kerja.sabtu.mulai', 'value' => '07:30', 'tipe' => 'string'],
            ['key' => 'jam_kerja.sabtu.selesai', 'value' => '12:00', 'tipe' => 'string'],
            ['key' => 'jam_kerja.batas_absen', 'value' => '22:00', 'tipe' => 'string'],
        ];

        foreach ($items as $item) {
            Pengaturan::updateOrCreate(['key' => $item['key']], $item);
        }

        // Bersihkan kunci lama (satu titik kantor) jika ada dari seed sebelumnya.
        Pengaturan::whereIn('key', [
            'kantor.nama', 'kantor.latitude', 'kantor.longitude',
            'jam_kerja.mulai', 'jam_kerja.selesai', 'jam_kerja.toleransi_menit',
            'presensi.strict_geofence',
        ])->delete();
    }
}
