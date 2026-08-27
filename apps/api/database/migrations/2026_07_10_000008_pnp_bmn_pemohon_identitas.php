<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Simpan identitas pemohon (nama & NIP) apa adanya sesuai isian formulir —
 * NIP dapat diketik & disinkronkan dari data pegawai (nama/jabatan terisi otomatis).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pengajuan_bmn', function (Blueprint $table) {
            if (! Schema::hasColumn('pengajuan_bmn', 'pemohon_nama')) {
                $table->string('pemohon_nama', 190)->nullable()->after('jabatan');
            }
            if (! Schema::hasColumn('pengajuan_bmn', 'pemohon_nip')) {
                $table->string('pemohon_nip', 40)->nullable()->after('pemohon_nama');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pengajuan_bmn', function (Blueprint $table) {
            $table->dropColumn(['pemohon_nama', 'pemohon_nip']);
        });
    }
};
