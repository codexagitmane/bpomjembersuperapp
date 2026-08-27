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

        $berhakJatah = $user->berhakJatahCutiTahunan();
        $terpakai = CutiIzin::totalCutiDisetujui($user->id, $tahun);

        return response()->json([
            'data' => CutiIzin::with('approver:id,name')
                ->where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->limit(50)
                ->get(),
            'jatah' => [
                'tahun' => $tahun,
                'berlaku' => $berhakJatah,
                'jatah_cuti_tahunan' => $berhakJatah ? $user->jatah_cuti_tahunan : 0,
                'cuti_terpakai' => $terpakai,
                'sisa_cuti' => $berhakJatah ? max(0, $user->jatah_cuti_tahunan - $terpakai) : 0,
                'keterangan' => $berhakJatah
                    ? null
                    : 'Sebagai pegawai outsourcing/magang, cuti diajukan tanpa jatah tahunan dan disetujui berjenjang oleh Kasubag TU lalu Kepala Balai.',
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

        // Khusus cuti ASN/PPPK: validasi sisa jatah tahun berjalan.
        // Outsourcing/magang tidak berjatah — cuti disetujui berjenjang.
        if ($validated['jenis'] === 'cuti' && $user->berhakJatahCutiTahunan()) {
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
        $query = CutiIzin::with(['user:id,name,jenis_pegawai', 'approver:id,name', 'kasubagApprover:id,name'])
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

        $approver = $request->user();
        $isSuperadmin = $approver->hasRole('superadmin');
        $isKasubag = $approver->hasRole('kepala_subag_tu') || $isSuperadmin;
        $isKabalai = $approver->hasRole('kepala_balai') || $isSuperadmin;
        $catatan = $validated['catatan'] ?? null;

        // Penolakan di tahap manapun bersifat final.
        if ($validated['aksi'] === 'tolak') {
            $cutiIzin->update([
                'status' => 'ditolak',
                'approved_by' => $approver->id,
                'approved_at' => now(),
                'catatan_approval' => $catatan,
            ]);
            AuditLog::catat($approver->id, 'cuti_izin_ditolak', 'presensi',
                "Pengajuan {$cutiIzin->jenis} #{$cutiIzin->id} milik {$cutiIzin->user->name} ditolak.");
            $this->beriTahuPemohon($notif, $cutiIzin, 'ditolak', $catatan);

            return response()->json(['cuti_izin' => $this->muat($cutiIzin)]);
        }

        // === Persetujuan ===
        // Re-validasi jatah untuk cuti ASN/PPPK (jatah bisa berubah sejak diajukan).
        if ($cutiIzin->jenis === 'cuti' && $cutiIzin->user->berhakJatahCutiTahunan()) {
            $tahun = Carbon::parse($cutiIzin->tanggal_mulai)->year;
            $terpakai = CutiIzin::totalCutiDisetujui($cutiIzin->user_id, $tahun);
            $sisa = $cutiIzin->user->jatah_cuti_tahunan - $terpakai;
            if ($cutiIzin->jumlah_hari > $sisa) {
                return response()->json([
                    'message' => "Sisa jatah cuti pegawai tinggal {$sisa} hari — tidak cukup untuk {$cutiIzin->jumlah_hari} hari.",
                ], 422);
            }
        }

        // Alur berjenjang khusus pegawai outsourcing/magang.
        if ($cutiIzin->user->isOutsourcing()) {
            // Tahap 1 — Kasubag TU.
            if (! $cutiIzin->approval_kasubag_at) {
                if (! $isKasubag) {
                    return response()->json(['message' => 'Tahap pertama harus disetujui Kepala Subag TU.'], 422);
                }
                $cutiIzin->update([
                    'approval_kasubag_by' => $approver->id,
                    'approval_kasubag_at' => now(),
                    'catatan_approval' => $catatan,
                ]);
                AuditLog::catat($approver->id, 'cuti_izin_approve_kasubag', 'presensi',
                    "Cuti #{$cutiIzin->id} ({$cutiIzin->user->name}) disetujui Kasubag, menunggu Kepala Balai.");

                $notif->kirimKeRole(['kepala_balai'],
                    'Persetujuan Cuti Menunggu Anda',
                    "Cuti {$cutiIzin->user->name} sudah disetujui Kasubag TU dan menunggu persetujuan Kepala Balai.",
                    '/persetujuan');
                $this->beriTahuPemohon($notif, $cutiIzin, 'disetujui Kasubag TU (menunggu Kepala Balai)', $catatan);

                return response()->json(['cuti_izin' => $this->muat($cutiIzin)]);
            }

            // Tahap 2 — Kepala Balai (final).
            if (! $isKabalai) {
                return response()->json(['message' => 'Tahap akhir harus disetujui Kepala Balai.'], 422);
            }
            $cutiIzin->update([
                'approval_kabalai_by' => $approver->id,
                'approval_kabalai_at' => now(),
                'status' => 'disetujui',
                'approved_by' => $approver->id,
                'approved_at' => now(),
                'catatan_approval' => $catatan ?? $cutiIzin->catatan_approval,
            ]);
            AuditLog::catat($approver->id, 'cuti_izin_disetujui', 'presensi',
                "Cuti #{$cutiIzin->id} ({$cutiIzin->user->name}) disetujui final oleh Kepala Balai.");
            $this->beriTahuPemohon($notif, $cutiIzin, 'disetujui', $catatan);

            return response()->json(['cuti_izin' => $this->muat($cutiIzin)]);
        }

        // ASN/PPPK: cukup satu tahap (Kasubag TU / Superadmin).
        if (! $isKasubag) {
            return response()->json(['message' => 'Pengajuan ini disetujui oleh Kepala Subag TU.'], 422);
        }
        $cutiIzin->update([
            'status' => 'disetujui',
            'approved_by' => $approver->id,
            'approved_at' => now(),
            'approval_kasubag_by' => $approver->id,
            'approval_kasubag_at' => now(),
            'catatan_approval' => $catatan,
        ]);
        AuditLog::catat($approver->id, 'cuti_izin_disetujui', 'presensi',
            "Pengajuan {$cutiIzin->jenis} #{$cutiIzin->id} milik {$cutiIzin->user->name} disetujui.");
        $this->beriTahuPemohon($notif, $cutiIzin, 'disetujui', $catatan);

        return response()->json(['cuti_izin' => $this->muat($cutiIzin)]);
    }

    private function muat(CutiIzin $cutiIzin): CutiIzin
    {
        return $cutiIzin->fresh(['user:id,name', 'approver:id,name', 'kasubagApprover:id,name']);
    }

    private function beriTahuPemohon(NotifikasiService $notif, CutiIzin $cutiIzin, string $statusText, ?string $catatan): void
    {
        $notif->kirim([$cutiIzin->user_id],
            'Pengajuan '.ucfirst($cutiIzin->jenis).': '.ucfirst($statusText),
            "Pengajuan {$cutiIzin->jenis} Anda ({$cutiIzin->tanggal_mulai->format('Y-m-d')} s/d {$cutiIzin->tanggal_selesai->format('Y-m-d')}) {$statusText}."
                .($catatan ? " Catatan: {$catatan}" : ''),
            '/cuti');
    }
}
