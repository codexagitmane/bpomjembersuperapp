"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";

/** Batas diam sebelum sesi diakhiri otomatis. */
const BATAS_DIAM_MS = 3 * 60 * 1000;

/** Seberapa sering sisa waktu diperiksa. */
const JEDA_PERIKSA_MS = 15 * 1000;

/** Disimpan di localStorage agar seluruh tab berbagi waktu aktivitas yang sama. */
const KUNCI_AKTIVITAS = "lentera_aktivitas_terakhir";

const PERISTIWA_AKTIVITAS = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
] as const;

/**
 * Mengakhiri sesi bila aplikasi dibiarkan menganggur.
 *
 * Perangkat kerja seperti ini sering ditinggal terbuka di meja atau di ponsel
 * yang berpindah tangan, jadi sesi yang menganggur ditutup sendiri.
 *
 * Dua hal yang membuatnya dapat diandalkan:
 *
 *   - Waktu aktivitas disimpan di localStorage, bukan di memori. Pencacah
 *     JavaScript berhenti saat layar terkunci atau tab disembunyikan, sehingga
 *     mengandalkan pencacah saja membuat sesi tetap hidup padahal perangkat
 *     ditinggal berjam-jam. Selisih waktu dihitung ulang setiap kali halaman
 *     kembali terlihat.
 *   - Keluar memakai `location.replace`, bukan navigasi router. Riwayat
 *     halaman ikut terganti sehingga membuka aplikasi lagi selalu mendarat di
 *     halaman awal — bukan halaman terakhir yang sempat dibuka pengguna.
 */
export function AutoLogout() {
  const { user, logout } = useAuth();
  const sedangKeluar = useRef(false);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    const catat = () => {
      try {
        localStorage.setItem(KUNCI_AKTIVITAS, String(Date.now()));
      } catch {
        // Penyimpanan diblokir (mis. mode privat) — pemeriksaan tetap berjalan
        // memakai nilai terakhir yang berhasil disimpan.
      }
    };

    const terakhir = (): number => {
      try {
        const nilai = Number(localStorage.getItem(KUNCI_AKTIVITAS));

        return Number.isFinite(nilai) && nilai > 0 ? nilai : Date.now();
      } catch {
        return Date.now();
      }
    };

    const keluar = async () => {
      if (sedangKeluar.current) return;
      sedangKeluar.current = true;

      try {
        await logout();
      } finally {
        try {
          localStorage.removeItem(KUNCI_AKTIVITAS);
        } catch {
          // abaikan
        }
        window.location.replace("/login?alasan=diam");
      }
    };

    const periksa = () => {
      if (Date.now() - terakhir() >= BATAS_DIAM_MS) void keluar();
    };

    // Mulai menghitung sejak komponen aktif.
    catat();

    for (const nama of PERISTIWA_AKTIVITAS) {
      window.addEventListener(nama, catat, { passive: true });
    }

    const saatTerlihat = () => {
      if (document.visibilityState === "visible") periksa();
    };

    document.addEventListener("visibilitychange", saatTerlihat);
    window.addEventListener("focus", saatTerlihat);

    const pencacah = window.setInterval(periksa, JEDA_PERIKSA_MS);

    return () => {
      for (const nama of PERISTIWA_AKTIVITAS) {
        window.removeEventListener(nama, catat);
      }
      document.removeEventListener("visibilitychange", saatTerlihat);
      window.removeEventListener("focus", saatTerlihat);
      window.clearInterval(pencacah);
    };
  }, [user, logout]);

  return null;
}
