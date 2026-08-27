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
 * Koordinat ditempatkan di dalam poligon kecamatan yang bersangkutan (dibaca
 * dari resources/sig/geojson/kecamatan.geojson) agar sebaran titik masuk akal
 * secara geografis dan tidak jatuh ke laut, namun tetap merupakan simulasi —
 * bukan lokasi sarana yang sebenarnya.
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

    /**
     * Cincin luar poligon tiap kecamatan, dikunci "Kabupaten|Kecamatan".
     *
     * @var array<string,array<int,array{titik:array<int,array{0:float,1:float}>,bbox:array{0:float,1:float,2:float,3:float}}>>
     */
    private array $poligon = [];

    public function run(): void
    {
        $this->muatPoligonKecamatan();

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

                // Titik diambil dari dalam poligon kecamatan bila batas wilayah
                // tersedia; bila tidak, jatuh kembali ke sebaran sekitar pusat.
                $titik = $tanpaKoordinat ? null : ($this->titikDalamKecamatan($kabupaten, $kecamatan)
                    ?? [round($lat + $this->acak(0.13), 6), round($lng + $this->acak(0.13), 6)]);

                $apotek = SigApotek::create([
                    'nama_apotek' => $nama,
                    'alamat' => 'Jl. Contoh Demo No. '.(10 + $i).', '.$kecamatan,
                    'kabupaten' => $kabupaten,
                    'kecamatan' => $kecamatan,
                    'desa' => 'Desa Demo '.(($i % 3) + 1),
                    'latitude' => $titik[0] ?? null,
                    'longitude' => $titik[1] ?? null,
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

    /**
     * Baca batas kecamatan sekali saja lalu simpan cincin luar tiap bagian
     * beserta kotak pembatasnya, agar penempatan titik demo cukup cepat.
     */
    private function muatPoligonKecamatan(): void
    {
        $path = resource_path('sig/geojson/kecamatan.geojson');
        if (! is_file($path)) {
            return;
        }

        $isi = json_decode((string) file_get_contents($path), true);
        if (! is_array($isi) || ! isset($isi['features']) || ! is_array($isi['features'])) {
            return;
        }

        foreach ($isi['features'] as $fitur) {
            $prop = $fitur['properties'] ?? [];
            $geom = $fitur['geometry'] ?? [];
            $kunci = ($prop['kabupaten'] ?? '').'|'.($prop['nama'] ?? '');
            if ($kunci === '|' || ! isset($geom['type'], $geom['coordinates'])) {
                continue;
            }

            // Polygon → satu bagian; MultiPolygon → banyak bagian. Cincin
            // pertama tiap bagian adalah batas luarnya.
            $bagian = $geom['type'] === 'MultiPolygon' ? $geom['coordinates'] : [$geom['coordinates']];
            foreach ($bagian as $poligon) {
                $cincin = $poligon[0] ?? null;
                if (! is_array($cincin) || count($cincin) < 4) {
                    continue;
                }

                $lng = array_column($cincin, 0);
                $lat = array_column($cincin, 1);
                $this->poligon[$kunci][] = [
                    'titik' => $cincin,
                    'bbox' => [min($lng), min($lat), max($lng), max($lat)],
                ];
            }
        }
    }

    /**
     * Titik acak di dalam poligon kecamatan.
     *
     * Memakai penolakan (rejection sampling): ambil titik acak di dalam kotak
     * pembatas, ulangi sampai titik benar-benar berada di dalam poligon.
     *
     * @return array{0:float,1:float}|null [lat, lng]
     */
    private function titikDalamKecamatan(string $kabupaten, string $kecamatan): ?array
    {
        $bagian = $this->poligon[$kabupaten.'|'.$kecamatan] ?? null;
        if (! $bagian) {
            return null;
        }

        // Bagian terluas dipakai agar titik tidak menumpuk di pulau kecil.
        usort($bagian, fn ($a, $b) => ($b['bbox'][2] - $b['bbox'][0]) * ($b['bbox'][3] - $b['bbox'][1])
            <=> ($a['bbox'][2] - $a['bbox'][0]) * ($a['bbox'][3] - $a['bbox'][1]));
        [$minLng, $minLat, $maksLng, $maksLat] = $bagian[0]['bbox'];

        for ($coba = 0; $coba < 200; $coba++) {
            $lng = $minLng + (mt_rand(0, 1000000) / 1000000) * ($maksLng - $minLng);
            $lat = $minLat + (mt_rand(0, 1000000) / 1000000) * ($maksLat - $minLat);
            if ($this->didalam($lng, $lat, $bagian[0]['titik'])) {
                return [round($lat, 6), round($lng, 6)];
            }
        }

        return null;
    }

    /**
     * Uji titik di dalam poligon dengan algoritme lemparan sinar (ray casting).
     *
     * @param  array<int,array{0:float,1:float}>  $cincin
     */
    private function didalam(float $x, float $y, array $cincin): bool
    {
        $didalam = false;
        $n = count($cincin);

        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            [$xi, $yi] = $cincin[$i];
            [$xj, $yj] = $cincin[$j];

            // Sinar horizontal ke kanan memotong ruas [j,i]?
            if (($yi > $y) !== ($yj > $y)
                && $x < ($xj - $xi) * ($y - $yi) / ($yj - $yi) + $xi) {
                $didalam = ! $didalam;
            }
        }

        return $didalam;
    }
}
