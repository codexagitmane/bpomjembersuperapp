<?php

namespace App\Services\Sig;

use App\Models\SigApotek;
use Illuminate\Support\Facades\Cache;

/**
 * Asisten SIG — menjawab pertanyaan seputar monitoring apotek.
 *
 * Dua sumber jawaban, keduanya dapat dipertanggungjawabkan:
 *
 *   1. DATA NYATA. Angka apa pun yang disebut asisten dihitung saat itu juga
 *      dari basis data lewat AnalitikApotekService — tidak ada angka yang
 *      dikarang atau dihafal.
 *   2. PENGETAHUAN TERKURASI. Penjelasan istilah dan cara kerja modul dibaca
 *      dari resources/sig/pengetahuan.json. Berkas itu sengaja tidak memuat
 *      nomor peraturan, tarif, tenggat, maupun sanksi.
 *
 * Pertanyaan di luar kedua sumber tersebut TIDAK dijawab dengan karangan:
 * asisten menyatakan keterbatasannya dan mengarahkan ke petugas.
 *
 * Lapisan ini juga menjadi titik sambung bila nanti dipasang model bahasa:
 * `jawab()` tinggal diberi cadangan pemanggilan API, sementara ringkasan data
 * di bawah dipakai sebagai konteks yang sudah terverifikasi.
 */
class AsistenSigService
{
    public function __construct(
        private readonly AnalitikApotekService $analitik,
        private readonly WilayahService $wilayah,
    ) {}

    /** Pertanyaan contoh yang ditawarkan di antarmuka. */
    public const SARAN = [
        'Sarana mana yang paling perlu dimonitoring?',
        'Berapa sarana yang belum pernah diperiksa?',
        'Bagaimana sebaran sarana per kabupaten?',
        'Bagaimana kualitas data sarana saat ini?',
        'Apakah ada dugaan data ganda?',
        'Bagaimana Skor Prioritas Monitoring dihitung?',
        'Apa arti status "belum diverifikasi"?',
        'Dari mana batas wilayah pada peta berasal?',
    ];

    /**
     * Ringkasan eksekutif — dihitung dari data, bukan dikarang.
     *
     * @return array<string,mixed>
     */
    public function ringkasanEksekutif(): array
    {
        $kpi = $this->analitik->kpi();
        $prioritas = $this->analitik->prioritas(null, 5);
        $kualitas = $this->analitik->kualitasData();

        $sorotan = [];

        if ($kpi['total_apotek'] === 0) {
            $sorotan[] = 'Belum ada data sarana yang tercatat, sehingga analitik belum dapat disusun.';
        } else {
            $sorotan[] = sprintf(
                'Cakupan pemeriksaan %d%% — %d dari %d sarana sudah memiliki catatan pemeriksaan.',
                $kpi['cakupan_pemeriksaan'],
                $kpi['total_apotek'] - $kpi['belum_diperiksa'],
                $kpi['total_apotek'],
            );

            if ($kpi['perlu_monitoring'] > 0) {
                $sorotan[] = sprintf(
                    '%d sarana masuk kategori perlu monitoring (belum pernah diperiksa atau terakhir diperiksa lebih dari 12 bulan lalu).',
                    $kpi['perlu_monitoring'],
                );
            }

            if ($kpi['tindak_lanjut_lewat_target'] > 0) {
                $sorotan[] = sprintf(
                    '%d tindak lanjut sudah melewati tanggal target dan perlu ditagih.',
                    $kpi['tindak_lanjut_lewat_target'],
                );
            }

            if ($kpi['tanpa_koordinat'] > 0) {
                $sorotan[] = sprintf(
                    '%d sarana belum berkoordinat sehingga tidak muncul di peta dan luput dari analisis sebaran.',
                    $kpi['tanpa_koordinat'],
                );
            }

            if ($kpi['temuan_aktif'] === 0 && $kpi['total_apotek'] > 0) {
                $sorotan[] = 'Tidak ada temuan yang berstatus belum atau dalam proses.';
            }
        }

        return [
            'kpi' => $kpi,
            'sorotan' => $sorotan,
            'prioritas_teratas' => array_map(fn ($p) => [
                'id' => $p['id'],
                'nama_apotek' => $p['nama_apotek'],
                'wilayah' => trim(implode(', ', array_filter([$p['kecamatan'], $p['kabupaten']]))) ?: '—',
                'skor' => $p['skor'],
                'tingkat' => $p['tingkat'],
            ], $prioritas),
            'kelengkapan' => [
                'total' => $kualitas['total'] ?? 0,
                'lengkap' => $kualitas['lengkap'] ?? 0,
                'perlu_dilengkapi' => $kualitas['perlu_dilengkapi'] ?? 0,
                'persen_lengkap' => $kualitas['persen_lengkap'] ?? 0,
            ],
            'disclaimer' => self::DISCLAIMER,
        ];
    }

    public const DISCLAIMER = 'Jawaban disusun dari data yang tersimpan pada modul ini dan penjelasan istilah internal. '
        .'Asisten tidak menyampaikan ketentuan peraturan, tarif, tenggat, maupun keputusan penindakan — '
        .'hal tersebut harus dikonfirmasi kepada petugas berwenang.';

    /**
     * Jawab satu pertanyaan.
     *
     * @return array<string,mixed>
     */
    public function jawab(string $pertanyaan): array
    {
        $teks = mb_strtolower(trim($pertanyaan));

        if ($teks === '') {
            return $this->tidakTahu('Pertanyaan masih kosong.');
        }

        // Pertanyaan yang menyentuh ketentuan formal sengaja tidak dijawab.
        if ($this->menyentuhKetentuan($teks)) {
            return [
                'jenis' => 'diarahkan',
                'judul' => 'Perlu dikonfirmasi ke petugas',
                'ringkasan' => 'Pertanyaan ini menyangkut ketentuan formal — dasar hukum, tenggat resmi, biaya, atau sanksi. '
                    .'Asisten ini hanya memuat data monitoring dan penjelasan istilah internal, sehingga tidak menjawabnya.',
                'poin' => [
                    'Silakan konfirmasikan kepada petugas Balai POM di Jember yang menangani bidang terkait.',
                    'Data pada modul ini tetap dapat dipakai sebagai bahan: gunakan menu Prioritas, Analisis, dan Kualitas Data.',
                ],
                'tabel' => null,
                'butuh_petugas' => true,
                'disclaimer' => self::DISCLAIMER,
            ];
        }

        // Pertanyaan yang meminta PENJELASAN dijawab dari pengetahuan lebih
        // dulu. Tanpa urutan ini, "Bagaimana Skor Prioritas dihitung?" tersangkut
        // ke pencocokan kata "prioritas" dan dijawab dengan daftar sarana —
        // padahal yang diminta adalah cara perhitungannya.
        $menjelaskan = $this->mengandung($teks, [
            'apa itu', 'apa arti', 'artinya', 'arti ', 'maksud', 'jelaskan', 'definisi',
            'bagaimana cara', 'cara hitung', 'cara menghitung', 'dihitung', 'perhitungan',
            'kenapa', 'mengapa', 'dari mana', 'siapa yang',
        ]);

        if ($menjelaskan) {
            $entri = $this->cariPengetahuan($teks);
            if ($entri !== null) {
                return $this->dariPengetahuan($entri);
            }
        }

        // 1) Pertanyaan berbasis data.
        $dariData = $this->jawabDariData($teks);
        if ($dariData !== null) {
            return $dariData;
        }

        // 2) Pertanyaan berbasis pengetahuan istilah.
        $entri = $this->cariPengetahuan($teks);
        if ($entri !== null) {
            return $this->dariPengetahuan($entri);
        }

        return $this->tidakTahu();
    }

    // ── Jawaban berbasis data ────────────────────────────────────────────────

    /** @return array<string,mixed>|null */
    private function jawabDariData(string $teks): ?array
    {
        $kab = $this->kabupatenDisebut($teks);
        $q = $kab ? SigApotek::query()->where('kabupaten', $kab) : null;
        $lingkup = $kab ? " di Kabupaten {$kab}" : ' pada seluruh wilayah kerja';

        if ($this->mengandung($teks, ['prioritas', 'paling perlu', 'didahulukan', 'dikunjungi lebih dulu', 'urutan kunjungan'])) {
            $daftar = $this->analitik->prioritas($q, 10);
            if ($daftar === []) {
                return $this->kosong('Belum ada sarana yang dapat diperingkat'.$lingkup.'.');
            }

            return [
                'jenis' => 'data',
                'judul' => 'Sarana dengan prioritas monitoring tertinggi'.$lingkup,
                'ringkasan' => sprintf(
                    '%d sarana teratas menurut Skor Prioritas Monitoring. Skor tinggi berarti perlu dikunjungi lebih dulu — bukan indikasi pelanggaran.',
                    count($daftar),
                ),
                'poin' => [],
                'tabel' => [
                    'kolom' => ['Sarana', 'Wilayah', 'Temuan Aktif', 'Skor', 'Tingkat'],
                    'baris' => array_map(fn ($p) => [
                        $p['nama_apotek'],
                        trim(implode(', ', array_filter([$p['kecamatan'], $p['kabupaten']]))) ?: '—',
                        (string) $p['temuan_aktif'],
                        (string) $p['skor'],
                        $p['tingkat'],
                    ], $daftar),
                ],
                'butuh_petugas' => false,
                'disclaimer' => self::DISCLAIMER,
            ];
        }

        if ($this->mengandung($teks, ['belum diperiksa', 'belum pernah diperiksa', 'perlu monitoring', 'cakupan', 'belum dimonitoring'])) {
            $kpi = $this->analitik->kpi($q);

            return [
                'jenis' => 'data',
                'judul' => 'Cakupan pemeriksaan'.$lingkup,
                'ringkasan' => sprintf(
                    'Dari %d sarana, %d sudah memiliki catatan pemeriksaan (%d%%) dan %d belum pernah diperiksa.',
                    $kpi['total_apotek'],
                    $kpi['total_apotek'] - $kpi['belum_diperiksa'],
                    $kpi['cakupan_pemeriksaan'],
                    $kpi['belum_diperiksa'],
                ),
                'poin' => [
                    sprintf('%d sarana masuk kategori perlu monitoring (belum pernah diperiksa atau terakhir diperiksa lebih dari 12 bulan lalu).', $kpi['perlu_monitoring']),
                    sprintf('%d temuan masih berstatus belum atau dalam proses.', $kpi['temuan_aktif']),
                    sprintf('%d tindak lanjut melewati tanggal target.', $kpi['tindak_lanjut_lewat_target']),
                ],
                'tabel' => null,
                'butuh_petugas' => false,
                'disclaimer' => self::DISCLAIMER,
            ];
        }

        if ($this->mengandung($teks, [
            'sebaran', 'per kabupaten', 'per wilayah', 'per kecamatan',
            'berapa apotek', 'berapa sarana', 'berapa banyak',
            'jumlah apotek', 'jumlah sarana', 'total apotek', 'total sarana',
        ])) {
            $perKecamatan = $this->mengandung($teks, ['kecamatan']);
            $data = $perKecamatan ? $this->analitik->perKecamatan($q) : $this->analitik->perKabupaten($q);
            if ($data === []) {
                return $this->kosong('Belum ada data sarana yang dapat direkap'.$lingkup.'.');
            }

            $data = array_slice($data, 0, 15);

            return [
                'jenis' => 'data',
                'judul' => $perKecamatan ? 'Sebaran sarana per kecamatan'.$lingkup : 'Sebaran sarana per kabupaten',
                'ringkasan' => 'Rekap dihitung dari data sarana yang tersimpan saat ini.',
                'poin' => [],
                'tabel' => [
                    'kolom' => $perKecamatan
                        ? ['Kabupaten', 'Kecamatan', 'Sarana', 'Belum Monitoring', 'Temuan']
                        : ['Kabupaten', 'Sarana', 'Belum Diperiksa', 'Temuan Aktif'],
                    'baris' => array_map(fn ($r) => $perKecamatan
                        ? [
                            (string) ($r['kabupaten'] ?? '—'),
                            (string) ($r['kecamatan'] ?? '—'),
                            (string) ($r['jumlah'] ?? 0),
                            (string) ($r['belum_monitoring'] ?? 0),
                            (string) ($r['temuan'] ?? 0),
                        ]
                        : [
                            (string) ($r['kabupaten'] ?? '—'),
                            (string) ($r['jumlah'] ?? 0),
                            (string) ($r['belum_diperiksa'] ?? 0),
                            (string) ($r['temuan_aktif'] ?? 0),
                        ], $data),
                ],
                'butuh_petugas' => false,
                'disclaimer' => self::DISCLAIMER,
            ];
        }

        if ($this->mengandung($teks, ['kualitas data', 'data kosong', 'kelengkapan', 'data tidak lengkap', 'koordinat kosong'])) {
            $kualitas = $this->analitik->kualitasData($q);
            $masalah = $kualitas['masalah'] ?? [];

            $poin = [];
            foreach ($masalah as $kunci => $info) {
                $jumlah = (int) ($info['jumlah'] ?? 0);
                if ($jumlah > 0) {
                    $poin[] = sprintf('%s: %d sarana', $this->labelKualitas((string) $kunci), $jumlah);
                }
            }
            if ($poin === []) {
                $poin[] = 'Seluruh kolom penting sudah terisi pada semua sarana.';
            }

            return [
                'jenis' => 'data',
                'judul' => 'Kualitas data sarana'.$lingkup,
                'ringkasan' => sprintf(
                    '%d dari %d sarana datanya sudah lengkap (%d%%); %d sarana masih perlu dilengkapi.',
                    (int) ($kualitas['lengkap'] ?? 0),
                    (int) ($kualitas['total'] ?? 0),
                    (int) ($kualitas['persen_lengkap'] ?? 0),
                    (int) ($kualitas['perlu_dilengkapi'] ?? 0),
                ),
                'poin' => $poin,
                'tabel' => null,
                'butuh_petugas' => false,
                'disclaimer' => self::DISCLAIMER,
            ];
        }

        if ($this->mengandung($teks, ['duplikat', 'data ganda', 'dobel', 'kembar'])) {
            $duplikat = $this->analitik->duplikat();
            if ($duplikat === []) {
                return $this->kosong('Tidak ditemukan dugaan data ganda pada data sarana saat ini.');
            }

            return [
                'jenis' => 'data',
                'judul' => 'Dugaan data ganda',
                'ringkasan' => sprintf(
                    '%d pasang sarana memiliki nama atau alamat yang sangat mirip. Ini dugaan berbasis kemiripan teks dan tetap perlu diperiksa manusia sebelum digabung atau dihapus.',
                    count($duplikat),
                ),
                'poin' => [],
                'tabel' => null,
                'butuh_petugas' => false,
                'disclaimer' => self::DISCLAIMER,
            ];
        }

        if ($this->mengandung($teks, ['temuan', 'tindak lanjut', 'capa', 'lewat target'])) {
            $kpi = $this->analitik->kpi($q);

            return [
                'jenis' => 'data',
                'judul' => 'Temuan dan tindak lanjut'.$lingkup,
                'ringkasan' => sprintf(
                    '%d temuan berstatus belum atau dalam proses, %d di antaranya melewati tanggal target.',
                    $kpi['temuan_aktif'],
                    $kpi['tindak_lanjut_lewat_target'],
                ),
                'poin' => [
                    'Temuan dianggap aktif selama statusnya belum atau dalam proses.',
                    'Tindak lanjut dinyatakan selesai setelah diverifikasi petugas.',
                ],
                'tabel' => null,
                'butuh_petugas' => false,
                'disclaimer' => self::DISCLAIMER,
            ];
        }

        return null;
    }

    // ── Pengetahuan istilah ──────────────────────────────────────────────────

    /**
     * @param  array<string,mixed>  $entri
     * @return array<string,mixed>
     */
    private function dariPengetahuan(array $entri): array
    {
        return [
            'jenis' => 'pengetahuan',
            'judul' => $entri['judul'],
            'ringkasan' => $entri['ringkasan'],
            'poin' => array_merge(
                $entri['poin'] ?? [],
                isset($entri['penting']) ? ['Penting: '.$entri['penting']] : [],
            ),
            'tabel' => null,
            'butuh_petugas' => false,
            'disclaimer' => self::DISCLAIMER,
        ];
    }

    /** @return array<string,mixed>|null */
    private function cariPengetahuan(string $teks): ?array
    {
        $entri = $this->muatPengetahuan();
        $terbaik = null;
        $nilaiTerbaik = 0.0;

        foreach ($entri as $e) {
            $nilai = 0.0;

            foreach ($e['kata_kunci'] ?? [] as $kata) {
                if (str_contains($teks, mb_strtolower($kata))) {
                    // Kata kunci yang lebih panjang lebih spesifik, jadi lebih berbobot.
                    $nilai += 6 + mb_strlen($kata) / 10;
                }
            }

            if ($nilai > $nilaiTerbaik) {
                $nilaiTerbaik = $nilai;
                $terbaik = $e;
            }
        }

        return $nilaiTerbaik >= 6 ? $terbaik : null;
    }

    /** @return array<int,array<string,mixed>> */
    private function muatPengetahuan(): array
    {
        return Cache::remember('sig.pengetahuan', 300, function () {
            $path = resource_path('sig/pengetahuan.json');
            if (! is_file($path)) {
                return [];
            }

            $isi = json_decode((string) file_get_contents($path), true);

            return is_array($isi['entri'] ?? null) ? $isi['entri'] : [];
        });
    }

    // ── Pembantu ─────────────────────────────────────────────────────────────

    /** @param array<int,string> $kata */
    private function mengandung(string $teks, array $kata): bool
    {
        foreach ($kata as $k) {
            if (str_contains($teks, $k)) {
                return true;
            }
        }

        return false;
    }

    private function kabupatenDisebut(string $teks): ?string
    {
        foreach ($this->wilayah->getKabupaten() as $kab) {
            if (str_contains($teks, mb_strtolower($kab))) {
                return $kab;
            }
        }

        return null;
    }

    private function menyentuhKetentuan(string $teks): bool
    {
        return $this->mengandung($teks, [
            'sanksi', 'denda', 'pidana', 'dicabut', 'pencabutan izin', 'dasar hukum',
            'peraturan', 'permenkes', 'perbpom', 'undang-undang', 'pasal',
            'biaya', 'tarif', 'berapa lama izin', 'syarat izin', 'cara mengurus izin',
            'wajib berapa', 'tenggat resmi', 'boleh tidak',
        ]);
    }

    private function labelKualitas(string $kunci): string
    {
        return match ($kunci) {
            'koordinat_kosong' => 'Tanpa koordinat',
            'alamat_kosong' => 'Tanpa alamat',
            'nib_kosong' => 'Tanpa NIB',
            'wilayah_kosong' => 'Wilayah belum lengkap',
            'penanggung_jawab_kosong' => 'Tanpa penanggung jawab',
            default => ucfirst(str_replace('_', ' ', $kunci)),
        };
    }

    /** @return array<string,mixed> */
    private function kosong(string $pesan): array
    {
        return [
            'jenis' => 'data',
            'judul' => 'Belum ada data',
            'ringkasan' => $pesan,
            'poin' => [],
            'tabel' => null,
            'butuh_petugas' => false,
            'disclaimer' => self::DISCLAIMER,
        ];
    }

    /** @return array<string,mixed> */
    private function tidakTahu(?string $sebab = null): array
    {
        return [
            'jenis' => 'tidak_tahu',
            'judul' => 'Belum dapat dijawab',
            'ringkasan' => $sebab ?? 'Pertanyaan ini di luar data monitoring dan daftar istilah yang dimiliki asisten. '
                .'Asisten sengaja tidak mengarang jawaban.',
            'poin' => [
                'Coba tanyakan hal yang berkaitan dengan data modul ini: prioritas monitoring, cakupan pemeriksaan, sebaran wilayah, temuan, atau kualitas data.',
                'Untuk hal di luar itu, silakan hubungi petugas Balai POM di Jember.',
            ],
            'tabel' => null,
            'butuh_petugas' => true,
            'disclaimer' => self::DISCLAIMER,
        ];
    }
}
