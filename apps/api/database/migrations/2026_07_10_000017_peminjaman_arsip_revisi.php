<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Revisi peminjaman arsip: tanda tangan pengembalian oleh KEDUA pihak
 * (peminjam saat mengembalikan, petugas saat mengesahkan).
 * ttd_kembali_at (lama) dipakai sebagai TTD petugas pada pengembalian.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('peminjaman_arsip', function (Blueprint $table) {
            if (! Schema::hasColumn('peminjaman_arsip', 'ttd_kembali_peminjam_at')) {
                $table->timestamp('ttd_kembali_peminjam_at')->nullable()->after('ttd_petugas_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('peminjaman_arsip', function (Blueprint $table) {
            $table->dropColumn('ttd_kembali_peminjam_at');
        });
    }
};
