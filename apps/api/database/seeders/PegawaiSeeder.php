<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Data pegawai riil Balai POM di Jember (Bezzeting 03 November 2025).
 * Urutan: ASN (PNS/CPNS) → P3K (PPPK) → Outsourcing → Magang.
 * Password di-generate acak; lihat lampiran kredensial yang diberikan terpisah.
 * Bersifat idempotent (updateOrCreate berdasarkan email).
 */
class PegawaiSeeder extends Seeder
{
    public function run(): void
    {
        $pegawai = [
            ['name' => 'Dra. Any Koosbudiwati, Apt', 'email' => 'dra.any@bpomjember.go.id', 'nip' => '196604201992032001', 'jabatan' => '', 'penugasan' => '', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'MIh3iLxt1f'],
            ['name' => 'Benny Hendrawan Prabowo, S.Farm, Apt.', 'email' => 'benyy.prabowo@pom.go.id', 'nip' => '198404012007121001', 'jabatan' => 'Kepala Balai POM di Jember', 'penugasan' => 'Kepala Balai POM di Jember', 'status' => 'asn', 'role' => 'kepala_balai', 'jenis' => 'pegawai', 'password' => 'BJ4UgD3MzK'],
            ['name' => 'Puji Lestari, SE', 'email' => 'puji.lestari@pom.go.id', 'nip' => '198810172014022002', 'jabatan' => 'Kepala Sub Bagian Tata Usaha pada Balai POM di Jember', 'penugasan' => 'Kepala Sub Bagian Tata Usaha pada Balai POM di Jember', 'status' => 'asn', 'role' => 'kepala_subag_tu', 'jenis' => 'pegawai', 'password' => 'cyVhbirzf1'],
            ['name' => 'Yusita Harminingsih, S.Farm., Apt', 'email' => 'yusita.harminingsih@pom.go.id', 'nip' => '198105312006042005', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Muda', 'penugasan' => 'Kelompok Substansi Pemeriksaan', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'XMuVxiKt2A'],
            ['name' => 'Diana Pristawiti Novira, STP, M.Si', 'email' => 'diana.pristawiti@pom.go.id', 'nip' => '197911092005012001', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Muda', 'penugasan' => 'Kelompok Substansi Informasi dan Komunikasi dan Pemeriksaan', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'CT8ZsrnO5e'],
            ['name' => 'Wildansyah Azami, S.Farm, Apt', 'email' => 'wildansyah.azami@pom.go.id', 'nip' => '199007172018011001', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Muda', 'penugasan' => 'Kelompok Substansi Pemeriksaan', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'R81w5YKiPh'],
            ['name' => 'Ika Rizki Helwandi, S.Farm., Apt.', 'email' => 'ika.helwandi@pom.go.id', 'nip' => '199401042019032004', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Muda', 'penugasan' => 'Kelompok Substansi Pemeriksaan', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => '0xCTJtNmJm'],
            ['name' => 'Mia Riswani, S.Farm., Apt.', 'email' => 'mia.riswani@pom.go.id', 'nip' => '199407262019032007', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Muda', 'penugasan' => 'Kelompok Substansi Pemeriksaan', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'sqFj7RMGX1'],
            ['name' => 'Tiara Dimas Hapsari, S.Farm., Apt.', 'email' => 'tiara.hapsari@pom.go.id', 'nip' => '199510032019032003', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => 'Kelompok Substansi Pemeriksaan dan Pengujian', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'eJEeINm14L'],
            ['name' => 'Yodi Setiadi, S.Farm., Apt.', 'email' => 'yodi.setiadi@pom.go.id', 'nip' => '199404302019031001', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => 'Kelompok Substansi Pemeriksaan', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'K1GPe5aF4h'],
            ['name' => 'Ayu Safitri, S.TP', 'email' => 'ayu.safitri@pom.go.id', 'nip' => '199306132019032004', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => 'Kelompok Substansi Pemeriksaan', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'C0pkLttkci'],
            ['name' => 'Putu Shintya Ari Pratiwi, S.TP.', 'email' => 'shintya.pratiwi@pom.go.id', 'nip' => '199401182019032005', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => 'Kelompok Substansi Pemeriksaan', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => '0YiLS65c42'],
            ['name' => 'Daniel Prasetiawan, S.H.', 'email' => 'daniel.prasetiawan@pom.go.id', 'nip' => '199606192019031002', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => 'Kelompok Substansi Penindakan; Kelompok Substansi Pemeriksaan', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'NQcsBR13lc'],
            ['name' => 'Yonanda Christiadi, S.H.', 'email' => 'yonanda.christiadi@pom.go.id', 'nip' => '199510242019031001', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => 'Kelompok Substansi Penindakan; Kelompok Substansi Pemeriksaan', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'WMgVJ5AkfE'],
            ['name' => 'Ida Farida, S.Si', 'email' => 'ida.f@pom.go.id', 'nip' => '199507152019032007', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => 'Kelompok Substansi Pengujian; Kelompok Substansi Pemeriksaan', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'htiGhlB7C5'],
            ['name' => 'Rini Indah Setyaningsih, SKM', 'email' => 'rini.setyaningsih@pom.go.id', 'nip' => '199601232019032007', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => 'Kelompok Substansi Informasi dan Komunikasi; Kelompok Substansi Pemeriksaan', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'WYusBkFSm0'],
            ['name' => 'Prisca Akvila, S.E', 'email' => 'prisca.akvila@pom.go.id', 'nip' => '199305142019032004', 'jabatan' => 'Analis Pengelolaan Keuangan APBN Ahli Pertama', 'penugasan' => 'Kelompok Substansi Tata Usaha', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'CNGfbULTWd'],
            ['name' => 'Qithfirul Bahrowi, A.Md.', 'email' => 'qithfirul.bahrowi@pom.go.id', 'nip' => '199702262019031001', 'jabatan' => 'Pranata Komputer Terampil', 'penugasan' => 'Kelompok Substansi Tata Usaha', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'WvYYcbLcGV'],
            ['name' => 'Diah Wahyuni, A.Md. Akun', 'email' => 'diah.wahyuni@pom.go.id', 'nip' => '199606022022032004', 'jabatan' => 'Pranata Keuangan APBN Terampil', 'penugasan' => 'Kelompok Substansi Tata Usaha', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'iykp3khIcC'],
            ['name' => 'Prasetya Ramadhan, S.Si', 'email' => 'prasetya.ramadhan@pom.go.id', 'nip' => '198804182022031002', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => 'Kelompok Substansi Informasi dan Komunikasi; Kelompok Substansi Pemeriksaan; Kelompok Substansi Pengujian', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => '0c9yzjioug'],
            ['name' => 'Baiq Nisrina Nurubay, S.T.P.', 'email' => 'baiq.nurubay@pom.go.id', 'nip' => '199810202025062010', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => '', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => '7fflyH3r6u'],
            ['name' => 'Yulia Kartika Nur Anggraini, A.Md. A.B.', 'email' => 'yulia.anggraini@pom.go.id', 'nip' => '200107192025062005', 'jabatan' => 'Penata Laksana Barang Terampil', 'penugasan' => '', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'PxhkCOmZdL'],
            ['name' => 'Rizky Andina Anggraeni, S.M.', 'email' => 'rizky.anggraeni@pom.go.id', 'nip' => '199911132025062007', 'jabatan' => 'Perencana Ahli Pertama', 'penugasan' => '', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'WAPynGoCHN'],
            ['name' => 'Nindya Widyanti, S.Si.', 'email' => 'nindya.widyanti@pom.go.id', 'nip' => '200006052025062012', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => '', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'MvZ91nQ1l0'],
            ['name' => 'Tasya Zulanda Tamara, A.Md. A.Pkt', 'email' => 'tasya.tamara@pom.go.id', 'nip' => '200010172025062010', 'jabatan' => 'Arsiparis Terampil', 'penugasan' => '', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'gXw1se4WjW'],
            ['name' => 'Made Hanami Asri Giri, S. Gz', 'email' => 'hanami.asri@pom.go.id', 'nip' => '199709112025062011', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => '', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'nYbwY5Ijee'],
            ['name' => 'Fii Ahsan Qauly, A.Md.Kom', 'email' => 'fii.qauly@pom.go.id', 'nip' => '200002162025061003', 'jabatan' => 'Pranata SDM Aparatur Terampil', 'penugasan' => '', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'adbd5S06j4'],
            ['name' => 'Hesyandi, S.T.P.', 'email' => 'hesyandi@pom.go.id', 'nip' => '199510282025061004', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => '', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => '3qAfc3AqI3'],
            ['name' => 'Addevia Illahi, S.Farm.', 'email' => 'addevia.illahi@pom.go.id', 'nip' => '200101172025062006', 'jabatan' => 'Penata Kelola Obat dan Makanan', 'penugasan' => '', 'status' => 'asn', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'UgxzUJNZJp'],
            ['name' => 'Rianita Pambukowati, S.Si', 'email' => 'Rianita.pambukowati@pom.go.id', 'nip' => '199805172024212012', 'jabatan' => 'Pengawas Farmasi dan Makanan Ahli Pertama', 'penugasan' => 'Kelompok Substansi Informasi dan Komunikasi', 'status' => 'pppk', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'qGWRlmjX98'],
            ['name' => 'Anggie Afrida, S.Ak', 'email' => 'anggie.afrida@pom.go.id', 'nip' => '199704182025212035', 'jabatan' => 'Penata Layanan Operasional', 'penugasan' => 'Kelompok Substansi Tata Usaha', 'status' => 'pppk', 'role' => 'pegawai_asn_pppk', 'jenis' => 'pegawai', 'password' => 'HUgE1GWZmS'],
            ['name' => 'Dani Triawan', 'email' => 'dani.triawan@bpomjember.go.id', 'nip' => '', 'jabatan' => 'Petugas Keamanan', 'penugasan' => '', 'status' => 'outsourcing', 'role' => 'pegawai_outsourcing_magang', 'jenis' => 'keamanan', 'password' => 'YSrivRspAa'],
            ['name' => 'Erawanto', 'email' => 'erawanto@bpomjember.go.id', 'nip' => '', 'jabatan' => 'Petugas Keamanan', 'penugasan' => '', 'status' => 'outsourcing', 'role' => 'pegawai_outsourcing_magang', 'jenis' => 'keamanan', 'password' => 'JYEyZ3jzkv'],
            ['name' => 'Bambang Elok Kurniawan', 'email' => 'bambang.elok@bpomjember.go.id', 'nip' => '', 'jabatan' => 'Petugas Kebersihan', 'penugasan' => '', 'status' => 'outsourcing', 'role' => 'pegawai_outsourcing_magang', 'jenis' => 'kebersihan', 'password' => 'KWk5n8n7qW'],
            ['name' => 'Imam Dwi Nur Cahyo', 'email' => 'imam.dwi@bpomjember.go.id', 'nip' => '', 'jabatan' => 'Pengemudi', 'penugasan' => '', 'status' => 'outsourcing', 'role' => 'pegawai_outsourcing_magang', 'jenis' => 'pengemudi', 'password' => 'bkD3OVeThE'],
            ['name' => 'Alex Andriawan', 'email' => 'alex.andriawan@bpomjember.go.id', 'nip' => '', 'jabatan' => 'Petugas Keamanan', 'penugasan' => '', 'status' => 'outsourcing', 'role' => 'pegawai_outsourcing_magang', 'jenis' => 'keamanan', 'password' => 'rr73mkaHx6'],
            ['name' => 'Inu Manarul Hidayat', 'email' => 'inu.manarul@bpomjember.go.id', 'nip' => '', 'jabatan' => 'Petugas Keamanan', 'penugasan' => '', 'status' => 'outsourcing', 'role' => 'pegawai_outsourcing_magang', 'jenis' => 'keamanan', 'password' => 'yadSd0XRrl'],
            ['name' => 'Rudiyanto', 'email' => 'rudiyanto@bpomjember.go.id', 'nip' => '', 'jabatan' => 'Petugas Kebersihan', 'penugasan' => '', 'status' => 'outsourcing', 'role' => 'pegawai_outsourcing_magang', 'jenis' => 'kebersihan', 'password' => '0tyWZsXPs3'],
            ['name' => 'Akhmad Khoirul Zakaria', 'email' => 'akhmad.khoirul@bpomjember.go.id', 'nip' => '', 'jabatan' => 'Resepsionis', 'penugasan' => '', 'status' => 'outsourcing', 'role' => 'pegawai_outsourcing_magang', 'jenis' => 'pelayanan', 'password' => 'RFuVJYJBWA'],
        ];

        foreach ($pegawai as $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => $data['password'],
                    'nip_nik' => $data['nip'] !== '' ? $data['nip'] : null,
                    'account_type' => 'internal',
                    'jenis_pegawai' => $data['jenis'],
                    'status_kepegawaian' => $data['status'],
                    'jabatan' => $data['jabatan'] !== '' ? $data['jabatan'] : null,
                    'penugasan' => $data['penugasan'] !== '' ? $data['penugasan'] : null,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]
            );
            $user->syncRoles([$data['role']]);
        }

        // Penanda Pengelola Gudang (penandatangan SPB & SBBK) & Ketua Tim per fungsi.
        // Diset di seeder (bukan migrasi) agar tetap benar pada deploy fresh —
        // migrasi berjalan sebelum data pegawai ada.
        User::where('email', 'yulia.anggraini@pom.go.id')->update(['is_pengelola_gudang' => true]);

        // Pengelola/penandatangan BMN (tujuan permohonan pemeliharaan) = Qithfirul saja.
        User::where('email', 'qithfirul.bahrowi@pom.go.id')->update(['is_pengelola_bmn' => true]);
        User::where('email', 'yulia.anggraini@pom.go.id')->update(['is_pengelola_bmn' => false]);

        // Kelompok Substansi pegawai ASN (PNS/PPPK) — sesuai data Bezzeting.
        $kelompokSubstansi = [
            'benyy.prabowo@pom.go.id' => 'Kepala Balai POM di Jember',
            'puji.lestari@pom.go.id' => 'Kepala Sub Bagian Tata Usaha',
            'yusita.harminingsih@pom.go.id' => 'Kelompok Substansi Pemeriksaan',
            'diana.pristawiti@pom.go.id' => 'Kelompok Substansi Informasi dan Komunikasi',
            'wildansyah.azami@pom.go.id' => 'Kelompok Substansi Pemeriksaan',
            'ika.helwandi@pom.go.id' => 'Kelompok Substansi Pemeriksaan',
            'mia.riswani@pom.go.id' => 'Kelompok Substansi Pemeriksaan',
            'tiara.hapsari@pom.go.id' => 'Kelompok Substansi Pengujian',
            'yodi.setiadi@pom.go.id' => 'Kelompok Substansi Pemeriksaan',
            'ayu.safitri@pom.go.id' => 'Kelompok Substansi Pemeriksaan',
            'shintya.pratiwi@pom.go.id' => 'Kelompok Substansi Pemeriksaan',
            'daniel.prasetiawan@pom.go.id' => 'Kelompok Substansi Penindakan',
            'yonanda.christiadi@pom.go.id' => 'Kelompok Substansi Penindakan',
            'ida.f@pom.go.id' => 'Kelompok Substansi Pengujian',
            'rini.setyaningsih@pom.go.id' => 'Kelompok Substansi Informasi dan Komunikasi',
            'prisca.akvila@pom.go.id' => 'Kelompok Substansi Tata Usaha',
            'qithfirul.bahrowi@pom.go.id' => 'Kelompok Substansi Tata Usaha',
            'diah.wahyuni@pom.go.id' => 'Kelompok Substansi Tata Usaha',
            'prasetya.ramadhan@pom.go.id' => 'Kelompok Substansi Informasi dan Komunikasi; Pemeriksaan; Pengujian',
            'baiq.nurubay@pom.go.id' => 'Kelompok Substansi Penindakan',
            'yulia.anggraini@pom.go.id' => 'Kelompok Substansi Tata Usaha',
            'rizky.anggraeni@pom.go.id' => 'Kelompok Substansi Tata Usaha',
            'nindya.widyanti@pom.go.id' => 'Kelompok Substansi Pengujian',
            'tasya.tamara@pom.go.id' => 'Kelompok Substansi Tata Usaha',
            'hanami.asri@pom.go.id' => 'Kelompok Substansi Informasi dan Komunikasi',
            'fii.qauly@pom.go.id' => 'Kelompok Substansi Tata Usaha',
            'hesyandi@pom.go.id' => 'Kelompok Substansi Pengujian',
            'addevia.illahi@pom.go.id' => 'Kelompok Substansi Penindakan',
            'Rianita.pambukowati@pom.go.id' => 'Kelompok Substansi Informasi dan Komunikasi',
            'anggie.afrida@pom.go.id' => 'Kelompok Substansi Tata Usaha',
        ];
        foreach ($kelompokSubstansi as $email => $kelompok) {
            User::where('email', $email)->whereIn('status_kepegawaian', ['asn', 'pppk'])->update(['kelompok_substansi' => $kelompok]);
        }

        // Petugas Arsip AKTIF (penandatangan per Tim Kerja) & Arsiparis (arsip INAKTIF).
        User::query()->update(['is_pengelola_arsip' => false, 'is_arsiparis' => false, 'fungsi_arsip' => null]);
        $arsipAktif = [
            'qithfirul.bahrowi@pom.go.id' => 'tata_usaha',
            'yodi.setiadi@pom.go.id' => 'pemeriksaan',
            'Rianita.pambukowati@pom.go.id' => 'infokom',
            'tiara.hapsari@pom.go.id' => 'pengujian',
            'yonanda.christiadi@pom.go.id' => 'penindakan',
        ];
        foreach ($arsipAktif as $email => $fungsi) {
            User::where('email', $email)->update(['is_pengelola_arsip' => true, 'fungsi_arsip' => $fungsi]);
        }
        User::where('email', 'tasya.tamara@pom.go.id')->update(['is_arsiparis' => true]);

        // Katalog Barang Milik Negara untuk formulir permohonan perbaikan.
        $bmn = [
            ['3.02.01.04.001.1', 'Sepeda Motor N-Max', 'Ruang Garasi Mobil', 2021],
            ['3.02.01.01.001.2', 'Kendaraan Dinas Roda Empat', 'Garasi Kantor', 2019],
            ['3.05.02.01.003.1', 'AC Split Ruang Pemeriksaan', 'Ruang Pemeriksaan Lt. 2', 2020],
            ['3.10.01.02.001.4', 'Laptop Dinas', 'Ruang Tata Usaha', 2022],
            ['3.10.01.02.005.7', 'Komputer PC Workstation', 'Ruang Pengujian', 2021],
            ['3.10.02.03.001.2', 'Printer Multifungsi', 'Ruang Infokom', 2023],
            ['3.05.01.05.010.1', 'Genset 10 kVA', 'Ruang Utilitas', 2018],
            ['3.06.01.01.020.3', 'Meja Kerja Biro', 'Ruang Kepala Balai', 2020],
            ['3.05.02.06.002.1', 'CCTV & DVR', 'Pos Keamanan', 2022],
            ['3.10.03.04.001.5', 'Proyektor Ruang Rapat', 'Ruang Rapat Utama', 2021],
        ];
        foreach ($bmn as [$kode, $nama, $lokasi, $tahun]) {
            \App\Models\BmnItem::updateOrCreate(
                ['kode_barang' => $kode],
                ['nama_barang' => $nama, 'lokasi' => $lokasi, 'kondisi' => 'baik', 'tahun_perolehan' => $tahun]
            );
        }

        $ketuaTim = [
            'puji.lestari@pom.go.id' => 'tata_usaha',
            'rini.setyaningsih@pom.go.id' => 'infokom',
            'yusita.harminingsih@pom.go.id' => 'pemeriksaan',
            'daniel.prasetiawan@pom.go.id' => 'penindakan',
        ];
        foreach ($ketuaTim as $email => $fungsi) {
            User::where('email', $email)->update(['is_ketua_tim' => true, 'fungsi_ketua_tim' => $fungsi]);
        }
    }
}
