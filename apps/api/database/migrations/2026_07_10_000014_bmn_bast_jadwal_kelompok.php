<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * - users.kelompok_substansi: kelompok substansi pegawai ASN (PNS/PPPK).
 * - bmn_items.bast_path: dokumen BAST (PDF) per aset, dapat dipratinjau via QR.
 * - jadwal_pemeliharaan_bmn: perencanaan & realisasi pemeliharaan tiap BMN.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users') && ! Schema::hasColumn('users', 'kelompok_substansi')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('kelompok_substansi', 190)->nullable()->after('penugasan');
            });
        }

        if (Schema::hasTable('bmn_items') && ! Schema::hasColumn('bmn_items', 'bast_path')) {
            Schema::table('bmn_items', function (Blueprint $table) {
                $table->string('bast_path', 255)->nullable()->after('foto_path');
            });
        }

        if (! Schema::hasTable('jadwal_pemeliharaan_bmn')) {
            Schema::create('jadwal_pemeliharaan_bmn', function (Blueprint $table) {
                $table->id();
                $table->foreignId('bmn_item_id')->constrained('bmn_items')->cascadeOnDelete();
                $table->string('jenis_pemeliharaan', 120)->nullable(); // rutin/berkala/dll
                $table->date('rencana_tanggal')->nullable();
                $table->date('realisasi_tanggal')->nullable();
                $table->enum('status', ['belum', 'sudah'])->default('belum');
                $table->text('keterangan')->nullable();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->unique('bmn_item_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('jadwal_pemeliharaan_bmn');
        if (Schema::hasTable('bmn_items') && Schema::hasColumn('bmn_items', 'bast_path')) {
            Schema::table('bmn_items', fn (Blueprint $t) => $t->dropColumn('bast_path'));
        }
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'kelompok_substansi')) {
            Schema::table('users', fn (Blueprint $t) => $t->dropColumn('kelompok_substansi'));
        }
    }
};
