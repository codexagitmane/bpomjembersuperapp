"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Fingerprint,
  CheckCircle2,
  Clock,
  Home,
  CalendarClock,
  ArrowRight,
  History,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PresensiTabs } from "@/components/presensi/PresensiTabs";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { formatJam, formatTanggalIndonesia, cn } from "@/lib/utils";

interface RiwayatItem {
  id: number;
  tanggal: string;
  jam_masuk: string | null;
  jam_keluar: string | null;
  status_masuk: string | null;
  mode_masuk: string | null;
}

interface HariIni {
  id: number;
  jam_masuk: string | null;
  jam_keluar: string | null;
  status_masuk: string | null;
  status_keluar: string | null;
  mode_masuk: string | null;
  mode_keluar: string | null;
}

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  tepat_waktu: { label: "Tepat Waktu", tone: "success" },
  terlambat: { label: "Terlambat", tone: "warning" },
  pulang_awal: { label: "Pulang Awal", tone: "warning" },
  di_luar_geofence: { label: "Di Luar Radius", tone: "danger" },
};

export default function PresensiDashboardPage() {
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([]);
  const [hariIni, setHariIni] = useState<HariIni | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/presensi/riwayat"), api.get("/presensi/hari-ini")])
      .then(([r, h]) => {
        setRiwayat(r.data.data ?? []);
        setHariIni(h.data.presensi ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const bulanIni = riwayat.filter((r) => {
    const d = new Date(r.tanggal);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const stat = {
    hadir: bulanIni.filter((r) => r.jam_masuk).length,
    tepat: bulanIni.filter((r) => r.status_masuk === "tepat_waktu").length,
    terlambat: bulanIni.filter((r) => r.status_masuk === "terlambat").length,
    wfh: bulanIni.filter((r) => r.mode_masuk === "wfh").length,
    dinas: bulanIni.filter((r) => r.mode_masuk === "dinas").length,
  };

  const sudahMasuk = !!hariIni?.jam_masuk;
  const sudahPulang = !!hariIni?.jam_keluar;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <PresensiTabs />

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-navy-100/60" />
            ))}
          </div>
        ) : (
          <>
            {/* Status hari ini + CTA */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-navy-900 to-navy-700 !text-white">
              <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-bpom-500/20 blur-2xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-navy-200">{formatTanggalIndonesia(now.toISOString())}</p>
                  <p className="mt-1 text-lg font-bold">
                    {!sudahMasuk
                      ? "Belum absen masuk hari ini"
                      : !sudahPulang
                        ? "Sudah masuk — jangan lupa absen pulang"
                        : "Presensi hari ini sudah lengkap 🎉"}
                  </p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span className="text-navy-200">
                      Masuk: <strong className="text-white">{formatJam(hariIni?.jam_masuk)}</strong>
                    </span>
                    <span className="text-navy-200">
                      Pulang: <strong className="text-white">{formatJam(hariIni?.jam_keluar)}</strong>
                    </span>
                  </div>
                </div>
                {!sudahPulang && (
                  <Link href="/presensi/absen">
                    <Button variant="secondary" size="lg">
                      <Fingerprint className="size-5" />
                      {sudahMasuk ? "Absen Pulang" : "Absen Masuk"}
                    </Button>
                  </Link>
                )}
              </div>
            </Card>

            {/* Ringkasan bulan ini */}
            <h2 className="mb-3 mt-7 text-sm font-bold uppercase tracking-wide text-navy-400">
              Ringkasan Bulan Ini
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile icon={<CheckCircle2 className="size-4.5" />} label="Hari Hadir" value={stat.hadir} accent="bpom" delay={0} />
              <StatTile icon={<CalendarClock className="size-4.5" />} label="Tepat Waktu" value={stat.tepat} accent="navy" delay={1} />
              <StatTile icon={<Clock className="size-4.5" />} label="Terlambat" value={stat.terlambat} accent="amber" delay={2} />
              <StatTile icon={<Home className="size-4.5" />} label="WFH / Dinas" value={stat.wfh + stat.dinas} sub={`${stat.wfh} WFH • ${stat.dinas} dinas`} accent="navy" delay={3} />
            </div>

            {/* Riwayat singkat */}
            <div className="mb-3 mt-7 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy-400">Presensi Terakhir</h2>
              <Link href="/presensi/riwayat" className="flex items-center gap-1 text-xs font-semibold text-bpom-600 hover:underline">
                Lihat semua <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <Card className="!p-0">
              {riwayat.length === 0 ? (
                <p className="flex flex-col items-center gap-2 py-12 text-center text-sm text-navy-400">
                  <History className="size-8 text-navy-200" /> Belum ada riwayat presensi.
                </p>
              ) : (
                <div className="divide-y divide-navy-900/5">
                  {riwayat.slice(0, 6).map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-semibold text-navy-900">{formatTanggalIndonesia(r.tanggal)}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-navy-400">
                          <Clock className="size-3.5" />
                          {formatJam(r.jam_masuk)} – {formatJam(r.jam_keluar)}
                          {r.mode_masuk && <span className="uppercase">• {r.mode_masuk}</span>}
                        </p>
                      </div>
                      {r.status_masuk && (
                        <Badge tone={STATUS_LABEL[r.status_masuk]?.tone ?? "neutral"}>
                          {STATUS_LABEL[r.status_masuk]?.label ?? r.status_masuk}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

const ACCENT: Record<string, string> = {
  bpom: "bg-bpom-50 text-bpom-700",
  amber: "bg-amber-500/10 text-amber-600",
  navy: "bg-navy-50 text-navy-600",
};

function StatTile({
  icon,
  label,
  value,
  sub,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  accent: keyof typeof ACCENT;
  delay: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay * 0.06 }} className="min-w-0">
      <Card className="!p-4">
        <div className={cn("mb-3 inline-flex size-9 items-center justify-center rounded-xl", ACCENT[accent])}>{icon}</div>
        <p className="text-2xl font-extrabold tabular-nums text-navy-900">{value}</p>
        <p className="mt-0.5 text-xs font-semibold text-navy-600">{label}</p>
        {sub && <p className="mt-0.5 text-[11px] text-navy-400">{sub}</p>}
      </Card>
    </motion.div>
  );
}
