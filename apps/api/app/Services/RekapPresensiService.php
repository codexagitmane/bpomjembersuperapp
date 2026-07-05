<?php

namespace App\Services;

use App\Models\CutiIzin;
use App\Models\Presensi;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Membangun data rekap presensi (harian / bulanan / tahunan) per pegawai —
 * dipakai untuk tampilan tabel dan ekspor Excel/PDF (lampiran kehadiran/TPP).
 * Cuti/izin/sakit yang DISETUJUI dihitung sebagai keterangan kehadiran.
 */
class RekapPresensiService
{
    /** Rekap satu hari: status tiap pegawai pada tanggal tsb. */
    public function rekapHarian(string $tanggal): array
    {
        $tgl = Carbon::parse($tanggal);
        $pegawai = $this->daftarPegawai();

        $presensi = Presensi::whereDate('tanggal', $tgl->toDateString())
            ->get()
            ->keyBy('user_id');

        $cuti = CutiIzin::where('status', 'disetujui')
            ->whereDate('tanggal_mulai', '<=', $tgl->toDateString())
            ->whereDate('tanggal_selesai', '>=', $tgl->toDateString())
            ->get()
            ->keyBy('user_id');

        $rows = [];
        foreach ($pegawai as $p) {
            $pr = $presensi->get($p->id);
            $ci = $cuti->get($p->id);

            $keterangan = match (true) {
                $pr && $pr->jam_masuk => ucfirst(str_replace('_', ' ', $pr->status_masuk ?? 'hadir')),
                (bool) $ci => ucfirst($ci->jenis),
                default => 'Tidak hadir',
            };

            $rows[] = [
                'nama' => $p->name,
                'nip_nik' => $p->nip_nik ?? '-',
                'jenis_pegawai' => $p->jenis_pegawai,
                'jam_masuk' => $pr?->jam_masuk ? substr($pr->jam_masuk, 0, 5) : '-',
                'jam_keluar' => $pr?->jam_keluar ? substr($pr->jam_keluar, 0, 5) : '-',
                'mode' => $pr?->mode_masuk ? strtoupper($pr->mode_masuk) : '-',
                'keterangan' => $keterangan,
            ];
        }

        $hadir = count(array_filter($rows, fn ($r) => $r['jam_masuk'] !== '-'));

        return [
            'mode' => 'harian',
            'periode' => $tgl->translatedFormat('l, d F Y'),
            'tanggal' => $tgl->toDateString(),
            'headers' => ['No', 'Nama', 'NIP/NIK', 'Jenis', 'Jam Masuk', 'Jam Keluar', 'Mode', 'Keterangan'],
            'kolom' => ['nama', 'nip_nik', 'jenis_pegawai', 'jam_masuk', 'jam_keluar', 'mode', 'keterangan'],
            'rows' => $rows,
            'ringkasan' => [
                'total_pegawai' => count($rows),
                'total_hadir' => $hadir,
                'total_tidak_hadir' => count($rows) - $hadir,
            ],
        ];
    }

    /** @return array{periode:string, hari_kerja:int, rows:array, ringkasan:array} */
    public function rekapBulanan(int $tahun, int $bulan): array
    {
        $awal = Carbon::create($tahun, $bulan, 1)->startOfMonth();
        $akhir = (clone $awal)->endOfMonth();

        $rows = $this->agregatRentang($awal, $akhir);

        return [
            'mode' => 'bulanan',
            'periode' => $awal->translatedFormat('F Y'),
            'tahun' => $tahun,
            'bulan' => $bulan,
            'hari_kerja' => $this->hitungHariKerja($awal, $akhir),
            'headers' => ['No', 'Nama', 'NIP/NIK', 'Jenis', 'Hadir', 'Tepat Waktu', 'Terlambat', 'WFH', 'Dinas', 'Cuti', 'Izin', 'Sakit'],
            'kolom' => ['nama', 'nip_nik', 'jenis_pegawai', 'hadir', 'tepat_waktu', 'terlambat', 'wfh', 'dinas', 'cuti', 'izin', 'sakit'],
            'rows' => $rows,
            'ringkasan' => [
                'total_pegawai' => count($rows),
                'total_hadir' => array_sum(array_column($rows, 'hadir')),
                'total_terlambat' => array_sum(array_column($rows, 'terlambat')),
            ],
        ];
    }

    /** Rekap agregat satu tahun penuh per pegawai. */
    public function rekapTahunan(int $tahun): array
    {
        $awal = Carbon::create($tahun, 1, 1)->startOfYear();
        $akhir = (clone $awal)->endOfYear();

        $rows = $this->agregatRentang($awal, $akhir);

        return [
            'mode' => 'tahunan',
            'periode' => "Tahun {$tahun}",
            'tahun' => $tahun,
            'hari_kerja' => $this->hitungHariKerja($awal, $akhir),
            'headers' => ['No', 'Nama', 'NIP/NIK', 'Jenis', 'Hadir', 'Tepat Waktu', 'Terlambat', 'WFH', 'Dinas', 'Cuti', 'Izin', 'Sakit'],
            'kolom' => ['nama', 'nip_nik', 'jenis_pegawai', 'hadir', 'tepat_waktu', 'terlambat', 'wfh', 'dinas', 'cuti', 'izin', 'sakit'],
            'rows' => $rows,
            'ringkasan' => [
                'total_pegawai' => count($rows),
                'total_hadir' => array_sum(array_column($rows, 'hadir')),
                'total_terlambat' => array_sum(array_column($rows, 'terlambat')),
            ],
        ];
    }

    /** Agregat hadir/terlambat/wfh/dinas + cuti/izin/sakit per pegawai dalam rentang. */
    private function agregatRentang(Carbon $awal, Carbon $akhir): array
    {
        $pegawai = $this->daftarPegawai();

        $presensi = Presensi::whereBetween('tanggal', [$awal->toDateString(), $akhir->toDateString()])
            ->get()
            ->groupBy('user_id');

        $cutiSemua = CutiIzin::where('status', 'disetujui')
            ->whereDate('tanggal_mulai', '<=', $akhir->toDateString())
            ->whereDate('tanggal_selesai', '>=', $awal->toDateString())
            ->get()
            ->groupBy('user_id');

        $rows = [];
        foreach ($pegawai as $p) {
            $data = $presensi->get($p->id, collect());

            // Hari cuti/izin/sakit dihitung hanya pada porsi yang jatuh di rentang.
            $ci = ['cuti' => 0, 'izin' => 0, 'sakit' => 0];
            foreach ($cutiSemua->get($p->id, collect()) as $c) {
                $mulai = Carbon::parse($c->tanggal_mulai)->max($awal);
                $selesai = Carbon::parse($c->tanggal_selesai)->min($akhir);
                $ci[$c->jenis] += CutiIzin::hitungHariKerja($mulai, $selesai);
            }

            $rows[] = [
                'nama' => $p->name,
                'nip_nik' => $p->nip_nik ?? '-',
                'jenis_pegawai' => $p->jenis_pegawai,
                'hadir' => $data->whereNotNull('jam_masuk')->count(),
                'tepat_waktu' => $data->where('status_masuk', 'tepat_waktu')->count(),
                'terlambat' => $data->where('status_masuk', 'terlambat')->count(),
                'wfh' => $data->where('mode_masuk', 'wfh')->count(),
                'dinas' => $data->where('mode_masuk', 'dinas')->count(),
                'cuti' => $ci['cuti'],
                'izin' => $ci['izin'],
                'sakit' => $ci['sakit'],
            ];
        }

        return $rows;
    }

    private function daftarPegawai()
    {
        return User::where('account_type', 'internal')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'nip_nik', 'jenis_pegawai']);
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
