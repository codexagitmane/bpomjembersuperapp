<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Foto fisik BMN untuk detail & QR aset. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bmn_items', function (Blueprint $table) {
            if (! Schema::hasColumn('bmn_items', 'foto_path')) {
                $table->string('foto_path')->nullable()->after('tahun_perolehan');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bmn_items', function (Blueprint $table) {
            $table->dropColumn('foto_path');
        });
    }
};
