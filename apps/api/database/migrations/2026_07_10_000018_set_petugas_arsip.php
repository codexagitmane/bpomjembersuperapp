<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Menetapkan penanda Petugas Arsip via migrasi data (dijalankan tiap
 * `migrate --force`), agar dropdown petugas terisi walau seeder tak sempat
 * menerapkannya pada database yang sudah berisi data.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'is_pengelola_arsip')) {
            return;
        }
        $aktif = [
            'qithfirul.bahrowi@pom.go.id' => 'tata_usaha',
            'yodi.setiadi@pom.go.id' => 'pemeriksaan',
            'Rianita.pambukowati@pom.go.id' => 'infokom',
            'tiara.hapsari@pom.go.id' => 'pengujian',
            'yonanda.christiadi@pom.go.id' => 'penindakan',
        ];
        foreach ($aktif as $email => $fungsi) {
            DB::table('users')->where('email', $email)->update(['is_pengelola_arsip' => true, 'fungsi_arsip' => $fungsi]);
        }
        DB::table('users')->where('email', 'tasya.tamara@pom.go.id')->update(['is_arsiparis' => true]);
    }

    public function down(): void
    {
        // Penanda tidak dihapus saat rollback.
    }
};
