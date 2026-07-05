<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Services\RekapExportService;
use App\Services\RekapPresensiService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Rekap presensi harian / bulanan / tahunan + ekspor Excel/PDF —
 * Kasubag TU, Kepala Balai, Superadmin.
 */
class RekapPresensiController extends Controller
{
    public function __construct(
        private readonly RekapPresensiService $rekap,
        private readonly RekapExportService $export,
    ) {
    }

    /** Validasi parameter sesuai mode, lalu bangun data rekap. */
    private function bangunRekap(Request $request): array
    {
        $v = $request->validate([
            'mode' => ['nullable', Rule::in(['harian', 'bulanan', 'tahunan'])],
            'tanggal' => ['required_if:mode,harian', 'nullable', 'date'],
            'tahun' => ['required_unless:mode,harian', 'nullable', 'integer', 'min:2020', 'max:2100'],
            'bulan' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        $mode = $v['mode'] ?? 'bulanan';

        return match ($mode) {
            'harian' => $this->rekap->rekapHarian($v['tanggal']),
            'tahunan' => $this->rekap->rekapTahunan((int) $v['tahun']),
            default => $this->rekap->rekapBulanan((int) $v['tahun'], (int) ($v['bulan'] ?? now()->month)),
        };
    }

    public function index(Request $request)
    {
        return response()->json($this->bangunRekap($request));
    }

    public function excel(Request $request)
    {
        $rekap = $this->bangunRekap($request);
        AuditLog::catat($request->user()->id, 'rekap_export_excel', 'tata_usaha',
            "Export Excel rekap {$rekap['mode']} ({$rekap['periode']}).");

        return $this->export->excel($rekap);
    }

    public function pdf(Request $request)
    {
        $rekap = $this->bangunRekap($request);
        AuditLog::catat($request->user()->id, 'rekap_export_pdf', 'tata_usaha',
            "Export PDF rekap {$rekap['mode']} ({$rekap['periode']}).");

        return $this->export->pdf($rekap);
    }
}
