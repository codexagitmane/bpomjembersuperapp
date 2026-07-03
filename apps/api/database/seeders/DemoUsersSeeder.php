<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Akun demo untuk pengembangan/uji coba SAJA.
 * ⚠️ WAJIB dihapus/diganti sebelum deployment produksi.
 */
class DemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $demoPassword = 'BpomJember@2026';

        $internal = [
            ['name' => 'Super Administrator', 'email' => 'superadmin@bpomjember.go.id', 'nip_nik' => '198001012000011001', 'role' => 'superadmin'],
            ['name' => 'Dra. Kepala Balai POM Jember', 'email' => 'kepala.balai@bpomjember.go.id', 'nip_nik' => '196505051990032002', 'role' => 'kepala_balai'],
            ['name' => 'Kepala Subag Tata Usaha', 'email' => 'kasubag.tu@bpomjember.go.id', 'nip_nik' => '197203032001121003', 'role' => 'kepala_subag_tu'],
            ['name' => 'Budi Santoso, S.Farm (ASN)', 'email' => 'pegawai.asn@bpomjember.go.id', 'nip_nik' => '199001152015031004', 'role' => 'pegawai_asn_pppk'],
            ['name' => 'Siti Aminah (Outsourcing)', 'email' => 'pegawai.outsourcing@bpomjember.go.id', 'nip_nik' => '3509012345678901', 'role' => 'pegawai_outsourcing_magang'],
        ];

        foreach ($internal as $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => $demoPassword,
                    'nip_nik' => $data['nip_nik'],
                    'account_type' => 'internal',
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]
            );
            $user->syncRoles([$data['role']]);
        }

        $masyarakat = User::updateOrCreate(
            ['email' => 'masyarakat@example.com'],
            [
                'name' => 'Warga Jember',
                'password' => 'Masyarakat@123',
                'phone' => '081234567890',
                'account_type' => 'eksternal',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
        $masyarakat->syncRoles(['masyarakat']);
    }
}
