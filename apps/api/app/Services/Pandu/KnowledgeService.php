<?php

namespace App\Services\Pandu;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Sumber pengetahuan SI PANDU AI.
 *
 * Seluruh jawaban asisten HARUS bersumber dari berkas knowledge ini.
 * Bila sebuah informasi tidak ditemukan, pemanggil wajib mengembalikan
 * kalimat baku "perlu diverifikasi" — bukan mengarang regulasi, nomor
 * peraturan, biaya, persyaratan, atau nomor kontak.
 */
class KnowledgeService
{
    /** Kata kunci yang menandakan pertanyaan masih dalam lingkup Badan POM. */
    private const KATA_DALAM_LINGKUP = [
        'bpom', 'badan pom', 'balai pom', 'obat', 'makanan', 'pangan', 'kosmetik', 'kosmetika',
        'suplemen', 'jamu', 'herbal', 'regulasi', 'peraturan', 'sertifikat', 'sertifikasi',
        'izin', 'perizinan', 'edar', 'registrasi', 'label', 'kemasan', 'klaim', 'netto',
        'komposisi', 'kedaluwarsa', 'expired', 'keamanan', 'mutu', 'pemeriksaan', 'inspeksi',
        'sarana', 'temuan', 'capa', 'cppob', 'cpkb', 'cpotb', 'cpob', 'cdob', 'cperpob',
        'smkpo', 'btp', 'bahan tambahan', 'higiene', 'sanitasi', 'produksi', 'distribusi',
        'maklon', 'nib', 'umkm', 'usaha', 'produk', 'gizi', 'halal', 'pengawet', 'pewarna',
        'jember', 'banyuwangi', 'bondowoso', 'situbondo', 'lumajang', 'layanan', 'konsultasi',
    ];

    /** @return array<string,mixed> */
    public function all(): array
    {
        return Cache::remember('pandu.knowledge', 300, function () {
            $path = resource_path('pandu/knowledge.json');
            if (! is_file($path)) {
                return ['topik' => [], 'faq' => [], 'regulasi' => [], 'regulasi_kategori' => []];
            }
            $data = json_decode((string) file_get_contents($path), true);

            return is_array($data) ? $data : ['topik' => [], 'faq' => [], 'regulasi' => [], 'regulasi_kategori' => []];
        });
    }

    public function kontak(): array
    {
        return $this->all()['kontak'] ?? [];
    }

    public function wilayahKerja(): array
    {
        return $this->all()['wilayah_kerja'] ?? [];
    }

    public function elemenLabel(): array
    {
        return $this->all()['elemen_label'] ?? [];
    }

    public function topik(): array
    {
        return $this->all()['topik'] ?? [];
    }

    public function faq(): array
    {
        return $this->all()['faq'] ?? [];
    }

    public function regulasiKategori(): array
    {
        return $this->all()['regulasi_kategori'] ?? [];
    }

    public function sumberResmi(): array
    {
        return $this->all()['sumber_resmi'] ?? [];
    }

    /** Apakah pertanyaan masih berada dalam lingkup tugas Badan POM. */
    public function dalamLingkup(string $pertanyaan): bool
    {
        $t = Str::lower($pertanyaan);
        foreach (self::KATA_DALAM_LINGKUP as $k) {
            if (str_contains($t, $k)) {
                return true;
            }
        }
        // Cocokkan juga dengan kata kunci milik entri knowledge.
        foreach ([...$this->topik(), ...$this->faq()] as $e) {
            foreach ((array) ($e['kata_kunci'] ?? []) as $k) {
                if ($k !== '' && str_contains($t, Str::lower($k))) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Ambil entri knowledge paling relevan dengan pertanyaan.
     *
     * @return array<int,array<string,mixed>> entri terurut dari paling relevan
     */
    public function cari(string $pertanyaan, int $limit = 3): array
    {
        $t = Str::lower($pertanyaan);
        $kata = array_values(array_filter(
            preg_split('/[^a-z0-9]+/', $t) ?: [],
            fn ($w) => mb_strlen($w) >= 3
        ));

        $kandidat = [];
        foreach ($this->faq() as $e) {
            $kandidat[] = ['tipe' => 'faq', 'entri' => $e, 'teks' => ($e['pertanyaan'] ?? '').' '.($e['jawaban'] ?? '')];
        }
        foreach ($this->topik() as $e) {
            $kandidat[] = ['tipe' => 'topik', 'entri' => $e, 'teks' => ($e['nama'] ?? '').' '.($e['kepanjangan'] ?? '').' '.($e['ringkasan'] ?? '')];
        }

        $skor = [];
        foreach ($kandidat as $i => $c) {
            $nilai = 0;
            $teks = Str::lower($c['teks']);
            foreach ((array) ($c['entri']['kata_kunci'] ?? []) as $k) {
                $k = Str::lower(trim((string) $k));
                if ($k !== '' && str_contains($t, $k)) {
                    // Kata kunci eksplisit bernilai paling tinggi.
                    $nilai += 6 + mb_strlen($k) / 10;
                }
            }
            foreach ($kata as $w) {
                if (str_contains($teks, $w)) {
                    $nilai += 1;
                }
            }
            // Ambang minimum: kecocokan satu kata umum saja terlalu lemah untuk
            // dianggap sebagai jawaban, dan lebih baik dialihkan ke petugas.
            if ($nilai >= 2) {
                $skor[$i] = $nilai;
            }
        }
        arsort($skor);

        $hasil = [];
        foreach (array_slice(array_keys($skor), 0, $limit) as $i) {
            // Skor disertakan agar pemanggil dapat menilai seberapa yakin
            // kecocokannya; kecocokan lemah sebaiknya dialihkan ke petugas.
            $hasil[] = $kandidat[$i] + ['skor' => $skor[$i]];
        }

        return $hasil;
    }

    /** Entri topik berdasarkan id. */
    public function topikById(string $id): ?array
    {
        foreach ($this->topik() as $t) {
            if (($t['id'] ?? null) === $id) {
                return $t;
            }
        }

        return null;
    }
}
