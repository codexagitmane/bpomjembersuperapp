<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Services\RekapExportService;
use App\Services\RekapPresensiService;
use Illuminate\Http\Request;

/** Rekap presensi bulanan + ekspor Excel/PDF — Kasubag TU, Kepala Balai, Superadmin. */
class RekapPresensiController extends Controller
{
    public function __construct(
        private readonly RekapPresensiService $rekap,
        private readonly RekapExportService $export,
    ) {
    }

    private function validasi(Request $request): array
    {
        return $request->validate([
            'tahun' => ['required', 'integer', 'min:2020', 'max:2100'],
            'bulan' => ['required', 'integer', 'min:1', 'max:12'],
        ]);
    }

    public function index(Request $request)
    {
        $v = $this->validasi($request);

        return response()->json($this->rekap->rekapBulanan($v['tahun'], $v['bulan']));
    }

    public function excel(Request $request)
    {
        $v = $this->validasi($request);
        AuditLog::catat($request->user()->id, 'rekap_export_excel', 'tata_usaha', "Export Excel rekap {$v['bulan']}/{$v['tahun']}.");

        return $this->export->excel($this->rekap->rekapBulanan($v['tahun'], $v['bulan']));
    }

    public function pdf(Request $request)
    {
        $v = $this->validasi($request);
        AuditLog::catat($request->user()->id, 'rekap_export_pdf', 'tata_usaha', "Export PDF rekap {$v['bulan']}/{$v['tahun']}.");

        return $this->export->pdf($this->rekap->rekapBulanan($v['tahun'], $v['bulan']));
    }
}
