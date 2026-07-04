<?php

namespace Database\Seeders;

use App\Models\RosterKeamanan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/** Contoh roster shift keamanan bulan berjalan (agar demo presensi keamanan jalan). */
class RosterKeamananSeeder extends Seeder
{
    public function run(): void
    {
        $keamanan = User::where('jenis_pegawai', 'keamanan')->first();
        if (! $keamanan) {
            return;
        }
        $admin = User::role('superadmin')->first() ?? $keamanan;

        $awal = now()->startOfMonth();
        $akhir = now()->endOfMonth();
        $cursor = $awal->copy();
        while ($cursor <= $akhir) {
            // Demo: petugas tunggal bertugas hari ganjil (pola shift bergantian).
            if ($cursor->day % 2 === 1) {
                RosterKeamanan::updateOrCreate(
                    ['user_id' => $keamanan->id, 'tanggal' => $cursor->toDateString()],
                    ['shift' => 'malam', 'created_by' => $admin->id]
                );
            }
            $cursor->addDay();
        }
    }
}
