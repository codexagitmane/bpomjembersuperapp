<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PengajuanBmn;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PengajuanBmnController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            PengajuanBmn::where('user_id', $request->user()->id)->orderByDesc('created_at')->paginate(20)
        );
    }

    /** Antrean tiket pemeliharaan/perbaikan — khusus Tata Usaha. */
    public function semua(Request $request)
    {
        $query = PengajuanBmn::with(['user:id,name', 'bmnItem'])->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'bmn_item_id' => ['nullable', 'exists:bmn_items,id'],
            'nama_barang_lain' => ['required_without:bmn_item_id', 'nullable', 'string', 'max:150'],
            'jenis_pengajuan' => ['required', Rule::in(['pemeliharaan', 'perbaikan'])],
            'deskripsi_kerusakan' => ['required', 'string', 'min:10', 'max:1500'],
            'prioritas' => ['required', Rule::in(['rendah', 'sedang', 'tinggi'])],
        ]);

        $pengajuan = PengajuanBmn::create([
            ...$validated,
            'user_id' => $request->user()->id,
            'status' => 'diajukan',
        ]);

        AuditLog::catat($request->user()->id, 'bmn_diajukan', 'tata_usaha', "Pengajuan BMN #{$pengajuan->id} dibuat.");

        return response()->json(['pengajuan' => $pengajuan], 201);
    }

    public function updateStatus(Request $request, PengajuanBmn $pengajuan)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['diproses', 'selesai', 'ditolak'])],
            'ditugaskan_ke' => ['nullable', 'exists:users,id'],
            'catatan_penyelesaian' => ['nullable', 'string', 'max:1000'],
        ]);

        $pengajuan->update([
            ...$validated,
            'selesai_at' => $validated['status'] === 'selesai' ? now() : $pengajuan->selesai_at,
        ]);

        AuditLog::catat($request->user()->id, 'bmn_status_diubah', 'tata_usaha', "Pengajuan BMN #{$pengajuan->id} -> {$validated['status']}.");

        return response()->json(['pengajuan' => $pengajuan]);
    }
}
