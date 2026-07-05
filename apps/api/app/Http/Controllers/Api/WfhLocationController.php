<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\WfhLocation;
use App\Services\NotifikasiService;
use Illuminate\Http\Request;

class WfhLocationController extends Controller
{
    /** Lokasi WFH milik user yang login. */
    public function index(Request $request)
    {
        return response()->json([
            'lokasi' => WfhLocation::where('user_id', $request->user()->id)->orderByDesc('created_at')->get(),
        ]);
    }

    /** Daftarkan / ajukan ulang lokasi WFH (menunggu verifikasi admin). */
    public function store(Request $request, NotifikasiService $notif)
    {
        $validated = $request->validate([
            'label' => ['nullable', 'string', 'max:100'],
            'alamat' => ['required', 'string', 'max:1000'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        // Satu pengajuan aktif per user: pengajuan baru menggantikan yang lama.
        WfhLocation::where('user_id', $request->user()->id)->delete();

        $lokasi = WfhLocation::create([
            ...$validated,
            'label' => $validated['label'] ?? 'Rumah',
            'user_id' => $request->user()->id,
            'status' => 'diajukan',
        ]);

        AuditLog::catat($request->user()->id, 'wfh_diajukan', 'presensi', "Lokasi WFH #{$lokasi->id} diajukan.");

        $notif->kirimKeRole(['superadmin'],
            'Pengajuan Lokasi WFH Baru',
            "{$request->user()->name} mengajukan lokasi WFH baru untuk diverifikasi.",
            '/admin/verifikasi');

        return response()->json([
            'lokasi' => $lokasi,
            'message' => 'Lokasi WFH diajukan. Menunggu verifikasi tim IT/admin BPOM Jember.',
        ], 201);
    }
}
