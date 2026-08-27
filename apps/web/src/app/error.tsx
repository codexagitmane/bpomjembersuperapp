"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Batas galat tingkat halaman.
 *
 * Tanpa ini, sebuah galat saat render membuat tab menjadi kosong/mati sehingga
 * peramban menampilkan "This page couldn't load" tanpa keterangan apa pun.
 * Dengan batas galat, pengguna tetap melihat pesan yang jelas dan pengembang
 * memperoleh keterangan penyebabnya.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Tercatat di konsol peramban agar penyebabnya dapat ditelusuri.
    console.error("[LENTERA] Galat halaman:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-navy-900/5 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10">
          <AlertTriangle className="size-6 text-amber-500" />
        </div>
        <h1 className="mt-3 text-lg font-extrabold text-navy-900">Halaman gagal ditampilkan</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-navy-500">
          Terjadi kendala saat memuat halaman ini. Silakan coba muat ulang. Bila masih berlanjut,
          hubungi pengelola sistem dengan menyertakan kode di bawah.
        </p>

        <p className="mt-3 break-all rounded-xl bg-navy-50 px-3 py-2 font-mono text-[11px] text-navy-500">
          {error.digest ? `Kode: ${error.digest}` : error.message || "Tidak ada keterangan galat."}
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-bpom-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-bpom-700"
          >
            <RefreshCw className="size-4" /> Muat Ulang
          </button>
          <a
            href="/beranda"
            className="inline-flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm font-bold text-navy-700 transition-colors hover:bg-navy-50"
          >
            <Home className="size-4" /> Beranda
          </a>
        </div>
      </div>
    </div>
  );
}
