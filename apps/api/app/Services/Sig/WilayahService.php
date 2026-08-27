<?php

namespace App\Services\Sig;

use App\Models\SigApotek;
use Illuminate\Support\Facades\Cache;

/**
 * Layanan wilayah & batas geografis (geoService).
 *
 * Daftar kabupaten diambil dari wilayah kerja Balai POM di Jember, sedangkan
 * daftar kecamatan/desa dibangun dari data sarana yang benar-benar tersimpan
 * — bukan dari daftar wilayah yang dikarang.
 *
 * Batas wilayah (GeoJSON) dibaca dari resources/sig/geojson bila tersedia.
 * Bila belum ada, sistem mengembalikan penanda "belum tersedia" dan peta
 * tetap berjalan tanpa lapisan batas. Sistem TIDAK pernah menggambar batas
 * wilayah buatan yang seolah-olah resmi.
 */
class WilayahService
{
    /** Wilayah kerja Balai POM di Jember. */
    public const KABUPATEN = ['Jember', 'Banyuwangi', 'Bondowoso', 'Situbondo', 'Lumajang'];

    /** Titik tengah peta per kabupaten untuk memusatkan tampilan. */
    private const PUSAT = [
        'Jember' => [-8.1724, 113.7002],
        'Banyuwangi' => [-8.2192, 114.3691],
        'Bondowoso' => [-7.9135, 113.8211],
        'Situbondo' => [-7.7062, 114.0098],
        'Lumajang' => [-8.1335, 113.2246],
    ];

    public function getKabupaten(): array
    {
        return self::KABUPATEN;
    }

    /** Titik tengah & zoom awal peta. */
    public function pusatPeta(?string $kabupaten = null): array
    {
        if ($kabupaten && isset(self::PUSAT[$kabupaten])) {
            return ['lat' => self::PUSAT[$kabupaten][0], 'lng' => self::PUSAT[$kabupaten][1], 'zoom' => 11];
        }

        // Titik tengah seluruh wilayah kerja.
        return ['lat' => -8.07, 'lng' => 113.85, 'zoom' => 9];
    }

    /**
     * Daftar kecamatan yang benar-benar ada pada data sarana.
     *
     * @return array<int,string>
     */
    public function getKecamatan(?string $kabupaten = null): array
    {
        return SigApotek::query()
            ->when($kabupaten, fn ($q) => $q->where('kabupaten', $kabupaten))
            ->whereNotNull('kecamatan')
            ->where('kecamatan', '!=', '')
            ->distinct()
            ->orderBy('kecamatan')
            ->pluck('kecamatan')
            ->all();
    }

    /** Daftar desa/kelurahan pada data sarana. */
    public function getDesa(?string $kabupaten = null, ?string $kecamatan = null): array
    {
        return SigApotek::query()
            ->when($kabupaten, fn ($q) => $q->where('kabupaten', $kabupaten))
            ->when($kecamatan, fn ($q) => $q->where('kecamatan', $kecamatan))
            ->whereNotNull('desa')
            ->where('desa', '!=', '')
            ->distinct()
            ->orderBy('desa')
            ->pluck('desa')
            ->all();
    }

    /**
     * Muat batas wilayah dari berkas GeoJSON bila tersedia.
     *
     * Letakkan berkas resmi pada resources/sig/geojson/{tingkat}.geojson —
     * strukturnya sengaja dibuat agar berkas dapat diganti tanpa mengubah kode.
     *
     * @return array{tersedia:bool,data:array|null,catatan:string}
     */
    public function loadGeoJSON(string $tingkat = 'kabupaten'): array
    {
        $tingkat = in_array($tingkat, ['kabupaten', 'kecamatan'], true) ? $tingkat : 'kabupaten';

        return Cache::remember("sig.geojson.{$tingkat}", 600, function () use ($tingkat) {
            $path = resource_path("sig/geojson/{$tingkat}.geojson");
            if (! is_file($path)) {
                return [
                    'tersedia' => false,
                    'data' => null,
                    'catatan' => "Berkas batas {$tingkat} belum tersedia. Letakkan berkas GeoJSON resmi pada resources/sig/geojson/{$tingkat}.geojson untuk menampilkan lapisan batas wilayah.",
                ];
            }

            $isi = json_decode((string) file_get_contents($path), true);
            if (! is_array($isi)) {
                return ['tersedia' => false, 'data' => null, 'catatan' => "Berkas batas {$tingkat} tidak dapat dibaca."];
            }

            return ['tersedia' => true, 'data' => $isi, 'catatan' => ''];
        });
    }

    /** Validasi koordinat: harus angka dan berada pada rentang yang sah. */
    public function koordinatValid(mixed $lat, mixed $lng): bool
    {
        if (! is_numeric($lat) || ! is_numeric($lng)) {
            return false;
        }
        $lat = (float) $lat;
        $lng = (float) $lng;

        return $lat >= -90 && $lat <= 90 && $lng >= -180 && $lng <= 180;
    }
}
