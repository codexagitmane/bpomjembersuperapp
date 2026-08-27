<?php

namespace App\Services\Sig;

use App\Models\SigApotek;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Csv as CsvWriter;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Impor & ekspor data sarana apotek (CSV/XLSX).
 *
 * Impor selalu melalui dua tahap: pratinjau + validasi lebih dahulu, baru
 * disimpan setelah dikonfirmasi pengguna. Baris yang tidak lolos validasi
 * dilaporkan beserta alasannya dan tidak pernah disimpan diam-diam.
 */
class ApotekBerkasService
{
    /** Pemetaan kolom berkas → medan basis data. */
    public const KOLOM = [
        'nama_apotek' => ['nama apotek', 'nama_apotek', 'nama', 'nama sarana'],
        'alamat' => ['alamat', 'alamat lengkap'],
        'kabupaten' => ['kabupaten', 'kab', 'kabupaten/kota'],
        'kecamatan' => ['kecamatan', 'kec'],
        'desa' => ['desa', 'kelurahan', 'desa/kelurahan'],
        'latitude' => ['latitude', 'lat', 'lintang'],
        'longitude' => ['longitude', 'lng', 'long', 'bujur'],
        'nib' => ['nib'],
        'nomor_identitas' => ['nomor identitas', 'nomor_identitas', 'no identitas', 'nomor izin', 'no izin'],
        'pemilik' => ['pemilik', 'nama pemilik'],
        'penanggung_jawab' => ['penanggung jawab', 'penanggung_jawab', 'apoteker', 'apj'],
        'telepon' => ['telepon', 'no telepon', 'hp', 'nomor telepon'],
        'email' => ['email', 'surel'],
        'status_sarana' => ['status', 'status sarana', 'status_sarana'],
        'keterangan' => ['keterangan', 'catatan'],
    ];

    public function __construct(private readonly WilayahService $wilayah) {}

    /** Header berkas contoh untuk diunduh pengguna. */
    public function template(): string
    {
        $ss = new Spreadsheet;
        $s = $ss->getActiveSheet();
        $s->setTitle('Data Apotek');

        $judul = ['Nama Apotek', 'Alamat', 'Kabupaten', 'Kecamatan', 'Desa', 'Latitude', 'Longitude',
            'NIB', 'Nomor Identitas', 'Pemilik', 'Penanggung Jawab', 'Telepon', 'Email', 'Status', 'Keterangan'];
        $s->fromArray($judul, null, 'A1');
        $s->fromArray([
            'Apotek Contoh Sehat', 'Jl. Contoh No. 1', 'Jember', 'Sumbersari', 'Kebonsari',
            -8.1724, 113.7002, '1234567890123', 'SIA-CONTOH-001', 'Nama Pemilik',
            'Apoteker Penanggung Jawab', '08123456789', 'apotek@contoh.id', 'aktif', 'Baris contoh — hapus sebelum impor',
        ], null, 'A2');

        foreach (range('A', 'O') as $k) {
            $s->getColumnDimension($k)->setAutoSize(true);
        }
        $s->getStyle('A1:O1')->getFont()->setBold(true);

        $tmp = tempnam(sys_get_temp_dir(), 'tpl').'.xlsx';
        (new Xlsx($ss))->save($tmp);
        $isi = (string) file_get_contents($tmp);
        @unlink($tmp);

        return $isi;
    }

    /**
     * Baca berkas dan validasi tiap baris tanpa menyimpan apa pun.
     *
     * @return array{baris:array,valid:int,galat:int,kolom_terbaca:array}
     */
    public function pratinjau(UploadedFile $berkas, int $maks = 2000): array
    {
        $sheet = IOFactory::load($berkas->getRealPath())->getActiveSheet();
        $data = $sheet->toArray(null, true, true, false);

        if ($data === []) {
            return ['baris' => [], 'valid' => 0, 'galat' => 0, 'kolom_terbaca' => []];
        }

        $peta = $this->petakanHeader(array_shift($data));
        $baris = [];
        $valid = 0;
        $galat = 0;

        foreach ($data as $i => $row) {
            if (count($baris) >= $maks) {
                break;
            }
            // Lewati baris kosong.
            if (count(array_filter($row, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $nilai = [];
            foreach ($peta as $medan => $idx) {
                $nilai[$medan] = trim((string) ($row[$idx] ?? ''));
            }

            $masalah = $this->validasi($nilai);
            if ($masalah === []) {
                $valid++;
            } else {
                $galat++;
            }

            $baris[] = ['baris' => $i + 2, 'data' => $nilai, 'masalah' => $masalah, 'valid' => $masalah === []];
        }

        return ['baris' => $baris, 'valid' => $valid, 'galat' => $galat, 'kolom_terbaca' => array_keys($peta)];
    }

    /**
     * Simpan baris yang lolos validasi.
     *
     * @return array{disimpan:int,dilewati:int}
     */
    public function simpan(array $baris, int $userId): array
    {
        $disimpan = 0;
        $dilewati = 0;

        foreach ($baris as $b) {
            $d = $b['data'] ?? $b;
            if ($this->validasi($d) !== []) {
                $dilewati++;

                continue;
            }

            $isi = [
                'nama_apotek' => $this->potong($d['nama_apotek'] ?? '', 150),
                'alamat' => $d['alamat'] ?? '',
                'kabupaten' => $this->potong($d['kabupaten'] ?? null, 60),
                'kecamatan' => $this->potong($d['kecamatan'] ?? null, 80),
                'desa' => $this->potong($d['desa'] ?? null, 80),
                'nib' => $this->potong($d['nib'] ?? null, 60),
                'nomor_identitas' => $this->potong($d['nomor_identitas'] ?? null, 80),
                'pemilik' => $this->potong($d['pemilik'] ?? null, 150),
                'penanggung_jawab' => $this->potong($d['penanggung_jawab'] ?? null, 150),
                'telepon' => $this->potong($d['telepon'] ?? null, 30),
                'email' => $this->potong($d['email'] ?? null, 120),
                'keterangan' => $d['keterangan'] ?? null,
                'status_sarana' => $this->statusSah($d['status_sarana'] ?? ''),
                'created_by' => $userId,
                'updated_by' => $userId,
            ];

            $lat = $d['latitude'] ?? '';
            $lng = $d['longitude'] ?? '';
            if ($this->wilayah->koordinatValid($lat, $lng)) {
                $isi['latitude'] = (float) $lat;
                $isi['longitude'] = (float) $lng;
            }

            try {
                SigApotek::create($isi);
                $disimpan++;
            } catch (\Throwable) {
                $dilewati++;
            }
        }

        return ['disimpan' => $disimpan, 'dilewati' => $dilewati];
    }

    /** Ekspor data terfilter ke CSV atau XLSX. */
    public function ekspor(Builder $q, string $format = 'xlsx'): array
    {
        $ss = new Spreadsheet;
        $s = $ss->getActiveSheet();
        $s->setTitle('Data Apotek');

        $judul = ['No', 'Nama Apotek', 'Alamat', 'Kabupaten', 'Kecamatan', 'Desa', 'Latitude', 'Longitude',
            'NIB', 'Nomor Identitas', 'Penanggung Jawab', 'Telepon', 'Status', 'Pemeriksaan Terakhir'];
        $s->fromArray($judul, null, 'A1');
        $s->getStyle('A1:N1')->getFont()->setBold(true);

        $baris = 2;
        foreach ($q->orderBy('kabupaten')->orderBy('nama_apotek')->cursor() as $i => $a) {
            $s->fromArray([
                $i + 1, $a->nama_apotek, $a->alamat, $a->kabupaten, $a->kecamatan, $a->desa,
                $a->latitude, $a->longitude, $a->nib, $a->nomor_identitas,
                $a->penanggung_jawab, $a->telepon, $a->status_sarana,
                $a->tanggal_pemeriksaan_terakhir?->format('d/m/Y') ?? '-',
            ], null, 'A'.$baris);
            $baris++;
        }
        foreach (range('A', 'N') as $k) {
            $s->getColumnDimension($k)->setAutoSize(true);
        }

        $tmp = tempnam(sys_get_temp_dir(), 'exp');
        if ($format === 'csv') {
            (new CsvWriter($ss))->setDelimiter(';')->setUseBOM(true)->save($tmp);
            $mime = 'text/csv';
            $ext = 'csv';
        } else {
            (new Xlsx($ss))->save($tmp);
            $mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            $ext = 'xlsx';
        }
        $isi = (string) file_get_contents($tmp);
        @unlink($tmp);

        return ['isi' => $isi, 'mime' => $mime, 'ext' => $ext];
    }

    /** @return array<int,string> daftar masalah pada satu baris */
    private function validasi(array $d): array
    {
        $masalah = [];
        if (trim((string) ($d['nama_apotek'] ?? '')) === '') {
            $masalah[] = 'Nama apotek wajib diisi.';
        }
        if (trim((string) ($d['alamat'] ?? '')) === '') {
            $masalah[] = 'Alamat wajib diisi.';
        }

        $lat = $d['latitude'] ?? '';
        $lng = $d['longitude'] ?? '';
        $adaLat = trim((string) $lat) !== '';
        $adaLng = trim((string) $lng) !== '';
        if ($adaLat !== $adaLng) {
            $masalah[] = 'Latitude dan longitude harus diisi berpasangan.';
        } elseif ($adaLat && ! $this->wilayah->koordinatValid($lat, $lng)) {
            $masalah[] = 'Koordinat tidak valid.';
        }

        $email = trim((string) ($d['email'] ?? ''));
        if ($email !== '' && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $masalah[] = 'Format email tidak valid.';
        }

        return $masalah;
    }

    /** Cocokkan header berkas dengan medan yang dikenali. */
    private function petakanHeader(array $header): array
    {
        $peta = [];
        foreach ($header as $idx => $judul) {
            $j = trim(mb_strtolower((string) $judul));
            if ($j === '') {
                continue;
            }
            foreach (self::KOLOM as $medan => $alias) {
                if (! isset($peta[$medan]) && in_array($j, $alias, true)) {
                    $peta[$medan] = $idx;
                    break;
                }
            }
        }

        return $peta;
    }

    private function statusSah(string $s): string
    {
        $s = str_replace(' ', '_', trim(mb_strtolower($s)));

        return in_array($s, SigApotek::STATUS_SARANA, true) ? $s : 'belum_diverifikasi';
    }

    private function potong(?string $v, int $maks): ?string
    {
        $v = $v === null ? null : trim($v);

        return ($v === null || $v === '') ? null : mb_substr($v, 0, $maks);
    }
}
