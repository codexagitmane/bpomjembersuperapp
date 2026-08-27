<?php

namespace Database\Seeders;

use App\Models\ApotekDistribusi;
use App\Models\ApotekPemeriksaan;
use App\Models\ApotekTemuan;
use App\Models\ApotekTindakLanjut;
use App\Models\SigApotek;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * DATA DEMO modul SIG Monitoring Distribusi Apotek.
 *
 * Seluruh nama sarana, NIB, nomor identitas, dan nama penanggung jawab pada
 * berkas ini adalah REKAAN dan ditandai `is_demo = true`. Tidak ada data
 * pribadi maupun identitas sarana nyata yang digunakan.
 *
 * Koordinat disebar di sekitar titik tengah tiap kabupaten agar masuk akal
 * secara geografis, namun jelas merupakan simulasi — bukan lokasi sebenarnya.
 */
class SigApotekSeeder extends Seeder
{
    /** Titik tengah & kecamatan contoh tiap kabupaten wilayah kerja. */
    private const WILAYAH = [
        'Jember' => [-8.1724, 113.7002, ['Sumbersari', 'Patrang', 'Kaliwates', 'Ambulu', 'Tanggul', 'Balung']],
        'Banyuwangi' => [-8.2192, 114.3691, ['Banyuwangi', 'Genteng', 'Rogojampi', 'Muncar', 'Srono']],
        'Bondowoso' => [-7.9135, 113.8211, ['Bondowoso', 'Tenggarang', 'Wonosari', 'Tamanan']],
        'Situbondo' => [-7.7062, 114.0098, ['Situbondo', 'Panji', 'Besuki', 'Asembagus']],
        'Lumajang' => [-8.1335, 113.2246, ['Lumajang', 'Sukodono', 'Senduro', 'Yosowilangun']],
    ];

    private const NAMA_DEPAN = [
        'Sehat', 'Sentosa', 'Bahagia', 'Harapan', 'Mulia', 'Amanah', 'Barokah', 'Lestari',
        'Cendana', 'Melati', 'Anggrek', 'Kenanga', 'Cempaka', 'Nusantara', 'Bangun', 'Prima',
        'Mandiri', 'Bersama', 'Rahayu', 'Makmur', 'Jaya', 'Sumber', 'Tirta', 'Argo', 'Wijaya',
    ];

    public function run(): void
    {
        // Idempoten: data demo lama dibersihkan agar tidak menumpuk.
        SigApotek::where('is_demo', true)->delete();

        $admin = User::role('superadmin')->first() ?? User::first();
        if (! $admin) {
            return;
        }

        mt_srand(20260827); // hasil sebaran tetap sama tiap kali di-seed
        $dibuat = [];
        $nomor = 1;

        foreach (self::WILAYAH as $kabupaten => [$lat, $lng, $kecamatanList]) {
            // 10-12 sarana per kabupaten → total di atas 50.
            $jumlah = 10 + ($kabupaten === 'Jember' ? 2 : 0);

            for ($i = 0; $i < $jumlah; $i++) {
                $kecamatan = $kecamatanList[$i % count($kecamatanList)];
                $nama = 'Apotek '.self::NAMA_DEPAN[($nomor - 1) % count(self::NAMA_DEPAN)]
                    .' '.$kecamatan.' (DEMO)';

                // Sebagian kecil sengaja dibuat tanpa koordinat & data tak lengkap,
                // agar fitur Kualitas Data dan "belum dipetakan" dapat diuji.
                $tanpaKoordinat = $i % 9 === 4;
                $tanpaNib = $i % 7 === 3;

                $apotek = SigApotek::create([
                    'nama_apotek' => $nama,
                    'alamat' => 'Jl. Contoh Demo No. '.(10 + $i).', '.$kecamatan,
                    'kabupaten' => $kabupaten,
                    'kecamatan' => $kecamatan,
                    'desa' => 'Desa Demo '.(($i % 3) + 1),
                    'latitude' => $tanpaKoordinat ? null : round($lat + $this->acak(0.13), 6),
                    'longitude' => $tanpaKoordinat ? null : round($lng + $this->acak(0.13), 6),
                    'nib' => $tanpaNib ? null : 'DEMO-NIB-'.str_pad((string) $nomor, 5, '0', STR_PAD_LEFT),
                    'nomor_identitas' => 'DEMO-SIA-'.str_pad((string) $nomor, 4, '0', STR_PAD_LEFT),
                    'pemilik' => 'Pemilik Demo '.$nomor,
                    'penanggung_jawab' => $i % 6 === 2 ? null : 'Apoteker Demo '.$nomor,
                    'telepon' => '08000000'.str_pad((string) $nomor, 4, '0', STR_PAD_LEFT),
                    'email' => 'demo'.$nomor.'@contoh.invalid',
                    'jenis_sarana' => $i % 11 === 5 ? 'toko_obat' : ($i % 13 === 7 ? 'distributor' : 'apotek'),
                    'status_sarana' => $tanpaKoordinat ? 'belum_diverifikasi' : ($i % 10 === 8 ? 'nonaktif' : 'aktif'),
                    'keterangan' => 'DATA DEMO — dibuat otomatis untuk keperluan uji coba modul.',
                    'is_demo' => true,
                    'created_by' => $admin->id,
                    'updated_by' => $admin->id,
                ]);

                $this->buatRiwayat($apotek, $i, $admin->id);
                $dibuat[] = $apotek;
                $nomor++;
            }
        }

        $this->buatDistribusi($dibuat);
    }

    /** Riwayat pemeriksaan, temuan, dan tindak lanjut untuk sebagian sarana. */
    private function buatRiwayat(SigApotek $apotek, int $i, int $userId): void
    {
        // Sekitar sepertiga sarana sengaja dibiarkan belum pernah diperiksa.
        if ($i % 3 === 0) {
            return;
        }

        $bulanLalu = 2 + ($i * 3) % 26;
        $tanggal = Carbon::today()->subMonths($bulanLalu);
        $jumlahTemuan = $i % 4;

        $pemeriksaan = ApotekPemeriksaan::create([
            'apotek_id' => $apotek->id,
            'tanggal' => $tanggal,
            'jenis' => 'pemeriksaan_sarana',
            'petugas' => 'Tim Pemeriksaan Demo',
            'hasil' => $jumlahTemuan === 0
                ? 'Tidak ditemukan catatan yang perlu ditindaklanjuti pada pemeriksaan ini.'
                : 'Terdapat beberapa catatan yang perlu ditindaklanjuti oleh sarana.',
            'jumlah_temuan' => $jumlahTemuan,
            'status_tindak_lanjut' => $jumlahTemuan === 0 ? 'selesai' : 'proses',
            'target_penyelesaian' => $jumlahTemuan > 0 ? $tanggal->copy()->addMonth() : null,
            'catatan' => 'DATA DEMO.',
            'user_id' => $userId,
        ]);

        $apotek->update([
            'tanggal_pemeriksaan_terakhir' => $tanggal,
            'hasil_pemeriksaan_terakhir' => $pemeriksaan->hasil,
        ]);

        $kategori = ['dokumen', 'penyimpanan', 'sarana', 'penandaan'];
        for ($t = 0; $t < $jumlahTemuan; $t++) {
            // Sebagian temuan sudah selesai, sebagian masih berjalan, sebagian
            // melewati target — agar KPI dan skor prioritas bervariasi.
            $status = match (($i + $t) % 3) {
                0 => 'selesai',
                1 => 'proses',
                default => 'belum',
            };

            $temuan = ApotekTemuan::create([
                'pemeriksaan_id' => $pemeriksaan->id,
                'apotek_id' => $apotek->id,
                'tanggal' => $tanggal,
                'kategori' => $kategori[($i + $t) % count($kategori)],
                'deskripsi' => 'DATA DEMO — catatan hasil pemeriksaan nomor '.($t + 1).' pada sarana ini.',
                'status' => $status,
                'target' => $tanggal->copy()->addMonth(),
                'pic' => 'Penanggung Jawab Sarana',
            ]);

            if ($status !== 'belum') {
                ApotekTindakLanjut::create([
                    'temuan_id' => $temuan->id,
                    'tanggal' => $tanggal->copy()->addWeeks(2),
                    'uraian' => 'DATA DEMO — sarana menyampaikan perbaikan atas catatan tersebut.',
                    'bukti' => $status === 'selesai' ? 'Dokumentasi perbaikan (demo)' : null,
                    'tahap' => $status === 'selesai' ? 'selesai' : 'tindakan',
                    'status' => $status === 'selesai' ? 'selesai' : 'proses',
                    'pic' => 'Penanggung Jawab Sarana',
                    'terverifikasi' => $status === 'selesai',
                    'user_id' => $userId,
                ]);
            }
        }
    }

    /** Hubungan distribusi demo: distributor → beberapa apotek sewilayah. */
    private function buatDistribusi(array $daftar): void
    {
        ApotekDistribusi::where('is_demo', true)->delete();

        $distributor = array_values(array_filter($daftar, fn ($a) => $a->jenis_sarana === 'distributor'));
        if ($distributor === []) {
            return;
        }

        $produk = ['Obat Bebas (demo)', 'Obat Bebas Terbatas (demo)', 'Suplemen Kesehatan (demo)'];
        $n = 1;

        foreach ($distributor as $d) {
            $penerima = array_values(array_filter(
                $daftar,
                fn ($a) => $a->kabupaten === $d->kabupaten && $a->id !== $d->id && $a->jenis_sarana === 'apotek'
            ));

            foreach (array_slice($penerima, 0, 4) as $idx => $p) {
                ApotekDistribusi::create([
                    'sumber_id' => $d->id,
                    'penerima_id' => $p->id,
                    'tanggal' => Carbon::today()->subDays(15 + $idx * 9),
                    'produk' => $produk[$idx % count($produk)],
                    'kategori' => 'obat',
                    'jumlah' => 25 + $idx * 15,
                    'satuan' => 'boks',
                    'referensi' => 'DEMO-FKT-'.str_pad((string) $n, 4, '0', STR_PAD_LEFT),
                    'status' => 'tercatat',
                    'is_demo' => true,
                ]);
                $n++;
            }
        }
    }

    /** Sebaran acak simetris di sekitar titik tengah. */
    private function acak(float $rentang): float
    {
        return (mt_rand(0, 20000) / 10000 - 1) * $rentang;
    }
}
