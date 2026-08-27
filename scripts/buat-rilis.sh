#!/usr/bin/env bash
#
# Membungkus paket rilis LENTERA untuk dikirim ke VPS.
#
#   bash scripts/buat-rilis.sh              # → ../lentera-rilis.tar.gz
#   KELUARAN=/tmp/rilis.tar.gz bash scripts/buat-rilis.sh
#
# Paket sengaja berprefiks "./" tanpa folder pembungkus, sehingga di VPS
# diekstrak DARI DALAM direktori proyek:
#   cd /opt/lentera && tar xzf /root/lentera-rilis.tar.gz
#
# DUA BERKAS SENGAJA TIDAK IKUT, karena keduanya milik VPS dan bukan milik
# repositori — menimpanya pernah/berpotensi mematikan layanan:
#   .env             memuat APP_KEY dan kredensial basis data produksi
#   docker/Caddyfile satu Caddy bisa melayani beberapa aplikasi; berkas di VPS
#                    memuat blok situs lain yang tidak ada di repositori ini
set -euo pipefail

AKAR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KELUARAN="${KELUARAN:-$AKAR/../lentera-rilis.tar.gz}"

cd "$AKAR"
rm -f "$KELUARAN"

tar czf "$KELUARAN" \
	--exclude='./.git' \
	--exclude='./node_modules' --exclude='*/node_modules' \
	--exclude='./apps/api/vendor' \
	--exclude='./apps/web/.next' \
	--exclude='./apps/mobile/.expo' \
	--exclude='./.cache-geojson' \
	--exclude='*.sqlite' \
	--exclude='./.env' --exclude='./apps/api/.env' --exclude='./apps/web/.env' \
	--exclude='./docker/Caddyfile' --exclude='./docker/Caddyfile.vps.bak' \
	--exclude='./apps/api/storage/logs/*.log' \
	--exclude='./apps/api/storage/framework/cache/data/*' \
	--exclude='./apps/api/storage/framework/sessions/*' \
	--exclude='./apps/api/storage/framework/views/*' \
	--exclude='./apps/api/bootstrap/cache/*.php' \
	--exclude='./.claude' \
	.

# Pemeriksaan: paket tidak boleh memuat berkas milik VPS atau direktori berat.
BOCOR="$(tar tzf "$KELUARAN" | grep -E 'node_modules|/vendor/|\.next/|\.git/|/\.env$|docker/Caddyfile' || true)"
if [ -n "$BOCOR" ]; then
	printf '\033[1;31mGAGAL:\033[0m paket memuat berkas yang seharusnya dikecualikan:\n' >&2
	printf '%s\n' "$BOCOR" | head -10 >&2
	rm -f "$KELUARAN"
	exit 1
fi

printf '%s  (%s, %s berkas)\n' "$KELUARAN" \
	"$(du -h "$KELUARAN" | cut -f1)" \
	"$(tar tzf "$KELUARAN" | wc -l | tr -d ' ')"
