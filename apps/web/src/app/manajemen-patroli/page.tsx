"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, ShieldX, Sun, Moon, MapPin, CalendarDays, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { formatTanggalIndonesia, cn } from "@/lib/utils";

interface Laporan {
  id: number;
  tanggal: string;
  sesi: string | null;
  kondisi: string;
  catatan: string | null;
  foto_url: string | null;
  waktu: string | null;
  petugas: string | null;
  latitude: number | null;
  longitude: number | null;
}

const KONDISI: Record<string, { label: string; tone: "success" | "warning" | "danger"; icon: typeof ShieldCheck }> = {
  aman: { label: "Aman", tone: "success", icon: ShieldCheck },
  perlu_perhatian: { label: "Perlu Perhatian", tone: "warning", icon: ShieldAlert },
  insiden: { label: "Insiden", tone: "danger", icon: ShieldX },
};

const inputCls =
  "rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200";

export default function ManajemenPatroliPage() {
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/laporan-keamanan-semua", { params: { tanggal } });
      setItems(data.data ?? []);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, [tanggal]);

  useEffect(() => {
    load();
  }, [load]);

  const stat = {
    total: items.length,
    petugas: new Set(items.map((i) => i.petugas)).size,
    insiden: items.filter((i) => i.kondisi === "insiden").length,
    perhatian: items.filter((i) => i.kondisi === "perlu_perhatian").length,
  };

  if (forbidden) {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <ShieldCheck className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Khusus Pimpinan & Kasubag TU</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 shadow-md">
              <ShieldCheck className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-900">Manajemen Patroli Keamanan</h1>
              <p className="text-xs text-navy-500">Pantau laporan patroli petugas keamanan per hari.</p>
            </div>
          </div>
          <label className="flex items-center gap-2">
            <CalendarDays className="size-4 text-navy-400" />
            <input type="date" className={inputCls} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </label>
        </div>

        {/* Stat */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={<Users className="size-4.5" />} label="Total Laporan" value={stat.total} accent="navy" />
          <StatTile icon={<ShieldCheck className="size-4.5" />} label="Petugas Lapor" value={stat.petugas} accent="bpom" />
          <StatTile icon={<ShieldAlert className="size-4.5" />} label="Perlu Perhatian" value={stat.perhatian} accent="amber" />
          <StatTile icon={<ShieldX className="size-4.5" />} label="Insiden" value={stat.insiden} accent="rose" />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-navy-100/50" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-16 text-center">
            <ShieldCheck className="size-10 text-navy-200" />
            <p className="font-semibold text-navy-700">Belum ada laporan patroli pada tanggal ini</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((l, i) => {
              const k = KONDISI[l.kondisi] ?? KONDISI.aman;
              return (
                <motion.div key={l.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <Card className="flex h-full flex-col overflow-hidden !p-0">
                    {l.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.foto_url} alt="Foto patroli" className="h-40 w-full object-cover" />
                    ) : (
                      <div className="flex h-40 items-center justify-center bg-navy-100 text-navy-300">
                        <ShieldCheck className="size-8" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col gap-1.5 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-navy-900">{l.petugas ?? "—"}</p>
                        <span className="flex items-center gap-1 text-xs font-semibold text-navy-500">
                          {l.sesi === "malam" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                          {l.waktu}
                        </span>
                      </div>
                      <Badge tone={k.tone} className="w-fit">
                        <k.icon className="mr-1 size-3" /> {k.label}
                      </Badge>
                      {l.catatan && <p className="text-xs text-navy-500">{l.catatan}</p>}
                      {l.latitude && l.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${l.latitude},${l.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-auto flex items-center gap-1 pt-1 text-xs font-semibold text-bpom-600 hover:underline"
                        >
                          <MapPin className="size-3" /> Lokasi
                        </a>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

const ACCENT: Record<string, string> = {
  bpom: "bg-bpom-50 text-bpom-700",
  amber: "bg-amber-500/10 text-amber-600",
  rose: "bg-rose-500/10 text-rose-600",
  navy: "bg-navy-50 text-navy-600",
};

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: keyof typeof ACCENT }) {
  return (
    <Card className="!p-4">
      <div className={cn("mb-3 inline-flex size-9 items-center justify-center rounded-xl", ACCENT[accent])}>{icon}</div>
      <p className="text-2xl font-extrabold tabular-nums text-navy-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-navy-600">{label}</p>
    </Card>
  );
}
