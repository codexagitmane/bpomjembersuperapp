<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BahanLab;
use App\Models\PenggunaanBahanLab;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/** Dashboard analitik "SIMBA" — manajemen bahan laboratorium (Fungsi Pengujian). */
class DashboardSimbaController extends Controller
{
    public function index(Request $request)
    {
        $bulan = $request->input('bulan'); // format YYYY-MM, opsional
        $namaPenguji = $request->input('penguji_id'); // user_id, opsional

        $penggunaanQuery = PenggunaanBahanLab::query();
        if ($bulan) {
            $awal = Carbon::createFromFormat('Y-m', $bulan)->startOfMonth();
            $penggunaanQuery->whereBetween('tanggal', [$awal->toDateString(), $awal->copy()->endOfMonth()->toDateString()]);
        }
        if ($namaPenguji) {
            $penggunaanQuery->where('user_id', $namaPenguji);
        }

        $totalPenggunaan = (clone $penggunaanQuery)->count();
        $jumlahBahanAktif = BahanLab::where('status', 'aktif')
            ->where(function ($q) {
                $q->whereNull('tanggal_kedaluwarsa')->orWhere('tanggal_kedaluwarsa', '>=', Carbon::today());
            })->count();
        $jumlahBahanKedaluwarsa = BahanLab::whereNotNull('tanggal_kedaluwarsa')
            ->where('tanggal_kedaluwarsa', '<', Carbon::today())->count();

        // Tren penggunaan 6 bulan terakhir (tidak terpengaruh filter bulan, selalu rolling 6 bulan).
        $trenBulanan = [];
        for ($i = 5; $i >= 0; $i--) {
            $bln = now()->copy()->subMonths($i);
            $jumlah = PenggunaanBahanLab::whereYear('tanggal', $bln->year)
                ->whereMonth('tanggal', $bln->month)
                ->when($namaPenguji, fn ($q) => $q->where('user_id', $namaPenguji))
                ->count();
            $trenBulanan[] = ['bulan' => $bln->translatedFormat('M Y'), 'jumlah' => $jumlah];
        }

        // Top 5 bahan paling banyak digunakan (berdasarkan filter aktif).
        $top5 = (clone $penggunaanQuery)
            ->join('bahan_lab', 'bahan_lab.id', '=', 'penggunaan_bahan_lab.bahan_lab_id')
            ->selectRaw('bahan_lab.nama_bahan, bahan_lab.satuan, SUM(penggunaan_bahan_lab.jumlah_diambil) as total_diambil')
            ->groupBy('bahan_lab.nama_bahan', 'bahan_lab.satuan')
            ->orderByDesc('total_diambil')
            ->limit(5)
            ->get();

        $perluPengadaan = BahanLab::whereColumn('stok_tersedia', '<=', 'stok_minimum')
            ->orderBy('stok_tersedia')
            ->get(['id', 'nama_bahan', 'stok_tersedia', 'satuan'])
            ->map(fn ($b) => [
                'nama' => $b->nama_bahan,
                'sisa_stok' => (float) $b->stok_tersedia,
                'satuan' => $b->satuan,
                'keterangan' => (float) $b->stok_tersedia <= 0 ? 'Stok habis' : 'Stok menipis',
            ]);

        $listTanggalEd = BahanLab::whereNotNull('tanggal_kedaluwarsa')
            ->orderBy('tanggal_kedaluwarsa')
            ->paginate(10, ['id', 'nama_bahan', 'tanggal_kedaluwarsa'], 'page_ed');

        $daftarPenguji = User::whereIn('id', PenggunaanBahanLab::select('user_id')->distinct())
            ->get(['id', 'name']);

        return response()->json([
            'total_penggunaan_bahan' => $totalPenggunaan,
            'jumlah_bahan_aktif' => $jumlahBahanAktif,
            'jumlah_bahan_kedaluwarsa' => $jumlahBahanKedaluwarsa,
            'tren_bulanan' => $trenBulanan,
            'top5_bahan' => $top5,
            'bahan_perlu_pengadaan' => $perluPengadaan,
            'list_tanggal_ed' => $listTanggalEd,
            'daftar_penguji' => $daftarPenguji,
            'data_terakhir_update' => now()->toIso8601String(),
        ]);
    }
}
