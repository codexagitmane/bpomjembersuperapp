<?php

namespace App\Services;

use App\Models\PersediaanBmn;
use App\Models\PersediaanMasuk;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Impor massal "persediaan masuk": tiap baris = satu penerimaan barang yang
 * meng-upsert item katalog, menambah stok, dan membuat lot FIFO (persediaan_masuk).
 */
class PersediaanExcelService
{
    private const KATEGORI = ['atk', 'reagen', 'test_kit', 'alat', 'lainnya'];

    private const HEADERS = ['Nama Item', 'Kategori', 'Kelompok', 'Satuan', 'Lokasi',
        'Jumlah Masuk', 'Stok Minimum', 'Jenis', 'Tanggal Masuk', 'Sumber', 'Tanggal Kedaluwarsa'];

    public function template(): StreamedResponse
    {
        $ss = new Spreadsheet();
        $sheet = $ss->getActiveSheet();
        $sheet->setTitle('Template Persediaan Masuk');
        $lastCol = Coordinate::stringFromColumnIndex(count(self::HEADERS));

        $sheet->fromArray(self::HEADERS, null, 'A1');
        $sheet->getStyle("A1:{$lastCol}1")->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle("A1:{$lastCol}1")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('0B1F3A');
        $sheet->getStyle("A1:{$lastCol}1")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $contoh = [
            ['Kertas A4 80gr', 'ATK', 'ATK', 'rim', 'Gudang ATK Lt. 1', 50, 10, 'Pembelian', '2026-07-01', 'CV Sumber Makmur', ''],
            ['Reagen Formalin Kit', 'Reagen', 'PSD', 'kit', 'Gudang Lab', 20, 5, 'Transfer Masuk', '2026-07-05', 'Balai Besar Surabaya', '2027-06-30'],
        ];
        $sheet->fromArray($contoh, null, 'A2');
        $sheet->getStyle('A2:'.$lastCol.'3')->getFont()->getColor()->setRGB('8291AB');

        $sheet->setCellValue('A5', 'Catatan: Kategori = ATK/Reagen/Test Kit/Alat/Lainnya. Kelompok = ATK atau PSD. '
            .'Jenis = Pembelian atau Transfer Masuk. Tanggal format YYYY-MM-DD. Hapus baris contoh sebelum impor.');
        $sheet->mergeCells("A5:{$lastCol}5");
        $sheet->getStyle('A5')->getFont()->setItalic(true)->setSize(9)->getColor()->setRGB('B4540A');

        for ($c = 1; $c <= count(self::HEADERS); $c++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
        }
        $sheet->getStyle("A1:{$lastCol}3")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        return response()->streamDownload(function () use ($ss) {
            (new Xlsx($ss))->save('php://output');
        }, 'Template-Persediaan-Masuk.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function import(UploadedFile $file, ?int $userId = null): array
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
            if (! is_array($row) || count(array_filter($row, fn ($c) => trim((string) $c) !== '')) === 0) {
                continue;
            }
            $d = [];
            foreach ($header as $col => $key) {
                $d[$key] = isset($row[$col]) ? trim((string) $row[$col]) : null;
            }
            $nama = $this->pick($d, ['nama item', 'nama', 'nama barang']);
            $jumlah = (int) preg_replace('/\D/', '', (string) $this->pick($d, ['jumlah masuk', 'jumlah', 'stok']));
            if (! $nama || $jumlah < 1) {
                $gagal++;
                if (count($errors) < 20) {
                    $errors[] = 'Baris '.($i + 2).': Nama Item & Jumlah Masuk (≥1) wajib diisi.';
                }

                continue;
            }
            try {
                $item = PersediaanBmn::firstOrNew(['nama' => mb_substr($nama, 0, 190)]);
                $item->kategori = $this->normalKategori($this->pick($d, ['kategori']));
                $item->kelompok = strtolower((string) $this->pick($d, ['kelompok'])) === 'atk' ? 'atk' : 'psd';
                $item->satuan = mb_substr((string) ($this->pick($d, ['satuan']) ?? 'unit'), 0, 30);
                $lokasi = $this->cut($this->pick($d, ['lokasi', 'ruang']), 120);
                if ($lokasi) {
                    $item->lokasi = $lokasi;
                }
                $item->stok_minimum = (int) preg_replace('/\D/', '', (string) $this->pick($d, ['stok minimum', 'stok_minimum', 'minimum']));
                $exp = $this->parseTanggal($this->pick($d, ['tanggal kedaluwarsa', 'kedaluwarsa', 'expired']));
                if ($exp) {
                    $item->tanggal_kedaluwarsa = $exp;
                }
                $item->stok = (int) $item->stok + $jumlah;
                $item->save();

                PersediaanMasuk::create([
                    'persediaan_id' => $item->id,
                    'jenis' => str_contains(strtolower((string) $this->pick($d, ['jenis'])), 'transfer') ? 'transfer_masuk' : 'pembelian',
                    'jumlah' => $jumlah,
                    'sisa' => $jumlah,
                    'lokasi' => $item->lokasi,
                    'tanggal' => $this->parseTanggal($this->pick($d, ['tanggal masuk', 'tanggal'])) ?? Carbon::today()->toDateString(),
                    'sumber' => $this->cut($this->pick($d, ['sumber', 'pemasok']), 190),
                    'keterangan' => 'Impor Excel',
                    'user_id' => $userId,
                ]);
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

    private function pick(array $d, array $keys): ?string
    {
        foreach ($keys as $k) {
            if (! empty($d[$k])) {
                return $d[$k];
            }
        }

        return null;
    }

    private function cut(?string $v, int $max): ?string
    {
        return ($v === null || $v === '') ? null : mb_substr($v, 0, $max);
    }

    private function normalKategori(?string $v): string
    {
        $v = strtolower(str_replace([' ', '-'], '_', trim((string) $v)));

        return in_array($v, self::KATEGORI, true) ? $v : 'lainnya';
    }

    private function parseTanggal(?string $v): ?string
    {
        if (! $v) {
            return null;
        }
        try {
            return Carbon::parse($v)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}
