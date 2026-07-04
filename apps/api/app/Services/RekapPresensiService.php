<?php

namespace App\Services;

use App\Models\Presensi;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Membangun data rekap presensi bulanan per pegawai — dipakai untuk
 * tampilan tabel dan ekspor Excel/PDF (lampiran kehadiran/TPP).
 */
class RekapPresensiService
{
    /** @return array{periode:string, hari_kerja:int, rows:array, ringkasan:array} */
    public function rekapBulanan(int $tahun, int $bulan): array
    {
        $awal = Carbon::create($tahun, $bulan, 1)->startOfMonth();
        $akhir = (clone $awal)->endOfMonth();

        $pegawai = User::where('account_type', 'internal')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'nip_nik', 'jenis_pegawai']);

        $presensi = Presensi::whereBetween('tanggal', [$awal->toDateString(), $akhir->toDateString()])
            ->get()
            ->groupBy('user_id');

        $rows = [];
        foreach ($pegawai as $p) {
            $data = $presensi->get($p->id, collect());
            $hadir = $data->whereNotNull('jam_masuk')->count();
            $tepat = $data->where('status_masuk', 'tepat_waktu')->count();
            $terlambat = $data->where('status_masuk', 'terlambat')->count();
            $wfh = $data->where('mode_masuk', 'wfh')->count();
            $dinas = $data->where('mode_masuk', 'dinas')->count();

            $rows[] = [
                'nama' => $p->name,
                'nip_nik' => $p->nip_nik ?? '-',
                'jenis_pegawai' => $p->jenis_pegawai,
                'hadir' => $hadir,
                'tepat_waktu' => $tepat,
                'terlambat' => $terlambat,
                'wfh' => $wfh,
                'dinas' => $dinas,
            ];
        }

        return [
            'periode' => $awal->translatedFormat('F Y'),
            'tahun' => $tahun,
            'bulan' => $bulan,
            'hari_kerja' => $this->hitungHariKerja($awal, $akhir),
            'rows' => $rows,
            'ringkasan' => [
                'total_pegawai' => $pegawai->count(),
                'total_hadir' => array_sum(array_column($rows, 'hadir')),
                'total_terlambat' => array_sum(array_column($rows, 'terlambat')),
            ],
        ];
    }

    private function hitungHariKerja(Carbon $awal, Carbon $akhir): int
    {
        $count = 0;
        $cursor = $awal->copy();
        while ($cursor <= $akhir) {
            if ($cursor->dayOfWeekIso <= 5) { // Senin-Jumat
                $count++;
            }
            $cursor->addDay();
        }

        return $count;
    }
}
