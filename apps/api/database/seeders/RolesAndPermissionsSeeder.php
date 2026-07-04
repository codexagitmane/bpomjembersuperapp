<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $roles = [
            'superadmin',
            'kepala_balai',
            'kepala_subag_tu',
            'pegawai_asn_pppk',
            'pegawai_outsourcing_magang',
            'masyarakat',
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $aplikasiSlugs = [
            'booking_konsultasi',
            'sig_apotek',
            'presensi',
            'izin_keluar_masuk',
            'pengajuan_bmn',
            'barang_bukti',
            'manajemen_bahan_lab',
        ];

        foreach ($aplikasiSlugs as $slug) {
            Permission::firstOrCreate(['name' => "akses-{$slug}", 'guard_name' => 'web']);
        }

        $matrix = [
            'superadmin' => $aplikasiSlugs, // akses penuh
            'kepala_balai' => $aplikasiSlugs, // akses penuh (monitoring lintas fungsi)
            'kepala_subag_tu' => ['presensi', 'izin_keluar_masuk', 'pengajuan_bmn'],
            'pegawai_asn_pppk' => ['presensi', 'izin_keluar_masuk', 'pengajuan_bmn', 'sig_apotek', 'barang_bukti', 'booking_konsultasi', 'manajemen_bahan_lab'],
            'pegawai_outsourcing_magang' => ['presensi', 'izin_keluar_masuk'],
            'masyarakat' => ['booking_konsultasi'],
        ];

        foreach ($matrix as $roleName => $slugs) {
            $role = Role::findByName($roleName);
            $permissions = array_map(fn ($s) => "akses-{$s}", $slugs);
            $role->syncPermissions($permissions);
        }
    }
}
