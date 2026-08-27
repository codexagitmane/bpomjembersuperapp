<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Penanda Pengelola Gudang (mis. Yulia) — penandatangan SPB & SBBK.
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'is_pengelola_gudang')) {
                $table->boolean('is_pengelola_gudang')->default(false)->after('jenis_pegawai');
            }
        });
        DB::table('users')->where('email', 'yulia.anggraini@pom.go.id')->update(['is_pengelola_gudang' => true]);

        // Tahap Pengelola Gudang pada permintaan persediaan.
        Schema::table('permintaan_persediaan', function (Blueprint $table) {
            if (! Schema::hasColumn('permintaan_persediaan', 'approved_gudang_by')) {
                $table->foreignId('approved_gudang_by')->nullable()->after('approved_katim_at')->constrained('users')->nullOnDelete();
                $table->timestamp('approved_gudang_at')->nullable()->after('approved_gudang_by');
            }
        });

        // Alur baru: diajukan → disetujui_katim → disetujui_gudang → disetujui.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE permintaan_persediaan MODIFY status ENUM('diajukan','disetujui_katim','disetujui_gudang','disetujui_kasubag','disetujui','ditolak') NOT NULL DEFAULT 'diajukan'");
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_pengelola_gudang');
        });
        Schema::table('permintaan_persediaan', function (Blueprint $table) {
            $table->dropColumn(['approved_gudang_by', 'approved_gudang_at']);
        });
    }
};
