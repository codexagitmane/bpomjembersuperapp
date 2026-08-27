# Backup, Pemulihan & Migrasi VPS — LENTERA BPOM Jember

Dokumen ini menjawab satu pertanyaan: **kalau VPS mati sekarang, berapa lama
LENTERA bisa hidup lagi di tempat lain, dan apakah ada data yang hilang?**

Dengan prosedur di bawah, jawabannya: **± 20 menit**, dengan kehilangan data
maksimal sebesar jarak antar-backup (bawaan: 1 hari; bisa dirapatkan).

---

## 1. Apa saja yang harus dicadangkan

| # | Aset | Tersimpan di | Hilang kalau tidak dicadangkan |
|---|---|---|---|
| 1 | Basis data MySQL | volume `mysql_data` | Seluruh data: pegawai, presensi, BMN, arsip, SIG, berita |
| 2 | Berkas unggahan | volume `api_storage` | Foto selfie presensi, BAST PDF, foto BMN, gambar berita, label Si Pandu |
| 3 | `.env` | direktori proyek | `APP_KEY` — **tanpa ini seluruh data terenkripsi & token tidak terbaca** |
| 4 | `docker-compose.prod.yml`, `docker/Caddyfile` | direktori proyek | Susunan layanan & rute HTTPS |
| 5 | Kode sumber | git | Aplikasi itu sendiri |

Yang **tidak** perlu dicadangkan: volume `redis_data` (hanya cache, sesi, dan
antrian sementara — dibangun ulang sendiri) dan `caddy_data` (sertifikat TLS
diterbitkan ulang otomatis).

> **`APP_KEY` adalah kunci paling kritis.** Ia dipakai untuk mengenkripsi kolom
> sensitif dan menandatangani sesi. Basis data yang dipulihkan dengan `APP_KEY`
> berbeda akan terbaca sebagian saja. Simpan salinan `.env` di tempat terpisah
> dari VPS (mis. brankas kata sandi atau Google Drive pribadi Anda).

---

## 2. Menyalakan backup otomatis (sekali saja)

Di VPS, dari dalam direktori proyek (`/opt/lentera`):

```bash
cd /opt/lentera
bash scripts/pasang-cron-backup.sh
```

Terpasang: backup penuh setiap hari pukul **01:30**, hasil di
`/opt/lentera-backup/`, 14 arsip terakhir disimpan, log di
`/var/log/lentera-backup.log`.

Ubah jadwal atau jumlah simpanan:

```bash
JAM="0 */6 * * *" bash scripts/pasang-cron-backup.sh   # tiap 6 jam
SIMPAN=30 bash scripts/backup.sh                        # simpan 30 arsip
TUJUAN=/mnt/backup bash scripts/backup.sh               # simpan ke disk lain
```

Uji sekali secara manual — **jangan tunggu insiden untuk tahu backup Anda jalan**:

```bash
bash scripts/backup.sh
ls -lh /opt/lentera-backup/
tar tzf /opt/lentera-backup/lentera-backup-*.tar.gz | head
```

Isi setiap arsip:

```
MANIFEST.txt          keterangan isi + cara memulihkan
basisdata.sql.gz      dump MySQL lengkap (--single-transaction, tanpa mengunci)
storage.tar.gz        seluruh berkas unggahan
konfigurasi/.env      termasuk APP_KEY
konfigurasi/docker-compose.prod.yml
konfigurasi/docker/Caddyfile
kode.bundle           seluruh riwayat git (git clone kode.bundle lentera)
```

### Simpan salinan di luar VPS

Backup yang hanya ada di VPS yang sama tidak melindungi apa pun bila VPS itu
yang hilang. Tarik ke komputer Anda secara berkala:

```powershell
# dijalankan di PowerShell komputer Anda
scp root@147.93.159.225:/opt/lentera-backup/lentera-backup-*.tar.gz C:\backup-lentera\
```

---

## 3. Memulihkan di VPS yang sama (data rusak / salah hapus)

```bash
cd /opt/lentera
bash scripts/restore.sh /opt/lentera-backup/lentera-backup-20260827-013000.tar.gz
```

Skrip akan meminta konfirmasi `YA` sebelum menimpa basis data.

---

## 4. Migrasi ke VPS baru (VPS lama bermasalah)

**Prasyarat di VPS baru:** Ubuntu 22.04/24.04, Docker + Docker Compose.

```bash
# 1. Pasang Docker (sekali saja)
curl -fsSL https://get.docker.com | sh

# 2. Siapkan direktori & ambil kode
mkdir -p /opt/lentera && cd /opt/lentera
#    a) dari repositori GitHub Anda:
git clone https://github.com/codexagitmane/bpomjembersuperapp.git .
#    b) atau dari kode.bundle di dalam arsip backup:
#       tar xzf lentera-backup-*.tar.gz kode.bundle && git clone kode.bundle .

# 3. Salin arsip backup dari komputer Anda ke VPS baru
#    (di PowerShell komputer Anda)
#    scp C:\backup-lentera\lentera-backup-20260827-013000.tar.gz root@IP_BARU:/root/

# 4. Pulihkan seluruh sistem
bash scripts/restore.sh /root/lentera-backup-20260827-013000.tar.gz
```

`restore.sh` memulihkan `.env` (termasuk `APP_KEY`), mengimpor basis data,
mengembalikan berkas unggahan, lalu menyalakan seluruh stack.

**Langkah terakhir — arahkan domain ke IP baru.** Sunting `DOMAIN` di `.env`:

```bash
cd /opt/lentera
sed -i 's/^DOMAIN=.*/DOMAIN=IP_BARU.nip.io/' .env
docker compose -f docker-compose.prod.yml up -d --build web caddy
```

Karena `NEXT_PUBLIC_API_URL` ditanam saat **build** Next.js, service `web`
**wajib** di-build ulang setiap kali `DOMAIN` berubah — bukan sekadar
di-restart.

### Verifikasi setelah migrasi

```bash
docker compose -f docker-compose.prod.yml ps          # 7 service harus "Up"
curl -sk https://$DOMAIN/up                            # health check Laravel
curl -sk https://$DOMAIN/api/berita | head -c 200      # API menjawab JSON
docker compose -f docker-compose.prod.yml exec redis redis-cli ping   # PONG
docker compose -f docker-compose.prod.yml logs --tail 30 worker       # antrian jalan
```

Lalu buka aplikasi di peramban dan login dengan satu akun nyata.

---

## 5. Uji pemulihan berkala (disarankan tiap 3 bulan)

Backup yang belum pernah diuji bukan backup. Cara aman mengujinya tanpa
mengganggu produksi: jalankan pemulihan di direktori terpisah pada VPS lain
(atau VPS uji berbiaya rendah), lalu pastikan jumlah baris masuk akal:

```bash
docker compose -f docker-compose.prod.yml exec -T mysql \
  mysql -u root -p"$DB_ROOT_PASSWORD" bpom_jember \
  -e "SELECT
        (SELECT COUNT(*) FROM users)          AS pengguna,
        (SELECT COUNT(*) FROM presensi)       AS presensi,
        (SELECT COUNT(*) FROM sig_apotek)     AS sarana;"
```

Catat hasilnya, bandingkan dengan produksi.

---

## 6. Ringkasan perintah

| Tujuan | Perintah |
|---|---|
| Backup sekarang | `cd /opt/lentera && bash scripts/backup.sh` |
| Pasang backup harian | `bash scripts/pasang-cron-backup.sh` |
| Lihat log backup | `tail -50 /var/log/lentera-backup.log` |
| Pulihkan | `bash scripts/restore.sh <arsip.tar.gz>` |
| Tarik backup ke PC | `scp root@IP:/opt/lentera-backup/*.tar.gz C:\backup-lentera\` |
| Status layanan | `docker compose -f docker-compose.prod.yml ps` |
| Log satu layanan | `docker compose -f docker-compose.prod.yml logs -f api` |
