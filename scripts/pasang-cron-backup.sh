#!/usr/bin/env bash
#
# Memasang backup otomatis harian LENTERA (dijalankan DI VPS, sebagai root).
#
#   bash scripts/pasang-cron-backup.sh            # tiap hari 01:30
#   JAM="0 */6 * * *" bash scripts/pasang-cron-backup.sh
#
# Skrip memakai penanda unik agar aman dijalankan berkali-kali: entri lama
# dengan penanda yang sama diganti, bukan ditumpuk.
set -euo pipefail

AKAR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JAM="${JAM:-30 1 * * *}"
LOG="${LOG:-/var/log/lentera-backup.log}"
PENANDA="# lentera-backup"
BARIS="$JAM cd $AKAR && /usr/bin/env bash scripts/backup.sh >> $LOG 2>&1 $PENANDA"

command -v crontab >/dev/null || { echo "crontab tidak tersedia. Pasang dengan: apt install -y cron" >&2; exit 1; }

LAMA="$(crontab -l 2>/dev/null || true)"
BARU="$(printf '%s\n' "$LAMA" | grep -v -F "$PENANDA" || true)"
printf '%s\n%s\n' "$BARU" "$BARIS" | sed '/^$/d' | crontab -

echo "Terpasang:"
crontab -l | grep -F "$PENANDA"
echo
echo "Log backup : $LOG"
echo "Uji manual : cd $AKAR && bash scripts/backup.sh"
echo "Hapus      : crontab -l | grep -v '$PENANDA' | crontab -"
