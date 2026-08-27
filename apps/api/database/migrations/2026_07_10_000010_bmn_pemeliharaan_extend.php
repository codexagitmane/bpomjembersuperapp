<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Perluasan modul Pemeliharaan BMN: NUP & jenis BMN, kondisi rusak (ringan/sedang/berat).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bmn_items', function (Blueprint $table) {
            if (! Schema::hasColumn('bmn_items', 'nup')) {
                $table->string('nup', 40)->nullable()->after('kode_barang');
            }
            if (! Schema::hasColumn('bmn_items', 'jenis_bmn')) {
                $table->string('jenis_bmn', 120)->nullable()->after('nama_barang');
            }
        });

        Schema::table('pengajuan_bmn', function (Blueprint $table) {
            if (! Schema::hasColumn('pengajuan_bmn', 'kondisi')) {
                $table->string('kondisi', 30)->nullable()->after('deskripsi_kerusakan');
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE bmn_items MODIFY kondisi ENUM('baik','rusak_ringan','rusak_sedang','rusak_berat') NOT NULL DEFAULT 'baik'");
        }
    }

    public function down(): void
    {
        Schema::table('bmn_items', function (Blueprint $table) {
            $table->dropColumn(['nup', 'jenis_bmn']);
        });
        Schema::table('pengajuan_bmn', function (Blueprint $table) {
            $table->dropColumn('kondisi');
        });
    }
};
