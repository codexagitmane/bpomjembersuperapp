<?php

use App\Http\Controllers\Api\PanduAiController;
use App\Http\Controllers\Api\AdminVerifikasiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BahanLabController;
use App\Http\Controllers\Api\BarangBuktiController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DashboardKasubagController;
use App\Http\Controllers\Api\DashboardSimbaController;
use App\Http\Controllers\Api\BeritaController;
use App\Http\Controllers\Api\BookingKonsultasiController;
use App\Http\Controllers\Api\CutiIzinController;
use App\Http\Controllers\Api\NotifikasiController;
use App\Http\Controllers\Api\IzinKeluarMasukController;
use App\Http\Controllers\Api\LaporanKeamananController;
use App\Http\Controllers\Api\LayananKonsumenController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\PeminjamanArsipController;
use App\Http\Controllers\Api\PerjalananDinasController;
use App\Http\Controllers\Api\PengajuanBmnController;
use App\Http\Controllers\Api\PersediaanBmnController;
use App\Http\Controllers\Api\PresensiController;
use App\Http\Controllers\Api\RekapPresensiController;
use App\Http\Controllers\Api\RosterKeamananController;
use App\Http\Controllers\Api\SecurityController;
use App\Http\Controllers\Api\SigApotekController;
use App\Http\Controllers\Api\TandaTanganController;
use App\Http\Controllers\Api\UserController;
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

// Landing publik (tanpa login) — hanya berita terbit, rate-limited.
Route::middleware('throttle:30,1')->group(function () {
    Route::get('/publik/berita', [BeritaController::class, 'index']);
    Route::get('/publik/berita/{slug}', [BeritaController::class, 'show']);
    // Verifikasi tanda tangan via QR (publik — hasil scan barcode pegawai).
    Route::get('/publik/ttd/{kode}', [TandaTanganController::class, 'verify']);
    Route::get('/publik/ttd/{kode}/qr', [TandaTanganController::class, 'qr']);
    // Detail aset BMN via QR (publik — hasil scan QR aset).
    Route::get('/publik/bmn/{bmnItem}', [PengajuanBmnController::class, 'publicBmn']);
});

Route::middleware('auth:sanctum')->group(function () {

    // --- SI PANDU AI: Asisten Pintar Pelaku Usaha ---
    Route::prefix('pandu')->group(function () {
        Route::get('/bootstrap', [PanduAiController::class, 'bootstrap']);
        Route::get('/regulasi', [PanduAiController::class, 'regulasi']);
        Route::get('/faq', [PanduAiController::class, 'faq']);
        Route::get('/kontak', [PanduAiController::class, 'kontak']);
        Route::get('/riwayat', [PanduAiController::class, 'riwayat']);
        Route::delete('/riwayat', [PanduAiController::class, 'hapusRiwayat']);
        Route::delete('/riwayat/{riwayat}', [PanduAiController::class, 'hapusRiwayat']);
        Route::get('/profil-usaha', [PanduAiController::class, 'profil']);
        Route::put('/profil-usaha', [PanduAiController::class, 'simpanProfil']);
        Route::middleware('throttle:30,1')->group(function () {
            Route::post('/chat', [PanduAiController::class, 'chat']);
            Route::post('/cek-produk', [PanduAiController::class, 'cekProduk']);
            Route::post('/cek-label', [PanduAiController::class, 'cekLabel']);
            Route::post('/edit-label', [PanduAiController::class, 'editLabel']);
            Route::post('/capa', [PanduAiController::class, 'capa']);
        });
    });

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

    // --- Cuti / Izin / Sakit (Fungsi Tata Usaha) ---
    Route::prefix('cuti-izin')->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk|pegawai_outsourcing_magang')->group(function () {
        Route::get('/', [CutiIzinController::class, 'index']);
        Route::post('/', [CutiIzinController::class, 'store']);
    });
    Route::get('/cuti-izin-semua', [CutiIzinController::class, 'semua'])
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu');
    // Kepala Balai perlu akses untuk tahap-2 persetujuan cuti outsourcing.
    Route::patch('/cuti-izin/{cutiIzin}/approve', [CutiIzinController::class, 'approve'])
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu');

    // --- Notifikasi in-app (semua user login) ---
    Route::prefix('notifikasi')->group(function () {
        Route::get('/', [NotifikasiController::class, 'index']);
        Route::patch('/baca-semua', [NotifikasiController::class, 'bacaSemua']);
        Route::patch('/{notifikasi}/baca', [NotifikasiController::class, 'baca']);
    });

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

    // --- Pengajuan & Pemeliharaan (PnP) BMN (Fungsi Tata Usaha) ---
    Route::prefix('pengajuan-bmn')->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk|pegawai_outsourcing_magang')->group(function () {
        Route::get('/', [PengajuanBmnController::class, 'index']);
        Route::get('/bmn-list', [PengajuanBmnController::class, 'bmnList']);
        Route::get('/pengelola-bmn', [PengajuanBmnController::class, 'pengelolaBmn']);
        Route::get('/cari-pegawai', [PengajuanBmnController::class, 'cariPegawai']);
        Route::get('/export', [PengajuanBmnController::class, 'exportPemeliharaan']);
        Route::get('/bmn-template', [PengajuanBmnController::class, 'bmnTemplate']);
        Route::post('/bmn-import', [PengajuanBmnController::class, 'importBmn'])->middleware('throttle:10,10');
        Route::post('/bmn', [PengajuanBmnController::class, 'storeBmn'])->middleware('throttle:30,1');
        Route::post('/bmn/{bmnItem}', [PengajuanBmnController::class, 'updateBmn'])->middleware('throttle:30,1');
        Route::delete('/bmn/{bmnItem}', [PengajuanBmnController::class, 'deleteBmn']);
        Route::get('/bmn/{bmnItem}/riwayat', [PengajuanBmnController::class, 'riwayatBmn']);
        Route::get('/bmn/{bmnItem}/qr', [PengajuanBmnController::class, 'qrAset']);
        Route::get('/jadwal', [PengajuanBmnController::class, 'jadwalIndex']);
        Route::get('/jadwal-tahun', [PengajuanBmnController::class, 'jadwalTahun']);
        Route::get('/jadwal-template', [PengajuanBmnController::class, 'jadwalTemplate']);
        Route::post('/jadwal-import', [PengajuanBmnController::class, 'jadwalImport'])->middleware('throttle:20,1');
        Route::post('/jadwal/{bmnItem}', [PengajuanBmnController::class, 'jadwalUpsert'])->middleware('throttle:120,1');
        Route::post('/', [PengajuanBmnController::class, 'store'])->middleware('throttle:20,1');
        Route::get('/{pengajuan}', [PengajuanBmnController::class, 'show']);
        Route::get('/{pengajuan}/pdf', [PengajuanBmnController::class, 'pdf']);
        Route::patch('/{pengajuan}/proses', [PengajuanBmnController::class, 'proses']);
        Route::patch('/{pengajuan}/selesaikan', [PengajuanBmnController::class, 'selesaikan']);
        Route::patch('/{pengajuan}/tolak', [PengajuanBmnController::class, 'tolak']);
    });
    Route::get('/pengajuan-bmn-semua', [PengajuanBmnController::class, 'semua'])
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk');

    // --- Persediaan Barang Milik Negara (Fungsi Tata Usaha) ---
    Route::prefix('persediaan-bmn')
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk')
        ->group(function () {
            Route::get('/katalog', [PersediaanBmnController::class, 'katalog']);
            Route::get('/ketua-tim', [PersediaanBmnController::class, 'ketuaTim']);
            Route::get('/kedaluwarsa', [PersediaanBmnController::class, 'kedaluwarsa']);
            Route::post('/', [PersediaanBmnController::class, 'simpanItem']);
            Route::patch('/{persediaan}', [PersediaanBmnController::class, 'updateItem']);
            Route::delete('/{persediaan}', [PersediaanBmnController::class, 'hapusItem']);
            Route::get('/permintaan', [PersediaanBmnController::class, 'daftarPermintaan']);
            Route::post('/permintaan', [PersediaanBmnController::class, 'ajukan'])->middleware('throttle:20,1');
            Route::patch('/permintaan/{permintaan}/putuskan', [PersediaanBmnController::class, 'putuskan']);
            Route::patch('/permintaan/{permintaan}/ajukan-ulang', [PersediaanBmnController::class, 'ajukanUlang']);
            Route::get('/permintaan/{permintaan}/spb', [PersediaanBmnController::class, 'spb']);
            Route::get('/permintaan/{permintaan}/sbbk', [PersediaanBmnController::class, 'sbbk']);
            // Transaksi masuk (pembelian / transfer) & stock opname (barang keluar FIFO).
            Route::get('/masuk', [PersediaanBmnController::class, 'daftarMasuk']);
            Route::post('/masuk', [PersediaanBmnController::class, 'transaksiMasuk'])->middleware('throttle:60,1');
            Route::get('/masuk-template', [PersediaanBmnController::class, 'templateMasuk']);
            Route::post('/masuk-import', [PersediaanBmnController::class, 'importMasuk'])->middleware('throttle:20,1');
            Route::get('/stock-opname', [PersediaanBmnController::class, 'stockOpname']);
        });

    // --- Peminjaman & Pengembalian Arsip Aktif/Inaktif (Kearsipan) ---
    Route::prefix('peminjaman-arsip')
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk')
        ->group(function () {
            Route::get('/', [PeminjamanArsipController::class, 'index']);
            Route::get('/petugas', [PeminjamanArsipController::class, 'petugas']);
            Route::post('/', [PeminjamanArsipController::class, 'store'])->middleware('throttle:30,1');
            Route::get('/{peminjaman}/pdf', [PeminjamanArsipController::class, 'pdf']);
            Route::patch('/{peminjaman}/setujui', [PeminjamanArsipController::class, 'setujui']);
            Route::patch('/{peminjaman}/tolak', [PeminjamanArsipController::class, 'tolak']);
            Route::patch('/{peminjaman}/kembalikan', [PeminjamanArsipController::class, 'kembalikan']);
            Route::patch('/{peminjaman}/selesaikan', [PeminjamanArsipController::class, 'selesaikan']);
        });

    // --- Sistem Informasi Layanan Konsumen (Fungsi Infokom) ---
    // Berisi data pribadi konsumen (PII): dibatasi ke staf ASN/pimpinan,
    // bukan outsourcing/magang (least-privilege).
    Route::prefix('layanan-konsumen')
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk')
        ->group(function () {
            Route::get('/', [LayananKonsumenController::class, 'index']);
            Route::post('/', [LayananKonsumenController::class, 'store'])->middleware('throttle:30,1');
            Route::get('/{layananKonsumen}', [LayananKonsumenController::class, 'show']);
            Route::get('/{layananKonsumen}/word', [LayananKonsumenController::class, 'word']);
            Route::get('/{layananKonsumen}/pdf', [LayananKonsumenController::class, 'pdf']);
        });

    // --- Aplikasi Perjalanan Dinas (Fungsi Tata Usaha) ---
    Route::prefix('perjalanan-dinas')
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk')
        ->group(function () {
            Route::get('/', [PerjalananDinasController::class, 'index']);
            Route::post('/', [PerjalananDinasController::class, 'store'])->middleware('throttle:30,1');
            Route::delete('/{perjalananDina}', [PerjalananDinasController::class, 'destroy']);
            Route::get('/{perjalananDina}/pdf', [PerjalananDinasController::class, 'pdf']);
        });

    // --- Monitoring Barang Bukti (Fungsi Penindakan) ---
    Route::prefix('barang-bukti')->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk')->group(function () {
        Route::get('/', [BarangBuktiController::class, 'index']);
        Route::get('/{barangBukti}', [BarangBuktiController::class, 'show']);
        Route::post('/', [BarangBuktiController::class, 'store']);
        Route::post('/{barangBukti}/log', [BarangBuktiController::class, 'tambahLog']);
        Route::post('/{barangBukti}/foto', [BarangBuktiController::class, 'uploadFoto'])->middleware('throttle:20,1');
        Route::get('/{barangBukti}/berita-acara', [BarangBuktiController::class, 'beritaAcara']);
    });

    // --- SIG Monitoring & Pemetaan Distribusi Apotek (Fungsi Pemeriksaan) ---
    Route::prefix('sig-apotek')->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk')->group(function () {
        Route::get('/', [SigApotekController::class, 'index']);
        Route::post('/', [SigApotekController::class, 'store']);
        Route::post('/import-excel', [SigApotekController::class, 'importSpreadsheet'])->middleware('throttle:10,10');
        Route::post('/import-shp', [SigApotekController::class, 'importShapefile'])->middleware('throttle:10,10');
        Route::patch('/{sigApotek}', [SigApotekController::class, 'update']);
    });

    // --- Manajemen Bahan Laboratorium & Dashboard SIMBA (Fungsi Pengujian) ---
    Route::prefix('bahan-lab')->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk')->group(function () {
        Route::get('/', [BahanLabController::class, 'index']);
        Route::post('/', [BahanLabController::class, 'store']);
        Route::patch('/{bahanLab}', [BahanLabController::class, 'update']);
        Route::post('/{bahanLab}/pemakaian', [BahanLabController::class, 'catatPemakaian']);
        Route::get('/{bahanLab}/riwayat', [BahanLabController::class, 'riwayatPemakaian']);
    });
    Route::get('/dashboard/simba', [DashboardSimbaController::class, 'index'])
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk');

    // --- Laporan Patroli Petugas Keamanan (khusus jenis 'keamanan') ---
    Route::prefix('laporan-keamanan')->group(function () {
        Route::get('/', [LaporanKeamananController::class, 'index']);
        Route::post('/', [LaporanKeamananController::class, 'store'])->middleware('throttle:20,1');
    });
    Route::get('/laporan-keamanan-semua', [LaporanKeamananController::class, 'semua'])
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu');

    // --- Update profil milik sendiri (semua user login) ---
    Route::patch('/profil', [UserController::class, 'updateSelf']);
    // Foto profil & 2FA (keamanan akun).
    Route::post('/profil/avatar', [SecurityController::class, 'uploadAvatar'])->middleware('throttle:20,1');
    Route::delete('/profil/avatar', [SecurityController::class, 'hapusAvatar']);
    Route::post('/profil/2fa/setup', [SecurityController::class, 'twoFactorSetup']);
    Route::post('/profil/2fa/confirm', [SecurityController::class, 'twoFactorConfirm'])->middleware('throttle:10,1');
    Route::post('/profil/2fa/disable', [SecurityController::class, 'twoFactorDisable']);
    Route::post('/profil/2fa/recovery-codes', [SecurityController::class, 'recoveryCodes']);

    // --- Manajemen Pegawai / User (Fungsi Tata Usaha, khusus Superadmin) ---
    Route::prefix('pegawai')->middleware('role:superadmin')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::get('/opsi', [UserController::class, 'opsi']);
        Route::get('/{user}', [UserController::class, 'show']);
        Route::post('/', [UserController::class, 'store']);
        Route::patch('/{user}', [UserController::class, 'update']);
        Route::patch('/{user}/reset-password', [UserController::class, 'resetPassword']);
        Route::delete('/{user}', [UserController::class, 'destroy']);
    });

    // --- Verifikasi oleh Tim IT/Admin (Superadmin) ---
    Route::prefix('admin')->middleware('role:superadmin')->group(function () {
        Route::get('/tanda-tangan', [TandaTanganController::class, 'index']);
        Route::post('/tanda-tangan', [TandaTanganController::class, 'simpan']);
        Route::delete('/tanda-tangan/{user}', [TandaTanganController::class, 'hapus']);
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
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk');
    Route::patch('/booking-konsultasi/{booking}/status', [BookingKonsultasiController::class, 'updateStatus'])
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk');
    // Konfigurasi slot booking (petugas Infokom).
    Route::get('/booking-config', [BookingKonsultasiController::class, 'getConfig'])
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk');
    Route::put('/booking-config', [BookingKonsultasiController::class, 'updateConfig'])
        ->middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk');

    // --- Publikasi Berita (Fungsi Infokom) ---
    // Kelola penuh: daftar (termasuk draft), buat, ubah, terbitkan, hapus.
    Route::middleware('role:superadmin|kepala_balai|kepala_subag_tu|pegawai_asn_pppk')->group(function () {
        Route::get('/kelola-berita', [BeritaController::class, 'kelola']);
        Route::get('/kelola-berita/{berita}', [BeritaController::class, 'detail']);
        Route::post('/berita', [BeritaController::class, 'store']);
        Route::post('/berita/{berita}', [BeritaController::class, 'update']);
        Route::patch('/berita/{berita}/status', [BeritaController::class, 'ubahStatus']);
        Route::delete('/berita/{berita}', [BeritaController::class, 'destroy']);
    });
});
