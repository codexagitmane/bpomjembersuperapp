<?php

use App\Http\Controllers\Api\AdminVerifikasiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarangBuktiController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DashboardKasubagController;
use App\Http\Controllers\Api\BeritaController;
use App\Http\Controllers\Api\BookingKonsultasiController;
use App\Http\Controllers\Api\IzinKeluarMasukController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\PengajuanBmnController;
use App\Http\Controllers\Api\PresensiController;
use App\Http\Controllers\Api\RekapPresensiController;
use App\Http\Controllers\Api\RosterKeamananController;
use App\Http\Controllers\Api\SigApotekController;
use App\Http\Controllers\Api\WfhLocationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Sistem Super Terintegrasi Balai POM di Jember
|--------------------------------------------------------------------------
| Semua endpoint di-throttle. Endpoint sensitif (login, register, presensi)
| memiliki batas lebih ketat untuk mencegah brute-force/abuse.
*/

Route::middleware('throttle:10,1')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'registerEksternal']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/menu', [MenuController::class, 'index']);

    Route::get('/berita', [BeritaController::class, 'index']);
    Route::get('/berita/{slug}', [BeritaController::class, 'show']);

    // --- Presensi Berbasis Lokasi & Selfie (Fungsi Tata Usaha) ---
    Route::prefix('presensi')->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk|pegawai_outsourcing_magang')->group(function () {
        Route::get('/kantor-info', [PresensiController::class, 'kantorInfo']);
        Route::get('/hari-ini', [PresensiController::class, 'hariIni']);
        Route::get('/riwayat', [PresensiController::class, 'riwayat']);
        Route::get('/wfh-lokasi', [WfhLocationController::class, 'index']);
        Route::post('/wfh-lokasi', [WfhLocationController::class, 'store']);
        Route::middleware('throttle:20,1')->group(function () {
            Route::post('/check-in', [PresensiController::class, 'checkIn']);
            Route::post('/check-out', [PresensiController::class, 'checkOut']);
        });
    });
    Route::get('/presensi', [PresensiController::class, 'semuaPresensi'])
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu');

    // Rekap presensi bulanan + ekspor Excel/PDF (Kasubag TU, Kepala Balai, Superadmin).
    Route::middleware('role:superadmin|kepala_balai|kepala_subag_tu')->group(function () {
        Route::get('/rekap-presensi', [RekapPresensiController::class, 'index']);
        Route::get('/rekap-presensi/excel', [RekapPresensiController::class, 'excel']);
        Route::get('/rekap-presensi/pdf', [RekapPresensiController::class, 'pdf']);
        Route::get('/dashboard/kasubag', [DashboardKasubagController::class, 'index']);
    });

    // Roster shift petugas keamanan (Kasubag TU / Superadmin).
    Route::middleware('role:superadmin|kepala_subag_tu')->prefix('roster-keamanan')->group(function () {
        Route::get('/', [RosterKeamananController::class, 'index']);
        Route::post('/', [RosterKeamananController::class, 'store']);
        Route::post('/generate', [RosterKeamananController::class, 'generateOtomatis']);
        Route::delete('/{rosterKeamanan}', [RosterKeamananController::class, 'destroy']);
    });

    // --- Izin Keluar Masuk Kantor (Fungsi Tata Usaha) ---
    Route::prefix('izin-keluar-masuk')->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk|pegawai_outsourcing_magang')->group(function () {
        Route::get('/', [IzinKeluarMasukController::class, 'index']);
        Route::post('/', [IzinKeluarMasukController::class, 'store']);
    });
    Route::get('/izin-keluar-masuk-semua', [IzinKeluarMasukController::class, 'semua'])
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu');
    Route::patch('/izin-keluar-masuk/{izin}/approve', [IzinKeluarMasukController::class, 'approve'])
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu');

    // --- Pengajuan Pemeliharaan & Perbaikan BMN (Fungsi Tata Usaha) ---
    Route::prefix('pengajuan-bmn')->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk|pegawai_outsourcing_magang')->group(function () {
        Route::get('/', [PengajuanBmnController::class, 'index']);
        Route::post('/', [PengajuanBmnController::class, 'store']);
    });
    Route::get('/pengajuan-bmn-semua', [PengajuanBmnController::class, 'semua'])
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu');
    Route::patch('/pengajuan-bmn/{pengajuan}/status', [PengajuanBmnController::class, 'updateStatus'])
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu');

    // --- Monitoring Barang Bukti (Fungsi Penindakan) ---
    Route::prefix('barang-bukti')->middleware('role:superadmin|kepala_balai|pegawai_asn_pppk')->group(function () {
        Route::get('/', [BarangBuktiController::class, 'index']);
        Route::get('/{barangBukti}', [BarangBuktiController::class, 'show']);
        Route::post('/', [BarangBuktiController::class, 'store']);
        Route::post('/{barangBukti}/log', [BarangBuktiController::class, 'tambahLog']);
    });

    // --- SIG Monitoring & Pemetaan Distribusi Apotek (Fungsi Pemeriksaan) ---
    Route::prefix('sig-apotek')->middleware('role:superadmin|kepala_balai|pegawai_asn_pppk')->group(function () {
        Route::get('/', [SigApotekController::class, 'index']);
        Route::post('/', [SigApotekController::class, 'store']);
        Route::post('/import-excel', [SigApotekController::class, 'importSpreadsheet'])->middleware('throttle:10,10');
        Route::post('/import-shp', [SigApotekController::class, 'importShapefile'])->middleware('throttle:10,10');
        Route::patch('/{sigApotek}', [SigApotekController::class, 'update']);
    });

    // --- Verifikasi oleh Tim IT/Admin (Superadmin) ---
    Route::prefix('admin')->middleware('role:superadmin')->group(function () {
        Route::get('/akun-pending', [AdminVerifikasiController::class, 'akunPending']);
        Route::patch('/akun/{user}/aktivasi', [AdminVerifikasiController::class, 'aktivasiAkun']);
        Route::get('/wfh-pending', [AdminVerifikasiController::class, 'wfhPending']);
        Route::patch('/wfh/{wfhLocation}/verifikasi', [AdminVerifikasiController::class, 'verifikasiWfh']);
    });

    // --- Dashboard Monitoring (khusus Kepala Balai & Superadmin) ---
    Route::get('/dashboard/kabalai', [DashboardController::class, 'kabalai'])
        ->middleware('role:superadmin|kepala_balai');

    // --- Booking Layanan Konsultasi & Pengaduan (Fungsi Infokom) ---
    // Bisa diakses akun internal maupun eksternal (masyarakat).
    Route::prefix('booking-konsultasi')->group(function () {
        Route::get('/', [BookingKonsultasiController::class, 'index']);
        Route::get('/slot', [BookingKonsultasiController::class, 'slotTersedia']);
        Route::post('/', [BookingKonsultasiController::class, 'store']);
    });
    Route::get('/booking-konsultasi-semua', [BookingKonsultasiController::class, 'semua'])
        ->middleware('role:superadmin|kepala_balai|pegawai_asn_pppk');
    Route::patch('/booking-konsultasi/{booking}/status', [BookingKonsultasiController::class, 'updateStatus'])
        ->middleware('role:superadmin|kepala_balai|pegawai_asn_pppk');
    // Konfigurasi slot booking (petugas Infokom).
    Route::get('/booking-config', [BookingKonsultasiController::class, 'getConfig'])
        ->middleware('role:superadmin|kepala_balai|pegawai_asn_pppk');
    Route::put('/booking-config', [BookingKonsultasiController::class, 'updateConfig'])
        ->middleware('role:superadmin|kepala_balai|pegawai_asn_pppk');

    // --- Publikasi Berita (Fungsi Infokom) ---
    Route::post('/berita', [BeritaController::class, 'store'])
        ->middleware('role:superadmin|kepala_balai|pegawai_asn_pppk');
});
