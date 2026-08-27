#!/usr/bin/env bash
#
# Backup lengkap LENTERA BPOM Jember (dijalankan DI VPS).
#
# Yang dicadangkan:
#   1. Basis data MySQL   → basisdata.sql.gz
#   2. Berkas unggahan    → storage.tar.gz   (volume api_storage)
#   3. Berkas konfigurasi → .env, docker-compose.prod.yml, docker/Caddyfile
#   4. Kode sumber        → kode.bundle      (seluruh riwayat git, bila ada)
#   5. Keterangan isi     → MANIFEST.txt
#
# Hasil akhir: satu berkas lentera-backup-<tanggal>.tar.gz yang cukup untuk
# menghidupkan kembali seluruh sistem di VPS mana pun.
#
# Pemakaian:
#   bash scripts/backup.sh                  # ke /opt/lentera-backup
#   TUJUAN=/mnt/backup bash scripts/backup.sh
#   SIMPAN=30 bash scripts/backup.sh        # simpan 30 arsip terakhir
set -euo pipefail

AKAR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TUJUAN="${TUJUAN:-/opt/lentera-backup}"
SIMPAN="${SIMPAN:-14}"
COMPOSE="${COMPOSE:-docker compose -f $AKAR/docker-compose.prod.yml}"
CAP="$(date +%Y%m%d-%H%M%S)"
KERJA="$TUJUAN/.kerja-$CAP"
ARSIP="$TUJUAN/lentera-backup-$CAP.tar.gz"

pesan() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
gagal() { printf '\033[1;31mGAGAL:\033[0m %s\n' "$*" >&2; exit 1; }

cd "$AKAR"
[ -f docker-compose.prod.yml ] || gagal "docker-compose.prod.yml tidak ditemukan di $AKAR"

# Kredensial database dibaca dari .env stack (bukan ditulis di skrip ini).
# Berkas dibaca baris demi baris — bukan `source` — agar tanda kutip, spasi,
# atau baris rusak di .env tidak sampai mengeksekusi apa pun.
if [ -f .env ]; then
	while IFS= read -r baris || [ -n "$baris" ]; do
		case "$baris" in ''|'#'*) continue ;; esac
		kunci="${baris%%=*}"
		nilai="${baris#*=}"
		case "$kunci" in ''|*[!A-Za-z0-9_]*) continue ;; esac
		nilai="${nilai%\"}"; nilai="${nilai#\"}"
		nilai="${nilai%\'}"; nilai="${nilai#\'}"
		export "$kunci=$nilai"
	done < .env
fi
DB_DATABASE="${DB_DATABASE:-bpom_jember}"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-secret}"

mkdir -p "$KERJA"
trap 'rm -rf "$KERJA"' EXIT

# --- 1. Basis data -----------------------------------------------------------
pesan "Mencadangkan basis data MySQL ($DB_DATABASE)..."
$COMPOSE exec -T mysql \
	mysqldump --single-transaction --quick --routines --triggers --events \
	--default-character-set=utf8mb4 \
	-u root -p"$DB_ROOT_PASSWORD" "$DB_DATABASE" \
	| gzip -9 > "$KERJA/basisdata.sql.gz"

# mysqldump yang gagal tetap menghasilkan berkas gzip kecil; periksa isinya.
if [ "$(gzip -dc "$KERJA/basisdata.sql.gz" | head -c 200 | wc -c)" -lt 100 ]; then
	gagal "hasil mysqldump kosong — periksa DB_ROOT_PASSWORD di .env"
fi

# --- 2. Berkas unggahan ------------------------------------------------------
pesan "Mencadangkan berkas unggahan (storage)..."
$COMPOSE exec -T api tar czf - -C /var/www/html/storage/app/public . \
	> "$KERJA/storage.tar.gz"

# --- 3. Konfigurasi ----------------------------------------------------------
pesan "Menyalin berkas konfigurasi..."
mkdir -p "$KERJA/konfigurasi/docker"
[ -f .env ] && cp .env "$KERJA/konfigurasi/.env"
cp docker-compose.prod.yml "$KERJA/konfigurasi/"
[ -f docker/Caddyfile ] && cp docker/Caddyfile "$KERJA/konfigurasi/docker/"

# --- 4. Kode sumber ----------------------------------------------------------
if [ -d .git ]; then
	pesan "Membundel kode sumber beserta riwayat git..."
	git bundle create "$KERJA/kode.bundle" --all >/dev/null 2>&1 \
		|| pesan "  (lewati: repositori git belum memiliki commit)"
else
	pesan "Direktori .git tidak ada — kode sumber tidak dibundel."
	pesan "  Jalankan scripts/siapkan-repo.sh agar kode ikut tercadangkan."
fi

# --- 5. Manifest -------------------------------------------------------------
{
	echo "BACKUP LENTERA BPOM JEMBER"
	echo "Dibuat        : $(date '+%Y-%m-%d %H:%M:%S %Z')"
	echo "Host          : $(hostname)"
	echo "Direktori     : $AKAR"
	echo "Basis data    : $DB_DATABASE"
	echo "Commit git    : $(git -C "$AKAR" rev-parse --short HEAD 2>/dev/null || echo '-')"
	echo "Cabang git    : $(git -C "$AKAR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '-')"
	echo
	echo "ISI ARSIP"
	echo "  basisdata.sql.gz     dump MySQL lengkap (--single-transaction)"
	echo "  storage.tar.gz       isi volume api_storage (unggahan pengguna)"
	echo "  konfigurasi/         .env, docker-compose.prod.yml, docker/Caddyfile"
	echo "  kode.bundle          seluruh riwayat git (git clone kode.bundle)"
	echo
	echo "CARA MEMULIHKAN"
	echo "  bash scripts/restore.sh $(basename "$ARSIP")"
	echo "  (panduan lengkap: PEMULIHAN.md)"
	echo
	echo "CATATAN"
	echo "  Redis tidak dicadangkan: isinya hanya cache, sesi, dan antrian"
	echo "  sementara yang dibangun ulang otomatis setelah pemulihan."
} > "$KERJA/MANIFEST.txt"

# --- Bungkus & bersihkan -----------------------------------------------------
pesan "Membungkus arsip..."
tar czf "$ARSIP" -C "$KERJA" .
chmod 600 "$ARSIP"   # berisi .env → jangan bisa dibaca pengguna lain

pesan "Membersihkan arsip lama (menyimpan $SIMPAN terbaru)..."
ls -1t "$TUJUAN"/lentera-backup-*.tar.gz 2>/dev/null \
	| tail -n +"$((SIMPAN + 1))" | xargs -r rm -f

UKURAN="$(du -h "$ARSIP" | cut -f1)"
pesan "Selesai: $ARSIP ($UKURAN)"
