"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Clock, Camera, ChevronRight, ShieldOff, CalendarDays, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PresensiTabs } from "@/components/presensi/PresensiTabs";
import {
  DetailPresensi,
  LencanaStatus,
  type PresensiDetail,
} from "@/components/presensi/DetailPresensi";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { formatJam, formatTanggalIndonesia } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-navy-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200";

/**
 * Kehadiran seluruh pegawai pada satu tanggal, lengkap dengan foto selfie.
 *
 * Halaman ini memakai endpoint /presensi yang sudah ada tetapi belum pernah
 * dipakai antarmuka mana pun, sehingga pimpinan sebelumnya hanya bisa melihat
 * angka rekap tanpa bisa memeriksa bukti kehadiran satu per satu.
 */
export default function KehadiranPegawaiPage() {
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<PresensiDetail[]>([]);
  const [muat, setMuat] = useState(true);
  const [ditolak, setDitolak] = useState(false);
  const [cari, setCari] = useState("");
  const [detail, setDetail] = useState<PresensiDetail | null>(null);

  // Penanda pembatalan menjaga agar jawaban tanggal lama tidak menimpa
  // tanggal yang sedang dipilih ketika pengguna berpindah tanggal dengan cepat.
  useEffect(() => {
    let batal = false;

    void (async () => {
      setMuat(true);
      try {
        const { data } = await api.get("/presensi", { params: { tanggal } });
        if (! batal) setItems(data.data ?? []);
      } catch (err: unknown) {
        if (! batal && (err as { response?: { status?: number } })?.response?.status === 403) {
          setDitolak(true);
        }
      } finally {
        if (! batal) setMuat(false);
      }
    })();

    return () => { batal = true; };
  }, [tanggal]);

  const hasil = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    if (!kunci) return items;

    return items.filter((p) => (p.user?.name ?? "").toLowerCase().includes(kunci));
  }, [items, cari]);

  const ringkas = useMemo(() => ({
    hadir: items.length,
    terlambat: items.filter((p) => p.status_masuk === "terlambat").length,
    berfoto: items.filter((p) => p.foto_masuk_url).length,
  }), [items]);

  if (ditolak) {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <ShieldOff className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Halaman ini khusus pimpinan &amp; superadmin</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl">
        <PresensiTabs />

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-bold text-navy-900">
            <Users className="size-4.5 shrink-0" /> Kehadiran Pegawai
          </h2>
          <label className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-navy-400" />
            <input
              type="date"
              className={inputCls}
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </label>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2.5">
          <Ringkasan nilai={ringkas.hadir} label="Tercatat" />
          <Ringkasan nilai={ringkas.terlambat} label="Terlambat" nada="text-amber-600" />
          <Ringkasan nilai={ringkas.berfoto} label="Ada Foto" nada="text-bpom-600" />
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-navy-400" />
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama pegawai…"
            className={`${inputCls} pl-10`}
          />
        </div>

        <Card className="!p-0 overflow-hidden">
          {muat ? (
            <div className="space-y-2 p-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-navy-100/50" />
              ))}
            </div>
          ) : hasil.length === 0 ? (
            <p className="flex flex-col items-center gap-2 py-14 text-center text-sm text-navy-400">
              <Users className="size-8 text-navy-200" />
              Belum ada presensi tercatat pada {formatTanggalIndonesia(tanggal)}.
            </p>
          ) : (
            <ul className="divide-y divide-navy-900/5">
              {hasil.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setDetail(p)}
                    className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-navy-50/50"
                  >
                    {p.foto_masuk_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.foto_masuk_url} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-navy-300">
                        <Camera className="size-4.5" />
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-navy-900">
                        {p.user?.name ?? "Pengguna tidak ditemukan"}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-navy-500">
                        <Clock className="size-3 shrink-0 text-navy-300" />
                        {formatJam(p.jam_masuk)} — {formatJam(p.jam_keluar)}
                        {p.mode_masuk && <span className="uppercase text-navy-400">· {p.mode_masuk}</span>}
                      </p>
                      <div className="mt-1.5">
                        <LencanaStatus status={p.status_masuk} />
                      </div>
                    </div>

                    <ChevronRight className="size-4 shrink-0 text-navy-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {detail && <DetailPresensi data={detail} onClose={() => setDetail(null)} />}
    </AppShell>
  );
}

function Ringkasan({ nilai, label, nada = "text-navy-900" }: { nilai: number; label: string; nada?: string }) {
  return (
    <Card className="!p-3 text-center">
      <p className={`text-2xl font-extrabold tabular-nums ${nada}`}>{nilai}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-navy-500">{label}</p>
    </Card>
  );
}
