<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IzinKeluarMasuk;
use App\Models\PengajuanBmn;
use App\Models\Presensi;
use App\Models\User;
use App\Models\WfhLocation;
use Illuminate\Support\Carbon;

/** Dashboard operasional Tata Usaha — Kasubag TU & Superadmin. */
class DashboardKasubagController extends Controller
{
    public function index()
    {
        $today = Carbon::today();
        $totalPegawai = User::where('account_type', 'internal')->where('is_active', true)->count();
        $presensiHariIni = Presensi::whereDate('tanggal', $today)->get();

        // Tren kehadiran 7 hari terakhir (untuk grafik).
        $tren = [];
        for ($i = 6; $i >= 0; $i--) {
            $tgl = $today->copy()->subDays($i);
            $hadir = Presensi::whereDate('tanggal', $tgl)->whereNotNull('jam_masuk')->count();
            $terlambat = Presensi::whereDate('tanggal', $tgl)->where('status_masuk', 'terlambat')->count();
            $tren[] = [
                'tanggal' => $tgl->toDateString(),
                'label' => $tgl->translatedFormat('D'),
                'hadir' => $hadir,
                'terlambat' => $terlambat,
            ];
        }

        return response()->json([
            'tanggal' => $today->toDateString(),
            'presensi_hari_ini' => [
                'total_pegawai' => $totalPegawai,
                'hadir' => $presensiHariIni->whereNotNull('jam_masuk')->count(),
                'tepat_waktu' => $presensiHariIni->where('status_masuk', 'tepat_waktu')->count(),
                'terlambat' => $presensiHariIni->where('status_masuk', 'terlambat')->count(),
                'belum_absen' => max(0, $totalPegawai - $presensiHariIni->whereNotNull('jam_masuk')->count()),
                'wfh' => $presensiHariIni->where('mode_masuk', 'wfh')->count(),
                'dinas' => $presensiHariIni->where('mode_masuk', 'dinas')->count(),
            ],
            'antrean' => [
                'izin_menunggu' => IzinKeluarMasuk::where('status', 'diajukan')->count(),
                'bmn_menunggu' => PengajuanBmn::where('status', 'diajukan')->count(),
                'bmn_diproses' => PengajuanBmn::where('status', 'diproses')->count(),
                'wfh_menunggu' => WfhLocation::where('status', 'diajukan')->count(),
            ],
            'tren_kehadiran' => $tren,
        ]);
    }
}
