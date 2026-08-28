"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

/**
 * Ajakan memasang LENTERA sebagai aplikasi (PWA).
 *
 * Chrome di Android hanya menampilkan bilah "Pasang" bawaannya sekali dan
 * mudah terlewat, sedangkan Safari di iOS tidak pernah menampilkannya sama
 * sekali. Komponen ini menyediakan tombol pasang di dalam aplikasi sendiri:
 *
 *   - Android/Chrome/Edge : memakai peristiwa `beforeinstallprompt`, satu ketuk.
 *   - iOS/Safari          : menampilkan petunjuk manual (Bagikan → Ke Layar Utama).
 *
 * Tidak pernah muncul bila aplikasi sudah terpasang, dan penolakan pengguna
 * diingat selama 14 hari.
 */

const KUNCI_TUNDA = "lentera-pasang-ditunda";
const JEDA_TUNDA = 14 * 24 * 60 * 60 * 1000; // 14 hari

interface PeristiwaPasang extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function sedangDitunda(): boolean {
  try {
    const nilai = Number(localStorage.getItem(KUNCI_TUNDA) ?? 0);

    return Number.isFinite(nilai) && Date.now() - nilai < JEDA_TUNDA;
  } catch {
    return false;
  }
}

function catatTunda(): void {
  try {
    localStorage.setItem(KUNCI_TUNDA, String(Date.now()));
  } catch {
    // Mode privat memblokir penyimpanan — abaikan, bilah cukup hilang sesi ini.
  }
}

function sudahTerpasang(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function iOS(): boolean {
  const ua = navigator.userAgent;
  const apple = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // Semua peramban di iOS memakai WebKit; hanya Safari yang punya menu Bagikan
  // dengan "Tambahkan ke Layar Utama".
  const safari = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

  return apple && safari;
}

export function PasangAplikasi() {
  const [mode, setMode] = useState<"pasang" | "ios" | null>(null);
  const [peristiwa, setPeristiwa] = useState<PeristiwaPasang | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sudahTerpasang() || sedangDitunda()) return;

    const saatSiap = (e: Event) => {
      // Cegah bilah bawaan Chrome agar ajakan hanya muncul sekali, dari sini.
      e.preventDefault();
      setPeristiwa(e as PeristiwaPasang);
      setMode("pasang");
    };

    const saatTerpasang = () => {
      setMode(null);
      catatTunda();
    };

    window.addEventListener("beforeinstallprompt", saatSiap);
    window.addEventListener("appinstalled", saatTerpasang);

    // iOS tidak pernah memicu `beforeinstallprompt`; petunjuk manual ditunda
    // sejenak agar tidak menutupi halaman saat baru dibuka.
    const jeda = setTimeout(() => {
      if (iOS()) setMode("ios");
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", saatSiap);
      window.removeEventListener("appinstalled", saatTerpasang);
      clearTimeout(jeda);
    };
  }, []);

  const pasang = useCallback(async () => {
    if (!peristiwa) return;
    await peristiwa.prompt();
    const { outcome } = await peristiwa.userChoice;
    if (outcome === "dismissed") catatTunda();
    setPeristiwa(null);
    setMode(null);
  }, [peristiwa]);

  const tutup = useCallback(() => {
    catatTunda();
    setMode(null);
  }, []);

  if (!mode) return null;

  return (
    <div className="fixed inset-x-0 bottom-[4.75rem] z-40 px-4 md:bottom-5 md:left-auto md:right-5 md:px-0">
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-navy-900/10 bg-white p-4 shadow-xl md:max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element -- turunan logo sudah berukuran pas */}
        <img
          src="/logo-mark-128.png"
          alt=""
          width={128}
          height={128}
          className="size-11 shrink-0 object-contain"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-navy-900">Pasang LENTERA di ponsel</p>

          {mode === "pasang" ? (
            <>
              <p className="mt-0.5 text-xs leading-relaxed text-navy-500">
                Buka lebih cepat dari layar utama, tanpa bilah alamat peramban.
              </p>
              <button
                type="button"
                onClick={pasang}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-navy-800"
              >
                <Download className="size-3.5" /> Pasang Sekarang
              </button>
            </>
          ) : (
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-relaxed text-navy-500">
              Ketuk <Share className="inline size-3.5 shrink-0 text-navy-700" aria-label="Bagikan" />
              <span className="font-semibold text-navy-700">Bagikan</span> di Safari, lalu pilih
              <SquarePlus className="inline size-3.5 shrink-0 text-navy-700" aria-hidden="true" />
              <span className="font-semibold text-navy-700">Tambahkan ke Layar Utama</span>.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={tutup}
          aria-label="Tutup ajakan pasang aplikasi"
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-700"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
