<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Presensi\PresensiCheckRequest;
use App\Models\AuditLog;
use App\Models\Pengaturan;
use App\Models\Presensi;
use App\Services\GeoService;
use App\Services\SelfiePhotoService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

class PresensiController extends Controller
{
    public function __construct(private readonly SelfiePhotoService $fotoService)
    {
    }

    /** Info lokasi kantor & jam kerja untuk ditampilkan di peta klien. */
    public function kantorInfo()
    {
        return response()->json([
            'nama' => Pengaturan::get('kantor.nama', 'Kantor Balai POM di Jember'),
            'latitude' => (float) Pengaturan::get('kantor.latitude', -8.1723),
            'longitude' => (float) Pengaturan::get('kantor.longitude', 113.7002),
            'radius_meter' => (int) Pengaturan::get('kantor.radius_meter', 150),
            'jam_masuk' => Pengaturan::get('jam_kerja.mulai', '08:00'),
            'jam_pulang' => Pengaturan::get('jam_kerja.selesai', '16:00'),
            'toleransi_menit' => (int) Pengaturan::get('jam_kerja.toleransi_menit', 15),
        ]);
    }

    public function hariIni(Request $request)
    {
        $presensi = Presensi::where('user_id', $request->user()->id)
            ->whereDate('tanggal', Carbon::today())
            ->first();

        return response()->json(['presensi' => $this->format($presensi)]);
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
        $query = Presensi::with('user:id,name,email')->orderByDesc('tanggal');

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
        $today = Carbon::today();

        $presensi = Presensi::firstOrNew([
            'user_id' => $user->id,
            'tanggal' => $today->toDateString(),
        ]);

        if ($presensi->exists && $presensi->jam_masuk) {
            return response()->json(['message' => 'Anda sudah melakukan presensi masuk hari ini.'], 422);
        }

        $geo = $this->evaluasiGeofence((float) $request->input('latitude'), (float) $request->input('longitude'));

        $strict = filter_var(Pengaturan::get('presensi.strict_geofence', true), FILTER_VALIDATE_BOOLEAN);
        if ($strict && ! $geo['di_dalam_radius']) {
            AuditLog::catat($user->id, 'presensi_ditolak_geofence', 'presensi', sprintf(
                'Check-in ditolak: jarak %.0f m dari kantor (radius %d m).',
                $geo['jarak_meter'],
                $geo['radius_meter']
            ));

            return response()->json([
                'message' => sprintf(
                    'Anda berada %.0f meter dari kantor (di luar radius %d meter). Presensi ditolak.',
                    $geo['jarak_meter'],
                    $geo['radius_meter']
                ),
            ], 422);
        }

        $fotoPath = $this->fotoService->simpan($request->file('foto'), 'presensi/masuk');

        $jamMasukBatas = Carbon::createFromFormat('H:i', Pengaturan::get('jam_kerja.mulai', '08:00'))
            ->addMinutes((int) Pengaturan::get('jam_kerja.toleransi_menit', 15));

        $now = Carbon::now();
        $statusMasuk = $geo['di_dalam_radius']
            ? ($now->format('H:i') > $jamMasukBatas->format('H:i') ? 'terlambat' : 'tepat_waktu')
            : 'di_luar_geofence';

        $presensi->fill([
            'jam_masuk' => $now->format('H:i:s'),
            'lokasi_masuk_lat' => $request->input('latitude'),
            'lokasi_masuk_lng' => $request->input('longitude'),
            'jarak_masuk_meter' => (int) round($geo['jarak_meter']),
            'akurasi_masuk_meter' => $request->input('accuracy_meter'),
            'foto_masuk_path' => $fotoPath,
            'status_masuk' => $statusMasuk,
            'ip_masuk' => $request->ip(),
            'device_masuk' => substr((string) $request->userAgent(), 0, 255),
            'catatan' => $request->input('catatan'),
        ])->save();

        AuditLog::catat($user->id, 'presensi_masuk', 'presensi', "Check-in berhasil, status: {$statusMasuk}.");

        return response()->json(['presensi' => $this->format($presensi)], 201);
    }

    public function checkOut(PresensiCheckRequest $request)
    {
        $user = $request->user();
        $today = Carbon::today();

        $presensi = Presensi::where('user_id', $user->id)->whereDate('tanggal', $today)->first();

        if (! $presensi || ! $presensi->jam_masuk) {
            return response()->json(['message' => 'Anda belum melakukan presensi masuk hari ini.'], 422);
        }
        if ($presensi->jam_keluar) {
            return response()->json(['message' => 'Anda sudah melakukan presensi pulang hari ini.'], 422);
        }

        $geo = $this->evaluasiGeofence((float) $request->input('latitude'), (float) $request->input('longitude'));

        $strict = filter_var(Pengaturan::get('presensi.strict_geofence', true), FILTER_VALIDATE_BOOLEAN);
        if ($strict && ! $geo['di_dalam_radius']) {
            return response()->json([
                'message' => sprintf(
                    'Anda berada %.0f meter dari kantor (di luar radius %d meter). Presensi pulang ditolak.',
                    $geo['jarak_meter'],
                    $geo['radius_meter']
                ),
            ], 422);
        }

        $fotoPath = $this->fotoService->simpan($request->file('foto'), 'presensi/keluar');

        $jamPulangBatas = Carbon::createFromFormat('H:i', Pengaturan::get('jam_kerja.selesai', '16:00'));
        $now = Carbon::now();
        $statusKeluar = $geo['di_dalam_radius']
            ? ($now->format('H:i') < $jamPulangBatas->format('H:i') ? 'pulang_awal' : 'tepat_waktu')
            : 'di_luar_geofence';

        $presensi->fill([
            'jam_keluar' => $now->format('H:i:s'),
            'lokasi_keluar_lat' => $request->input('latitude'),
            'lokasi_keluar_lng' => $request->input('longitude'),
            'jarak_keluar_meter' => (int) round($geo['jarak_meter']),
            'akurasi_keluar_meter' => $request->input('accuracy_meter'),
            'foto_keluar_path' => $fotoPath,
            'status_keluar' => $statusKeluar,
            'ip_keluar' => $request->ip(),
            'device_keluar' => substr((string) $request->userAgent(), 0, 255),
        ])->save();

        AuditLog::catat($user->id, 'presensi_keluar', 'presensi', "Check-out berhasil, status: {$statusKeluar}.");

        return response()->json(['presensi' => $this->format($presensi)]);
    }

    private function evaluasiGeofence(float $lat, float $lng): array
    {
        $kantorLat = (float) Pengaturan::get('kantor.latitude', -8.1723);
        $kantorLng = (float) Pengaturan::get('kantor.longitude', 113.7002);
        $radius = (int) Pengaturan::get('kantor.radius_meter', 150);

        $jarak = GeoService::distanceMeter($lat, $lng, $kantorLat, $kantorLng);

        return [
            'jarak_meter' => $jarak,
            'radius_meter' => $radius,
            'di_dalam_radius' => $jarak <= $radius,
        ];
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
            'jarak_masuk_meter' => $p->jarak_masuk_meter,
            'jarak_keluar_meter' => $p->jarak_keluar_meter,
            'foto_masuk_url' => $p->foto_masuk_path ? Storage::disk('public')->url($p->foto_masuk_path) : null,
            'foto_keluar_url' => $p->foto_keluar_path ? Storage::disk('public')->url($p->foto_keluar_path) : null,
            'catatan' => $p->catatan,
        ];
    }
}
