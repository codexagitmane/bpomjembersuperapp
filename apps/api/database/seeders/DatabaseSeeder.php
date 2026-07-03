<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            FungsiAplikasiSeeder::class,
            PengaturanSeeder::class,
            DemoUsersSeeder::class,
            BeritaSeeder::class,
        ]);
    }
}
