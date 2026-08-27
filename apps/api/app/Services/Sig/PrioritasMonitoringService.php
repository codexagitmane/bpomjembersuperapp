<?php

namespace App\Services\Sig;

use App\Models\SigApotek;
use Illuminate\Support\Carbon;

/**
 * Skor Prioritas Monitoring.
 *
 * PENTING: skor ini adalah alat bantu ADMINISTRATIF untuk menyusun urutan
 * kunjungan monitoring. Skor tinggi TIDAK berarti sarana melakukan
 * pelanggaran — melainkan menandakan sarana tersebut lebih layak
 * didahulukan untuk dimonitor berdasarkan parameter data yang tersedia.
 *
 * Setiap komponen skor dikembalikan beserta alasannya agar hasilnya selalu
 * dapat dijelaskan dan ditelusuri.
 */
class PrioritasMonitoringService
{
    /** Bobot tiap parameter; totalnya 100. */
    private const BOBOT = [
        'jarak_pemeriksaan' => 30,
        'tindak_lanjut' => 25,
        'temuan' => 20,
        'kelengkapan_data' => 15,
        'status_sarana' => 10,
    ];

    /**
     * Hitung skor untuk satu sarana.
     *
     * @param  array<string,mixed>  $agregat  ringkasan terhitung dari relasi
     * @return array{skor:int,tingkat:string,rincian:array<int,array<string,mixed>>}
     */
    public function hitung(SigApotek $a, array $agregat = []): array
    {
        $rincian = [];
        $skor = 0;

        // 1) Lama sejak pemeriksaan terakhir.
        $tanggal = $a->tanggal_pemeriksaan_terakhir;
        $bobot = self::BOBOT['jarak_pemeriksaan'];
        if (! $tanggal) {
            $skor += $bobot;
            $rincian[] = $this->baris('Belum pernah diperiksa', $bobot, $bobot,
                'Tidak ada catatan pemeriksaan pada sistem.');
        } else {
            $bulan = Carbon::parse($tanggal)->diffInMonths(now());
            // 0 bulan → 0 poin; 24 bulan atau lebih → poin penuh.
            $nilai = (int) round(min(1, $bulan / 24) * $bobot);
            $skor += $nilai;
            $rincian[] = $this->baris('Jarak sejak pemeriksaan terakhir', $nilai, $bobot,
                "Terakhir diperiksa sekitar {$bulan} bulan lalu.");
        }

        // 2) Tindak lanjut yang belum tuntas.
        $bobot = self::BOBOT['tindak_lanjut'];
        $tlBelum = (int) ($agregat['tindak_lanjut_belum'] ?? 0);
        $tlLewat = (int) ($agregat['tindak_lanjut_lewat_target'] ?? 0);
        $nilai = 0;
        if ($tlBelum > 0) {
            $nilai = (int) round(min(1, $tlBelum / 3) * ($bobot * 0.6));
        }
        if ($tlLewat > 0) {
            $nilai += (int) round(min(1, $tlLewat / 2) * ($bobot * 0.4));
        }
        $nilai = min($bobot, $nilai);
        $skor += $nilai;
        $rincian[] = $this->baris('Tindak lanjut belum selesai', $nilai, $bobot,
            "{$tlBelum} tindak lanjut belum selesai, {$tlLewat} melewati target.");

        // 3) Temuan yang masih aktif.
        $bobot = self::BOBOT['temuan'];
        $temuanAktif = (int) ($agregat['temuan_aktif'] ?? 0);
        $nilai = (int) round(min(1, $temuanAktif / 4) * $bobot);
        $skor += $nilai;
        $rincian[] = $this->baris('Temuan masih aktif', $nilai, $bobot,
            "{$temuanAktif} temuan berstatus belum atau dalam proses.");

        // 4) Kelengkapan data sarana.
        $bobot = self::BOBOT['kelengkapan_data'];
        $kosong = $this->medanKosong($a);
        $nilai = (int) round(min(1, count($kosong) / 4) * $bobot);
        $skor += $nilai;
        $rincian[] = $this->baris('Kelengkapan data', $nilai, $bobot,
            $kosong === [] ? 'Data pokok sudah lengkap.' : 'Belum lengkap: '.implode(', ', $kosong).'.');

        // 5) Status sarana pada sistem.
        $bobot = self::BOBOT['status_sarana'];
        $nilai = match ($a->status_sarana) {
            'belum_diverifikasi' => $bobot,
            'nonaktif' => (int) round($bobot / 2),
            default => 0,
        };
        $skor += $nilai;
        $rincian[] = $this->baris('Status sarana', $nilai, $bobot,
            'Status pada sistem: '.($a->status_sarana ?: 'tidak diketahui').'.');

        $skor = max(0, min(100, $skor));

        return ['skor' => $skor, 'tingkat' => $this->tingkat($skor), 'rincian' => $rincian];
    }

    /** Pemetaan skor menjadi tingkat prioritas. */
    public function tingkat(int $skor): string
    {
        return match (true) {
            $skor >= 80 => 'tinggi',
            $skor >= 50 => 'sedang',
            default => 'rendah',
        };
    }

    /** Daftar medan pokok yang masih kosong. */
    public function medanKosong(SigApotek $a): array
    {
        $kosong = [];
        if (! $a->punyaKoordinat()) {
            $kosong[] = 'koordinat';
        }
        foreach (['alamat' => 'alamat', 'kabupaten' => 'kabupaten', 'kecamatan' => 'kecamatan',
            'nib' => 'NIB', 'penanggung_jawab' => 'penanggung jawab'] as $k => $label) {
            if (blank($a->{$k})) {
                $kosong[] = $label;
            }
        }

        return $kosong;
    }

    private function baris(string $parameter, int $nilai, int $maks, string $alasan): array
    {
        return ['parameter' => $parameter, 'nilai' => $nilai, 'maksimum' => $maks, 'alasan' => $alasan];
    }
}
