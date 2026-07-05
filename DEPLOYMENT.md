# Panduan Deploy — LENTERA BPOM Jember di VPS Contabo

Panduan langkah-demi-langkah men-deploy **API (Laravel)** + **Web (Next.js)** di satu
VPS Contabo dengan domain profesional dan HTTPS, plus build **APK mobile (Expo)**
yang menunjuk ke API produksi.

> Diuji terhadap Ubuntu 24.04 LTS. Semua perintah dijalankan sebagai root kecuali
> disebutkan lain. Ganti `NAMADOMAIN.id` dengan domain Anda.

---

## 0. Pilih domain

| Opsi | Cocok untuk | Catatan |
|---|---|---|
| **`bpomjember.go.id` (subdomain .go.id)** | Produksi resmi instansi | Wajib untuk instansi pemerintah; diajukan melalui Kominfo/PANDI (domain.go.id) oleh pejabat berwenang — prosesnya administratif, bukan teknis. |
| **`.id`** (mis. `lenterabpomjember.id`) | Uji coba profesional | Bisa dibeli langsung (Niagahoster/IDwebhost/Cloudkilat, ±Rp250rb/th). Rekomendasi untuk trial sekarang. |
| `.my.id` | Uji coba murah | ±Rp10rb/th, kesan kurang formal. |

Rencana subdomain (atur di DNS registrar, arahkan **A record** ke IP VPS Contabo):

```
app.NAMADOMAIN.id   → IP VPS   (aplikasi web)
api.NAMADOMAIN.id   → IP VPS   (REST API untuk web & mobile)
```

---

## 1. Persiapan server (sekali saja)

```bash
apt update && apt upgrade -y
adduser deploy && usermod -aG sudo deploy

# Firewall: hanya SSH + HTTP/HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## 2. Install stack

```bash
# PHP 8.4 + ekstensi yang dibutuhkan Laravel & PhpSpreadsheet & GD
add-apt-repository ppa:ondrej/php -y && apt update
apt install -y nginx mysql-server \
  php8.4-fpm php8.4-cli php8.4-mysql php8.4-mbstring php8.4-xml \
  php8.4-curl php8.4-zip php8.4-gd php8.4-intl php8.4-bcmath

# Composer
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Node.js 20 + pnpm (untuk build Next.js)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs
npm install -g pnpm

# Certbot untuk HTTPS
apt install -y certbot python3-certbot-nginx
```

Amankan MySQL lalu buat database:

```bash
mysql_secure_installation
mysql -e "CREATE DATABASE lentera CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lentera'@'localhost' IDENTIFIED BY 'GANTI_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON lentera.* TO 'lentera'@'localhost'; FLUSH PRIVILEGES;"
```

## 3. Clone & setup API (Laravel)

```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/codexagitmane/bpomjembersuperapp.git lentera
cd lentera/apps/api

composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

Edit `/var/www/lentera/apps/api/.env` — nilai penting untuk produksi:

```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.NAMADOMAIN.id

DB_CONNECTION=mysql
DB_DATABASE=lentera
DB_USERNAME=lentera
DB_PASSWORD=GANTI_PASSWORD_KUAT

# SMTP asli (contoh: SMTP kantor / Brevo / Mailgun) — wajib agar email
# aktivasi akun, konfirmasi booking & reminder H-1 benar-benar terkirim
MAIL_MAILER=smtp
MAIL_HOST=smtp.brevo.com
MAIL_PORT=587
MAIL_USERNAME=xxx
MAIL_PASSWORD=xxx
MAIL_FROM_ADDRESS=noreply@NAMADOMAIN.id
MAIL_FROM_NAME="BPOM Jember"

QUEUE_CONNECTION=database

# CORS: HANYA origin web produksi
CORS_ALLOWED_ORIGINS=https://app.NAMADOMAIN.id
```

Lalu:

```bash
php artisan migrate --seed --force
php artisan storage:link
php artisan config:cache && php artisan route:cache && php artisan view:cache
chown -R www-data:www-data /var/www/lentera/apps/api/storage /var/www/lentera/apps/api/bootstrap/cache
```

> ⚠️ Setelah trial selesai, hapus akun demo: kosongkan `DemoUsersSeeder` dan ganti
> password superadmin lewat database/tinker.

### Queue worker (email) — systemd

`/etc/systemd/system/lentera-queue.service`:

```ini
[Unit]
Description=LENTERA queue worker
After=network.target

[Service]
User=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/lentera/apps/api/artisan queue:work --sleep=3 --tries=3 --max-time=3600

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now lentera-queue
```

### Scheduler (reminder H-1 booking) — cron

```bash
crontab -u www-data -e
# tambahkan:
* * * * * cd /var/www/lentera/apps/api && php artisan schedule:run >> /dev/null 2>&1
```

## 4. Build & jalankan Web (Next.js)

```bash
cd /var/www/lentera
pnpm install --frozen-lockfile

cd apps/web
echo "NEXT_PUBLIC_API_URL=https://api.NAMADOMAIN.id/api" > .env.local
pnpm build

# output standalone → salin aset statis sesuai struktur standalone monorepo
cp -r .next/static .next/standalone/apps/web/.next/static
cp -r public .next/standalone/apps/web/public
```

`/etc/systemd/system/lentera-web.service`:

```ini
[Unit]
Description=LENTERA Next.js web
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/lentera/apps/web
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/node .next/standalone/apps/web/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now lentera-web
```

## 5. Nginx + HTTPS

`/etc/nginx/sites-available/api.NAMADOMAIN.id`:

```nginx
server {
    listen 80;
    server_name api.NAMADOMAIN.id;
    root /var/www/lentera/apps/api/public;
    index index.php;
    client_max_body_size 20m;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
    }
    location ~ /\.(?!well-known) { deny all; }
}
```

`/etc/nginx/sites-available/app.NAMADOMAIN.id`:

```nginx
server {
    listen 80;
    server_name app.NAMADOMAIN.id;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/api.NAMADOMAIN.id /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/app.NAMADOMAIN.id /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# HTTPS otomatis (sertifikat + redirect HTTP→HTTPS + auto-renew)
certbot --nginx -d api.NAMADOMAIN.id -d app.NAMADOMAIN.id
```

## 6. Mobile (Expo) menunjuk ke produksi

```bash
cd apps/mobile
echo "EXPO_PUBLIC_API_URL=https://api.NAMADOMAIN.id/api" > .env
```

**Uji cepat (tanpa build):** jalankan `pnpm start` di laptop, buka lewat **Expo Go**
di HP — aplikasi langsung memakai API produksi.

**Build APK untuk dibagikan ke pegawai:**

```bash
npm install -g eas-cli
eas login                      # akun Expo gratis
eas build:configure
eas build -p android --profile preview   # hasil: file .apk yang bisa diunduh
```

Bagikan link unduhan APK dari dashboard expo.dev ke pegawai (install perlu
mengizinkan "sumber tidak dikenal"). Publikasi ke Play Store bisa menyusul
(`--profile production` menghasilkan .aab).

## 7. Verifikasi pasca-deploy

```bash
curl -s https://api.NAMADOMAIN.id/up               # → halaman "Application up"
curl -s https://api.NAMADOMAIN.id/api/publik/berita # → JSON berita
# buka https://app.NAMADOMAIN.id → login superadmin → cek presensi, dashboard, notifikasi
systemctl status lentera-web lentera-queue          # keduanya active (running)
```

## 8. Update versi berikutnya

```bash
cd /var/www/lentera && git pull
cd apps/api && composer install --no-dev --optimize-autoloader \
  && php artisan migrate --force \
  && php artisan config:cache && php artisan route:cache && php artisan view:cache
cd ../web && pnpm install --frozen-lockfile && pnpm build \
  && cp -r .next/static .next/standalone/apps/web/.next/static \
  && cp -r public .next/standalone/apps/web/public
systemctl restart lentera-web lentera-queue && systemctl reload php8.4-fpm
```

## Checklist keamanan sebelum dipakai luas

- [ ] `APP_DEBUG=false`, `APP_ENV=production` (wajib).
- [ ] Password DB & akun demo diganti; `DemoUsersSeeder` dinonaktifkan.
- [ ] Backup otomatis DB harian: `mysqldump lentera | gzip > backup-$(date +%F).sql.gz` via cron + simpan off-server.
- [ ] SSH: nonaktifkan login password (`PasswordAuthentication no`), pakai key.
- [ ] `fail2ban` untuk SSH (`apt install fail2ban`).
- [ ] Monitoring uptime gratis (UptimeRobot) ke `https://api.NAMADOMAIN.id/up`.
