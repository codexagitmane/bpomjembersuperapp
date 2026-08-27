<?php

namespace App\Services;

use App\Models\BmnItem;
use App\Models\JadwalPemeliharaanBmn;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Template & impor "Jadwal dan Realisasi Pemeliharaan Sarpras" (matriks per
 * tahun × 12 bulan Rencana/Realisasi), dikelompokkan per ruangan.
 */
class JadwalExcelService
{
    private const BULAN = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
        'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];

    // Kolom info: 0=NO 1=FASILITAS 2=Kode 3=No.Urut 4=NUP 5=JUMLAH, bulan mulai kolom 6, keterangan kolom 30.
    private const C_INFO = 6;
    private const C_KET = 30;

    public function template(int $tahun): StreamedResponse
    {
        $ss = new Spreadsheet();
        $sheet = $ss->getActiveSheet();
        $sheet->setTitle((string) $tahun);
        $lastCol = Coordinate::stringFromColumnIndex(self::C_KET + 1);

        $sheet->setCellValue('A1', 'JADWAL DAN REALISASI PEMELIHARAAN SARANA DAN PRASARANA');
        $sheet->mergeCells("A1:{$lastCol}1");
        $sheet->setCellValue('A2', 'BALAI PENGAWAS OBAT DAN MAKANAN DI JEMBER — TAHUN '.$tahun);
        $sheet->mergeCells("A2:{$lastCol}2");
        $sheet->getStyle('A1:A2')->getFont()->setBold(true);
        $sheet->getStyle('A1:A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $cell = fn (int $col0, int $row, $val) => $sheet->setCellValue(Coordinate::stringFromColumnIndex($col0 + 1).$row, $val);
        // Header baris 4-6.
        foreach (['NO', 'FASILITAS', 'Kode Barang', 'No. Urut Pendaftaran', 'NUP', 'JUMLAH'] as $c => $t) {
            $cell($c, 4, $t);
        }
        $cell(self::C_INFO, 4, 'PEMELIHARAAN PADA BULAN');
        $cell(self::C_KET, 4, 'KETERANGAN');
        foreach (self::BULAN as $m => $nama) {
            $c = self::C_INFO + $m * 2;
            $cell($c, 5, $nama);
            $cell($c, 6, 'Renc');
            $cell($c + 1, 6, 'Real');
        }
        // Contoh baris ruangan + item.
        $cell(0, 7, '1');
        $cell(1, 7, 'RUANG KEPALA BALAI');
        $cell(1, 8, 'PC ACER');
        $cell(2, 8, '3.10.01.02.001');
        $cell(3, 8, '5');
        $cell(4, 8, '173');
        $cell(5, 8, '1');
        foreach (range(0, 11) as $m) {
            $cell(self::C_INFO + $m * 2, 8, '√');
            $cell(self::C_INFO + $m * 2 + 1, 8, '√');
        }
        $cell(self::C_KET, 8, 'SETIAP 1 BULAN SEKALI');

        $sheet->getStyle("A4:{$lastCol}6")->getFont()->setBold(true);
        $sheet->getStyle("A4:{$lastCol}6")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('DCE6F1');
        $sheet->getStyle("A4:{$lastCol}8")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        for ($c = 1; $c <= self::C_KET + 1; $c++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
        }

        return response()->streamDownload(function () use ($ss) {
            (new Xlsx($ss))->save('php://output');
        }, "Template-Jadwal-Pemeliharaan-{$tahun}.xlsx", [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function import(UploadedFile $file, ?int $userId = null, ?int $tahunParam = null): array
    {
        $ss = IOFactory::load($file->getRealPath());
        $sheet = $ss->getActiveSheet();
        $tahun = $tahunParam ?: (is_numeric($sheet->getTitle()) ? (int) $sheet->getTitle() : now()->year);
        $rows = $sheet->toArray(null, true, true, false);

        // Cari baris "Renc/Real" (setelah baris bulan) → data mulai baris berikutnya.
        $subRow = null;
        foreach ($rows as $i => $r) {
            $joined = strtolower(implode('', array_map(fn ($c) => (string) $c, $r)));
            if (str_contains($joined, 'renc') && str_contains($joined, 'real')) {
                $subRow = $i;
                break;
            }
        }
        if ($subRow === null) {
            return ['berhasil' => 0, 'gagal' => 0, 'tahun' => $tahun, 'errors' => ['Format tidak dikenali (baris Renc/Real tidak ditemukan).']];
        }

        $ruangan = null;
        $berhasil = 0;
        $gagal = 0;
        $errors = [];
        $isMark = fn ($v) => in_array(strtolower(trim((string) $v)), ['√', 'v', 'ya', 'y', '1', 'x', 'ceklis', '✓'], true) || trim((string) $v) === '√';

        foreach (array_slice($rows, $subRow + 1, null, true) as $i => $r) {
            $nama = trim((string) ($r[1] ?? ''));
            $kode = trim((string) ($r[2] ?? ''));
            if ($nama === '' && $kode === '') {
                continue;
            }
            // Baris kelompok ruangan: FASILITAS terisi tapi Kode kosong.
            if ($kode === '') {
                $ruangan = mb_substr($nama, 0, 120);

                continue;
            }
            try {
                // Identitas aset = Kode Barang + NUP (No. BMN lengkap), agar kode sama
                // dengan NUP berbeda tidak saling menimpa.
                $nup = trim((string) ($r[4] ?? ''));
                $fullKode = $nup !== '' ? $kode.'.'.$nup : $kode;
                $bmn = BmnItem::firstOrNew(['kode_barang' => mb_substr($fullKode, 0, 60)]);
                $bmn->nama_barang = mb_substr($nama ?: $bmn->nama_barang ?: $fullKode, 0, 150);
                if ($nup !== '') {
                    $bmn->nup = mb_substr($nup, 0, 40);
                }
                if ($ruangan && ! $bmn->lokasi) {
                    $bmn->lokasi = $ruangan;
                }
                if (! $bmn->kondisi) {
                    $bmn->kondisi = 'baik';
                }
                $bmn->save();

                $bulan = [];
                foreach (range(0, 11) as $m) {
                    $bulan[$m + 1] = [
                        'r' => $isMark($r[self::C_INFO + $m * 2] ?? '') ? 1 : 0,
                        'e' => $isMark($r[self::C_INFO + $m * 2 + 1] ?? '') ? 1 : 0,
                    ];
                }
                JadwalPemeliharaanBmn::updateOrCreate(
                    ['bmn_item_id' => $bmn->id, 'tahun' => $tahun],
                    [
                        'jumlah' => (int) preg_replace('/\D/', '', (string) ($r[5] ?? '1')) ?: 1,
                        'bulan' => $bulan,
                        'keterangan' => mb_substr(trim((string) ($r[self::C_KET] ?? '')), 0, 255) ?: null,
                        'user_id' => $userId,
                    ]
                );
                $berhasil++;
            } catch (\Throwable $e) {
                $gagal++;
                if (count($errors) < 20) {
                    $errors[] = 'Baris '.($i + 1).': '.substr($e->getMessage(), 0, 80);
                }
            }
        }

        return compact('berhasil', 'gagal', 'tahun', 'errors');
    }
}
