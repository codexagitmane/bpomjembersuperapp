<?php

namespace App\Services;

use App\Models\Pengaturan;
use App\Models\User;
use App\Models\WfhLocation;
use Illuminate\Support\Carbon;

/**
 * Aturan jadwal & geofence presensi BPOM Jember.
 *
 * Jadwal (WIB):
 * - Senin–Kamis : 07.30–16.00 (semua pegawai)
 * - Jumat       : 07.30–16.30
 * - Sabtu       : 07.30–12.00 (khusus petugas kebersihan)
 * - Minggu      : hanya petugas keamanan (shift)
 * - Batas maksimal absen (check-in/out non-keamanan): 22.00
 * - Petugas keamanan: shift lintas hari — check-in maks 07.30, check-out
 *   keesokan harinya maks 07.30 (tetap masuk di hari libur/tanggal merah).
 *
 * Mode presensi:
 * - wfo   : dalam radius salah satu titik kantor (Kantor Utama / Gedung Lab)
 * - wfh   : dalam radius lokasi rumah yang SUDAH diverifikasi admin
 * - dinas : di luar radius kantor (lokasi tetap dicatat, geofence tidak menolak)
 */
class PresensiRuleService
{
    public const JENIS_PEGAWAI = [
        'pegawai', 'magang', 'keamanan', 'kebersihan', 'pengemudi', 'pelayanan',
    ];

    /** Daftar titik kantor dari pengaturan. */
    public function titikKantor(): array
    {
        return Pengaturan::get('kantor.lokasi', [
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
        ]);
    }

    public function radiusMeter(): int
    {
        return (int) Pengaturan::get('kantor.radius_meter', 100);
    }

    public function batasAbsen(): string
    {
        return Pengaturan::get('jam_kerja.batas_absen', '22:00');
    }

    /**
     * Jadwal kerja untuk user pada tanggal tertentu.
     * Mengembalikan: [boleh_absen(bool), alasan(string|null), jam_masuk, jam_pulang, lintas_hari(bool)]
     */
    public function jadwalUntuk(User $user, Carbon $tanggal): array
    {
        $jenis = $user->jenis_pegawai ?? 'pegawai';
        $hari = (int) $tanggal->dayOfWeekIso; // 1=Senin ... 7=Minggu

        if ($jenis === 'keamanan') {
            // Shift bergantian dicatat operasional di luar sistem; sistem menerima
            // presensi keamanan di hari apa pun (termasuk libur/tanggal merah).
            return [true, null, '07:30', '07:30', true];
        }

        if ($hari === 6) { // Sabtu
            if ($jenis !== 'kebersihan') {
                return [false, 'Hari Sabtu hanya untuk petugas kebersihan.', null, null, false];
            }

            return [true, null, Pengaturan::get('jam_kerja.sabtu.mulai', '07:30'), Pengaturan::get('jam_kerja.sabtu.selesai', '12:00'), false];
        }

        if ($hari === 7) { // Minggu
            return [false, 'Hari Minggu tidak ada jadwal presensi untuk jenis pegawai Anda.', null, null, false];
        }

        if ($hari === 5) { // Jumat
            return [true, null, Pengaturan::get('jam_kerja.jumat.mulai', '07:30'), Pengaturan::get('jam_kerja.jumat.selesai', '16:30'), false];
        }

        // Senin–Kamis
        return [true, null, Pengaturan::get('jam_kerja.senin_kamis.mulai', '07:30'), Pengaturan::get('jam_kerja.senin_kamis.selesai', '16:00'), false];
    }

    /**
     * Evaluasi lokasi terhadap mode presensi.
     * Return: [valid(bool), pesan(string|null), titik(string|null), jarak_meter(float)]
     */
    public function evaluasiLokasi(User $user, string $mode, float $lat, float $lng): array
    {
        $radius = $this->radiusMeter();

        if ($mode === 'wfo') {
            $terdekat = null;
            $jarakTerdekat = PHP_FLOAT_MAX;
            foreach ($this->titikKantor() as $titik) {
                $jarak = GeoService::distanceMeter($lat, $lng, (float) $titik['latitude'], (float) $titik['longitude']);
                if ($jarak < $jarakTerdekat) {
                    $jarakTerdekat = $jarak;
                    $terdekat = $titik['slug'];
                }
            }

            if ($jarakTerdekat > $radius) {
                return [false, sprintf(
                    'Anda berada %.0f m dari titik kantor terdekat (radius %d m). Pilih mode Dinas jika sedang tugas luar.',
                    $jarakTerdekat, $radius
                ), $terdekat, $jarakTerdekat];
            }

            return [true, null, $terdekat, $jarakTerdekat];
        }

        if ($mode === 'wfh') {
            $lokasi = WfhLocation::where('user_id', $user->id)->where('status', 'diverifikasi')->first();
            if (! $lokasi) {
                return [false, 'Anda belum memiliki lokasi WFH terverifikasi. Daftarkan lokasi rumah Anda dan tunggu verifikasi admin.', null, 0];
            }
            $jarak = GeoService::distanceMeter($lat, $lng, $lokasi->latitude, $lokasi->longitude);
            if ($jarak > $radius) {
                return [false, sprintf('Anda berada %.0f m dari lokasi WFH terdaftar (radius %d m).', $jarak, $radius), 'wfh', $jarak];
            }

            return [true, null, 'wfh', $jarak];
        }

        // dinas — tidak menolak lokasi; catat jarak ke kantor terdekat sebagai info
        $jarakTerdekat = PHP_FLOAT_MAX;
        foreach ($this->titikKantor() as $titik) {
            $jarak = GeoService::distanceMeter($lat, $lng, (float) $titik['latitude'], (float) $titik['longitude']);
            $jarakTerdekat = min($jarakTerdekat, $jarak);
        }

        return [true, null, 'dinas', $jarakTerdekat];
    }
}
