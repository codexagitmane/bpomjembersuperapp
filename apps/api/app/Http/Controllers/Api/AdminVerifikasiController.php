<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AkunDiaktifkanMail;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\WfhLocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

/**
 * Verifikasi oleh tim IT/admin (superadmin):
 * - aktivasi akun masyarakat hasil registrasi mandiri
 * - verifikasi lokasi WFH pegawai
 */
class AdminVerifikasiController extends Controller
{
    public function akunPending()
    {
        $users = User::where('account_type', 'eksternal')
            ->where('is_active', false)
            ->orderBy('created_at')
            ->get(['id', 'name', 'email', 'phone', 'created_at']);

        return response()->json(['users' => $users]);
    }

    public function aktivasiAkun(Request $request, User $user)
    {
        $validated = $request->validate([
            'aksi' => ['required', Rule::in(['aktifkan', 'tolak'])],
        ]);

        if ($user->account_type !== 'eksternal') {
            return response()->json(['message' => 'Hanya akun masyarakat (eksternal) yang diverifikasi lewat menu ini.'], 422);
        }

        if ($validated['aksi'] === 'aktifkan') {
            $user->forceFill(['is_active' => true, 'email_verified_at' => now()])->save();
            Mail::to($user->email)->queue(new AkunDiaktifkanMail($user));
            AuditLog::catat($request->user()->id, 'akun_diaktifkan', 'admin', "Akun {$user->email} diaktifkan.");

            return response()->json(['message' => "Akun {$user->email} berhasil diaktifkan."]);
        }

        $email = $user->email;
        $user->delete(); // soft delete
        AuditLog::catat($request->user()->id, 'akun_ditolak', 'admin', "Registrasi {$email} ditolak.");

        return response()->json(['message' => "Registrasi {$email} ditolak."]);
    }

    public function wfhPending()
    {
        $lokasi = WfhLocation::with('user:id,name,email,jenis_pegawai')
            ->where('status', 'diajukan')
            ->orderBy('created_at')
            ->get();

        return response()->json(['lokasi' => $lokasi]);
    }

    public function verifikasiWfh(Request $request, WfhLocation $wfhLocation)
    {
        $validated = $request->validate([
            'aksi' => ['required', Rule::in(['setujui', 'tolak'])],
            'catatan' => ['nullable', 'string', 'max:500'],
        ]);

        $wfhLocation->update([
            'status' => $validated['aksi'] === 'setujui' ? 'diverifikasi' : 'ditolak',
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
            'catatan_verifikasi' => $validated['catatan'] ?? null,
        ]);

        AuditLog::catat($request->user()->id, 'wfh_diverifikasi', 'admin',
            "Lokasi WFH #{$wfhLocation->id} ({$wfhLocation->user->name}): {$validated['aksi']}.");

        return response()->json(['lokasi' => $wfhLocation->fresh()]);
    }
}
