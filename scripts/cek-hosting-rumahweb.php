<?php
/**
 * Pemeriksa kesiapan shared hosting untuk LENTERA BPOM Jember.
 *
 * Berkas ini TIDAK mengubah apa pun. Ia hanya membaca konfigurasi PHP di
 * server dan melaporkan apakah aplikasi LENTERA bisa berjalan di sana —
 * jadi keputusan pindah dari VPS ke Rumahweb didasarkan pada kenyataan
 * server, bukan perkiraan.
 *
 * Cara pakai
 * ----------
 * 1. Unggah berkas ini ke hosting (lewat File Manager cPanel atau FTP).
 * 2. Buka alamatnya di peramban, misalnya https://domain-anda/cek-hosting-rumahweb.php
 * 3. Bila cPanel punya menu "Terminal", jalankan juga lewat CLI:
 *        php cek-hosting-rumahweb.php
 *    PHP web dan PHP CLI di shared hosting sering berbeda versi, dan
 *    LENTERA memakai keduanya (web untuk aplikasi, CLI untuk cron).
 * 4. HAPUS berkas ini setelah selesai memeriksa.
 *
 * Bila diletakkan bersebelahan dengan berkas .env Laravel, koneksi basis
 * data ikut diuji. Kata sandi tidak pernah ditampilkan.
 *
 * Sengaja ditulis dengan sintaks PHP lama supaya tetap bisa berjalan — dan
 * melaporkan versinya — di hosting yang PHP-nya masih usang.
 */

// Sintaks lama disengaja: berkas ini harus bisa jalan di PHP tua untuk
// melaporkan bahwa PHP-nya memang tua.

$MIN_PHP = '8.2.0';

/** Ekstensi yang benar-benar dibutuhkan oleh paket di composer.lock. */
$EKSTENSI_WAJIB = array(
    'ctype', 'dom', 'fileinfo', 'filter', 'gd', 'hash', 'iconv', 'json',
    'libxml', 'mbstring', 'openssl', 'pcre', 'session', 'simplexml',
    'tokenizer', 'xml', 'xmlreader', 'xmlwriter', 'zip', 'zlib',
    'pdo', 'pdo_mysql',
);

/** Tidak menggagalkan pemasangan, tetapi sebaiknya ada. */
$EKSTENSI_DISARANKAN = array(
    'curl'    => 'Permintaan HTTP keluar (Guzzle) memakai jalur lebih cepat.',
    'bcmath'  => 'Perhitungan angka presisi tinggi pada beberapa paket Laravel.',
    'intl'    => 'Pemformatan tanggal dan angka sesuai lokal Indonesia.',
    'exif'    => 'Pembacaan orientasi foto selfie presensi.',
    'sodium'  => 'Enkripsi modern bagi sebagian pustaka.',
);

$hasil = array();
$adaGagal = false;
$adaIngat = false;

/**
 * Mencatat satu baris hasil pemeriksaan.
 *
 * @param string $status "ok", "ingat", atau "gagal"
 */
function catat($status, $judul, $keterangan)
{
    global $hasil, $adaGagal, $adaIngat;

    $hasil[] = array('status' => $status, 'judul' => $judul, 'keterangan' => $keterangan);

    if ($status === 'gagal') {
        $adaGagal = true;
    } elseif ($status === 'ingat') {
        $adaIngat = true;
    }
}

/** Mengubah notasi ini PHP ("256M", "1G") menjadi byte. -1 berarti tanpa batas. */
function keByte($nilai)
{
    $nilai = trim((string) $nilai);

    if ($nilai === '' ) {
        return 0;
    }
    if ($nilai === '-1') {
        return -1;
    }

    $satuan = strtolower(substr($nilai, -1));
    $angka = (float) $nilai;

    if ($satuan === 'g') {
        return (int) ($angka * 1024 * 1024 * 1024);
    }
    if ($satuan === 'm') {
        return (int) ($angka * 1024 * 1024);
    }
    if ($satuan === 'k') {
        return (int) ($angka * 1024);
    }

    return (int) $angka;
}

/** Menampilkan byte dalam satuan yang enak dibaca. */
function ramahByte($byte)
{
    if ($byte < 0) {
        return 'tanpa batas';
    }
    if ($byte >= 1024 * 1024 * 1024) {
        return round($byte / 1024 / 1024 / 1024, 1) . ' GB';
    }
    if ($byte >= 1024 * 1024) {
        return round($byte / 1024 / 1024) . ' MB';
    }

    return round($byte / 1024) . ' KB';
}

/** Apakah sebuah fungsi benar-benar bisa dipanggil (tidak dimatikan hosting). */
function fungsiHidup($nama)
{
    if (!function_exists($nama)) {
        return false;
    }

    $dimatikan = array_map('trim', explode(',', (string) ini_get('disable_functions')));

    return !in_array($nama, $dimatikan, true);
}

/** Membaca berkas .env Laravel secara sederhana. */
function bacaEnv($berkas)
{
    $isi = array();
    $baris = @file($berkas, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    if (!is_array($baris)) {
        return $isi;
    }

    foreach ($baris as $satu) {
        $satu = trim($satu);

        if ($satu === '' || substr($satu, 0, 1) === '#') {
            continue;
        }

        $pisah = strpos($satu, '=');

        if ($pisah === false) {
            continue;
        }

        $kunci = trim(substr($satu, 0, $pisah));
        $nilai = trim(substr($satu, $pisah + 1));

        // Buang tanda kutip pembungkus bila ada.
        $panjang = strlen($nilai);
        if ($panjang >= 2) {
            $awal = substr($nilai, 0, 1);
            $akhir = substr($nilai, -1);
            if (($awal === '"' && $akhir === '"') || ($awal === "'" && $akhir === "'")) {
                $nilai = substr($nilai, 1, $panjang - 2);
            }
        }

        $isi[$kunci] = $nilai;
    }

    return $isi;
}

$lewatCli = (php_sapi_name() === 'cli');

// ---------------------------------------------------------------- versi PHP

if (version_compare(PHP_VERSION, $MIN_PHP, '>=')) {
    catat('ok', 'Versi PHP ' . ($lewatCli ? '(CLI)' : '(web)'), PHP_VERSION . ' — memenuhi syarat minimal ' . $MIN_PHP . '.');
} else {
    catat('gagal', 'Versi PHP ' . ($lewatCli ? '(CLI)' : '(web)'), PHP_VERSION . ' — LENTERA membutuhkan minimal ' . $MIN_PHP . '. Naikkan lewat menu "MultiPHP Manager" di cPanel.');
}

// Versi PHP CLI dilihat dari sisi web, karena cron memakai PHP CLI.
if (!$lewatCli) {
    $keluaran = fungsiHidup('shell_exec') ? @shell_exec('php -v 2>&1') : null;

    if (is_string($keluaran) && preg_match('/PHP\s+(\d+\.\d+\.\d+)/', $keluaran, $cocok)) {
        if (version_compare($cocok[1], $MIN_PHP, '>=')) {
            catat('ok', 'Versi PHP (CLI)', $cocok[1] . ' — dipakai oleh cron dan perintah artisan.');
        } else {
            catat('gagal', 'Versi PHP (CLI)', $cocok[1] . ' — di bawah ' . $MIN_PHP . '. Cron akan gagal walau PHP web sudah baru. Pakai jalur penuh biner PHP baru di perintah cron.');
        }
    } else {
        catat('ingat', 'Versi PHP (CLI)', 'Tidak dapat dideteksi dari peramban. Jalankan berkas ini sekali lagi lewat menu Terminal cPanel: php ' . basename(__FILE__));
    }
}

// ------------------------------------------------------------------ ekstensi

$kurang = array();

foreach ($EKSTENSI_WAJIB as $ekstensi) {
    if (!extension_loaded($ekstensi)) {
        $kurang[] = $ekstensi;
    }
}

if (count($kurang) === 0) {
    catat('ok', 'Ekstensi wajib', 'Lengkap, ' . count($EKSTENSI_WAJIB) . ' ekstensi tersedia.');
} else {
    catat('gagal', 'Ekstensi wajib', 'Belum ada: ' . implode(', ', $kurang) . '. Aktifkan di cPanel → "Select PHP Version" → tab Extensions, atau minta bantuan dukungan Rumahweb.');
}

$kurangSaran = array();

foreach ($EKSTENSI_DISARANKAN as $ekstensi => $alasan) {
    if (!extension_loaded($ekstensi)) {
        $kurangSaran[] = $ekstensi . ' (' . $alasan . ')';
    }
}

if (count($kurangSaran) === 0) {
    catat('ok', 'Ekstensi tambahan', 'Semua ekstensi pendukung tersedia.');
} else {
    catat('ingat', 'Ekstensi tambahan', 'Belum ada: ' . implode('; ', $kurangSaran) . ' Aplikasi tetap jalan tanpa ini.');
}

// Predis dipakai sebagai klien Redis murni PHP, jadi ext-redis tidak wajib.
if (extension_loaded('redis')) {
    catat('ok', 'Redis', 'Ekstensi redis tersedia. Bila Rumahweb menyediakan server Redis, antrian dan tembolok bisa tetap memakainya.');
} else {
    catat('ingat', 'Redis', 'Tidak tersedia — lazim di shared hosting. Ganti CACHE_STORE=file, SESSION_DRIVER=file, dan QUEUE_CONNECTION=database di .env.');
}

// ------------------------------------------------------- symlink dan perintah

if (!fungsiHidup('symlink')) {
    catat('gagal', 'Pembuatan symlink', 'Fungsi symlink() dimatikan. Perintah "php artisan storage:link" tidak bisa jalan; foto selfie dan berkas unggahan tidak akan tampil. Minta Rumahweb mengaktifkannya, atau salin manual isi storage/app/public ke public/storage.');
} else {
    $sasaran = sys_get_temp_dir() . '/lentera_cek_' . getmypid() . '.txt';
    $tautan = sys_get_temp_dir() . '/lentera_taut_' . getmypid();

    @file_put_contents($sasaran, 'cek');
    $berhasil = @symlink($sasaran, $tautan);

    if ($berhasil) {
        @unlink($tautan);
        catat('ok', 'Pembuatan symlink', 'Berhasil dibuat dan dihapus. Perintah storage:link akan bekerja.');
    } else {
        catat('gagal', 'Pembuatan symlink', 'Fungsi tersedia tetapi pembuatan gagal (kemungkinan dibatasi open_basedir). Foto unggahan perlu penanganan manual.');
    }

    @unlink($sasaran);
}

$perintah = array('proc_open', 'exec', 'shell_exec', 'putenv');
$mati = array();

foreach ($perintah as $satu) {
    if (!fungsiHidup($satu)) {
        $mati[] = $satu;
    }
}

if (count($mati) === 0) {
    catat('ok', 'Fungsi sistem', 'proc_open, exec, shell_exec, dan putenv aktif — composer dan artisan bisa dijalankan.');
} elseif (in_array('proc_open', $mati, true)) {
    catat('gagal', 'Fungsi sistem', 'proc_open dimatikan. Composer tidak bisa jalan di server; unggah folder vendor/ dalam keadaan sudah jadi dari komputer Anda.');
} else {
    catat('ingat', 'Fungsi sistem', 'Dimatikan: ' . implode(', ', $mati) . '. Sebagian perintah baris perintah mungkin terbatas.');
}

$basis = trim((string) ini_get('open_basedir'));

if ($basis === '') {
    catat('ok', 'open_basedir', 'Tidak dibatasi.');
} else {
    catat('ingat', 'open_basedir', 'Dibatasi ke: ' . $basis . '. Pastikan folder aplikasi dan folder sementara berada di dalam daftar ini.');
}

// -------------------------------------------------------------- batas sumber

$memori = keByte(ini_get('memory_limit'));

if ($memori < 0 || $memori >= 256 * 1024 * 1024) {
    catat('ok', 'Batas memori', ramahByte($memori) . '.');
} elseif ($memori >= 128 * 1024 * 1024) {
    catat('ingat', 'Batas memori', ramahByte($memori) . ' — cukup untuk penggunaan harian, tetapi ekspor Excel dan cetak PDF besar bisa terhenti. Idealnya 256 MB.');
} else {
    catat('gagal', 'Batas memori', ramahByte($memori) . ' — terlalu kecil. Laravel dan PhpSpreadsheet membutuhkan setidaknya 128 MB, disarankan 256 MB.');
}

$waktu = (int) ini_get('max_execution_time');

if ($waktu === 0 || $waktu >= 60) {
    catat('ok', 'Batas waktu eksekusi', ($waktu === 0 ? 'tanpa batas' : $waktu . ' detik') . '.');
} else {
    catat('ingat', 'Batas waktu eksekusi', $waktu . ' detik — migrasi basis data dan ekspor laporan besar berisiko terputus. Naikkan ke 120 detik.');
}

$unggah = keByte(ini_get('upload_max_filesize'));
$kiriman = keByte(ini_get('post_max_size'));
$terkecil = ($unggah < $kiriman || $kiriman < 0) ? $unggah : $kiriman;

if ($terkecil < 0 || $terkecil >= 8 * 1024 * 1024) {
    catat('ok', 'Batas unggahan', 'upload_max_filesize ' . ramahByte($unggah) . ', post_max_size ' . ramahByte($kiriman) . '.');
} else {
    catat('ingat', 'Batas unggahan', 'Efektif hanya ' . ramahByte($terkecil) . '. Foto selfie presensi dan berkas label Si Pandu AI bisa ditolak. Naikkan keduanya ke 16 MB.');
}

if ($kiriman >= 0 && $unggah > $kiriman) {
    catat('ingat', 'Kesesuaian batas unggahan', 'upload_max_filesize lebih besar daripada post_max_size, jadi batas sebenarnya adalah post_max_size. Samakan keduanya.');
}

// ------------------------------------------------------------ hak tulis berkas

if (is_writable(__DIR__)) {
    catat('ok', 'Hak tulis folder', 'Folder ' . __DIR__ . ' dapat ditulisi.');
} else {
    catat('gagal', 'Hak tulis folder', 'Folder ' . __DIR__ . ' tidak dapat ditulisi. Laravel membutuhkan hak tulis pada storage/ dan bootstrap/cache/.');
}

// ------------------------------------------------------------------ basis data

$berkasEnv = null;

foreach (array(__DIR__ . '/.env', dirname(__DIR__) . '/.env') as $calon) {
    if (is_readable($calon)) {
        $berkasEnv = $calon;
        break;
    }
}

if ($berkasEnv === null) {
    catat('ingat', 'Koneksi basis data', 'Berkas .env tidak ditemukan di sebelah berkas ini, jadi koneksi tidak diuji. Letakkan berkas ini di folder aplikasi Laravel untuk menguji koneksi.');
} else {
    $env = bacaEnv($berkasEnv);
    $sopir = isset($env['DB_CONNECTION']) ? $env['DB_CONNECTION'] : '';

    if ($sopir !== 'mysql' && $sopir !== 'mariadb') {
        catat('ingat', 'Koneksi basis data', 'DB_CONNECTION bernilai "' . $sopir . '", bukan mysql. Pemeriksaan dilewati.');
    } elseif (!extension_loaded('pdo_mysql')) {
        catat('gagal', 'Koneksi basis data', 'Ekstensi pdo_mysql tidak aktif, koneksi tidak dapat diuji.');
    } else {
        $inang = isset($env['DB_HOST']) ? $env['DB_HOST'] : '127.0.0.1';
        $pintu = isset($env['DB_PORT']) ? $env['DB_PORT'] : '3306';
        $nama = isset($env['DB_DATABASE']) ? $env['DB_DATABASE'] : '';
        $pengguna = isset($env['DB_USERNAME']) ? $env['DB_USERNAME'] : '';
        $sandi = isset($env['DB_PASSWORD']) ? $env['DB_PASSWORD'] : '';

        try {
            $dsn = 'mysql:host=' . $inang . ';port=' . $pintu . ';dbname=' . $nama;
            $pdo = new PDO($dsn, $pengguna, $sandi, array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5));
            $versi = $pdo->query('SELECT VERSION()')->fetchColumn();
            catat('ok', 'Koneksi basis data', 'Tersambung ke ' . $nama . ' di ' . $inang . '. Versi server: ' . $versi . '.');
        } catch (Exception $e) {
            // Pesan galat PDO tidak memuat kata sandi.
            catat('gagal', 'Koneksi basis data', 'Gagal tersambung ke ' . $nama . ' di ' . $inang . ': ' . $e->getMessage());
        }
    }
}

// ------------------------------------------------------------- hal manual saja

catat('ingat', 'Perlu dicek manual', 'Empat hal berikut tidak bisa dideteksi dari dalam PHP: (1) apakah document root domain bisa diarahkan ke folder public/; (2) interval minimum cron yang diizinkan — LENTERA butuh setiap 1 menit untuk penjadwal; (3) apakah tersedia akses SSH atau menu Terminal; (4) apakah Node.js tersedia bila Anda ingin menjalankan Next.js sebagai proses, bukan sebagai berkas statis. Tanyakan keempatnya ke dukungan Rumahweb.');

// ------------------------------------------------------------------ kesimpulan

if ($adaGagal) {
    $vonis = 'BELUM SIAP — ada syarat wajib yang tidak terpenuhi. Perbaiki butir bertanda GAGAL lebih dulu.';
} elseif ($adaIngat) {
    $vonis = 'SIAP DENGAN CATATAN — syarat wajib terpenuhi. Butir bertanda INGAT sebaiknya dibereskan sebelum pindah.';
} else {
    $vonis = 'SIAP — seluruh syarat terpenuhi.';
}

// ------------------------------------------------------------------ tampilkan

$judulHalaman = 'Pemeriksaan Kesiapan Hosting — LENTERA BPOM Jember';
$lencana = array('ok' => '[  OK  ]', 'ingat' => '[ INGAT]', 'gagal' => '[ GAGAL]');

if ($lewatCli) {
    echo $judulHalaman . "\n";
    echo str_repeat('=', strlen($judulHalaman)) . "\n\n";

    foreach ($hasil as $baris) {
        echo $lencana[$baris['status']] . ' ' . $baris['judul'] . "\n";
        echo '         ' . wordwrap($baris['keterangan'], 92, "\n         ") . "\n\n";
    }

    echo str_repeat('-', strlen($judulHalaman)) . "\n";
    echo $vonis . "\n\n";
    echo "Hapus berkas ini setelah selesai memeriksa.\n";

    exit($adaGagal ? 1 : 0);
}

$warna = array('ok' => '#15803d', 'ingat' => '#b45309', 'gagal' => '#b91c1c');
$latar = array('ok' => '#f0fdf4', 'ingat' => '#fffbeb', 'gagal' => '#fef2f2');

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title><?php echo htmlspecialchars($judulHalaman, ENT_QUOTES, 'UTF-8'); ?></title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 24px 16px; background: #f8fafc; color: #0f172a;
         font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
  main { max-width: 820px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.sub { margin: 0 0 20px; color: #64748b; font-size: 14px; }
  .baris { border: 1px solid #e2e8f0; border-left-width: 4px; border-radius: 8px;
           padding: 12px 14px; margin-bottom: 10px; background: #fff; }
  .baris h2 { font-size: 15px; margin: 0 0 4px; }
  .baris p { margin: 0; color: #334155; font-size: 14px; word-wrap: break-word; }
  .vonis { margin-top: 20px; padding: 14px 16px; border-radius: 8px; font-weight: 600; }
  .catatan { margin-top: 18px; font-size: 13px; color: #64748b; }
</style>
</head>
<body>
<main>
  <h1><?php echo htmlspecialchars($judulHalaman, ENT_QUOTES, 'UTF-8'); ?></h1>
  <p class="sub">Diperiksa pada <?php echo htmlspecialchars(date('d-m-Y H:i'), ENT_QUOTES, 'UTF-8'); ?> &middot; <?php echo htmlspecialchars(php_uname('s'), ENT_QUOTES, 'UTF-8'); ?></p>

<?php foreach ($hasil as $baris) { ?>
  <div class="baris" style="border-left-color: <?php echo $warna[$baris['status']]; ?>; background: <?php echo $latar[$baris['status']]; ?>;">
    <h2 style="color: <?php echo $warna[$baris['status']]; ?>;">
      <?php echo trim($lencana[$baris['status']], '[] '); ?> &middot;
      <?php echo htmlspecialchars($baris['judul'], ENT_QUOTES, 'UTF-8'); ?>
    </h2>
    <p><?php echo htmlspecialchars($baris['keterangan'], ENT_QUOTES, 'UTF-8'); ?></p>
  </div>
<?php } ?>

  <div class="vonis" style="background: <?php echo $adaGagal ? $latar['gagal'] : ($adaIngat ? $latar['ingat'] : $latar['ok']); ?>; color: <?php echo $adaGagal ? $warna['gagal'] : ($adaIngat ? $warna['ingat'] : $warna['ok']); ?>;">
    <?php echo htmlspecialchars($vonis, ENT_QUOTES, 'UTF-8'); ?>
  </div>

  <p class="catatan">Hapus berkas ini dari server setelah selesai memeriksa.</p>
</main>
</body>
</html>
