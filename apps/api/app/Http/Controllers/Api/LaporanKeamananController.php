<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\LaporanKeamanan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Laporan patroli petugas keamanan — wajib 2x sehari (siang & malam) dengan
 * bukti foto. Khusus pegawai berjenis "keamanan" (dan superadmin untuk monitor).
 */
class LaporanKeamananController extends Controller
{
    private const TARGET_HARIAN = 2;

    private function pastikanKeamanan(User $user): void
    {
        if ($user->jenis_pegawai !== 'keamanan' && ! $user->hasRole('superadmin')) {
            abort(403, 'Menu ini khusus petugas keamanan.');
        }
    }

    private function serialize(LaporanKeamanan $l): array
    {
        return [
            'id' => $l->id,
            'tanggal' => $l->tanggal->toDateString(),
            'sesi' => $l->sesi,
            'kondisi' => $l->kondisi,
            'catatan' => $l->catatan,
            'foto_url' => $l->foto_path ? asset('storage/'.$l->foto_path) : null,
            'latitude' => $l->latitude,
            'longitude' => $l->longitude,
            'waktu' => $l->created_at?->format('H:i'),
            'created_at' => $l->created_at?->toIso8601String(),
            'petugas' => $l->relationLoaded('user') ? $l->user?->name : null,
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $this->pastikanKeamanan($user);

        $hariIni = LaporanKeamanan::where('user_id', $user->id)
            ->whereDate('tanggal', Carbon::today())
            ->orderBy('created_at')
            ->get();

        $riwayat = LaporanKeamanan::where('user_id', $user->id)
            ->where('tanggal', '>=', Carbon::today()->subDays(14))
            ->orderByDesc('created_at')
            ->limit(30)
            ->get();

        return response()->json([
            'target_harian' => self::TARGET_HARIAN,
            'jumlah_hari_ini' => $hariIni->count(),
            'hari_ini' => $hariIni->map(fn ($l) => $this->serialize($l)),
            'riwayat' => $riwayat->map(fn ($l) => $this->serialize($l)),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $this->pastikanKeamanan($user);

        $data = $request->validate([
            'foto' => ['required', 'image', 'max:4096'],
            'sesi' => ['nullable', 'in:siang,malam'],
            'kondisi' => ['nullable', 'in:aman,perlu_perhatian,insiden'],
            'catatan' => ['nullable', 'string', 'max:500'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
        ]);

        $path = $request->file('foto')->store('laporan-keamanan', 'public');

        // Tentukan sesi otomatis bila tidak dikirim: <15:00 siang, selebihnya malam.
        $sesi = $data['sesi'] ?? (Carbon::now()->hour < 15 ? 'siang' : 'malam');

        $laporan = LaporanKeamanan::create([
            'user_id' => $user->id,
            'tanggal' => Carbon::today(),
            'sesi' => $sesi,
            'foto_path' => $path,
            'latitude' => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null,
            'kondisi' => $data['kondisi'] ?? 'aman',
            'catatan' => $data['catatan'] ?? null,
        ]);

        AuditLog::catat($user->id, 'laporan_keamanan', 'Keamanan',
            "Laporan patroli {$sesi} ({$laporan->kondisi}).");

        return response()->json([
            'data' => $this->serialize($laporan),
            'message' => 'Laporan patroli berhasil dikirim.',
        ], 201);
    }

    /** Rekap seluruh laporan keamanan untuk pimpinan/kasubag. */
    public function semua(Request $request)
    {
        $tanggal = $request->query('tanggal', Carbon::today()->toDateString());
        $laporan = LaporanKeamanan::with('user:id,name')
            ->whereDate('tanggal', $tanggal)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $laporan->map(fn ($l) => $this->serialize($l))]);
    }
}
