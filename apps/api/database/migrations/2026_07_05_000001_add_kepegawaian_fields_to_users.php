<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Status kepegawaian untuk pengelompokan & pengurutan data pegawai:
            // asn → PNS/CPNS, pppk → P3K, outsourcing, magang.
            $table->string('status_kepegawaian', 20)->nullable()->after('jenis_pegawai');
            $table->string('jabatan')->nullable()->after('status_kepegawaian');
            $table->string('penugasan')->nullable()->after('jabatan');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['status_kepegawaian', 'jabatan', 'penugasan']);
        });
    }
};
