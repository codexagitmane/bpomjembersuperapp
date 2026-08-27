# Evaluasi Temuan & Perintah Gerak Cepat

Ringkasan lima temuan, apa yang sudah dikerjakan di rilis ini, dan perintah
yang perlu Anda jalankan di VPS.

---

## Ringkasan

| # | Temuan | Status | Yang perlu Anda lakukan |
|---|---|---|---|
| 1 | Kode belum masuk GitHub milik sendiri | **Siap** — skrip + pemeriksaan rahasia | Buat repo kosong, jalankan 1 skrip, `git push` |
| 2 | Redis belum dipakai | **Selesai** — cache, sesi, antrian + worker + scheduler | `docker compose up -d --build` |
| 3 | GeoJSON SIG kosong | **Selesai** — 5 kabupaten + 117 kecamatan asli | Tidak ada; ikut dalam paket |
| 4 | Belum ada backup & jalur migrasi | **Selesai** — backup, restore, cron, runbook | `bash scripts/pasang-cron-backup.sh` |
| 5 | Build harus bersih | **Terverifikasi** — lihat bagian 5 | — |

---

## 1. Repositori GitHub milik Anda sendiri

**Temuan.** Selama ini kode berpindah lewat tarball. Tidak ada riwayat
perubahan, tidak ada titik pulang bila sebuah perubahan merusak sistem, dan
satu-satunya salinan kode ada di VPS.

**Yang sudah dikerjakan.** `scripts/siapkan-repo.sh` menyiapkan repositori,
menambahkan remote ke akun Anda, dan **menolak melanjutkan** bila `.env`,
`vendor/`, `node_modules/`, atau berkas kunci (`.pem`, `.key`, `.jks`, `.p12`)
sampai ikut ter-*stage* — pengaman agar kredensial produksi tidak pernah bocor
ke GitHub.

**Perintah gerak cepat.**

```bash
# 1) Di peramban: buat repositori KOSONG (tanpa README/.gitignore/LICENSE)
#    https://github.com/new  → Owner: codexagitmane  → Name: bpomjembersuperapp
#    Visibility: Private (disarankan)

# 2) Buat Personal Access Token (classic), centang scope "repo":
#    https://github.com/settings/tokens

# 3) Di VPS:
cd /opt/lentera
bash scripts/siapkan-repo.sh
git config credential.helper store     # token cukup diketik sekali
git push -u origin main
#    Username : codexagitmane
#    Password : <tempelkan Personal Access Token>
```

Selanjutnya setiap kali ada perubahan cukup:

```bash
cd /opt/lentera && bash scripts/siapkan-repo.sh && git push
```

> Saya sendiri tidak dapat mendorong ke repositori Anda — akses GitHub sesi ini
> ditolak (`403`) untuk `codexagitmane/bpomjembersuperapp`. Karena itu langkah
> terakhir sengaja dibuat sesingkat mungkin agar Anda jalankan sendiri.

---

## 2. Redis benar-benar dipakai

**Temuan.** Container `redis` sudah menyala sejak lama, tetapi **tidak dipakai
sama sekali**: `CACHE_STORE=file`, `SESSION_DRIVER=file`, `QUEUE_CONNECTION=sync`.
Akibatnya (a) cache menumpuk sebagai berkas di dalam container dan hilang tiap
deploy, (b) pengiriman surel berjalan **di dalam** request sehingga pengguna
menunggu SMTP selesai, dan (c) penjadwal Laravel (`schedule:run`) tidak pernah
dijalankan siapa pun — pengingat H-1 booking konsultasi **tidak pernah terkirim**.

**Yang sudah dikerjakan.**

- `predis/predis ^3.6` ditambahkan ke `composer.json` — klien Redis berbasis PHP
  murni, dipilih supaya image Docker tidak perlu mengompilasi ekstensi `phpredis`
  (menghilangkan satu sumber kegagalan build).
- `docker-compose.prod.yml`: `CACHE_STORE`, `SESSION_DRIVER`, `QUEUE_CONNECTION`
  seluruhnya `redis`; env aplikasi dipusatkan pada satu anchor YAML agar `api`,
  `worker`, dan `scheduler` mustahil memakai konfigurasi yang berbeda.
- Redis dijalankan dengan `--appendonly yes` + volume `redis_data`, sehingga sesi
  pengguna dan antrian surel **tidak hilang saat deploy**. Kebijakan memori
  `noeviction` dipilih agar job antrian tidak pernah dibuang diam-diam.
- Service **`worker`** baru: `queue:work redis --tries=3 --backoff=10 --max-time=3600`.
- Service **`scheduler`** baru: `schedule:work` — menggantikan entri cron di host
  dan menghidupkan kembali pengingat booking pukul 07:00 WIB.
- `healthcheck` Redis + `depends_on: service_healthy` agar aplikasi tidak start
  sebelum Redis siap.

**Perintah gerak cepat.**

```bash
cd /opt/lentera
docker compose -f docker-compose.prod.yml up -d --build

# Verifikasi
docker compose -f docker-compose.prod.yml ps                    # 7 service Up
docker compose -f docker-compose.prod.yml exec redis redis-cli ping        # PONG
docker compose -f docker-compose.prod.yml exec redis redis-cli dbsize      # > 0
docker compose -f docker-compose.prod.yml logs --tail 20 worker
docker compose -f docker-compose.prod.yml logs --tail 20 scheduler
docker compose -f docker-compose.prod.yml exec api php artisan about | grep -i -E "cache|queue|session"
```

---

## 3. GeoJSON SIG yang benar-benar berisi

**Temuan.** `WilayahService::loadGeoJSON()` mencari
`resources/sig/geojson/{kabupaten,kecamatan}.geojson`. Berkas itu tidak pernah
ada, sehingga lapisan "Batas Wilayah" di peta selalu kosong.

**Yang sudah dikerjakan.**

- Dibangun **batas wilayah asli** untuk seluruh wilayah kerja Balai POM di Jember:

  | Berkas | Isi | Ukuran |
  |---|---|---|
  | `kabupaten.geojson` | 5 kabupaten (Jember, Banyuwangi, Bondowoso, Situbondo, Lumajang) | 62 KB |
  | `kecamatan.geojson` | 117 kecamatan | 432 KB |

  Jumlah kecamatan cocok persis dengan data resmi: Jember 31, Banyuwangi 25,
  Bondowoso 23, Lumajang 21, Situbondo 17.

- Sumber data: dataset batas desa Indonesia turunan **OpenStreetMap (ODbL)**.
  1.025 poligon desa digabung (*dissolve*) menjadi kecamatan dan kabupaten,
  celah rambut antar-desa ditutup, lubang palsu dibuang, lalu disederhanakan
  agar ringan di peta. Seluruh geometri hasil diverifikasi valid, tanpa lubang,
  dan kotak batasnya cocok dengan posisi sebenarnya.
- Proses pembuatannya disimpan sebagai `scripts/bangun-geojson.py` agar data
  dapat dibangun ulang dan asal-usulnya bisa ditelusuri.
- **Titik apotek demo kini jatuh di dalam poligon kecamatannya masing-masing.**
  Sebelumnya koordinat disebar acak ±0,13° dari titik tengah kabupaten sehingga
  sebagian mendarat di laut. Seeder sekarang mengambil titik acak *di dalam*
  poligon kecamatan (uji *ray casting*). Terverifikasi: **47 dari 47** sarana
  bertitik berada di dalam kecamatannya (5 sarana memang sengaja dibiarkan tanpa
  koordinat untuk menguji fitur Kualitas Data).
- Nama wilayah muncul sebagai tooltip saat kursor menyusuri batas di peta.

**Batas kejujuran data.** Kawasan yang bukan bagian dari desa mana pun — hutan
negara dan taman nasional (Alas Purwo, Baluran, Meru Betiri) — tidak tercakup,
sehingga luas poligon Banyuwangi, Jember, dan Situbondo lebih kecil daripada
luas administratif resmi. Keterangan ini ditulis di dalam berkas GeoJSON itu
sendiri (`catatan`) dan lapisan ini dinyatakan sebagai **bantu visual, bukan
batas administratif resmi**. Bila nanti tersedia shapefile resmi dari BIG atau
Bappeda, cukup timpa kedua berkas tersebut — kode tidak perlu diubah.

**Perintah gerak cepat.**

```bash
cd /opt/lentera
docker compose -f docker-compose.prod.yml exec api ls -lh resources/sig/geojson/
docker compose -f docker-compose.prod.yml exec api php artisan cache:clear
curl -sk "https://$DOMAIN/api/sig-apotek/geojson?tingkat=kabupaten" | head -c 300
```

Lalu buka menu **SIG Monitoring Distribusi Apotek** → nyalakan lapisan
**Batas Wilayah**.

---

## 4. Backup & jalur migrasi

**Temuan.** Tidak ada backup sama sekali. Seluruh data hidup di dua volume
Docker pada satu VPS. Bila VPS bermasalah, semuanya hilang — termasuk `APP_KEY`
yang tanpa itu basis data cadangan pun tak sepenuhnya terbaca.

**Yang sudah dikerjakan.**

- `scripts/backup.sh` — satu arsip berisi dump MySQL, seluruh berkas unggahan,
  `.env` + `docker-compose.prod.yml` + `Caddyfile`, `kode.bundle` (riwayat git
  penuh), dan `MANIFEST.txt`. Hasil dump diperiksa agar backup kosong tidak
  lolos diam-diam; arsip di-`chmod 600` karena memuat `.env`; arsip lama
  dipangkas otomatis.
- `scripts/restore.sh` — memulihkan seluruhnya dengan konfirmasi `YA` sebelum
  menimpa basis data.
- `scripts/pasang-cron-backup.sh` — backup harian 01:30, aman dijalankan
  berulang (tidak menumpuk entri cron).
- `PEMULIHAN.md` — runbook lengkap, termasuk langkah migrasi ke VPS baru dan
  daftar verifikasi setelahnya.
- `docker/Caddyfile` kini **ada di dalam repositori**. Sebelumnya berkas ini
  hanya ada di VPS, padahal `docker-compose.prod.yml` me-*mount*-nya — artinya
  membangun ulang sistem dari repositori saja pasti gagal.

**Perintah gerak cepat.**

```bash
cd /opt/lentera

# CADANGKAN Caddyfile VPS lebih dulu, lalu bandingkan dengan versi repositori
cp docker/Caddyfile docker/Caddyfile.vps.bak 2>/dev/null
# (setelah mengekstrak paket rilis)
diff docker/Caddyfile.vps.bak docker/Caddyfile

bash scripts/backup.sh                  # uji sekali
bash scripts/pasang-cron-backup.sh      # nyalakan harian
ls -lh /opt/lentera-backup/
```

Tarik salinannya ke komputer Anda — backup yang hanya ada di VPS yang sama
tidak melindungi dari VPS yang hilang:

```powershell
scp root@147.93.159.225:/opt/lentera-backup/lentera-backup-*.tar.gz C:\backup-lentera\
```

---

## 5. Verifikasi build

| Pemeriksaan | Hasil |
|---|---|
| `php -l` seluruh berkas yang diubah | Bersih |
| `migrate:fresh --seed` (SQLite) | Seluruh migrasi & seeder sukses |
| Sebaran titik demo SIG | 47/47 berada di dalam poligon kecamatannya |
| Pemuatan GeoJSON via `WilayahService` | `kabupaten` 5 fitur, `kecamatan` 117 fitur |
| Aturan `EmailAman` | Menolak CR/LF, karakter kendali, dan spasi |
| `docker-compose.prod.yml` | YAML valid; env `worker`/`scheduler` identik dengan `api` |
| `eslint` berkas yang diubah | Bersih |
| `next build` | Sukses, seluruh halaman ter-*build* |

### Yang belum bersih (jujur dilaporkan)

**a. Sisa peringatan ESLint di seluruh proyek: 38 error, 12 warning** —
37 di antaranya `react-hooks/set-state-in-effect` dan 10 `no-unused-vars`.
Semuanya **sudah ada sebelum perubahan ini** dan tersebar di berkas yang tidak
saya sentuh; `next build` tetap sukses sehingga produksi tidak terpengaruh.
Rapi-rapi ini pantas dikerjakan sebagai satu pekerjaan tersendiri agar tidak
bercampur dengan perubahan infrastruktur di rilis ini.

**b. Tiga *advisory* keamanan pada `laravel/framework`.** Audit Composer awalnya
memunculkan 24 advisory pada 5 paket; setelah pemasangan ulang dependensi,
tersisa 3 — seluruhnya pada `laravel/framework`, dan perbaikan resminya **hanya
tersedia di Laravel 12.61.1+**, tidak ada tambalan untuk jalur 11.x. Saya
**tidak** menaikkan versi mayor Laravel sepihak: itu perubahan besar yang
berisiko dan seharusnya menjadi keputusan Anda, dengan jendela pengujian sendiri.

Yang saya lakukan sebagai gantinya adalah menutup jalur yang benar-benar
terpapar:

- *Signed URL* — **tidak terpapar**, fitur ini tidak dipakai di mana pun.
- **CRLF injection pada aturan `email`** (GHSA-5vg9-5847-vvmq, *high*) —
  **terpapar**: alamat surel dari pengguna dipakai langsung sebagai penerima
  (`Mail::to($user->email)` pada `AdminVerifikasiController` dan
  `BookingKonsultasiController`), sehingga karakter CR/LF berpotensi menyisipkan
  tajuk surel. Ditambahkan aturan `App\Rules\EmailAman` yang menolak seluruh
  karakter kendali dan spasi, lalu dipasang pada **lima titik validasi surel**:
  login, pendaftaran akun eksternal, tambah pegawai, ubah pegawai, dan data
  sarana SIG. Terverifikasi menolak `"budi@contoh.id\nbcc: korban@contoh.id"`.

Rekomendasi: jadwalkan kenaikan ke Laravel 12 sebagai pekerjaan terpisah dengan
pengujian penuh. Sampai saat itu, jalur yang terpapar sudah tertutup.

---

## Urutan yang disarankan di VPS

```bash
cd /opt/lentera
cp docker/Caddyfile docker/Caddyfile.vps.bak          # 1. amankan Caddyfile lama
tar xzf /root/lentera-rilis.tar.gz                     # 2. ekstrak DARI DALAM /opt/lentera
diff docker/Caddyfile.vps.bak docker/Caddyfile         # 3. pastikan rute tetap benar
docker compose -f docker-compose.prod.yml up -d --build # 4. nyalakan (Redis + worker + scheduler)
docker compose -f docker-compose.prod.yml ps           # 5. pastikan 7 service Up
bash scripts/backup.sh                                 # 6. backup pertama
bash scripts/pasang-cron-backup.sh                     # 7. backup harian otomatis
bash scripts/siapkan-repo.sh && git push -u origin main # 8. dorong ke GitHub Anda
```
