<?php

namespace Database\Seeders;

use App\Models\SigApotek;
use App\Models\User;
use Illuminate\Database\Seeder;

/** Data contoh apotek se-Kabupaten Jember untuk demo peta SIG. */
class SigApotekSeeder extends Seeder
{
    public function run(): void
    {
        $petugas = User::where('email', 'pegawai.asn@bpomjember.go.id')->first() ?? User::first();

        $items = [
            [
                'nama_apotek' => 'Apotek Kimia Farma Gajah Mada', 'kecamatan' => 'Kaliwates',
                'alamat' => 'Jl. Gajah Mada No. 171, Kaliwates, Jember',
                'latitude' => -8.1706, 'longitude' => 113.6919,
                'nomor_izin' => 'SIA/3509/2023/001', 'status_izin' => 'aktif',
                'penanggung_jawab' => 'apt. Ratna Dewi, S.Farm',
                'tanggal_pemeriksaan_terakhir' => '2026-05-12',
                'hasil_pemeriksaan_terakhir' => 'Memenuhi ketentuan. Penyimpanan obat keras sesuai standar.',
                'jumlah_pelanggaran' => 0,
            ],
            [
                'nama_apotek' => 'Apotek Sehat Sentosa', 'kecamatan' => 'Sumbersari',
                'alamat' => 'Jl. Kalimantan No. 24, Sumbersari, Jember',
                'latitude' => -8.1645, 'longitude' => 113.7168,
                'nomor_izin' => 'SIA/3509/2022/047', 'status_izin' => 'aktif',
                'penanggung_jawab' => 'apt. Hendra Wijaya, S.Farm',
                'tanggal_pemeriksaan_terakhir' => '2026-03-20',
                'hasil_pemeriksaan_terakhir' => 'Ditemukan ketidaksesuaian pencatatan narkotika ringan, sudah diperbaiki.',
                'jumlah_pelanggaran' => 1,
                'keterangan_pelanggaran' => 'Pencatatan kartu stok narkotika tidak mutakhir (Mar 2026).',
            ],
            [
                'nama_apotek' => 'Apotek Tanggul Farma', 'kecamatan' => 'Tanggul',
                'alamat' => 'Jl. PB Sudirman No. 88, Tanggul, Jember',
                'latitude' => -8.1656, 'longitude' => 113.4551,
                'nomor_izin' => 'SIA/3509/2020/112', 'status_izin' => 'kadaluarsa',
                'penanggung_jawab' => 'apt. Maria Ulfa, S.Farm',
                'tanggal_pemeriksaan_terakhir' => '2025-11-02',
                'hasil_pemeriksaan_terakhir' => 'Izin telah habis masa berlaku, dalam proses perpanjangan.',
                'jumlah_pelanggaran' => 0,
            ],
            [
                'nama_apotek' => 'Apotek Ambulu Jaya', 'kecamatan' => 'Ambulu',
                'alamat' => 'Jl. Suyitman No. 5, Ambulu, Jember',
                'latitude' => -8.3444, 'longitude' => 113.6063,
                'nomor_izin' => 'SIA/3509/2019/031', 'status_izin' => 'dicabut',
                'penanggung_jawab' => '-',
                'tanggal_pemeriksaan_terakhir' => '2026-01-15',
                'hasil_pemeriksaan_terakhir' => 'Ditemukan peredaran obat keras tanpa resep berulang. Izin dicabut.',
                'jumlah_pelanggaran' => 3,
                'keterangan_pelanggaran' => 'Penjualan obat keras tanpa resep (3 temuan: 2024–2026). Izin dicabut per Feb 2026.',
            ],
            [
                'nama_apotek' => 'Apotek Rambipuji Husada', 'kecamatan' => 'Rambipuji',
                'alamat' => 'Jl. Dharmawangsa No. 12, Rambipuji, Jember',
                'latitude' => -8.2065, 'longitude' => 113.6106,
                'nomor_izin' => 'SIA/3509/2024/009', 'status_izin' => 'aktif',
                'penanggung_jawab' => 'apt. Bagus Firmansyah, S.Farm',
                'tanggal_pemeriksaan_terakhir' => null,
                'hasil_pemeriksaan_terakhir' => null,
                'jumlah_pelanggaran' => 0,
            ],
        ];

        foreach ($items as $item) {
            SigApotek::updateOrCreate(
                ['nama_apotek' => $item['nama_apotek'], 'latitude' => $item['latitude'], 'longitude' => $item['longitude']],
                [...$item, 'created_by' => $petugas->id]
            );
        }
    }
}
