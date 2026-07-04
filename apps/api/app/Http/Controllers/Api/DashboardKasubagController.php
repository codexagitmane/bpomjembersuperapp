<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IzinKeluarMasuk;
use App\Models\PengajuanBmn;
use App\Models\Presensi;
use App\Models\User;
use App\Models\WfhLocation;
use App\Services\TrenKehadiranService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/** Dashboard operasional Tata Usaha — Kasubag TU & Superadmin. */
class DashboardKasubagController extends Controller
{
    public function index(Request $request, TrenKehadiranService $trenService)
    {
        $today = Carbon::today();
        $periode = $request->input('periode', 'bulan');
        $totalPegawai = User::where('account_type', 'internal')->where('is_active', true)->count();
        $presensiHariIni = Presensi::whereDate('tanggal', $today)->get();

        return response()->json([
            'tanggal' => $today->toDateString(),
            'periode' => $periode,
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
            'tren_kehadiran' => $trenService->tren($periode),
        ]);
    }
}
