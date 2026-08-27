<?php

namespace App\Services;

use App\Models\BmnItem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Impor katalog BMN & ekspor rekap pemeliharaan/perbaikan (Excel).
 * Kolom impor fleksibel (header case-insensitive): Nama BMN, Nomor BMN,
 * NUP, Jenis BMN, Kondisi, Lokasi, Tahun.
 */
class BmnExcelService
{
    private const KONDISI = ['baik', 'rusak_ringan', 'rusak_sedang', 'rusak_berat'];

    public function import(UploadedFile $file): array
    {
        $rows = IOFactory::load($file->getRealPath())->getActiveSheet()->toArray(null, true, true, false);
        if (count($rows) < 2) {
            return ['berhasil' => 0, 'gagal' => 0, 'errors' => ['File kosong atau tanpa baris data.']];
        }
        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $rows[0]);
        $berhasil = 0;
        $gagal = 0;
        $errors = [];

        foreach (array_slice($rows, 1) as $i => $row) {
            // Lewati baris yang benar-benar kosong (mis. baris pemisah / catatan template).
            if (! is_array($row) || count(array_filter($row, fn ($c) => trim((string) $c) !== '')) === 0) {
                continue;
            }
            $d = [];
            foreach ($header as $col => $key) {
                $d[$key] = isset($row[$col]) ? trim((string) $row[$col]) : null;
            }
            $kode = $this->pick($d, ['nomor bmn', 'no bmn', 'no. bmn', 'kode barang', 'kode_barang', 'nomor', 'kode']);
            $nama = $this->pick($d, ['nama bmn', 'nama barang', 'nama_barang', 'nama']);
            if (! $kode || ! $nama) {
                $gagal++;
                if (count($errors) < 20) {
                    $errors[] = 'Baris '.($i + 2).': Nama BMN & Nomor BMN wajib diisi.';
                }

                continue;
            }
            $tahun = (int) preg_replace('/\D/', '', (string) $this->pick($d, ['tahun', 'tahun perolehan']));
            try {
                // Potong ke panjang kolom agar tidak error di MySQL (strict mode).
                BmnItem::updateOrCreate(
                    ['kode_barang' => $this->cut($kode, 60)],
                    [
                        'nama_barang' => $this->cut($nama, 150),
                        'nup' => $this->cut($this->pick($d, ['nup']), 40),
                        'jenis_bmn' => $this->cut($this->pick($d, ['jenis bmn', 'jenis', 'jenis_bmn']), 120),
                        'lokasi' => $this->cut($this->pick($d, ['lokasi', 'ruang']), 150),
                        'kondisi' => $this->normalKondisi($this->pick($d, ['kondisi'])),
                        'tahun_perolehan' => $tahun > 1900 ? $tahun : null,
                    ]
                );
                $berhasil++;
            } catch (\Throwable $e) {
                $gagal++;
                if (count($errors) < 20) {
                    $errors[] = 'Baris '.($i + 2).': gagal disimpan ('.substr($e->getMessage(), 0, 80).').';
                }
            }
        }

        return compact('berhasil', 'gagal', 'errors');
    }

    /** Template Excel impor BMN (header sesuai kolom + baris contoh). */
    public function template(): StreamedResponse
    {
        $ss = new Spreadsheet();
        $sheet = $ss->getActiveSheet();
        $sheet->setTitle('Template BMN');
        $headers = ['Nama BMN', 'Nomor BMN', 'NUP', 'Jenis BMN', 'Kondisi', 'Lokasi', 'Tahun'];
        $lastCol = Coordinate::stringFromColumnIndex(count($headers));

        $sheet->fromArray($headers, null, 'A1');
        $sheet->getStyle("A1:{$lastCol}1")->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle("A1:{$lastCol}1")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('0B1F3A');
        $sheet->getStyle("A1:{$lastCol}1")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Baris contoh (bisa dihapus sebelum impor).
        $contoh = [
            ['AC Split 1 PK', '3.05.02.01.003.1', '0001', 'Alat Pendingin', 'Baik', 'Ruang Pemeriksaan', 2020],
            ['Laptop Dinas', '3.10.01.02.001.4', '0002', 'Peralatan Komputer', 'Rusak Ringan', 'Ruang Tata Usaha', 2022],
        ];
        $sheet->fromArray($contoh, null, 'A2');
        $sheet->getStyle('A2:'.$lastCol.'3')->getFont()->getColor()->setRGB('8291AB');

        // Catatan kolom Kondisi (validasi nilai yang diperbolehkan).
        $sheet->setCellValue('A5', 'Catatan: kolom Kondisi diisi salah satu dari — Baik, Rusak Ringan, Rusak Sedang, Rusak Berat. Hapus baris contoh sebelum impor.');
        $sheet->mergeCells("A5:{$lastCol}5");
        $sheet->getStyle('A5')->getFont()->setItalic(true)->setSize(9)->getColor()->setRGB('B4540A');

        for ($c = 1; $c <= count($headers); $c++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
        }
        $sheet->getStyle("A1:{$lastCol}3")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        return response()->streamDownload(function () use ($ss) {
            (new Xlsx($ss))->save('php://output');
        }, 'Template-Import-BMN.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /** @param  Collection<int,\App\Models\PengajuanBmn>  $data */
    public function exportPemeliharaan(Collection $data): StreamedResponse
    {
        $ss = new Spreadsheet();
        $sheet = $ss->getActiveSheet();
        $sheet->setTitle('Pemeliharaan BMN');
        $headers = ['No', 'Nomor Permohonan', 'Tanggal', 'Pemohon', 'NIP', 'Jabatan', 'Kelompok Substansi',
            'Nama BMN', 'No. BMN', 'Kondisi', 'Deskripsi Kerusakan', 'Pengelola BMN', 'Tindakan',
            'Tgl Diperbaiki', 'Status', 'Disahkan (Kasubag)', 'Tgl Selesai'];
        $lastCol = Coordinate::stringFromColumnIndex(count($headers));

        $sheet->setCellValue('A1', 'DATA PEMELIHARAAN & PERBAIKAN BMN — BALAI POM DI JEMBER');
        $sheet->mergeCells("A1:{$lastCol}1");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->setCellValue('A2', 'Dicetak: '.now()->timezone('Asia/Jakarta')->locale('id')->translatedFormat('d F Y H:i').' WIB');
        $sheet->mergeCells("A2:{$lastCol}2");

        $sheet->fromArray($headers, null, 'A4');
        $sheet->getStyle("A4:{$lastCol}4")->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle("A4:{$lastCol}4")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('0B1F3A');
        $sheet->getStyle("A4:{$lastCol}4")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $fmt = fn ($d) => $d ? $d->locale('id')->translatedFormat('d M Y') : '';
        $r = 5;
        foreach ($data->values() as $i => $p) {
            $sheet->fromArray([
                $i + 1,
                $p->nomor_permohonan,
                $fmt($p->tanggal_permohonan),
                $p->pemohon_nama ?? $p->user?->name,
                (string) ($p->pemohon_nip ?? $p->user?->nip_nik),
                $p->jabatan,
                $p->kelompok_substansi,
                $p->nama_barang_lain ?? $p->bmnItem?->nama_barang,
                (string) $p->no_bmn,
                $this->labelKondisi($p->kondisi),
                $p->deskripsi_kerusakan,
                $p->pengelolaBmn?->name,
                $p->tindakan,
                $fmt($p->tanggal_diperbaiki),
                ucfirst($p->status),
                $p->kasubag?->name,
                $fmt($p->selesai_tanggal),
            ], null, 'A'.$r);
            $r++;
        }

        for ($c = 1; $c <= count($headers); $c++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
        }
        if ($r > 5) {
            $sheet->getStyle("A4:{$lastCol}".($r - 1))->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        }

        return response()->streamDownload(function () use ($ss) {
            (new Xlsx($ss))->save('php://output');
        }, 'Pemeliharaan-BMN-'.now()->format('Ymd-His').'.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /** Potong string ke panjang maksimum kolom (aman untuk MySQL strict mode). */
    private function cut(?string $v, int $max): ?string
    {
        if ($v === null || $v === '') {
            return null;
        }

        return mb_substr($v, 0, $max);
    }

    private function pick(array $d, array $keys): ?string
    {
        foreach ($keys as $k) {
            if (! empty($d[$k])) {
                return $d[$k];
            }
        }

        return null;
    }

    private function normalKondisi(?string $v): string
    {
        $v = strtolower(str_replace([' ', '-'], '_', trim((string) $v)));

        return in_array($v, self::KONDISI, true) ? $v : 'baik';
    }

    private function labelKondisi(?string $v): string
    {
        return match ($v) {
            'rusak_ringan' => 'Rusak Ringan',
            'rusak_sedang' => 'Rusak Sedang',
            'rusak_berat' => 'Rusak Berat',
            'baik' => 'Baik',
            default => '',
        };
    }
}
