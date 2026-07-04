<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RekapExportService
{
    public function excel(array $rekap): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Rekap Presensi');

        $sheet->setCellValue('A1', 'REKAP PRESENSI PEGAWAI — BALAI POM DI JEMBER');
        $sheet->setCellValue('A2', 'Periode: '.$rekap['periode'].'  |  Hari kerja: '.$rekap['hari_kerja']);
        $sheet->mergeCells('A1:I1');
        $sheet->mergeCells('A2:I2');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $headers = ['No', 'Nama', 'NIP/NIK', 'Jenis', 'Hadir', 'Tepat Waktu', 'Terlambat', 'WFH', 'Dinas'];
        $sheet->fromArray($headers, null, 'A4');
        $sheet->getStyle('A4:I4')->getFont()->setBold(true);
        $sheet->getStyle('A4:I4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('0B1F3A');
        $sheet->getStyle('A4:I4')->getFont()->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A4:I4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $r = 5;
        foreach ($rekap['rows'] as $i => $row) {
            $sheet->fromArray([
                $i + 1, $row['nama'], $row['nip_nik'], $row['jenis_pegawai'],
                $row['hadir'], $row['tepat_waktu'], $row['terlambat'], $row['wfh'], $row['dinas'],
            ], null, 'A'.$r);
            $r++;
        }

        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        $sheet->getStyle('A4:I'.($r - 1))->getBorders()->getAllBorders()
            ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

        $filename = 'rekap-presensi-'.$rekap['tahun'].'-'.str_pad((string) $rekap['bulan'], 2, '0', STR_PAD_LEFT).'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function pdf(array $rekap)
    {
        $pdf = Pdf::loadView('pdf.rekap-presensi', ['rekap' => $rekap])->setPaper('a4', 'landscape');
        $filename = 'rekap-presensi-'.$rekap['tahun'].'-'.str_pad((string) $rekap['bulan'], 2, '0', STR_PAD_LEFT).'.pdf';

        return $pdf->download($filename);
    }
}
