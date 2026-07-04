<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Presensi\PresensiCheckRequest;
use App\Models\AuditLog;
use App\Models\Presensi;
use App\Models\User;
use App\Services\PresensiRuleService;
use App\Services\SelfiePhotoService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

class PresensiController extends Controller
{
    public function __construct(
        private readonly SelfiePhotoService $fotoService,
        private readonly PresensiRuleService $rules,
    ) {
    }

    /** Titik kantor, radius, dan jadwal user hari ini — untuk peta & UI klien. */
    public function kantorInfo(Request $request)
    {
        $user = $request->user();
        [$boleh, $alasan, $jamMasuk, $jamPulang, $lintasHari] = $this->rules->jadwalUntuk($user, Carbon::today());

        return response()->json([
            'titik_kantor' => $this->rules->titikKantor(),
            'radius_meter' => $this->rules->radiusMeter(),
            'batas_absen' => $this->rules->batasAbsen(),
            'jenis_pegawai' => $user->jenis_pegawai,
            'jadwal_hari_ini' => [
                'boleh_absen' => $boleh,
                'alasan' => $alasan,
                'jam_masuk' => $jamMasuk,
                'jam_pulang' => $jamPulang,
                'shift_lintas_hari' => $lintasHari,
            ],
        ]);
    }

    public function hariIni(Request $request)
    {
        $user = $request->user();
        $presensi = Presensi::where('user_id', $user->id)
            ->whereDate('tanggal', Carbon::today())
            ->first();

        // Shift keamanan lintas hari: tampilkan juga presensi kemarin yang belum checkout.
        $shiftKemarin = null;
        if (($user->jenis_pegawai ?? 'pegawai') === 'keamanan') {
            $shiftKemarin = Presensi::where('user_id', $user->id)
                ->whereDate('tanggal', Carbon::yesterday())
                ->whereNotNull('jam_masuk')
                ->whereNull('jam_keluar')
                ->first();
        }

        return response()->json([
            'presensi' => $this->format($presensi),
            'shift_kemarin_belum_checkout' => $this->format($shiftKemarin),
        ]);
    }

    public function riwayat(Request $request)
    {
        $data = Presensi::where('user_id', $request->user()->id)
            ->orderByDesc('tanggal')
            ->paginate(30);

        $data->getCollection()->transform(fn ($p) => $this->format($p));

        return response()->json($data);
    }

    /** Daftar presensi seluruh pegawai — khusus role manajerial/TU. */
    public function semuaPresensi(Request $request)
    {
        $query = Presensi::with('user:id,name,email,jenis_pegawai')->orderByDesc('tanggal');

        if ($request->filled('tanggal')) {
            $query->whereDate('tanggal', $request->input('tanggal'));
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        $data = $query->paginate(30);
        $data->getCollection()->transform(function ($p) {
            $arr = $this->format($p);
            $arr['user'] = $p->user;

            return $arr;
        });

        return response()->json($data);
    }

    public function checkIn(PresensiCheckRequest $request)
    {
        $user = $request->user();
        $now = Carbon::now();
        $today = Carbon::today();

        [$boleh, $alasan, $jamMasukJadwal] = $this->rules->jadwalUntuk($user, $today);
        if (! $boleh) {
            return response()->json(['message' => $alasan], 422);
        }

        if ($now->format('H:i') > $this->rules->batasAbsen()) {
            return response()->json(['message' => 'Melebihi batas maksimal absen ('.$this->rules->batasAbsen().' WIB).'], 422);
        }

        $presensi = Presensi::firstOrNew([
            'user_id' => $user->id,
            'tanggal' => $today->toDateString(),
        ]);

        if ($presensi->exists && $presensi->jam_masuk) {
            return response()->json(['message' => 'Anda sudah melakukan presensi masuk hari ini.'], 422);
        }

        $mode = $request->input('mode');
        [$valid, $pesan, $titik, $jarak] = $this->rules->evaluasiLokasi(
            $user, $mode, (float) $request->input('latitude'), (float) $request->input('longitude')
        );
        if (! $valid) {
            AuditLog::catat($user->id, 'presensi_ditolak_geofence', 'presensi', $pesan);

            return response()->json(['message' => $pesan], 422);
        }

        $fotoPath = $this->fotoService->simpan($request->file('foto'), 'presensi/masuk');

        $statusMasuk = $now->format('H:i') > $jamMasukJadwal ? 'terlambat' : 'tepat_waktu';

        $presensi->fill([
            'jam_masuk' => $now->format('H:i:s'),
            'lokasi_masuk_lat' => $request->input('latitude'),
            'lokasi_masuk_lng' => $request->input('longitude'),
            'jarak_masuk_meter' => (int) round($jarak),
            'akurasi_masuk_meter' => $request->input('accuracy_meter'),
            'foto_masuk_path' => $fotoPath,
            'status_masuk' => $statusMasuk,
            'mode_masuk' => $mode,
            'titik_masuk' => $titik,
            'ip_masuk' => $request->ip(),
            'device_masuk' => substr((string) $request->userAgent(), 0, 255),
            'catatan' => $request->input('catatan'),
        ])->save();

        AuditLog::catat($user->id, 'presensi_masuk', 'presensi', "Check-in {$mode} ({$titik}), status: {$statusMasuk}.");

        return response()->json(['presensi' => $this->format($presensi)], 201);
    }

    public function checkOut(PresensiCheckRequest $request)
    {
        $user = $request->user();
        $now = Carbon::now();
        $isKeamanan = ($user->jenis_pegawai ?? 'pegawai') === 'keamanan';

        // Cari presensi yang akan di-checkout: hari ini, atau (khusus keamanan)
        // shift kemarin yang belum checkout.
        $presensi = Presensi::where('user_id', $user->id)
            ->whereDate('tanggal', Carbon::today())
            ->whereNotNull('jam_masuk')
            ->whereNull('jam_keluar')
            ->first();

        $shiftLintasHari = false;
        if (! $presensi && $isKeamanan) {
            $presensi = Presensi::where('user_id', $user->id)
                ->whereDate('tanggal', Carbon::yesterday())
                ->whereNotNull('jam_masuk')
                ->whereNull('jam_keluar')
                ->first();
            $shiftLintasHari = (bool) $presensi;
        }

        if (! $presensi) {
            $sudahCheckout = Presensi::where('user_id', $user->id)
                ->whereDate('tanggal', Carbon::today())
                ->whereNotNull('jam_keluar')
                ->exists();

            return response()->json([
                'message' => $sudahCheckout
                    ? 'Anda sudah melakukan presensi pulang hari ini.'
                    : 'Anda belum melakukan presensi masuk.',
            ], 422);
        }

        if (! $isKeamanan && $now->format('H:i') > $this->rules->batasAbsen()) {
            return response()->json(['message' => 'Melebihi batas maksimal absen ('.$this->rules->batasAbsen().' WIB).'], 422);
        }

        $mode = $request->input('mode');
        [$valid, $pesan, $titik, $jarak] = $this->rules->evaluasiLokasi(
            $user, $mode, (float) $request->input('latitude'), (float) $request->input('longitude')
        );
        if (! $valid) {
            return response()->json(['message' => $pesan], 422);
        }

        $fotoPath = $this->fotoService->simpan($request->file('foto'), 'presensi/keluar');

        if ($isKeamanan) {
            // Shift keamanan: checkout keesokan hari maks 07.30.
            $statusKeluar = $shiftLintasHari
                ? ($now->format('H:i') <= '07:30' ? 'tepat_waktu' : 'lewat_batas')
                : 'pulang_awal';
        } else {
            [, , , $jamPulangJadwal] = $this->rules->jadwalUntuk($user, Carbon::parse($presensi->tanggal));
            $statusKeluar = $now->format('H:i') < ($jamPulangJadwal ?? '16:00') ? 'pulang_awal' : 'tepat_waktu';
        }

        $presensi->fill([
            'jam_keluar' => $now->format('H:i:s'),
            'lokasi_keluar_lat' => $request->input('latitude'),
            'lokasi_keluar_lng' => $request->input('longitude'),
            'jarak_keluar_meter' => (int) round($jarak),
            'akurasi_keluar_meter' => $request->input('accuracy_meter'),
            'foto_keluar_path' => $fotoPath,
            'status_keluar' => $statusKeluar,
            'mode_keluar' => $mode,
            'titik_keluar' => $titik,
            'ip_keluar' => $request->ip(),
            'device_keluar' => substr((string) $request->userAgent(), 0, 255),
        ])->save();

        AuditLog::catat($user->id, 'presensi_keluar', 'presensi', "Check-out {$mode} ({$titik}), status: {$statusKeluar}.");

        return response()->json(['presensi' => $this->format($presensi)]);
    }

    private function format(?Presensi $p): ?array
    {
        if (! $p) {
            return null;
        }

        return [
            'id' => $p->id,
            'tanggal' => $p->tanggal->toDateString(),
            'jam_masuk' => $p->jam_masuk,
            'jam_keluar' => $p->jam_keluar,
            'status_masuk' => $p->status_masuk,
            'status_keluar' => $p->status_keluar,
            'mode_masuk' => $p->mode_masuk,
            'mode_keluar' => $p->mode_keluar,
            'titik_masuk' => $p->titik_masuk,
            'titik_keluar' => $p->titik_keluar,
            'jarak_masuk_meter' => $p->jarak_masuk_meter,
            'jarak_keluar_meter' => $p->jarak_keluar_meter,
            'foto_masuk_url' => $p->foto_masuk_path ? Storage::disk('public')->url($p->foto_masuk_path) : null,
            'foto_keluar_url' => $p->foto_keluar_path ? Storage::disk('public')->url($p->foto_keluar_path) : null,
            'catatan' => $p->catatan,
        ];
    }
}
