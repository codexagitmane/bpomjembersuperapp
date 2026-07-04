<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\BarangBukti;
use App\Models\BookingKonsultasi;
use App\Models\IzinKeluarMasuk;
use App\Models\PengajuanBmn;
use App\Models\Presensi;
use App\Models\SigApotek;
use App\Models\User;
use Illuminate\Support\Carbon;

/** Dashboard monitoring lintas-modul — khusus Kepala Balai & Superadmin. */
class DashboardController extends Controller
{
    public function kabalai()
    {
        $today = Carbon::today();

        $totalPegawaiAktif = User::where('account_type', 'internal')->where('is_active', true)->count();
        $presensiHariIni = Presensi::whereDate('tanggal', $today)->get();

        $presensi = [
            'total_pegawai' => $totalPegawaiAktif,
            'hadir' => $presensiHariIni->whereNotNull('jam_masuk')->count(),
            'tepat_waktu' => $presensiHariIni->where('status_masuk', 'tepat_waktu')->count(),
            'terlambat' => $presensiHariIni->where('status_masuk', 'terlambat')->count(),
            'belum_absen' => max(0, $totalPegawaiAktif - $presensiHariIni->whereNotNull('jam_masuk')->count()),
            'wfh' => $presensiHariIni->where('mode_masuk', 'wfh')->count(),
            'dinas' => $presensiHariIni->where('mode_masuk', 'dinas')->count(),
        ];

        $booking = BookingKonsultasi::selectRaw('status, count(*) as jumlah')
            ->groupBy('status')->pluck('jumlah', 'status');

        $izin = IzinKeluarMasuk::selectRaw('status, count(*) as jumlah')
            ->groupBy('status')->pluck('jumlah', 'status');

        $bmn = PengajuanBmn::selectRaw('status, count(*) as jumlah')
            ->groupBy('status')->pluck('jumlah', 'status');

        $barangBukti = BarangBukti::selectRaw('status, count(*) as jumlah')
            ->groupBy('status')->pluck('jumlah', 'status');

        $apotek = [
            'total' => SigApotek::count(),
            'aktif' => SigApotek::where('status_izin', 'aktif')->count(),
            'kadaluarsa' => SigApotek::where('status_izin', 'kadaluarsa')->count(),
            'dicabut' => SigApotek::where('status_izin', 'dicabut')->count(),
            'pernah_diperiksa' => SigApotek::whereNotNull('tanggal_pemeriksaan_terakhir')->count(),
            'total_pelanggaran' => (int) SigApotek::sum('jumlah_pelanggaran'),
        ];

        $akunPending = User::where('account_type', 'eksternal')->where('is_active', false)->count();

        $aktivitasTerbaru = AuditLog::with('user:id,name')
            ->orderByDesc('created_at')
            ->limit(15)
            ->get(['id', 'user_id', 'aksi', 'modul', 'deskripsi', 'created_at']);

        return response()->json([
            'tanggal' => $today->toDateString(),
            'presensi' => $presensi,
            'booking' => $booking,
            'izin' => $izin,
            'bmn' => $bmn,
            'barang_bukti' => $barangBukti,
            'apotek' => $apotek,
            'akun_masyarakat_pending' => $akunPending,
            'aktivitas_terbaru' => $aktivitasTerbaru,
        ]);
    }
}
