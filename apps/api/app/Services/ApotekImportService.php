<?php

namespace App\Services;

use App\Models\SigApotek;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;
use ShapeFile\ShapeFile;

/**
 * Impor data apotek dari Excel/CSV dan Shapefile (SHP dalam ZIP).
 *
 * Format kolom Excel/CSV (baris pertama = header, nama kolom fleksibel
 * case-insensitive): nama_apotek | alamat | kecamatan | latitude | longitude |
 * nomor_izin | status_izin | penanggung_jawab | tanggal_pemeriksaan_terakhir |
 * hasil_pemeriksaan_terakhir | jumlah_pelanggaran | keterangan_pelanggaran
 *
 * Shapefile: ZIP berisi .shp (+ .dbf untuk atribut). Geometri Point diambil
 * sebagai koordinat; atribut DBF dipetakan dengan heuristik nama kolom.
 */
class ApotekImportService
{
    private const STATUS_VALID = ['aktif', 'kadaluarsa', 'dicabut'];

    public function importSpreadsheet(UploadedFile $file, int $userId): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);

        if (count($rows) < 2) {
            return ['berhasil' => 0, 'gagal' => 0, 'errors' => ['File kosong atau tidak memiliki baris data.']];
        }

        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $rows[0]);

        $berhasil = 0;
        $gagal = 0;
        $errors = [];

        foreach (array_slice($rows, 1) as $i => $row) {
            $data = [];
            foreach ($header as $col => $key) {
                $data[$key] = isset($row[$col]) ? trim((string) $row[$col]) : null;
            }

            $hasil = $this->simpanBaris($data, $userId);
            if ($hasil === true) {
                $berhasil++;
            } else {
                $gagal++;
                if (count($errors) < 20) {
                    $errors[] = 'Baris '.($i + 2).': '.$hasil;
                }
            }
        }

        return compact('berhasil', 'gagal', 'errors');
    }

    public function importShapefileZip(UploadedFile $file, int $userId): array
    {
        $tmpDir = sys_get_temp_dir().'/shp_'.bin2hex(random_bytes(8));
        mkdir($tmpDir, 0700, true);

        try {
            $zip = new \ZipArchive();
            if ($zip->open($file->getRealPath()) !== true) {
                return ['berhasil' => 0, 'gagal' => 0, 'errors' => ['File ZIP tidak dapat dibuka.']];
            }

            // Ekstraksi aman: tolak path traversal di nama entri.
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (str_contains($name, '..') || str_starts_with($name, '/')) {
                    return ['berhasil' => 0, 'gagal' => 0, 'errors' => ['ZIP berisi path tidak aman.']];
                }
            }
            $zip->extractTo($tmpDir);
            $zip->close();

            $shpFiles = glob($tmpDir.'/{,*/}*.shp', GLOB_BRACE);
            if (! $shpFiles) {
                return ['berhasil' => 0, 'gagal' => 0, 'errors' => ['Tidak ditemukan file .shp di dalam ZIP.']];
            }

            $shp = new ShapeFile($shpFiles[0]);

            $berhasil = 0;
            $gagal = 0;
            $errors = [];

            while ($record = $shp->getRecord(ShapeFile::GEOMETRY_ARRAY)) {
                if (isset($record['dbf']['deleted']) && $record['dbf']['deleted']) {
                    continue;
                }

                $geom = $record['shp'] ?? [];
                $lat = $geom['y'] ?? ($geom['parts'][0]['rings'][0]['points'][0]['y'] ?? null);
                $lng = $geom['x'] ?? ($geom['parts'][0]['rings'][0]['points'][0]['x'] ?? null);

                $attrs = array_change_key_case($record['dbf'] ?? [], CASE_LOWER);
                $data = [
                    'nama_apotek' => $this->ambil($attrs, ['nama_apotek', 'nama', 'name', 'apotek']),
                    'alamat' => $this->ambil($attrs, ['alamat', 'address', 'almt']),
                    'kecamatan' => $this->ambil($attrs, ['kecamatan', 'kec', 'district']),
                    'nomor_izin' => $this->ambil($attrs, ['nomor_izin', 'no_izin', 'izin']),
                    'status_izin' => $this->ambil($attrs, ['status_izin', 'status']),
                    'penanggung_jawab' => $this->ambil($attrs, ['penanggung_jawab', 'pj', 'apoteker']),
                    'latitude' => $lat,
                    'longitude' => $lng,
                ];

                $hasil = $this->simpanBaris($data, $userId);
                if ($hasil === true) {
                    $berhasil++;
                } else {
                    $gagal++;
                    if (count($errors) < 20) {
                        $errors[] = 'Record: '.$hasil;
                    }
                }
            }

            return compact('berhasil', 'gagal', 'errors');
        } finally {
            $this->hapusDirRekursif($tmpDir);
        }
    }

    /** @return true|string true jika sukses, string pesan error jika gagal */
    private function simpanBaris(array $data, int $userId): bool|string
    {
        $nama = $data['nama_apotek'] ?? null;
        $alamat = $data['alamat'] ?? null;
        $lat = is_numeric($data['latitude'] ?? null) ? (float) $data['latitude'] : null;
        $lng = is_numeric($data['longitude'] ?? null) ? (float) $data['longitude'] : null;

        if (! $nama) {
            return 'kolom nama_apotek kosong';
        }
        if ($lat === null || $lng === null || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            return "koordinat tidak valid untuk '{$nama}'";
        }

        $status = strtolower((string) ($data['status_izin'] ?? 'aktif'));
        if (! in_array($status, self::STATUS_VALID, true)) {
            $status = 'aktif';
        }

        $tanggal = $data['tanggal_pemeriksaan_terakhir'] ?? null;
        if ($tanggal && strtotime($tanggal) === false) {
            $tanggal = null;
        }

        SigApotek::updateOrCreate(
            ['nama_apotek' => $nama, 'latitude' => $lat, 'longitude' => $lng],
            [
                'alamat' => $alamat ?: '-',
                'kecamatan' => $data['kecamatan'] ?? null,
                'nomor_izin' => $data['nomor_izin'] ?? null,
                'status_izin' => $status,
                'penanggung_jawab' => $data['penanggung_jawab'] ?? null,
                'tanggal_pemeriksaan_terakhir' => $tanggal,
                'hasil_pemeriksaan_terakhir' => $data['hasil_pemeriksaan_terakhir'] ?? null,
                'jumlah_pelanggaran' => is_numeric($data['jumlah_pelanggaran'] ?? null) ? (int) $data['jumlah_pelanggaran'] : 0,
                'keterangan_pelanggaran' => $data['keterangan_pelanggaran'] ?? null,
                'created_by' => $userId,
            ]
        );

        return true;
    }

    private function ambil(array $attrs, array $kandidat): ?string
    {
        foreach ($kandidat as $key) {
            if (isset($attrs[$key]) && trim((string) $attrs[$key]) !== '') {
                return trim((string) $attrs[$key]);
            }
        }

        return null;
    }

    private function hapusDirRekursif(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }
        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($it as $f) {
            $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname());
        }
        rmdir($dir);
    }
}
