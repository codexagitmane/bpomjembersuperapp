# LENTERA BPOM Jember

Sistem Informasi Terintegrasi untuk Balai Pengawas Obat dan Makanan (BPOM) di
Jember — satu platform untuk 5 fungsi (Pemeriksaan, Informasi &
Komunikasi, Penindakan, Tata Usaha, Pengujian), 5 peran pengguna internal, dan layanan
publik untuk masyarakat.

## Arsitektur

Monorepo (pnpm workspaces) dengan 3 aplikasi + 1 package bersama:

```
apps/
  api/      Laravel 11 (PHP 8.4) — REST API, Sanctum auth, Spatie RBAC, MySQL
  web/      Next.js 16 (React 19, TypeScript, Tailwind v4) — aplikasi web
  mobile/   Expo SDK 57 (React Native, expo-router) — aplikasi Android/iOS
packages/
  shared/   Types, skema validasi (zod), konstanta RBAC, API client — dipakai
            bersama oleh web & mobile
```

**Kenapa arsitektur ini:** Laravel dipilih sebagai backend tunggal (bukan
Node.js) demi *maintainability* jangka panjang oleh tim IT internal instansi
(ekosistem PHP/Laravel jauh lebih umum dikuasai di lingkungan pemerintah
daerah). React Native (Expo) dipilih untuk mobile karena bisa berbagi types,
skema validasi, dan API client langsung dengan web (keduanya berbasis React),
memangkas duplikasi logic secara signifikan untuk sistem sebesar ini.

## Menjalankan secara lokal (tanpa Docker)

Prasyarat: PHP 8.4+, Composer, Node.js 20+, pnpm, MySQL (atau pakai SQLite
bawaan untuk development cepat).

```bash
# 1. Install semua dependency JS (root + web + mobile + shared)
pnpm install

# 2. Setup backend
cd apps/api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed   # generate skema + data demo
php artisan storage:link
php artisan serve            # http://localhost:8000

# 3. Jalankan web app (terminal baru)
cd apps/web
cp .env.example .env.local
pnpm dev                     # http://localhost:3000

# 4. Jalankan mobile app (terminal baru)
cd apps/mobile
cp .env.example .env
pnpm start                   # buka di Expo Go / emulator
```

> Default `.env` backend memakai **SQLite** (`database/database.sqlite`) agar
> development langsung jalan tanpa setup MySQL. Untuk produksi, ganti
> `DB_CONNECTION` ke `mysql` dan isi kredensial di `.env`.

### Menjalankan dengan Docker Compose

Meng-containerize MySQL, Redis, API (Laravel), dan Web (Next.js). Mobile app
**tidak** di-containerize — jalankan native via `pnpm --filter @bpom/mobile start`
sesuai konvensi pengembangan Expo.

```bash
cp .env.example .env
php -r "echo 'APP_KEY='.base64_encode(random_bytes(32));"   # atau lihat apps/api/.env
# isi APP_KEY= di .env root dengan hasil di atas (format: base64:xxxx)
docker compose up --build
docker compose exec api php artisan migrate --seed
```

> ⚠️ **Catatan jujur:** konfigurasi Docker ini disusun mengikuti best practice
> standar (multi-stage build, healthcheck, named volumes) tapi **belum
> tervalidasi end-to-end** di sesi ini karena Docker daemon tidak tersedia di
> environment pengembangan. `docker compose config` sudah divalidasi valid
> secara sintaks — mohon jalankan `docker compose up --build` di mesin Anda
> dan laporkan bila ada masalah build sebelum dipakai di produksi.

## Akun Demo

| Role | Email | Password |
|---|---|---|
| Superadmin | superadmin@bpomjember.go.id | BpomJember@2026 |
| Kepala Balai | kepala.balai@bpomjember.go.id | BpomJember@2026 |
| Kepala Subag TU | kasubag.tu@bpomjember.go.id | BpomJember@2026 |
| Pegawai ASN/PPPK | pegawai.asn@bpomjember.go.id | BpomJember@2026 |
| Pegawai Outsourcing | pegawai.outsourcing@bpomjember.go.id | BpomJember@2026 |
| Magang | magang@bpomjember.go.id | BpomJember@2026 |
| Petugas Keamanan | keamanan@bpomjember.go.id | BpomJember@2026 |
| Petugas Kebersihan | kebersihan@bpomjember.go.id | BpomJember@2026 |
| Pengemudi | pengemudi@bpomjember.go.id | BpomJember@2026 |
| Masyarakat (eksternal) | masyarakat@example.com | Masyarakat@123 |

⚠️ **Akun-akun ini HANYA untuk development/demo.** Hapus atau ganti seeder
`DemoUsersSeeder` sebelum deploy ke produksi.

## Aturan Presensi (sesuai kebijakan BPOM Jember)

- **Dua titik kantor** (radius geofence 100 m): Kantor Utama (-8.17874, 113.70650)
  dan Gedung Laboratorium (-8.18324, 113.67008).
- **Jam kerja**: Senin–Kamis 07.30–16.00 • Jumat 07.30–16.30 • Sabtu 07.30–12.00
  (khusus petugas kebersihan) • batas maksimal absen 22.00 WIB.
- **Jenis pegawai** (atribut `jenis_pegawai`, terpisah dari role RBAC): pegawai,
  magang, keamanan, kebersihan, pengemudi, pelayanan.
- **Petugas keamanan**: shift lintas hari — check-in maks 07.30, check-out
  keesokan hari maks 07.30; boleh absen setiap hari termasuk libur.
- **Mode presensi**: WFO (radius salah satu titik kantor), WFH (lokasi rumah
  terdaftar & terverifikasi admin), Dinas (di luar radius, lokasi tetap dicatat).
- **Registrasi masyarakat** tidak langsung aktif — wajib diverifikasi tim
  IT/admin; notifikasi aktivasi dikirim via email. Booking yang dikonfirmasi
  petugas juga memicu email ke masyarakat.

## Modul yang Sudah Fungsional Penuh (backend + web + mobile)

- **Auth & RBAC** — login, registrasi mandiri (masyarakat), 6 role, token
  Sanctum, rate-limiting & penguncian akun otomatis setelah gagal login
  berulang.
- **Presensi Berbasis Lokasi & Selfie** — check-in/out dengan validasi
  geofence server-side (Haversine), kamera selfie native (foto di-re-encode
  ulang di server untuk menghapus metadata EXIF/GPS & menetralkan payload
  berbahaya), riwayat presensi.
- **Booking Layanan Konsultasi & Pengaduan** — form pengajuan + riwayat,
  bisa diakses akun internal maupun masyarakat.
- **Izin Keluar Masuk Kantor** — pengajuan + riwayat (persetujuan tersedia
  di API, UI approval khusus manajerial ada di web).
- **Pengajuan Pemeliharaan & Perbaikan BMN** — pengajuan + riwayat.
- **Monitoring Barang Bukti** — pencatatan + rantai pengelolaan (chain of
  custody log), khusus Fungsi Penindakan.
- **SIG Monitoring Distribusi Apotek** — peta interaktif (Leaflet) di web,
  daftar tabular di mobile; impor data via Excel dan Shapefile (SHP).
- **Berita & Informasi** — feed publik.
- **Dashboard Kepala Balai** — ringkasan semua modul + **tren kehadiran
  multi-periode** (30 hari / triwulan / semester / tahun) dengan line chart,
  serta pie chart status izin apotek & barang bukti.
- **Dashboard Tata Usaha (Kasubag TU)** — monitoring kehadiran harian,
  rekap presensi bulanan per pegawai dengan **ekspor Excel & PDF**.
- **Roster Keamanan** — penjadwalan shift petugas keamanan selang-sehari
  (lintas hari, termasuk hari libur), terintegrasi aturan presensi.
- **Dashboard SIMBA (Fungsi Pengujian)** — analitik bahan laboratorium:
  total penggunaan, bahan aktif/kedaluwarsa, tren penggunaan per bulan,
  top-5 bahan, daftar bahan perlu pengadaan, daftar tanggal ED (paginasi),
  filter bulan & penguji.
- **Manajemen Bahan Laboratorium** — CRUD stok bahan/reagen + pencatatan
  pemakaian per sampel dengan validasi stok server-side.
- **Peta Verifikasi WFH real-time** — admin melihat semua pengajuan lokasi
  WFH di peta Leaflet animasi: marker rumah berdenyut, radius geofence kedua
  kantor, garis animasi ke kantor terdekat + jarak, dan flyTo saat memilih
  pengajuan.
- **Cuti, Izin & Sakit** — pengajuan dengan hitungan hari kerja otomatis,
  jatah cuti tahunan per pegawai (default 12 hari) dengan validasi sisa jatah
  di server, approval Kasubag TU, dan integrasi ke rekap presensi (hari cuti
  tampil sebagai keterangan kehadiran).
- **Notifikasi in-app (lonceng)** — pengajuan baru memberi tahu approver,
  keputusan memberi tahu pemohon; mencakup cuti/izin, izin keluar-masuk,
  tiket BMN, verifikasi WFH, dan status booking.
- **Rekap presensi 3 mode** — harian (detail jam masuk/keluar per pegawai),
  bulanan, dan tahunan; semuanya bisa diekspor Excel & PDF.
- **Berita Acara Barang Bukti otomatis (PDF)** — kop resmi, identitas barang,
  kronologi chain-of-custody, lampiran foto (EXIF dihapus saat unggah), dan
  kolom tanda tangan.
- **Reminder email H-1 booking** — scheduler harian 07:00 WIB mengirim
  pengingat ke masyarakat untuk booking terkonfirmasi esok hari (idempoten).
- **Landing publik mobile** — halaman sambutan masyarakat/stakeholder sebelum
  login: info layanan + berita terbit (endpoint publik ber-rate-limit).

Panduan deploy produksi (VPS Contabo + domain + HTTPS + APK mobile) ada di
[`DEPLOYMENT.md`](DEPLOYMENT.md).

## Keamanan yang Sudah Diimplementasikan

- Semua query database lewat Eloquent ORM (parameterized) — **anti SQL
  injection** by design, tidak ada raw query dengan input mentah.
- Validasi input ketat di setiap endpoint (Form Request + zod di frontend),
  termasuk regex whitelist untuk nama/nomor HP.
- Rate limiting: login (10x/menit per IP+email), endpoint presensi
  (20x/menit), API umum via middleware `throttle`.
- Penguncian akun otomatis setelah 5x gagal login berturut-turut (15 menit).
- RBAC granular via Spatie Permission — setiap endpoint API dijaga middleware
  `role:` sesuai matriks akses per peran, **ditegakkan di server** (bukan
  cuma disembunyikan di UI).
- Upload foto selfie divalidasi sebagai gambar sungguhan (`getimagesize`,
  bukan cuma ekstensi file), dibatasi ukuran, di-resize & di-re-encode ulang
  (menghapus EXIF/GPS metadata & payload tersembunyi), nama file di-random
  (UUID) — tidak pernah memakai nama asli dari klien.
- Geofence presensi divalidasi ulang di server (client-side distance hanya
  untuk UX feedback, **tidak pernah dipercaya** sebagai sumber kebenaran).
- Header keamanan (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) di semua respons API.
- CORS whitelist eksplisit (bukan `*`), token Sanctum berbatas waktu
  (default 7 hari, bisa dikonfigurasi).
- Audit log untuk aksi sensitif (login, login gagal, presensi, perubahan
  status pengajuan/booking/barang bukti).
- Error API di luar environment `local`/`testing` tidak pernah membocorkan
  stack trace — selalu pesan generik.
- Semua error/exception di jalur `/api/*` selalu dijawab JSON terstruktur,
  tidak pernah halaman HTML Laravel.

### Yang perlu ditambahkan sebelum audit keamanan produksi (rekomendasi)

- Autentikasi dua faktor (2FA/OTP) untuk role manajerial.
- Registrasi masyarakat sudah melewati verifikasi manual admin; pertimbangkan
  tambahan verifikasi email/OTP otomatis untuk lapisan kedua.
- Web Application Firewall (WAF) di depan API (mis. Cloudflare/AWS WAF).
- Pertimbangkan pola BFF (cookie httpOnly) untuk token web alih-alih
  `localStorage`, guna mengurangi permukaan serangan XSS terhadap token.
- Penetration testing formal sebelum go-live.
- Koordinat dua titik kantor sudah diisi sesuai data resmi dari BPOM Jember
  (Kantor Utama & Gedung Laboratorium).

## Status Pengembangan

Fondasi (auth, RBAC, splash, menu) dan modul Presensi dibangun **full-depth**
end-to-end sesuai prioritas yang disepakati. Kelima modul lain sudah punya
API lengkap + UI fungsional di web; di mobile, 2 modul (Presensi, Booking
Konsultasi) full-depth dan 3 modul lain (Izin Keluar Masuk, Pengajuan BMN,
Barang Bukti) fungsional dengan UI ringkas, sementara SIG Apotek di mobile
masih tampilan daftar (peta interaktif baru tersedia di web).
