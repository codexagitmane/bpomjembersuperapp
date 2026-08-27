<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Kelompok kode: ATK (Alat Tulis Kantor) vs PSD (Persediaan lain: tinta,
        // catridge, bahan/test kit lab, dll) — menentukan format nomor SPB.
        Schema::table('persediaan_bmn', function (Blueprint $table) {
            if (! Schema::hasColumn('persediaan_bmn', 'kelompok')) {
                $table->enum('kelompok', ['atk', 'psd'])->default('psd')->after('kategori');
            }
        });
        // ATK hanya untuk kategori 'atk'; selebihnya PSD.
        DB::table('persediaan_bmn')->where('kategori', 'atk')->update(['kelompok' => 'atk']);
        DB::table('persediaan_bmn')->where('kategori', '!=', 'atk')->update(['kelompok' => 'psd']);

        Schema::table('permintaan_persediaan', function (Blueprint $table) {
            if (! Schema::hasColumn('permintaan_persediaan', 'kelompok')) {
                $table->string('kelompok', 4)->nullable()->after('nomor');
                $table->unsignedInteger('nomor_urut')->nullable()->after('kelompok');
            }
        });
    }

    public function down(): void
    {
        Schema::table('persediaan_bmn', function (Blueprint $table) {
            $table->dropColumn('kelompok');
        });
        Schema::table('permintaan_persediaan', function (Blueprint $table) {
            $table->dropColumn(['kelompok', 'nomor_urut']);
        });
    }
};
