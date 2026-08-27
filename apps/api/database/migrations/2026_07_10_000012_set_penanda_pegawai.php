<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Menetapkan penanda peran fungsional (Pengelola BMN, Pengelola Gudang,
 * Ketua Tim) langsung di database.
 *
 * Alasan: perintah boot produksi hanya menjalankan `php artisan migrate --force`
 * tanpa `db:seed`, sehingga penanda yang sebelumnya hanya diset di PegawaiSeeder
 * tidak pernah diterapkan pada database yang sudah berisi data. Migrasi ini
 * idempotent — pada deploy fresh (users belum ada) UPDATE hanya mengenai 0 baris
 * lalu seeder mengisi ulang; pada database eksisting penanda langsung terpasang.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        if (Schema::hasColumn('users', 'is_pengelola_bmn')) {
            DB::table('users')
                ->whereIn('email', ['qithfirul.bahrowi@pom.go.id', 'yulia.anggraini@pom.go.id'])
                ->update(['is_pengelola_bmn' => true]);
        }

        if (Schema::hasColumn('users', 'is_pengelola_gudang')) {
            DB::table('users')
                ->where('email', 'yulia.anggraini@pom.go.id')
                ->update(['is_pengelola_gudang' => true]);
        }

        if (Schema::hasColumn('users', 'is_ketua_tim') && Schema::hasColumn('users', 'fungsi_ketua_tim')) {
            $ketuaTim = [
                'puji.lestari@pom.go.id' => 'tata_usaha',
                'rini.setyaningsih@pom.go.id' => 'infokom',
                'yusita.harminingsih@pom.go.id' => 'pemeriksaan',
                'daniel.prasetiawan@pom.go.id' => 'penindakan',
            ];
            foreach ($ketuaTim as $email => $fungsi) {
                DB::table('users')
                    ->where('email', $email)
                    ->update(['is_ketua_tim' => true, 'fungsi_ketua_tim' => $fungsi]);
            }
        }
    }

    public function down(): void
    {
        // Penanda peran tidak dihapus saat rollback agar data operasional aman.
    }
};
