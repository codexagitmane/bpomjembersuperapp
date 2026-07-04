<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\RosterKeamanan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/** Jadwal shift petugas keamanan — dikelola Kasubag TU / Superadmin. */
class RosterKeamananController extends Controller
{
    /** Roster satu bulan penuh + daftar petugas keamanan. */
    public function index(Request $request)
    {
        $tahun = (int) $request->input('tahun', now()->year);
        $bulan = (int) $request->input('bulan', now()->month);
        $awal = Carbon::create($tahun, $bulan, 1)->startOfMonth();
        $akhir = (clone $awal)->endOfMonth();

        $roster = RosterKeamanan::with('user:id,name')
            ->whereBetween('tanggal', [$awal->toDateString(), $akhir->toDateString()])
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'user_id' => $r->user_id,
                'nama' => $r->user->name,
                'tanggal' => $r->tanggal->toDateString(),
                'shift' => $r->shift,
                'keterangan' => $r->keterangan,
            ]);

        $petugas = User::role('pegawai_outsourcing_magang')
            ->where('jenis_pegawai', 'keamanan')
            ->where('is_active', true)
            ->get(['id', 'name']);

        return response()->json([
            'tahun' => $tahun,
            'bulan' => $bulan,
            'roster' => $roster,
            'petugas' => $petugas,
        ]);
    }

    /** Simpan/ubah satu entri jadwal (upsert per user+tanggal). */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'tanggal' => ['required', 'date'],
            'shift' => ['required', Rule::in(['pagi', 'malam'])],
            'keterangan' => ['nullable', 'string', 'max:255'],
        ]);

        $petugas = User::find($validated['user_id']);
        if (($petugas->jenis_pegawai ?? null) !== 'keamanan') {
            return response()->json(['message' => 'User yang dipilih bukan petugas keamanan.'], 422);
        }

        $roster = RosterKeamanan::updateOrCreate(
            ['user_id' => $validated['user_id'], 'tanggal' => $validated['tanggal']],
            [
                'shift' => $validated['shift'],
                'keterangan' => $validated['keterangan'] ?? null,
                'created_by' => $request->user()->id,
            ]
        );

        AuditLog::catat($request->user()->id, 'roster_keamanan_disimpan', 'tata_usaha',
            "Roster {$petugas->name} {$validated['tanggal']} shift {$validated['shift']}.");

        return response()->json(['roster' => $roster], 201);
    }

    public function destroy(Request $request, RosterKeamanan $rosterKeamanan)
    {
        $rosterKeamanan->delete();
        AuditLog::catat($request->user()->id, 'roster_keamanan_dihapus', 'tata_usaha', "Roster #{$rosterKeamanan->id} dihapus.");

        return response()->json(['message' => 'Jadwal dihapus.']);
    }

    /** Generate pola ganjil-genap otomatis untuk sebulan (2 petugas bergantian). */
    public function generateOtomatis(Request $request)
    {
        $validated = $request->validate([
            'tahun' => ['required', 'integer', 'min:2020', 'max:2100'],
            'bulan' => ['required', 'integer', 'min:1', 'max:12'],
            'petugas_ids' => ['required', 'array', 'min:1', 'max:4'],
            'petugas_ids.*' => ['exists:users,id'],
        ]);

        $awal = Carbon::create($validated['tahun'], $validated['bulan'], 1)->startOfMonth();
        $akhir = (clone $awal)->endOfMonth();
        $ids = $validated['petugas_ids'];

        $dibuat = 0;
        $cursor = $awal->copy();
        $idx = 0;
        while ($cursor <= $akhir) {
            // Rotasi petugas bergantian per hari (1 masuk, lainnya libur).
            $userId = $ids[$idx % count($ids)];
            RosterKeamanan::updateOrCreate(
                ['user_id' => $userId, 'tanggal' => $cursor->toDateString()],
                ['shift' => 'malam', 'created_by' => $request->user()->id]
            );
            $dibuat++;
            $idx++;
            $cursor->addDay();
        }

        AuditLog::catat($request->user()->id, 'roster_keamanan_generate', 'tata_usaha',
            "Generate roster {$validated['bulan']}/{$validated['tahun']}: {$dibuat} entri.");

        return response()->json(['message' => "Berhasil membuat {$dibuat} jadwal shift.", 'dibuat' => $dibuat]);
    }
}
