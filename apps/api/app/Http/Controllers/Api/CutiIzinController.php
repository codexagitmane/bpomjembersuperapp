<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CutiIzin;
use App\Services\NotifikasiService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class CutiIzinController extends Controller
{
    /** Riwayat pengajuan milik sendiri + info sisa jatah cuti tahun berjalan. */
    public function index(Request $request)
    {
        $user = $request->user();
        $tahun = (int) $request->input('tahun', now()->year);

        $terpakai = CutiIzin::totalCutiDisetujui($user->id, $tahun);

        return response()->json([
            'data' => CutiIzin::with('approver:id,name')
                ->where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->limit(50)
                ->get(),
            'jatah' => [
                'tahun' => $tahun,
                'jatah_cuti_tahunan' => $user->jatah_cuti_tahunan,
                'cuti_terpakai' => $terpakai,
                'sisa_cuti' => max(0, $user->jatah_cuti_tahunan - $terpakai),
            ],
        ]);
    }

    public function store(Request $request, NotifikasiService $notif)
    {
        $validated = $request->validate([
            'jenis' => ['required', Rule::in(['cuti', 'izin', 'sakit'])],
            'tanggal_mulai' => ['required', 'date'],
            'tanggal_selesai' => ['required', 'date', 'after_or_equal:tanggal_mulai'],
            'alasan' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $user = $request->user();
        $mulai = Carbon::parse($validated['tanggal_mulai']);
        $selesai = Carbon::parse($validated['tanggal_selesai']);
        $jumlahHari = CutiIzin::hitungHariKerja($mulai, $selesai);

        if ($jumlahHari < 1) {
            return response()->json([
                'message' => 'Rentang tanggal tidak mengandung hari kerja (Senin–Jumat).',
            ], 422);
        }

        // Tolak pengajuan yang tumpang-tindih dengan pengajuan aktif lain.
        $tumpangTindih = CutiIzin::where('user_id', $user->id)
            ->whereIn('status', ['diajukan', 'disetujui'])
            ->whereDate('tanggal_mulai', '<=', $selesai->toDateString())
            ->whereDate('tanggal_selesai', '>=', $mulai->toDateString())
            ->exists();
        if ($tumpangTindih) {
            return response()->json([
                'message' => 'Rentang tanggal tumpang-tindih dengan pengajuan lain yang masih aktif.',
            ], 422);
        }

        // Khusus cuti: validasi sisa jatah tahun berjalan.
        if ($validated['jenis'] === 'cuti') {
            $terpakai = CutiIzin::totalCutiDisetujui($user->id, $mulai->year);
            $sisa = $user->jatah_cuti_tahunan - $terpakai;
            if ($jumlahHari > $sisa) {
                return response()->json([
                    'message' => "Sisa jatah cuti tahun {$mulai->year} hanya {$sisa} hari, pengajuan {$jumlahHari} hari.",
                ], 422);
            }
        }

        $cuti = CutiIzin::create([
            ...$validated,
            'user_id' => $user->id,
            'jumlah_hari' => $jumlahHari,
            'status' => 'diajukan',
        ]);

        AuditLog::catat($user->id, 'cuti_izin_diajukan', 'presensi',
            "Pengajuan {$validated['jenis']} {$jumlahHari} hari ({$mulai->toDateString()} s/d {$selesai->toDateString()}).");

        $notif->kirimKeRole(['kepala_subag_tu', 'superadmin'],
            'Pengajuan '.ucfirst($validated['jenis']).' Baru',
            "{$user->name} mengajukan {$validated['jenis']} {$jumlahHari} hari kerja ({$mulai->toDateString()} s/d {$selesai->toDateString()}).",
            '/persetujuan');

        return response()->json(['cuti_izin' => $cuti], 201);
    }

    /** Daftar semua pengajuan (untuk halaman persetujuan manajerial). */
    public function semua(Request $request)
    {
        $query = CutiIzin::with(['user:id,name,jenis_pegawai', 'approver:id,name'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json($query->paginate(20));
    }

    public function approve(Request $request, CutiIzin $cutiIzin, NotifikasiService $notif)
    {
        $validated = $request->validate([
            'aksi' => ['required', Rule::in(['setujui', 'tolak'])],
            'catatan' => ['nullable', 'string', 'max:500'],
        ]);

        if ($cutiIzin->status !== 'diajukan') {
            return response()->json(['message' => 'Pengajuan ini sudah diproses.'], 422);
        }

        // Re-validasi jatah saat approval (jatah bisa berubah sejak diajukan).
        if ($validated['aksi'] === 'setujui' && $cutiIzin->jenis === 'cuti') {
            $tahun = Carbon::parse($cutiIzin->tanggal_mulai)->year;
            $terpakai = CutiIzin::totalCutiDisetujui($cutiIzin->user_id, $tahun);
            $sisa = $cutiIzin->user->jatah_cuti_tahunan - $terpakai;
            if ($cutiIzin->jumlah_hari > $sisa) {
                return response()->json([
                    'message' => "Sisa jatah cuti pegawai tinggal {$sisa} hari — tidak cukup untuk {$cutiIzin->jumlah_hari} hari.",
                ], 422);
            }
        }

        $status = $validated['aksi'] === 'setujui' ? 'disetujui' : 'ditolak';
        $cutiIzin->update([
            'status' => $status,
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'catatan_approval' => $validated['catatan'] ?? null,
        ]);

        AuditLog::catat($request->user()->id, 'cuti_izin_'.$status, 'presensi',
            "Pengajuan {$cutiIzin->jenis} #{$cutiIzin->id} milik {$cutiIzin->user->name} {$status}.");

        $notif->kirim([$cutiIzin->user_id],
            'Pengajuan '.ucfirst($cutiIzin->jenis).' '.ucfirst($status),
            "Pengajuan {$cutiIzin->jenis} Anda ({$cutiIzin->tanggal_mulai->format('Y-m-d')} s/d {$cutiIzin->tanggal_selesai->format('Y-m-d')}) {$status}."
                .($validated['catatan'] ? " Catatan: {$validated['catatan']}" : ''),
            '/cuti');

        return response()->json(['cuti_izin' => $cutiIzin->fresh(['user:id,name', 'approver:id,name'])]);
    }
}
