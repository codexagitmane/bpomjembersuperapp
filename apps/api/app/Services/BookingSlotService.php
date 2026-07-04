<?php

namespace App\Services;

use App\Models\BookingKonsultasi;
use App\Models\Pengaturan;
use Illuminate\Support\Carbon;

/**
 * Menghasilkan daftar slot booking yang tersedia pada tanggal tertentu,
 * berdasarkan konfigurasi (jam mulai/selesai, interval menit, kuota per slot,
 * hari libur) yang dapat diubah petugas Infokom.
 */
class BookingSlotService
{
    public function config(): array
    {
        return [
            'jam_mulai' => Pengaturan::get('booking.jam_mulai', '08:00'),
            'jam_selesai' => Pengaturan::get('booking.jam_selesai', '15:00'),
            'interval_menit' => (int) Pengaturan::get('booking.interval_menit', 60),
            'kuota_per_slot' => (int) Pengaturan::get('booking.kuota_per_slot', 1),
            'hari_libur' => Pengaturan::get('booking.hari_libur', ['sabtu', 'minggu']),
        ];
    }

    private const HARI_MAP = [
        1 => 'senin', 2 => 'selasa', 3 => 'rabu', 4 => 'kamis',
        5 => 'jumat', 6 => 'sabtu', 7 => 'minggu',
    ];

    /** @return array{libur:bool, alasan:?string, slots:array} */
    public function slotTersedia(string $tanggal): array
    {
        $cfg = $this->config();
        $date = Carbon::parse($tanggal);
        $namaHari = self::HARI_MAP[$date->dayOfWeekIso];

        if (in_array($namaHari, (array) $cfg['hari_libur'], true)) {
            return ['libur' => true, 'alasan' => 'Layanan tutup pada hari '.ucfirst($namaHari).'.', 'slots' => []];
        }

        // Hitung booking aktif per jam_slot pada tanggal ini.
        $terpakai = BookingKonsultasi::whereDate('tanggal', $date->toDateString())
            ->whereIn('status', ['menunggu', 'dikonfirmasi'])
            ->selectRaw('jam_slot, count(*) as jml')
            ->groupBy('jam_slot')
            ->pluck('jml', 'jam_slot');

        $slots = [];
        $cursor = Carbon::createFromFormat('H:i', $cfg['jam_mulai']);
        $end = Carbon::createFromFormat('H:i', $cfg['jam_selesai']);
        $interval = max(15, $cfg['interval_menit']);

        while ($cursor <= $end) {
            $jam = $cursor->format('H:i');
            $dipakai = (int) ($terpakai[$jam.':00'] ?? $terpakai[$jam] ?? 0);
            $slots[] = [
                'jam' => $jam,
                'sisa' => max(0, $cfg['kuota_per_slot'] - $dipakai),
                'penuh' => $dipakai >= $cfg['kuota_per_slot'],
            ];
            $cursor->addMinutes($interval);
        }

        return ['libur' => false, 'alasan' => null, 'slots' => $slots];
    }
}
