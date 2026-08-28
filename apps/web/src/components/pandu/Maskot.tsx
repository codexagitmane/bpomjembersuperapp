"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Maskot SI PANDU AI.
 *
 * Berkas asli `public/pandu-mascot.png` berukuran 1254×1254 (±1,9 MB) dan
 * latarnya putih pekat, sehingga tampak sebagai kotak putih di atas permukaan
 * gelap. Yang dipakai di sini adalah turunannya yang latarnya sudah transparan
 * dan ukurannya wajar (96/192/288 px), dipilih peramban lewat `srcSet`.
 *
 * Bila berkas belum tersedia, komponen menampilkan lambang cadangan agar
 * tata letak tidak rusak — karakter maskot tidak pernah diganti dengan
 * karakter lain.
 */
export function Maskot({
  size = 96,
  className,
  bergerak = false,
}: {
  size?: number;
  className?: string;
  bergerak?: boolean;
}) {
  const [gagal, setGagal] = useState(false);

  if (gagal) {
    return (
      <div
        aria-hidden
        style={{ width: size, height: size }}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-bpom-500 to-navy-700 text-white shadow-lg",
          bergerak && "animate-pulse",
          className
        )}
      >
        <Sparkles style={{ width: size * 0.45, height: size * 0.45 }} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/pandu-mascot-192.png"
      srcSet="/pandu-mascot-96.png 96w, /pandu-mascot-192.png 192w, /pandu-mascot-288.png 288w"
      sizes={`${size}px`}
      alt="Maskot Si Pandu AI"
      width={size}
      height={size}
      onError={() => setGagal(true)}
      className={cn("shrink-0 object-contain drop-shadow-md", bergerak && "animate-bounce-slow", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Keadaan kosong dengan maskot sebagai pemandu. */
export function EmptyState({
  judul,
  pesan,
  aksi,
}: {
  judul: string;
  pesan?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <Maskot size={88} className="opacity-90" />
      <p className="text-sm font-semibold text-navy-800">{judul}</p>
      {pesan && <p className="max-w-sm text-xs text-navy-500">{pesan}</p>}
      {aksi}
    </div>
  );
}

/** Keadaan memuat dengan kalimat khas Si Pandu. */
export function PanduLoading({ pesan }: { pesan: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-bpom-200/60 bg-bpom-50/60 px-4 py-3">
      <Maskot size={40} bergerak />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-navy-800">{pesan}</p>
        <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-bpom-200">
          <div className="h-full w-1/2 animate-pandu-slide rounded-full bg-bpom-600" />
        </div>
      </div>
    </div>
  );
}
