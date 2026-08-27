<?php

namespace App\Services\Pandu;

use Illuminate\Support\Str;

/**
 * Abstraksi layanan AI SI PANDU AI.
 *
 * Saat ini berjalan pada mode "knowledge" — jawaban disusun dari berkas
 * knowledge resmi tanpa memanggil model bahasa eksternal, sehingga tidak ada
 * risiko regulasi yang dikarang.
 *
 * TODO: HUBUNGKAN KE GEMINI API.
 *  - Tambahkan driver 'gemini' pada config/services.php (key diambil dari
 *    variabel lingkungan di server, JANGAN pernah ditaruh di frontend).
 *  - Kirim hasil KnowledgeService::cari() sebagai konteks (RAG) dan instruksikan
 *    model untuk menjawab HANYA dari konteks tersebut.
 *  - Bila model tidak menemukan jawaban pada konteks, kembalikan
 *    self::PERLU_VERIFIKASI — jangan biarkan model berspekulasi.
 */
class PanduAiService
{
    public const DI_LUAR_LINGKUP = 'Maaf, saya fokus membantu informasi yang berkaitan dengan tugas dan layanan Badan POM, khususnya regulasi, sertifikasi, keamanan dan mutu produk, pemeriksaan, CAPA, serta label.';

    public const PERLU_VERIFIKASI = 'Informasi tersebut perlu diverifikasi melalui kanal resmi BPOM.';

    public const TIDAK_CUKUP = 'Saya belum menemukan informasi yang cukup untuk menjawab pertanyaan tersebut.';

    /** Skor minimum agar sebuah kecocokan dianggap meyakinkan (kata kunci cocok). */
    private const AMBANG_YAKIN = 6.0;

    public const DISCLAIMER = 'Si Pandu AI memberikan informasi dan edukasi awal, bukan keputusan atau persetujuan resmi BPOM. Untuk keputusan resmi, verifikasi melalui kanal resmi BPOM.';

    public function __construct(private readonly KnowledgeService $knowledge) {}

    /**
     * Jawab pertanyaan pengguna berdasarkan knowledge resmi.
     *
     * @return array{jawaban:string,sumber:array,di_luar_lingkup:bool,perlu_verifikasi:bool,saran:array}
     */
    public function askAssistant(string $pertanyaan): array
    {
        $pertanyaan = trim($pertanyaan);

        if (! $this->knowledge->dalamLingkup($pertanyaan)) {
            return [
                'jawaban' => self::DI_LUAR_LINGKUP,
                'sumber' => [],
                'di_luar_lingkup' => true,
                'perlu_verifikasi' => false,
                'butuh_petugas' => false,
                'petugas' => null,
                'saran' => $this->saranPertanyaan(),
            ];
        }

        $temuan = $this->knowledge->cari($pertanyaan, 3);
        if ($temuan === []) {
            return [
                'jawaban' => self::TIDAK_CUKUP.' Agar Anda memperoleh jawaban yang tepat, '
                    .'pertanyaan ini sebaiknya disampaikan langsung kepada petugas Balai POM di Jember.',
                'sumber' => [],
                'di_luar_lingkup' => false,
                'perlu_verifikasi' => true,
                // Menandai UI untuk menawarkan penghubung ke petugas.
                'butuh_petugas' => true,
                'petugas' => $this->kontakPetugas($pertanyaan),
                'saran' => $this->saranPertanyaan(),
            ];
        }

        $utama = $temuan[0];
        $entri = $utama['entri'];
        $perluVerifikasi = false;

        if ($utama['tipe'] === 'faq') {
            $jawaban = (string) ($entri['jawaban'] ?? '');
        } else {
            $nama = $entri['nama'] ?? '';
            $kepanjangan = $entri['kepanjangan'] ?? null;
            $judul = $kepanjangan ? "{$nama} ({$kepanjangan})" : $nama;
            $jawaban = "**{$judul}**\n\n".(string) ($entri['ringkasan'] ?? '');
        }

        // Poin, langkah, dan catatan tambahan disusun sebagai daftar agar
        // jawaban tetap rinci namun mudah dibaca.
        $jawaban .= $this->daftar($entri['poin'] ?? [], 'Hal penting yang perlu diperhatikan:');
        $jawaban .= $this->daftar($entri['langkah'] ?? [], 'Gambaran langkahnya:', true);
        $jawaban .= $this->daftar($entri['dokumen'] ?? [], 'Dokumen yang umumnya disiapkan:');
        if (! empty($entri['catatan'])) {
            $jawaban .= "\n\n".(string) $entri['catatan'];
        }
        if (! empty($entri['perlu_verifikasi'])) {
            $perluVerifikasi = true;
        }
        // Petugas dilibatkan bila entri memang menuntut kepastian resmi, atau
        // bila kecocokan pertanyaan tergolong lemah (tidak ada kata kunci yang
        // benar-benar cocok, hanya kemiripan kata biasa).
        $kecocokanLemah = ((float) ($utama['skor'] ?? 0)) < self::AMBANG_YAKIN;
        $arahkanPetugas = ! empty($entri['arahkan_petugas']) || $kecocokanLemah;

        if ($kecocokanLemah) {
            $jawaban .= "\n\nBila yang Anda maksud berbeda dari penjelasan di atas, "
                .'pertanyaan tersebut sebaiknya disampaikan langsung kepada petugas Balai POM di Jember.';
        }

        // Entri pendukung ditampilkan sebagai referensi tambahan, bukan karangan.
        $sumber = [];
        foreach ($temuan as $t) {
            $e = $t['entri'];
            $sumber[] = [
                'tipe' => $t['tipe'],
                'id' => $e['id'] ?? null,
                'judul' => $t['tipe'] === 'faq' ? ($e['pertanyaan'] ?? '') : ($e['nama'] ?? ''),
                'kategori' => $e['kategori'] ?? null,
                'perlu_verifikasi' => (bool) ($e['perlu_verifikasi'] ?? false),
            ];
        }

        if ($perluVerifikasi) {
            $jawaban .= "\n\n_".self::PERLU_VERIFIKASI.'_';
        }

        return [
            'jawaban' => $jawaban,
            'sumber' => $sumber,
            'di_luar_lingkup' => false,
            'perlu_verifikasi' => $perluVerifikasi,
            // Penghubung petugas hanya ditawarkan bila jawabannya memang
            // tidak dapat dipastikan dari knowledge — misalnya pertanyaan
            // tentang biaya, lama proses, atau kondisi khusus milik pengguna.
            'butuh_petugas' => $arahkanPetugas,
            'petugas' => $arahkanPetugas ? $this->kontakPetugas($pertanyaan) : null,
            'saran' => $this->saranLanjutan($temuan),
        ];
    }

    /**
     * Analisis awal (self-assessment) kesiapan produk.
     *
     * @param  array<string,mixed>  $d
     */
    public function analyzeProduct(array $d): array
    {
        $tersedia = [];
        $perluDilengkapi = [];

        $medan = [
            'nama_produk' => 'Nama produk',
            'jenis_produk' => 'Jenis produk',
            'kategori' => 'Kategori produk',
            'komposisi' => 'Komposisi',
            'cara_produksi' => 'Cara produksi',
            'lokasi_produksi' => 'Lokasi produksi',
            'produksi_sendiri' => 'Status produksi (sendiri/maklon)',
            'nib' => 'NIB',
            'punya_izin' => 'Status izin/sertifikat',
            'sudah_beredar' => 'Status peredaran produk',
        ];
        foreach ($medan as $key => $label) {
            $nilai = $d[$key] ?? null;
            if (is_string($nilai)) {
                $nilai = trim($nilai);
            }
            if ($nilai === null || $nilai === '' || $nilai === 'tidak_tahu') {
                $perluDilengkapi[] = $label;
            } else {
                $tersedia[] = $label;
            }
        }

        // Jalur layanan yang mungkin relevan — disusun dari knowledge, bukan karangan.
        $kategori = Str::lower((string) ($d['kategori'] ?? '').' '.(string) ($d['jenis_produk'] ?? ''));
        $petaJalur = [
            'pangan' => ['cppob', 'ip_cppob', 'label', 'btp'],
            'kosmetik' => ['cpkb', 'label', 'klaim'],
            'obat tradisional' => ['cpotb', 'label', 'klaim'],
            'jamu' => ['cpotb', 'label'],
            'suplemen' => ['registrasi', 'label', 'klaim'],
            'obat' => ['cpob', 'registrasi'],
            'distribusi' => ['cdob', 'cperpob'],
        ];
        $idJalur = [];
        foreach ($petaJalur as $kunci => $ids) {
            if ($kategori !== '' && str_contains($kategori, $kunci)) {
                $idJalur = array_merge($idJalur, $ids);
            }
        }
        if ($idJalur === []) {
            $idJalur = ['registrasi', 'label'];
        }
        $jalur = [];
        foreach (array_unique($idJalur) as $id) {
            if ($t = $this->knowledge->topikById($id)) {
                $jalur[] = [
                    'id' => $t['id'],
                    'nama' => $t['nama'],
                    'kepanjangan' => $t['kepanjangan'] ?? null,
                    'ringkasan' => $t['ringkasan'] ?? '',
                    'perlu_verifikasi' => (bool) ($t['perlu_verifikasi'] ?? true),
                ];
            }
        }

        $dokumen = [
            'Legalitas usaha (misalnya NIB)',
            'Data komposisi dan spesifikasi bahan dari pemasok',
            'Prosedur dan catatan produksi',
            'Catatan pembersihan, sanitasi, dan higiene',
            'Desain label yang akan digunakan',
        ];
        if (($d['produksi_sendiri'] ?? '') === 'maklon') {
            $dokumen[] = 'Perjanjian kerja sama maklon dan data sarana pembuat';
        }

        $langkah = [
            'Lengkapi informasi yang masih kosong pada daftar di atas.',
            'Siapkan dokumen pendukung sesuai kondisi sarana Anda yang sebenarnya.',
            'Gunakan menu Cek Label untuk meninjau kelengkapan informasi pada desain label.',
            'Konfirmasi jalur layanan dan persyaratan resmi ke Balai POM di Jember sebelum mengajukan permohonan.',
        ];
        if (($d['sudah_beredar'] ?? '') === 'ya' && ($d['punya_izin'] ?? '') === 'belum') {
            array_unshift($langkah, 'Produk disebut sudah beredar namun belum memiliki izin — segera konsultasikan kondisi ini ke Balai POM di Jember.');
        }

        return [
            'tersedia' => $tersedia,
            'perlu_dilengkapi' => $perluDilengkapi,
            'jalur_layanan' => $jalur,
            'dokumen' => $dokumen,
            'langkah' => $langkah,
            'catatan' => 'Hasil ini merupakan self-assessment awal berbasis informasi yang Anda isikan, bukan penilaian atau persetujuan resmi BPOM.',
        ];
    }

    /**
     * Susun draft CAPA dari temuan & kondisi aktual yang diisi pengguna.
     *
     * @param  array<string,mixed>  $d
     */
    public function generateCAPA(array $d): array
    {
        $temuan = trim((string) ($d['temuan'] ?? ''));
        $kondisi = trim((string) ($d['kondisi_aktual'] ?? ''));
        $bukti = trim((string) ($d['bukti'] ?? ''));
        $pic = trim((string) ($d['pic'] ?? ''));
        $target = trim((string) ($d['target'] ?? ''));

        // Akar masalah ditawarkan sebagai kemungkinan untuk ditelaah, bukan vonis.
        $petunjuk = [
            'dokumen' => 'Kelengkapan dan pemutakhiran dokumen/pencatatan belum berjalan konsisten.',
            'catat' => 'Pencatatan belum dilakukan secara rutin atau belum terverifikasi.',
            'sanitasi' => 'Program sanitasi/higiene belum dijalankan atau belum terjadwal.',
            'bersih' => 'Prosedur pembersihan belum diterapkan atau belum tercatat.',
            'suhu' => 'Pemantauan suhu belum dilakukan atau alat belum terkalibrasi.',
            'kalibrasi' => 'Program kalibrasi/verifikasi alat ukur belum berjalan.',
            'pelatihan' => 'Personel belum memperoleh pelatihan yang memadai.',
            'label' => 'Pengendalian penandaan/label belum sesuai ketentuan.',
            'bangunan' => 'Kondisi bangunan/fasilitas belum memenuhi persyaratan.',
            'hama' => 'Program pengendalian hama belum berjalan efektif.',
            'bahan' => 'Pengendalian bahan baku/pemasok belum memadai.',
            'prosedur' => 'Prosedur tertulis belum tersedia atau belum dipahami pelaksana.',
        ];
        $akar = [];
        $gabungan = Str::lower($temuan.' '.$kondisi);
        foreach ($petunjuk as $kunci => $kalimat) {
            if ($gabungan !== ' ' && str_contains($gabungan, $kunci)) {
                $akar[] = $kalimat;
            }
        }
        if ($akar === []) {
            $akar[] = 'Akar masalah perlu ditelusuri bersama pelaksana di lapangan (misalnya dengan metode 5 Why) berdasarkan kondisi aktual yang Anda tuliskan.';
        }

        $korektif = [
            'Perbaiki kondisi yang menjadi temuan sesuai keadaan sebenarnya di sarana.',
            'Dokumentasikan proses perbaikan beserta tanggal pelaksanaannya.',
        ];
        $preventif = [
            'Tetapkan prosedur tertulis dan jadwal pelaksanaan agar temuan tidak berulang.',
            'Sosialisasikan kepada personel terkait dan catat pelaksanaan sosialisasinya.',
            'Lakukan pemantauan berkala oleh penanggung jawab yang ditunjuk.',
        ];

        return [
            'temuan' => $temuan !== '' ? $temuan : 'Belum diisi.',
            'kondisi_aktual' => $kondisi !== '' ? $kondisi : 'Belum diisi.',
            'root_cause' => $akar,
            'corrective_action' => $korektif,
            'preventive_action' => $preventif,
            'bukti_objektif' => $bukti !== '' ? $bukti : 'Belum ada bukti objektif yang dapat ditampilkan.',
            'pic' => $pic !== '' ? $pic : 'Belum ditentukan.',
            'target' => $target !== '' ? $target : 'Belum ditentukan.',
            'verifikasi_efektivitas' => [
                'Tetapkan cara verifikasi (misalnya pemeriksaan ulang catatan atau pengamatan langsung).',
                'Tentukan waktu verifikasi setelah tindakan selesai dilaksanakan.',
                'Catat hasil verifikasi sebagai bukti bahwa tindakan berjalan efektif.',
            ],
            'catatan' => 'Draft ini disusun dari informasi yang Anda isikan dan masih perlu disesuaikan dengan kondisi nyata di sarana Anda. Draft CAPA bukan jaminan diterimanya tindak lanjut oleh petugas.',
        ];
    }

    /**
     * Data penghubung ke petugas Balai POM di Jember.
     *
     * Pertanyaan pengguna disertakan pada tautan WhatsApp agar petugas langsung
     * memperoleh konteks tanpa pengguna perlu mengetik ulang.
     */
    private function kontakPetugas(string $pertanyaan): array
    {
        $k = $this->knowledge->kontak();
        $nomor = preg_replace('/\D/', '', (string) ($k['whatsapp'] ?? ''));
        // Nomor lokal diawali 0 diubah ke format internasional untuk wa.me.
        if (str_starts_with($nomor, '0')) {
            $nomor = '62'.substr($nomor, 1);
        }

        $pesan = "Halo, saya pelaku usaha yang menggunakan Si Pandu AI.\n\n"
            ."Saya ingin menanyakan:\n\"".trim($pertanyaan)."\"\n\n"
            .'Mohon bantuan penjelasannya. Terima kasih.';

        return [
            'nama' => $k['nama'] ?? 'Balai POM di Jember',
            'whatsapp' => $k['whatsapp'] ?? null,
            'whatsapp_link' => $nomor !== '' ? 'https://wa.me/'.$nomor.'?text='.rawurlencode($pesan) : ($k['whatsapp_link'] ?? null),
            'telepon' => $k['telepon'] ?? null,
            'telepon_link' => $k['telepon_link'] ?? null,
            'email' => $k['email'] ?? null,
            'ajakan' => 'Hubungi petugas Balai POM di Jember untuk jawaban resmi.',
        ];
    }

    /** Susun daftar berpoin/bernomor untuk memperkaya jawaban. */
    private function daftar(mixed $isi, string $judul, bool $bernomor = false): string
    {
        $isi = array_values(array_filter((array) $isi));
        if ($isi === []) {
            return '';
        }

        $baris = '';
        foreach ($isi as $i => $b) {
            $baris .= "\n".($bernomor ? ($i + 1).'. ' : '• ').$b;
        }

        return "\n\n**{$judul}**".$baris;
    }

    /** Contoh pertanyaan pembuka. */
    private function saranPertanyaan(): array
    {
        return [
            'Apakah produk saya wajib BPOM?',
            'Bagaimana mengurus IP CPPOB?',
            'Apa saja dokumen untuk pemeriksaan?',
            'Bagaimana membuat CAPA?',
        ];
    }

    /** Saran lanjutan berbasis entri yang ditemukan. */
    private function saranLanjutan(array $temuan): array
    {
        $saran = [];
        foreach (array_slice($temuan, 1) as $t) {
            $e = $t['entri'];
            $saran[] = $t['tipe'] === 'faq'
                ? (string) ($e['pertanyaan'] ?? '')
                : 'Jelaskan tentang '.(string) ($e['nama'] ?? '');
        }

        return array_values(array_filter($saran)) ?: $this->saranPertanyaan();
    }
}
