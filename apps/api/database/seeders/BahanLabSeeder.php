<?php

namespace Database\Seeders;

use App\Models\BahanLab;
use App\Models\PenggunaanBahanLab;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/** Contoh data bahan/reagen lab + riwayat pemakaian untuk demo Dashboard SIMBA. */
class BahanLabSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::role('pegawai_asn_pppk')->first() ?? User::first();

        $bahanList = [
            ['nama_bahan' => 'Glycerol 85%', 'kategori' => 'Reagen', 'satuan' => 'liter', 'stok' => 8, 'min' => 2, 'ed' => '2025-08-31'],
            ['nama_bahan' => 'McFarland Standard Set (0.5,1,2,3,4)', 'kategori' => 'Standar', 'satuan' => 'kit', 'stok' => 3, 'min' => 1, 'ed' => '2025-12-31'],
            ['nama_bahan' => 'Sulphuric Acid 96%', 'kategori' => 'Reagen', 'satuan' => 'liter', 'stok' => 5, 'min' => 2, 'ed' => '2025-12-31'],
            ['nama_bahan' => '2,3,5-Triphenyl-tetrazolium chloride', 'kategori' => 'Reagen', 'satuan' => 'gram', 'stok' => 25, 'min' => 10, 'ed' => '2026-03-31'],
            ['nama_bahan' => 'Formalin (Test Kit)', 'kategori' => 'Test Kit', 'satuan' => 'kit', 'stok' => 12, 'min' => 5, 'ed' => '2026-05-10'],
            ['nama_bahan' => 'Metanil Yellow (Test Kit)', 'kategori' => 'Test Kit', 'satuan' => 'kit', 'stok' => 9, 'min' => 5, 'ed' => '2026-05-10'],
            ['nama_bahan' => 'Boraks (Test Kit)', 'kategori' => 'Test Kit', 'satuan' => 'kit', 'stok' => 1, 'min' => 5, 'ed' => '2026-05-10'],
            ['nama_bahan' => 'Peptone Salt Solution', 'kategori' => 'Media', 'satuan' => 'liter', 'stok' => 40, 'min' => 10, 'ed' => '2026-09-30'],
            ['nama_bahan' => 'Tryptic Soy Agar', 'kategori' => 'Media', 'satuan' => 'gram', 'stok' => 60, 'min' => 20, 'ed' => '2026-10-15'],
            ['nama_bahan' => 'Plate Count Agar (PCA)', 'kategori' => 'Media', 'satuan' => 'gram', 'stok' => 30, 'min' => 15, 'ed' => '2026-11-01'],
            ['nama_bahan' => 'Silver Nitrate', 'kategori' => 'Reagen', 'satuan' => 'gram', 'stok' => 15, 'min' => 5, 'ed' => '2027-01-20'],
            ['nama_bahan' => 'Potassium Iodide', 'kategori' => 'Reagen', 'satuan' => 'gram', 'stok' => 20, 'min' => 5, 'ed' => '2027-02-15'],
            ['nama_bahan' => 'Rhodamin B (Test Kit)', 'kategori' => 'Test Kit', 'satuan' => 'kit', 'stok' => 0, 'min' => 5, 'ed' => '2026-06-30'],
        ];

        $bahanModels = [];
        foreach ($bahanList as $b) {
            $bahanModels[] = BahanLab::updateOrCreate(
                ['nama_bahan' => $b['nama_bahan']],
                [
                    'kategori' => $b['kategori'],
                    'satuan' => $b['satuan'],
                    'stok_tersedia' => $b['stok'],
                    'stok_minimum' => $b['min'],
                    'tanggal_kedaluwarsa' => $b['ed'],
                    'status' => 'aktif',
                    'created_by' => $admin->id,
                ]
            );
        }

        // Riwayat pemakaian 6 bulan terakhir agar tren & top-5 terisi.
        $penguji = User::role('pegawai_asn_pppk')->get();
        if ($penguji->isEmpty()) {
            $penguji = collect([$admin]);
        }

        for ($i = 5; $i >= 0; $i--) {
            $bulan = now()->copy()->subMonths($i);
            $jumlahTransaksi = random_int(4, 12);
            for ($j = 0; $j < $jumlahTransaksi; $j++) {
                $bahan = $bahanModels[array_rand($bahanModels)];
                PenggunaanBahanLab::create([
                    'bahan_lab_id' => $bahan->id,
                    'user_id' => $penguji->random()->id,
                    'tanggal' => $bulan->copy()->day(random_int(1, min(28, $bulan->daysInMonth)))->toDateString(),
                    'jumlah_diambil' => random_int(1, 20),
                    'nama_sampel' => 'Sampel Uji #'.random_int(100, 999),
                ]);
            }
        }
    }
}
