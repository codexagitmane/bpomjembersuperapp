<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\IzinKeluarMasuk;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IzinKeluarMasukController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            IzinKeluarMasuk::where('user_id', $request->user()->id)->orderByDesc('tanggal')->paginate(20)
        );
    }

    /** Antrean persetujuan — khusus Kepala Subag TU / Superadmin. */
    public function semua(Request $request)
    {
        $query = IzinKeluarMasuk::with('user:id,name,email')->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tanggal' => ['required', 'date'],
            'jam_mulai' => ['required', 'date_format:H:i'],
            'jam_selesai' => ['nullable', 'date_format:H:i', 'after:jam_mulai'],
            'jenis' => ['required', Rule::in(['keluar_sementara', 'dinas_luar', 'izin_pribadi'])],
            'keperluan' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $izin = IzinKeluarMasuk::create([
            ...$validated,
            'user_id' => $request->user()->id,
            'status' => 'diajukan',
        ]);

        AuditLog::catat($request->user()->id, 'izin_diajukan', 'tata_usaha', "Izin #{$izin->id} diajukan.");

        return response()->json(['izin' => $izin], 201);
    }

    public function approve(Request $request, IzinKeluarMasuk $izin)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['disetujui', 'ditolak'])],
            'catatan_approval' => ['nullable', 'string', 'max:500'],
        ]);

        $izin->update([
            ...$validated,
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        AuditLog::catat($request->user()->id, 'izin_diputuskan', 'tata_usaha', "Izin #{$izin->id} -> {$validated['status']}.");

        return response()->json(['izin' => $izin]);
    }
}
