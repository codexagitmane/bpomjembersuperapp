<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Ekspor rekap presensi generik (harian/bulanan/tahunan). Struktur data dari
 * RekapPresensiService: headers (label kolom), kolom (key baris), rows.
 */
class RekapExportService
{
    public function excel(array $rekap): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Rekap Presensi');

        $jumlahKolom = count($rekap['headers']);
        $kolomAkhir = Coordinate::stringFromColumnIndex($jumlahKolom);

        $sheet->setCellValue('A1', 'REKAP PRESENSI PEGAWAI ('.strtoupper($rekap['mode']).') — BALAI POM DI JEMBER');
        $info = 'Periode: '.$rekap['periode'];
        if (isset($rekap['hari_kerja'])) {
            $info .= '  |  Hari kerja: '.$rekap['hari_kerja'];
        }
        $sheet->setCellValue('A2', $info);
        $sheet->mergeCells("A1:{$kolomAkhir}1");
        $sheet->mergeCells("A2:{$kolomAkhir}2");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $sheet->fromArray($rekap['headers'], null, 'A4');
        $sheet->getStyle("A4:{$kolomAkhir}4")->getFont()->setBold(true);
        $sheet->getStyle("A4:{$kolomAkhir}4")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('0B1F3A');
        $sheet->getStyle("A4:{$kolomAkhir}4")->getFont()->getColor()->setRGB('FFFFFF');
        $sheet->getStyle("A4:{$kolomAkhir}4")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $r = 5;
        foreach ($rekap['rows'] as $i => $row) {
            $sheet->fromArray([
                $i + 1,
                ...array_map(fn (string $k) => $row[$k], $rekap['kolom']),
            ], null, 'A'.$r);
            $r++;
        }

        for ($c = 1; $c <= $jumlahKolom; $c++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
        }
        $sheet->getStyle("A4:{$kolomAkhir}".($r - 1))->getBorders()->getAllBorders()
            ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

        $filename = $this->namaFile($rekap, 'xlsx');

        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function pdf(array $rekap)
    {
        $pdf = Pdf::loadView('pdf.rekap-presensi', ['rekap' => $rekap])->setPaper('a4', 'landscape');

        return $pdf->download($this->namaFile($rekap, 'pdf'));
    }

    private function namaFile(array $rekap, string $ext): string
    {
        $suffix = match ($rekap['mode']) {
            'harian' => $rekap['tanggal'],
            'tahunan' => (string) $rekap['tahun'],
            default => $rekap['tahun'].'-'.str_pad((string) $rekap['bulan'], 2, '0', STR_PAD_LEFT),
        };

        return "rekap-presensi-{$rekap['mode']}-{$suffix}.{$ext}";
    }
}
