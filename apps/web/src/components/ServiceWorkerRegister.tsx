"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan service worker LENTERA.
 *
 * Tanpa service worker yang menangani fetch, Chrome di Android menolak
 * memasang aplikasi sebagai PWA — yang terpasang hanya pintasan peramban
 * dengan favicon dan lencana Chrome, bukan ikon LENTERA.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const daftar = () => {
      navigator.serviceWorker.register("/sw.js").catch((e) => {
        console.warn("[LENTERA] Service worker gagal didaftarkan:", e);
      });
    };

    // Didaftarkan setelah halaman selesai dimuat agar tidak menahan render awal.
    if (document.readyState === "complete") {
      daftar();
    } else {
      window.addEventListener("load", daftar, { once: true });
      return () => window.removeEventListener("load", daftar);
    }
  }, []);

  return null;
}
