"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  Clock,
  UserX,
  Home,
  Briefcase,
  DoorOpen,
  Wrench,
  MapPin,
  ShieldOff,
  ClipboardCheck,
  CalendarRange,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { MiniBarChart } from "@/components/MiniBarChart";
import { api } from "@/lib/api";
import { formatTanggalIndonesia, cn } from "@/lib/utils";

interface DashboardTU {
  tanggal: string;
  presensi_hari_ini: {
    total_pegawai: number;
    hadir: number;
    tepat_waktu: number;
    terlambat: number;
    belum_absen: number;
    wfh: number;
    dinas: number;
  };
  antrean: {
    izin_menunggu: number;
    bmn_menunggu: number;
    bmn_diproses: number;
    wfh_menunggu: number;
  };
  tren_kehadiran: { label: string; tanggal: string; hadir: number; terlambat: number }[];
}

export default function DashboardTUPage() {
  const [data, setData] = useState<DashboardTU | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    api
      .get("/dashboard/kasubag")
      .then(({ data }) => setData(data))
      .catch((err) => {
        if (err?.response?.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (forbidden) {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <ShieldOff className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Dashboard ini khusus Kepala Subag TU & Superadmin</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-navy-900">
          <Building2 className="size-6 text-bpom-600" /> Dashboard Tata Usaha
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Operasional kepegawaian & sarana — {data ? formatTanggalIndonesia(data.tanggal) : "..."}
        </p>

        {loading && (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-navy-100/60" />
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile icon={<Users className="size-4.5" />} label="Hadir" value={data.presensi_hari_ini.hadir} sub={`dari ${data.presensi_hari_ini.total_pegawai}`} accent="bpom" />
              <StatTile icon={<Clock className="size-4.5" />} label="Terlambat" value={data.presensi_hari_ini.terlambat} accent="amber" />
              <StatTile icon={<UserX className="size-4.5" />} label="Belum Absen" value={data.presensi_hari_ini.belum_absen} accent="rose" />
              <StatTile icon={<Home className="size-4.5" />} label="WFH / Dinas" value={data.presensi_hari_ini.wfh + data.presensi_hari_ini.dinas} sub={`${data.presensi_hari_ini.wfh} WFH • ${data.presensi_hari_ini.dinas} dinas`} accent="navy" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
              {/* Tren 7 hari */}
              <Card className="lg:col-span-3">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy-400">
                  Tren Kehadiran 7 Hari
                </h2>
                <MiniBarChart data={data.tren_kehadiran} />
              </Card>

              {/* Antrean tindakan */}
              <div className="flex flex-col gap-3 lg:col-span-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-navy-400">Perlu Tindakan</h2>
                <QueueLink href="/persetujuan" icon={<DoorOpen className="size-4.5" />} label="Izin menunggu" count={data.antrean.izin_menunggu} />
                <QueueLink href="/persetujuan" icon={<Wrench className="size-4.5" />} label="BMN menunggu" count={data.antrean.bmn_menunggu} />
                <QueueLink href="/admin/verifikasi" icon={<MapPin className="size-4.5" />} label="WFH menunggu verifikasi" count={data.antrean.wfh_menunggu} />
              </div>
            </div>

            {/* Pintasan */}
            <h2 className="mb-3 mt-7 text-sm font-bold uppercase tracking-wide text-navy-400">Pintasan Tata Usaha</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ShortcutCard href="/persetujuan" icon={<ClipboardCheck className="size-5" />} title="Persetujuan" desc="Approve izin & pengajuan BMN" />
              <ShortcutCard href="/rekap-presensi" icon={<CalendarRange className="size-5" />} title="Rekap Presensi" desc="Rekap bulanan + ekspor Excel/PDF" />
              <ShortcutCard href="/roster-keamanan" icon={<ShieldCheck className="size-5" />} title="Roster Keamanan" desc="Atur jadwal shift petugas keamanan" />
            </div>
          </>
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

function StatTile({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  accent: keyof typeof ACCENT;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="!p-4">
        <div className={cn("mb-3 inline-flex size-9 items-center justify-center rounded-xl", ACCENT[accent])}>{icon}</div>
        <p className="text-2xl font-extrabold tabular-nums text-navy-900">{value}</p>
        <p className="mt-0.5 text-xs font-semibold text-navy-600">{label}</p>
        {sub && <p className="mt-0.5 text-[11px] text-navy-400">{sub}</p>}
      </Card>
    </motion.div>
  );
}

function QueueLink({ href, icon, label, count }: { href: string; icon: React.ReactNode; label: string; count: number }) {
  return (
    <Link href={href}>
      <Card className="flex items-center gap-3 !p-4">
        <div className={cn("flex size-9 items-center justify-center rounded-xl", count > 0 ? "bg-amber-500/10 text-amber-600" : "bg-navy-50 text-navy-400")}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-navy-800">{label}</p>
        </div>
        <span className={cn("text-lg font-extrabold tabular-nums", count > 0 ? "text-amber-600" : "text-navy-300")}>{count}</span>
        <ChevronRight className="size-4 text-navy-300" />
      </Card>
    </Link>
  );
}

function ShortcutCard({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href}>
      <Card className="group flex h-full flex-col gap-2">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-bpom-50 to-bpom-100 text-bpom-700 transition-colors group-hover:from-bpom-500 group-hover:to-bpom-600 group-hover:text-white">
          {icon}
        </div>
        <p className="font-bold text-navy-900">{title}</p>
        <p className="text-xs text-navy-500">{desc}</p>
      </Card>
    </Link>
  );
}
