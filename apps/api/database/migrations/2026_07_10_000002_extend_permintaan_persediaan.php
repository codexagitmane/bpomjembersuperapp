<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tahap Ketua Tim/Fungsi + alasan tolak + justifikasi revisi.
        Schema::table('permintaan_persediaan', function (Blueprint $table) {
            if (! Schema::hasColumn('permintaan_persediaan', 'approved_katim_by')) {
                $table->foreignId('approved_katim_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
                $table->timestamp('approved_katim_at')->nullable()->after('approved_katim_by');
            }
            if (! Schema::hasColumn('permintaan_persediaan', 'alasan_tolak')) {
                $table->string('alasan_tolak', 500)->nullable();
            }
            if (! Schema::hasColumn('permintaan_persediaan', 'justifikasi')) {
                $table->string('justifikasi', 500)->nullable();
            }
            if (! Schema::hasColumn('permintaan_persediaan', 'unit_kerja')) {
                $table->string('unit_kerja', 190)->nullable();
            }
        });

        // Tambah status disetujui_katim (MySQL enum) — abaikan bila bukan MySQL.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE permintaan_persediaan MODIFY status ENUM('diajukan','disetujui_katim','disetujui_kasubag','disetujui','ditolak') NOT NULL DEFAULT 'diajukan'");
        }
    }

    public function down(): void
    {
        Schema::table('permintaan_persediaan', function (Blueprint $table) {
            $table->dropColumn(['approved_katim_by', 'approved_katim_at', 'alasan_tolak', 'justifikasi', 'unit_kerja']);
        });
    }
};
