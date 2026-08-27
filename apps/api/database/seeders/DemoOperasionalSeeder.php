<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Data operasional demo agar dashboard & rekap tidak kosong:
 * riwayat presensi ~21 hari kerja, log aktivitas, dan pengajuan cuti.
 * Idempotent: presensi pakai updateOrInsert; tabel lain hanya diisi bila kosong.
 */
class DemoOperasionalSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::where('account_type', 'internal')->get(['id', 'name']);
        if ($users->isEmpty()) {
            return;
        }

        $this->seedPresensi($users);
        $this->seedAuditLog($users);
        $this->seedCutiIzin($users);
        $this->seedPersediaan();
    }

    private function seedPersediaan(): void
    {
        if (DB::table('persediaan_bmn')->count() > 0) {
            return;
        }

        $now = Carbon::now();
        $items = [
            ['nama' => 'Kertas HVS A4 70gr', 'kategori' => 'atk', 'satuan' => 'rim', 'stok' => 40, 'stok_minimum' => 10, 'exp' => null],
            ['nama' => 'Tinta Printer Hitam', 'kategori' => 'atk', 'satuan' => 'botol', 'stok' => 8, 'stok_minimum' => 10, 'exp' => null],
            ['nama' => 'Reagen Formalin Test Kit', 'kategori' => 'reagen', 'satuan' => 'set', 'stok' => 15, 'stok_minimum' => 5, 'exp' => $now->copy()->addDays(40)->toDateString()],
            ['nama' => 'Test Kit Boraks', 'kategori' => 'test_kit', 'satuan' => 'box', 'stok' => 6, 'stok_minimum' => 4, 'exp' => $now->copy()->addDays(20)->toDateString()],
            ['nama' => 'Test Kit Rhodamin B', 'kategori' => 'test_kit', 'satuan' => 'box', 'stok' => 3, 'stok_minimum' => 5, 'exp' => $now->copy()->subDays(5)->toDateString()],
            ['nama' => 'Sarung Tangan Nitrile', 'kategori' => 'alat', 'satuan' => 'box', 'stok' => 25, 'stok_minimum' => 8, 'exp' => null],
        ];

        foreach ($items as $it) {
            DB::table('persediaan_bmn')->insert([
                'nama' => $it['nama'],
                'kategori' => $it['kategori'],
                'kelompok' => $it['kategori'] === 'atk' ? 'atk' : 'psd',
                'satuan' => $it['satuan'],
                'stok' => $it['stok'],
                'stok_minimum' => $it['stok_minimum'],
                'tanggal_kedaluwarsa' => $it['exp'],
                'keterangan' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    private function seedPresensi($users): void
    {
        $now = Carbon::now();

        // Mulai dari KEMARIN (d=1), TIDAK menyentuh hari ini — agar presensi asli
        // yang diinput user hari ini tidak pernah ditimpa/dibuat palsu oleh seeder
        // (mencegah bug "muncul absen padahal belum" & riwayat hari ini hilang).
        for ($d = 21; $d >= 1; $d--) {
            $tgl = Carbon::today()->subDays($d);
            if ($tgl->isWeekend()) {
                continue;
            }

            foreach ($users as $u) {
                if (mt_rand(1, 100) > 92) {
                    continue;
                }

                $roll = mt_rand(1, 100);
                $status = $roll <= 74 ? 'tepat_waktu' : ($roll <= 94 ? 'terlambat' : 'di_luar_geofence');
                $jamMasuk = $status === 'terlambat'
                    ? sprintf('07:%02d:00', mt_rand(46, 59))
                    : sprintf('07:%02d:00', mt_rand(10, 44));

                $modeRoll = mt_rand(1, 100);
                $mode = $modeRoll <= 80 ? 'wfo' : ($modeRoll <= 92 ? 'wfh' : 'dinas');
                $titik = $mode === 'wfo' ? (mt_rand(0, 1) ? 'kantor_utama' : 'gedung_lab') : $mode;

                // Semua hari di sini sudah lewat, jadi selalu ada jam keluar.
                $jamKeluar = sprintf('16:%02d:00', mt_rand(0, 59));

                DB::table('presensi')->updateOrInsert(
                    ['user_id' => $u->id, 'tanggal' => $tgl->toDateString()],
                    [
                        'jam_masuk' => $jamMasuk,
                        'status_masuk' => $status,
                        'mode_masuk' => $mode,
                        'titik_masuk' => $titik,
                        'lokasi_masuk_lat' => -8.1730 + (mt_rand(-40, 40) / 100000),
                        'lokasi_masuk_lng' => 113.7000 + (mt_rand(-40, 40) / 100000),
                        'jarak_masuk_meter' => $status === 'di_luar_geofence' ? mt_rand(200, 800) : mt_rand(3, 60),
                        'jam_keluar' => $jamKeluar,
                        'status_keluar' => $jamKeluar ? 'tepat_waktu' : null,
                        'mode_keluar' => $jamKeluar ? $mode : null,
                        'titik_keluar' => $jamKeluar ? $titik : null,
                        'updated_at' => $now,
                        'created_at' => $tgl->copy()->setTime(7, 30),
                    ]
                );
            }
        }
    }

    private function seedAuditLog($users): void
    {
        if (DB::table('audit_logs')->count() > 0) {
            return;
        }

        $templates = [
            ['login', 'Auth', 'berhasil masuk ke sistem'],
            ['presensi.check_in', 'Presensi', 'melakukan check-in kehadiran'],
            ['presensi.check_out', 'Presensi', 'melakukan check-out'],
            ['cuti.ajukan', 'Cuti & Izin', 'mengajukan permohonan cuti tahunan'],
            ['booking.konfirmasi', 'Booking', 'mengonfirmasi jadwal konsultasi masyarakat'],
            ['bmn.ajukan', 'BMN', 'mengajukan tiket perbaikan sarana'],
            ['barang_bukti.simpan', 'Barang Bukti', 'mencatat barang bukti baru'],
            ['apotek.periksa', 'SIG Apotek', 'memperbarui status pemeriksaan apotek'],
            ['bahan_lab.pakai', 'SIMBA', 'mencatat pemakaian bahan laboratorium'],
            ['berita.publikasi', 'Berita', 'mempublikasikan berita baru'],
        ];

        $rows = [];
        for ($i = 0; $i < 28; $i++) {
            $u = $users->random();
            $t = $templates[array_rand($templates)];
            $rows[] = [
                'user_id' => $u->id,
                'aksi' => $t[0],
                'modul' => $t[1],
                'deskripsi' => $t[2],
                'ip_address' => '10.0.'.mt_rand(0, 5).'.'.mt_rand(2, 254),
                'created_at' => Carbon::now()->subMinutes(mt_rand(5, 60 * 24 * 6)),
            ];
        }
        DB::table('audit_logs')->insert($rows);
    }

    private function seedCutiIzin($users): void
    {
        if (DB::table('cuti_izin')->count() > 0) {
            return;
        }

        $jenis = ['cuti', 'izin', 'sakit'];
        $alasan = [
            'Keperluan keluarga', 'Acara pernikahan saudara', 'Kontrol kesehatan',
            'Istirahat karena sakit', 'Keperluan pribadi mendesak', 'Menghadiri wisuda anak',
        ];
        $rows = [];
        foreach ($users->random(min(8, $users->count())) as $idx => $u) {
            $mulai = Carbon::today()->addDays(mt_rand(1, 20));
            $hari = mt_rand(1, 3);
            $status = $idx < 5 ? 'diajukan' : (mt_rand(0, 1) ? 'disetujui' : 'ditolak');
            $rows[] = [
                'user_id' => $u->id,
                'jenis' => $jenis[array_rand($jenis)],
                'tanggal_mulai' => $mulai->toDateString(),
                'tanggal_selesai' => $mulai->copy()->addDays($hari - 1)->toDateString(),
                'jumlah_hari' => $hari,
                'alasan' => $alasan[array_rand($alasan)],
                'status' => $status,
                'created_at' => Carbon::now()->subDays(mt_rand(0, 5)),
                'updated_at' => Carbon::now(),
            ];
        }
        DB::table('cuti_izin')->insert($rows);
    }
}
