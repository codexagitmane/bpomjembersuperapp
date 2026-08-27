<?php

namespace App\Services;

use App\Models\Presensi;
use Illuminate\Support\Carbon;

/**
 * Tren kehadiran dengan granularitas fleksibel untuk dashboard monitoring:
 * - bulan     : 30 hari terakhir, per hari
 * - triwulan  : 3 bulan terakhir, per bulan
 * - semester  : 6 bulan terakhir, per bulan
 * - tahun     : 12 bulan terakhir, per bulan
 */
class TrenKehadiranService
{
    private const PERIODE_VALID = ['minggu', 'bulan', 'triwulan', 'semester', 'tahun'];

    public function tren(string $periode = 'bulan'): array
    {
        if (! in_array($periode, self::PERIODE_VALID, true)) {
            $periode = 'bulan';
        }

        if ($periode === 'minggu') {
            return $this->trenHarian(7);
        }

        if ($periode === 'bulan') {
            return $this->trenHarian(30);
        }

        $jumlahBulan = match ($periode) {
            'triwulan' => 3,
            'semester' => 6,
            'tahun' => 12,
        };

        return $this->trenBulanan($jumlahBulan);
    }

    private function trenHarian(int $jumlahHari): array
    {
        $hasil = [];
        for ($i = $jumlahHari - 1; $i >= 0; $i--) {
            $tgl = Carbon::today()->subDays($i);
            $data = Presensi::whereDate('tanggal', $tgl)->get();
            $hasil[] = [
                'label' => $tgl->translatedFormat('d M'),
                'tanggal' => $tgl->toDateString(),
                'hadir' => $data->whereNotNull('jam_masuk')->count(),
                'terlambat' => $data->where('status_masuk', 'terlambat')->count(),
            ];
        }

        return $hasil;
    }

    private function trenBulanan(int $jumlahBulan): array
    {
        $hasil = [];
        for ($i = $jumlahBulan - 1; $i >= 0; $i--) {
            $bln = Carbon::now()->subMonths($i);
            $data = Presensi::whereYear('tanggal', $bln->year)->whereMonth('tanggal', $bln->month)->get();
            $hasil[] = [
                'label' => $bln->translatedFormat('M Y'),
                'tanggal' => $bln->startOfMonth()->toDateString(),
                'hadir' => $data->whereNotNull('jam_masuk')->count(),
                'terlambat' => $data->where('status_masuk', 'terlambat')->count(),
            ];
        }

        return $hasil;
    }
}
