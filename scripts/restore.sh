#!/usr/bin/env bash
#
# Pemulihan LENTERA BPOM Jember dari arsip backup (dijalankan DI VPS tujuan).
#
# Pemakaian:
#   bash scripts/restore.sh /opt/lentera-backup/lentera-backup-20260827-013000.tar.gz
#
# Skrip ini:
#   1. membongkar arsip ke direktori sementara,
#   2. memulihkan berkas konfigurasi (.env, compose, Caddyfile) bila diminta,
#   3. menghidupkan mysql + redis lalu mengimpor dump basis data,
#   4. mengembalikan berkas unggahan ke volume api_storage,
#   5. menyalakan seluruh stack.
#
# PERINGATAN: langkah 3 MENIMPA isi basis data tujuan.
set -euo pipefail

ARSIP="${1:-}"
AKAR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="${COMPOSE:-docker compose -f $AKAR/docker-compose.prod.yml}"

pesan() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
gagal() { printf '\033[1;31mGAGAL:\033[0m %s\n' "$*" >&2; exit 1; }

[ -n "$ARSIP" ] || gagal "sebutkan berkas arsip. Contoh: bash scripts/restore.sh /opt/lentera-backup/lentera-backup-*.tar.gz"
[ -f "$ARSIP" ] || gagal "berkas $ARSIP tidak ditemukan"

KERJA="$(mktemp -d)"
trap 'rm -rf "$KERJA"' EXIT

pesan "Membongkar arsip..."
tar xzf "$ARSIP" -C "$KERJA"
[ -f "$KERJA/basisdata.sql.gz" ] || gagal "arsip tidak memuat basisdata.sql.gz"
cat "$KERJA/MANIFEST.txt" 2>/dev/null || true

cd "$AKAR"

# --- Konfigurasi -------------------------------------------------------------
if [ -d "$KERJA/konfigurasi" ]; then
	if [ -f .env ] && [ "${PAKSA_ENV:-0}" != "1" ]; then
		pesan ".env sudah ada di VPS ini — dipertahankan."
		pesan "  Jalankan ulang dengan PAKSA_ENV=1 bila ingin memakai .env dari arsip."
	elif [ -f "$KERJA/konfigurasi/.env" ]; then
		cp "$KERJA/konfigurasi/.env" .env
		chmod 600 .env
		pesan ".env dipulihkan dari arsip."
	fi

	mkdir -p docker
	[ -f "$KERJA/konfigurasi/docker/Caddyfile" ] && [ ! -f docker/Caddyfile ] \
		&& cp "$KERJA/konfigurasi/docker/Caddyfile" docker/Caddyfile
fi

[ -f .env ] || gagal ".env tidak tersedia. Salin dari arsip atau buat baru sebelum melanjutkan."

while IFS= read -r baris || [ -n "$baris" ]; do
	case "$baris" in ''|'#'*) continue ;; esac
	kunci="${baris%%=*}"; nilai="${baris#*=}"
	case "$kunci" in ''|*[!A-Za-z0-9_]*) continue ;; esac
	nilai="${nilai%\"}"; nilai="${nilai#\"}"
	nilai="${nilai%\'}"; nilai="${nilai#\'}"
	export "$kunci=$nilai"
done < .env
DB_DATABASE="${DB_DATABASE:-bpom_jember}"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-secret}"

# --- Konfirmasi --------------------------------------------------------------
if [ "${TANPA_TANYA:-0}" != "1" ]; then
	printf 'Basis data "%s" pada host ini akan DITIMPA. Ketik YA untuk lanjut: ' "$DB_DATABASE"
	read -r jawab
	[ "$jawab" = "YA" ] || gagal "dibatalkan oleh pengguna"
fi

# --- Basis data --------------------------------------------------------------
pesan "Menghidupkan mysql & redis..."
$COMPOSE up -d mysql redis

pesan "Menunggu MySQL siap..."
for _ in $(seq 1 60); do
	if $COMPOSE exec -T mysql mysqladmin ping -h localhost -u root -p"$DB_ROOT_PASSWORD" >/dev/null 2>&1; then
		break
	fi
	sleep 3
done
$COMPOSE exec -T mysql mysqladmin ping -h localhost -u root -p"$DB_ROOT_PASSWORD" >/dev/null 2>&1 \
	|| gagal "MySQL tidak kunjung siap"

pesan "Mengimpor dump basis data..."
$COMPOSE exec -T mysql mysql -u root -p"$DB_ROOT_PASSWORD" \
	-e "DROP DATABASE IF EXISTS \`$DB_DATABASE\`; CREATE DATABASE \`$DB_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
gzip -dc "$KERJA/basisdata.sql.gz" \
	| $COMPOSE exec -T mysql mysql -u root -p"$DB_ROOT_PASSWORD" "$DB_DATABASE"

# --- Berkas unggahan ---------------------------------------------------------
if [ -f "$KERJA/storage.tar.gz" ]; then
	pesan "Menyalakan api untuk memulihkan berkas unggahan..."
	$COMPOSE up -d api
	sleep 5
	$COMPOSE exec -T api sh -c 'mkdir -p /var/www/html/storage/app/public && tar xzf - -C /var/www/html/storage/app/public' \
		< "$KERJA/storage.tar.gz"
	pesan "Berkas unggahan dipulihkan."
fi

# --- Nyalakan semua ----------------------------------------------------------
pesan "Menyalakan seluruh stack..."
$COMPOSE up -d --build

pesan "Membersihkan cache aplikasi..."
$COMPOSE exec -T api php artisan config:clear >/dev/null 2>&1 || true
$COMPOSE exec -T api php artisan cache:clear >/dev/null 2>&1 || true
$COMPOSE exec -T api php artisan config:cache >/dev/null 2>&1 || true

pesan "Selesai. Periksa: $COMPOSE ps"
