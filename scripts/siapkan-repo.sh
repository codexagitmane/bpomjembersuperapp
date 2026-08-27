#!/usr/bin/env bash
#
# Menyiapkan direktori ini sebagai repositori git dan mendorongnya ke GitHub
# milik Anda sendiri (mis. github.com/codexagitmane/bpomjembersuperapp).
#
# Dijalankan DI VPS atau di komputer Anda, dari dalam direktori proyek:
#   bash scripts/siapkan-repo.sh
#
# Pilihan (opsional):
#   PEMILIK=codexagitmane  REPO=bpomjembersuperapp  CABANG=main  bash scripts/siapkan-repo.sh
#
# Skrip TIDAK menyimpan token Anda ke mana pun. Saat `git push` meminta
# kredensial, isi username GitHub Anda dan tempelkan Personal Access Token
# sebagai kata sandi (GitHub tidak lagi menerima kata sandi akun biasa).
set -euo pipefail

AKAR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PEMILIK="${PEMILIK:-codexagitmane}"
REPO="${REPO:-bpomjembersuperapp}"
CABANG="${CABANG:-main}"
REMOTE="https://github.com/$PEMILIK/$REPO.git"

pesan() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
gagal() { printf '\033[1;31mGAGAL:\033[0m %s\n' "$*" >&2; exit 1; }

cd "$AKAR"
command -v git >/dev/null || gagal "git belum terpasang. Pasang dengan: apt install -y git"

# --- Identitas commit --------------------------------------------------------
git config user.email >/dev/null 2>&1 || git config user.email "bahrowiq@gmail.com"
git config user.name  >/dev/null 2>&1 || git config user.name  "Qithfirul Bahrowi"

# --- Repositori --------------------------------------------------------------
if [ ! -d .git ]; then
	pesan "Membuat repositori git baru..."
	git init -q
	git symbolic-ref HEAD "refs/heads/$CABANG"
else
	pesan "Repositori git sudah ada — dipakai apa adanya."
fi

[ -f .gitignore ] || gagal ".gitignore tidak ditemukan. Jangan lanjut: vendor/, node_modules/, dan .env bisa ikut terdorong."

# --- Pemeriksaan keamanan sebelum commit -------------------------------------
pesan "Memeriksa berkas rahasia yang tidak boleh ikut terdorong..."
git add -A
BOCOR="$(git diff --cached --name-only | grep -E '(^|/)\.env$|(^|/)\.env\.|(^|/)vendor/|(^|/)node_modules/|\.pem$|\.key$|\.jks$|\.p12$' || true)"
if [ -n "$BOCOR" ]; then
	git reset -q
	printf '%s\n' "$BOCOR" | head -20
	gagal "berkas di atas tidak boleh masuk repositori. Perbaiki .gitignore lalu ulangi."
fi
pesan "  Aman — tidak ada .env, vendor/, node_modules/, atau kunci yang ikut."

# --- Commit ------------------------------------------------------------------
if git diff --cached --quiet; then
	pesan "Tidak ada perubahan baru untuk di-commit."
else
	JUMLAH="$(git diff --cached --name-only | wc -l | tr -d ' ')"
	git commit -q -m "Perbarui LENTERA BPOM Jember ($JUMLAH berkas) — $(date '+%Y-%m-%d %H:%M')"
	pesan "Commit dibuat ($JUMLAH berkas)."
fi

# --- Remote ------------------------------------------------------------------
if git remote get-url origin >/dev/null 2>&1; then
	LAMA="$(git remote get-url origin)"
	if [ "$LAMA" != "$REMOTE" ]; then
		pesan "Mengubah remote origin: $LAMA -> $REMOTE"
		git remote set-url origin "$REMOTE"
	fi
else
	git remote add origin "$REMOTE"
	pesan "Remote origin ditambahkan: $REMOTE"
fi

SEKARANG="$(git rev-parse --abbrev-ref HEAD)"
if [ "$SEKARANG" != "$CABANG" ]; then
	git branch -M "$CABANG"
fi

cat <<PETUNJUK

──────────────────────────────────────────────────────────────────────
Repositori siap. Langkah terakhir dikerjakan oleh Anda sendiri, karena
hanya Anda yang memegang kredensial GitHub:

1) Buat repositori KOSONG di GitHub (tanpa README/.gitignore/LICENSE):
   https://github.com/new  →  Owner: $PEMILIK  →  Name: $REPO
   Visibility: Private (disarankan — aplikasi ini memuat logika internal)

2) Buat Personal Access Token (sekali saja):
   https://github.com/settings/tokens  →  "Generate new token (classic)"
   Centang scope: repo    →  salin tokennya

3) Dorong kode:
   cd $AKAR
   git push -u origin $CABANG
   Username : $PEMILIK
   Password : <tempelkan Personal Access Token>

   Agar token tidak diminta berulang di VPS ini:
   git config credential.helper 'store'      # tersimpan di ~/.git-credentials

Dorongan berikutnya cukup:
   bash scripts/siapkan-repo.sh && git push
──────────────────────────────────────────────────────────────────────
PETUNJUK
