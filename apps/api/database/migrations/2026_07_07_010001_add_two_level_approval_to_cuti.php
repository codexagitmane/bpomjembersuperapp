<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cuti pegawai outsourcing/magang butuh persetujuan berjenjang:
 * Kasubag TU dulu, lalu Kepala Balai. ASN/PPPK cukup satu tahap (Kasubag).
 * Kolom status lama tetap dipakai (diajukan/disetujui/ditolak); untuk
 * outsourcing status tetap "diajukan" sampai kedua tahap selesai.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cuti_izin', function (Blueprint $table) {
            $table->foreignId('approval_kasubag_by')->nullable()->after('catatan_approval')->constrained('users')->nullOnDelete();
            $table->timestamp('approval_kasubag_at')->nullable()->after('approval_kasubag_by');
            $table->foreignId('approval_kabalai_by')->nullable()->after('approval_kasubag_at')->constrained('users')->nullOnDelete();
            $table->timestamp('approval_kabalai_at')->nullable()->after('approval_kabalai_by');
        });
    }

    public function down(): void
    {
        Schema::table('cuti_izin', function (Blueprint $table) {
            $table->dropConstrainedForeignId('approval_kasubag_by');
            $table->dropColumn('approval_kasubag_at');
            $table->dropConstrainedForeignId('approval_kabalai_by');
            $table->dropColumn('approval_kabalai_at');
        });
    }
};
