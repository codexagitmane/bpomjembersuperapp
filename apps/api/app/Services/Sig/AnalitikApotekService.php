<?php

namespace App\Services\Sig;

use App\Models\ApotekPemeriksaan;
use App\Models\ApotekTemuan;
use App\Models\SigApotek;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Analitik monitoring sarana apotek.
 *
 * Seluruh angka di sini merupakan INDIKATOR MONITORING yang dihitung dari
 * data yang tersimpan — bukan penilaian kepatuhan maupun kesimpulan
 * regulator atas sarana.
 */
class AnalitikApotekService
{
    public function __construct(private readonly PrioritasMonitoringService $prioritas) {}

    /** Ringkasan KPI utama pada dashboard. */
    public function kpi(?Builder $q = null): array
    {
        $q ??= SigApotek::query();
        $ids = (clone $q)->pluck('id');

        $total = $ids->count();
        $aktif = (clone $q)->where('status_sarana', 'aktif')->count();
        $belumDiperiksa = (clone $q)->whereNull('tanggal_pemeriksaan_terakhir')->count();

        // "Perlu monitoring": belum pernah diperiksa, atau terakhir diperiksa
        // lebih dari 12 bulan lalu.
        $perluMonitoring = (clone $q)->where(function ($w) {
            $w->whereNull('tanggal_pemeriksaan_terakhir')
                ->orWhere('tanggal_pemeriksaan_terakhir', '<', now()->subMonths(12)->toDateString());
        })->count();

        $temuanAktif = ApotekTemuan::whereIn('apotek_id', $ids)
            ->whereIn('status', ['belum', 'proses'])->count();

        $tlBelum = ApotekTemuan::whereIn('apotek_id', $ids)
            ->whereIn('status', ['belum', 'proses'])
            ->count();

        $tlLewatTarget = ApotekTemuan::whereIn('apotek_id', $ids)
            ->whereIn('status', ['belum', 'proses'])
            ->whereNotNull('target')
            ->whereDate('target', '<', now()->toDateString())
            ->count();

        $tanpaKoordinat = (clone $q)->where(function ($w) {
            $w->whereNull('latitude')->orWhereNull('longitude');
        })->count();

        return [
            'total_apotek' => $total,
            'apotek_aktif' => $aktif,
            'perlu_monitoring' => $perluMonitoring,
            'belum_diperiksa' => $belumDiperiksa,
            'temuan_aktif' => $temuanAktif,
            'tindak_lanjut_belum_selesai' => $tlBelum,
            'tindak_lanjut_lewat_target' => $tlLewatTarget,
            'tanpa_koordinat' => $tanpaKoordinat,
            'cakupan_pemeriksaan' => $total > 0
                ? (int) round(($total - $belumDiperiksa) / $total * 100)
                : 0,
        ];
    }

    /** Rekap per kabupaten. */
    public function perKabupaten(?Builder $q = null): array
    {
        $q ??= SigApotek::query();

        return (clone $q)
            ->select('kabupaten', DB::raw('COUNT(*) as jumlah'))
            ->selectRaw('SUM(CASE WHEN tanggal_pemeriksaan_terakhir IS NULL THEN 1 ELSE 0 END) as belum_diperiksa')
            ->groupBy('kabupaten')
            ->orderByDesc('jumlah')
            ->get()
            ->map(function ($r) {
                $ids = SigApotek::where('kabupaten', $r->kabupaten)->pluck('id');

                return [
                    'kabupaten' => $r->kabupaten ?: 'Tidak diketahui',
                    'jumlah' => (int) $r->jumlah,
                    'belum_diperiksa' => (int) $r->belum_diperiksa,
                    'sudah_diperiksa' => (int) $r->jumlah - (int) $r->belum_diperiksa,
                    'temuan_aktif' => ApotekTemuan::whereIn('apotek_id', $ids)
                        ->whereIn('status', ['belum', 'proses'])->count(),
                ];
            })->all();
    }

    /** Rekap per kecamatan. */
    public function perKecamatan(?Builder $q = null): array
    {
        $q ??= SigApotek::query();

        return (clone $q)
            ->select('kabupaten', 'kecamatan', DB::raw('COUNT(*) as jumlah'))
            ->selectRaw('SUM(CASE WHEN tanggal_pemeriksaan_terakhir IS NULL THEN 1 ELSE 0 END) as belum_monitoring')
            ->groupBy('kabupaten', 'kecamatan')
            ->orderByDesc('jumlah')
            ->get()
            ->map(function ($r) {
                $ids = SigApotek::where('kabupaten', $r->kabupaten)
                    ->where('kecamatan', $r->kecamatan)->pluck('id');

                return [
                    'kabupaten' => $r->kabupaten ?: 'Tidak diketahui',
                    'kecamatan' => $r->kecamatan ?: 'Tidak diketahui',
                    'jumlah' => (int) $r->jumlah,
                    'belum_monitoring' => (int) $r->belum_monitoring,
                    'sudah_monitoring' => (int) $r->jumlah - (int) $r->belum_monitoring,
                    'temuan' => ApotekTemuan::whereIn('apotek_id', $ids)->count(),
                    'tindak_lanjut_belum' => ApotekTemuan::whereIn('apotek_id', $ids)
                        ->whereIn('status', ['belum', 'proses'])->count(),
                ];
            })->all();
    }

    /**
     * Daftar prioritas monitoring, terurut dari skor tertinggi.
     *
     * @return array<int,array<string,mixed>>
     */
    public function prioritas(?Builder $q = null, int $limit = 100): array
    {
        $q ??= SigApotek::query();
        $daftar = (clone $q)->get();

        $agregat = $this->agregatPerApotek($daftar->pluck('id')->all());

        return $daftar
            ->map(function (SigApotek $a) use ($agregat) {
                $hasil = $this->prioritas->hitung($a, $agregat[$a->id] ?? []);

                return [
                    'id' => $a->id,
                    'nama_apotek' => $a->nama_apotek,
                    'kabupaten' => $a->kabupaten,
                    'kecamatan' => $a->kecamatan,
                    'tanggal_pemeriksaan_terakhir' => $a->tanggal_pemeriksaan_terakhir?->toDateString(),
                    'temuan_aktif' => $agregat[$a->id]['temuan_aktif'] ?? 0,
                    'tindak_lanjut_belum' => $agregat[$a->id]['tindak_lanjut_belum'] ?? 0,
                    'skor' => $hasil['skor'],
                    'tingkat' => $hasil['tingkat'],
                    'rincian' => $hasil['rincian'],
                ];
            })
            ->sortByDesc('skor')
            ->take($limit)
            ->values()
            ->all();
    }

    /** Agregat temuan & tindak lanjut per apotek (satu kueri, bukan N+1). */
    public function agregatPerApotek(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $hasil = [];
        $baris = ApotekTemuan::selectRaw('apotek_id')
            ->selectRaw("SUM(CASE WHEN status IN ('belum','proses') THEN 1 ELSE 0 END) as aktif")
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN status IN ('belum','proses') AND target IS NOT NULL AND target < ? THEN 1 ELSE 0 END) as lewat", [now()->toDateString()])
            ->whereIn('apotek_id', $ids)
            ->groupBy('apotek_id')
            ->get();

        foreach ($baris as $b) {
            $hasil[$b->apotek_id] = [
                'temuan_total' => (int) $b->total,
                'temuan_aktif' => (int) $b->aktif,
                'tindak_lanjut_belum' => (int) $b->aktif,
                'tindak_lanjut_lewat_target' => (int) $b->lewat,
            ];
        }

        return $hasil;
    }

    /** Indikator kualitas data. */
    public function kualitasData(?Builder $q = null): array
    {
        $q ??= SigApotek::query();
        $semua = (clone $q)->get();
        $total = $semua->count();

        $masalah = [
            'koordinat_kosong' => [],
            'alamat_kosong' => [],
            'nib_kosong' => [],
            'wilayah_kosong' => [],
            'penanggung_jawab_kosong' => [],
        ];

        $lengkap = 0;
        foreach ($semua as $a) {
            $adaMasalah = false;
            if (! $a->punyaKoordinat()) {
                $masalah['koordinat_kosong'][] = $this->ringkas($a);
                $adaMasalah = true;
            }
            if (blank($a->alamat)) {
                $masalah['alamat_kosong'][] = $this->ringkas($a);
                $adaMasalah = true;
            }
            if (blank($a->nib)) {
                $masalah['nib_kosong'][] = $this->ringkas($a);
                $adaMasalah = true;
            }
            if (blank($a->kabupaten) || blank($a->kecamatan)) {
                $masalah['wilayah_kosong'][] = $this->ringkas($a);
                $adaMasalah = true;
            }
            if (blank($a->penanggung_jawab)) {
                $masalah['penanggung_jawab_kosong'][] = $this->ringkas($a);
                $adaMasalah = true;
            }
            if (! $adaMasalah) {
                $lengkap++;
            }
        }

        return [
            'total' => $total,
            'lengkap' => $lengkap,
            'perlu_dilengkapi' => $total - $lengkap,
            'persen_lengkap' => $total > 0 ? (int) round($lengkap / $total * 100) : 0,
            'masalah' => array_map(fn ($v) => ['jumlah' => count($v), 'contoh' => array_slice($v, 0, 20)], $masalah),
            'duplikat' => $this->duplikat($semua),
        ];
    }

    /**
     * Deteksi potensi duplikat berdasarkan nama+alamat, NIB, dan nomor identitas.
     * Sistem TIDAK menghapus apa pun — hasilnya hanya untuk dikonfirmasi admin.
     */
    public function duplikat($semua = null): array
    {
        $semua ??= SigApotek::all();
        $kelompok = [];

        foreach ($semua as $a) {
            $kunci = [];
            $nama = $this->normal($a->nama_apotek);
            if ($nama !== '') {
                $kunci[] = 'nama:'.$nama.'|'.$this->normal((string) $a->alamat);
            }
            if (filled($a->nib)) {
                $kunci[] = 'nib:'.$this->normal($a->nib);
            }
            if (filled($a->nomor_identitas)) {
                $kunci[] = 'id:'.$this->normal($a->nomor_identitas);
            }
            foreach ($kunci as $k) {
                $kelompok[$k][] = $this->ringkas($a);
            }
        }

        $hasil = [];
        foreach ($kelompok as $k => $anggota) {
            if (count($anggota) > 1) {
                [$jenis] = explode(':', $k, 2);
                $hasil[] = ['jenis' => $jenis, 'jumlah' => count($anggota), 'anggota' => $anggota];
            }
        }

        return $hasil;
    }

    /** Peringatan monitoring — semuanya dihitung dari data, bukan asumsi. */
    public function peringatan(?Builder $q = null): array
    {
        $kpi = $this->kpi($q);
        $daftar = [];

        if ($kpi['belum_diperiksa'] > 0) {
            $daftar[] = ['tingkat' => 'peringatan', 'pesan' => "{$kpi['belum_diperiksa']} sarana belum memiliki catatan pemeriksaan."];
        }
        if ($kpi['tindak_lanjut_lewat_target'] > 0) {
            $daftar[] = ['tingkat' => 'bahaya', 'pesan' => "{$kpi['tindak_lanjut_lewat_target']} tindak lanjut melewati tanggal target."];
        }
        if ($kpi['tanpa_koordinat'] > 0) {
            $daftar[] = ['tingkat' => 'info', 'pesan' => "{$kpi['tanpa_koordinat']} sarana belum memiliki koordinat sehingga belum tampil di peta."];
        }
        if ($kpi['temuan_aktif'] > 0) {
            $daftar[] = ['tingkat' => 'peringatan', 'pesan' => "{$kpi['temuan_aktif']} temuan masih berstatus belum atau dalam proses."];
        }

        return $daftar;
    }

    /** Cakupan pemeriksaan per periode (12 bulan terakhir). */
    public function cakupanPemeriksaan(): array
    {
        $hasil = [];
        for ($i = 11; $i >= 0; $i--) {
            $bulan = now()->subMonths($i);
            $hasil[] = [
                'label' => $bulan->locale('id')->translatedFormat('M y'),
                'periode' => $bulan->format('Y-m'),
                'jumlah' => ApotekPemeriksaan::whereYear('tanggal', $bulan->year)
                    ->whereMonth('tanggal', $bulan->month)->count(),
            ];
        }

        return $hasil;
    }

    private function ringkas(SigApotek $a): array
    {
        return [
            'id' => $a->id,
            'nama_apotek' => $a->nama_apotek,
            'alamat' => $a->alamat,
            'kabupaten' => $a->kabupaten,
            'kecamatan' => $a->kecamatan,
            'nib' => $a->nib,
        ];
    }

    private function normal(?string $s): string
    {
        return trim(preg_replace('/\s+/', ' ', mb_strtolower((string) $s)) ?? '');
    }
}
