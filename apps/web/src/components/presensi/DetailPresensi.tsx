"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X, Clock, LogIn, LogOut, MapPin, Ruler, StickyNote, Camera, ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/Card";
import { formatJam, formatTanggalIndonesia } from "@/lib/utils";

export interface PresensiDetail {
  id: number;
  tanggal: string;
  jam_masuk: string | null;
  jam_keluar: string | null;
  status_masuk: string | null;
  status_keluar: string | null;
  mode_masuk: string | null;
  mode_keluar: string | null;
  titik_masuk: string | null;
  titik_keluar: string | null;
  jarak_masuk_meter: number | null;
  jarak_keluar_meter: number | null;
  foto_masuk_url: string | null;
  foto_keluar_url: string | null;
  catatan: string | null;
  user?: { id: number; name: string; email?: string | null } | null;
}

export const STATUS_PRESENSI: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" }
> = {
  tepat_waktu: { label: "Tepat Waktu", tone: "success" },
  terlambat: { label: "Terlambat", tone: "warning" },
  pulang_awal: { label: "Pulang Awal", tone: "warning" },
  di_luar_geofence: { label: "Di Luar Radius", tone: "danger" },
};

export function LencanaStatus({ status }: { status: string | null }) {
  if (!status) return <span className="text-navy-400">—</span>;
  const s = STATUS_PRESENSI[status];

  return <Badge tone={s?.tone ?? "neutral"}>{s?.label ?? status}</Badge>;
}

function jarak(meter: number | null): string {
  if (meter == null) return "—";

  return meter >= 1000 ? `${(meter / 1000).toFixed(2)} km` : `${Math.round(meter)} m`;
}

/** Satu sisi (masuk / pulang) beserta foto selfie-nya. */
function Sisi({
  judul, ikon, jam, status, mode, titik, meter, foto, onLihatFoto,
}: {
  judul: string;
  ikon: React.ReactNode;
  jam: string | null;
  status: string | null;
  mode: string | null;
  titik: string | null;
  meter: number | null;
  foto: string | null;
  onLihatFoto: (url: string) => void;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-navy-900/5 bg-navy-50/40 p-3.5">
      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-500">
        {ikon} {judul}
      </p>

      <button
        type="button"
        onClick={() => foto && onLihatFoto(foto)}
        disabled={!foto}
        className="relative mb-3 block aspect-square w-full overflow-hidden rounded-xl bg-navy-100 disabled:cursor-default"
      >
        {foto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt={`Foto selfie ${judul.toLowerCase()}`} className="size-full object-cover" />
            <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-lg bg-navy-950/65 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
              <ExternalLink className="size-3" /> Perbesar
            </span>
          </>
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-1.5 text-xs text-navy-400">
            <Camera className="size-6 text-navy-200" /> Tanpa foto
          </span>
        )}
      </button>

      <dl className="space-y-1.5 text-xs">
        <Baris ikon={<Clock className="size-3.5" />} label="Jam" nilai={formatJam(jam)} />
        <Baris ikon={<MapPin className="size-3.5" />} label="Mode" nilai={mode ? mode.toUpperCase() : "—"} />
        <Baris ikon={<Ruler className="size-3.5" />} label="Jarak" nilai={jarak(meter)} />
        {titik && <Baris ikon={<MapPin className="size-3.5" />} label="Titik" nilai={titik} mono />}
      </dl>

      <div className="mt-2.5">
        <LencanaStatus status={status} />
      </div>
    </div>
  );
}

function Baris({
  ikon, label, nilai, mono,
}: { ikon: React.ReactNode; label: string; nilai: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex shrink-0 items-center gap-1.5 text-navy-400">{ikon} {label}</dt>
      <dd className={`min-w-0 break-words text-right font-semibold text-navy-800 ${mono ? "font-mono text-[11px]" : ""}`}>
        {nilai}
      </dd>
    </div>
  );
}

/**
 * Rincian satu catatan presensi, termasuk foto selfie masuk dan pulang.
 *
 * Dipakai bersama oleh riwayat pribadi pegawai dan daftar kehadiran seluruh
 * pegawai milik pimpinan, sehingga keduanya menampilkan rincian yang sama.
 */
export function DetailPresensi({
  data, onClose,
}: { data: PresensiDetail; onClose: () => void }) {
  const [fotoPenuh, setFotoPenuh] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-navy-950/45 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-navy-900/5 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold text-navy-900">
              {data.user?.name ?? "Presensi Saya"}
            </p>
            <p className="mt-0.5 text-xs text-navy-500">{formatTanggalIndonesia(data.tanggal)}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup rincian presensi"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50 hover:text-navy-700"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Sisi
              judul="Masuk"
              ikon={<LogIn className="size-3.5" />}
              jam={data.jam_masuk}
              status={data.status_masuk}
              mode={data.mode_masuk}
              titik={data.titik_masuk}
              meter={data.jarak_masuk_meter}
              foto={data.foto_masuk_url}
              onLihatFoto={setFotoPenuh}
            />
            <Sisi
              judul="Pulang"
              ikon={<LogOut className="size-3.5" />}
              jam={data.jam_keluar}
              status={data.status_keluar}
              mode={data.mode_keluar}
              titik={data.titik_keluar}
              meter={data.jarak_keluar_meter}
              foto={data.foto_keluar_url}
              onLihatFoto={setFotoPenuh}
            />
          </div>

          {data.catatan && (
            <div className="mt-3 rounded-2xl border border-navy-900/5 bg-white p-3.5">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-500">
                <StickyNote className="size-3.5" /> Catatan
              </p>
              <p className="text-sm leading-relaxed text-navy-700">{data.catatan}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Foto ukuran penuh */}
      {fotoPenuh && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-navy-950/90 p-4"
          onClick={() => setFotoPenuh(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fotoPenuh} alt="Foto selfie ukuran penuh" className="max-h-full max-w-full rounded-2xl object-contain" />
          <button
            onClick={() => setFotoPenuh(null)}
            aria-label="Tutup foto"
            className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
          >
            <X className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
