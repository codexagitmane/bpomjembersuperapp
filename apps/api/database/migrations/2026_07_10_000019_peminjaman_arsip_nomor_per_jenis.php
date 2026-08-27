<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Nomor bukti peminjaman dipisah per jenis: Arsip Aktif & Inaktif masing-masing
 * memulai urutan dari 001, sehingga nomor "001/07/2026" bisa muncul di keduanya.
 * Keunikan diubah dari global (nomor) menjadi komposit (jenis, nomor).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('peminjaman_arsip')) {
            return;
        }
        Schema::table('peminjaman_arsip', function (Blueprint $table) {
            try {
                $table->dropUnique('peminjaman_arsip_nomor_unique');
            } catch (\Throwable $e) {
                // Indeks mungkin sudah tidak ada; abaikan.
            }
        });
        Schema::table('peminjaman_arsip', function (Blueprint $table) {
            $table->unique(['jenis', 'nomor'], 'peminjaman_arsip_jenis_nomor_unique');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('peminjaman_arsip')) {
            return;
        }
        Schema::table('peminjaman_arsip', function (Blueprint $table) {
            try {
                $table->dropUnique('peminjaman_arsip_jenis_nomor_unique');
            } catch (\Throwable $e) {
                // abaikan
            }
            $table->unique('nomor', 'peminjaman_arsip_nomor_unique');
        });
    }
};
