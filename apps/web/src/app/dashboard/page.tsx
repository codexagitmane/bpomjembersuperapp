"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Clock,
  UserX,
  Home,
  CalendarCheck,
  DoorOpen,
  Wrench,
  Boxes,
  MapPinned,
  ShieldOff,
  UserCheck,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { LineChart } from "@/components/charts/LineChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { api } from "@/lib/api";
import { formatTanggalIndonesia, cn } from "@/lib/utils";

type Periode = "bulan" | "triwulan" | "semester" | "tahun";

const PERIODE_LABEL: Record<Periode, string> = {
  bulan: "30 Hari",
  triwulan: "Triwulan",
  semester: "Semester",
  tahun: "Tahun",
};

interface DashboardData {
  tanggal: string;
  tren_kehadiran: { label: string; hadir: number; terlambat: number }[];
  presensi: {
    total_pegawai: number;
    hadir: number;
    tepat_waktu: number;
    terlambat: number;
    belum_absen: number;
    wfh: number;
    dinas: number;
  };
  booking: Record<string, number>;
  izin: Record<string, number>;
  bmn: Record<string, number>;
  barang_bukti: Record<string, number>;
  apotek: {
    total: number;
    aktif: number;
    kadaluarsa: number;
    dicabut: number;
    pernah_diperiksa: number;
    total_pelanggaran: number;
  };
  akun_masyarakat_pending: number;
  aktivitas_terbaru: {
    id: number;
    aksi: string;
    modul: string | null;
    deskripsi: string | null;
    created_at: string;
    user: { id: number; name: string } | null;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [periode, setPeriode] = useState<Periode>("bulan");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/dashboard/kabalai", { params: { periode } });
      setData(data);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, [periode]);

  useEffect(() => {
    load();
  }, [load]);

  if (forbidden) {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <ShieldOff className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Dashboard ini khusus Kepala Balai & Superadmin</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy-900 sm:text-2xl">
          <LayoutDashboard className="size-6 shrink-0 text-bpom-600" /> Dashboard Kepala Balai
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Ringkasan aktivitas seluruh aplikasi — {data ? formatTanggalIndonesia(data.tanggal) : "..."}
        </p>

        {loading && (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-navy-100/60" />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* Presensi hari ini */}
            <SectionTitle>Kehadiran Hari Ini</SectionTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile
                icon={<Users className="size-4.5" />}
                label="Hadir"
                value={data.presensi.hadir}
                sub={`dari ${data.presensi.total_pegawai} pegawai`}
                accent="bpom"
                delay={0}
              />
              <StatTile
                icon={<Clock className="size-4.5" />}
                label="Terlambat"
                value={data.presensi.terlambat}
                accent="amber"
                delay={1}
              />
              <StatTile
                icon={<UserX className="size-4.5" />}
                label="Belum Absen"
                value={data.presensi.belum_absen}
                accent="rose"
                delay={2}
              />
              <StatTile
                icon={<Home className="size-4.5" />}
                label="WFH / Dinas"
                value={data.presensi.wfh + data.presensi.dinas}
                sub={`${data.presensi.wfh} WFH • ${data.presensi.dinas} dinas`}
                accent="navy"
                delay={3}
              />
            </div>

            {/* Tren kehadiran per periode */}
            <SectionTitle>Tren Kehadiran</SectionTitle>
            <Card>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-navy-700">
                  Kehadiran & keterlambatan — {PERIODE_LABEL[periode]} terakhir
                </p>
                {/* Empat tombol periode tidak muat berdampingan di layar sempit;
                    barisnya dibuat dapat digeser, bukan meluber ke luar kartu. */}
                <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:overflow-visible sm:px-0">
                  <div className="inline-flex rounded-xl bg-navy-50 p-1">
                    {(Object.keys(PERIODE_LABEL) as Periode[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPeriode(p)}
                        className={cn(
                          "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                          periode === p ? "bg-navy-900 text-white shadow-sm" : "text-navy-500 hover:text-navy-800"
                        )}
                      >
                        {PERIODE_LABEL[p]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {data.tren_kehadiran.length > 0 ? (
                <LineChart
                  labels={data.tren_kehadiran.map((t) => t.label)}
                  series={[
                    { name: "Hadir", color: "#0f854e", data: data.tren_kehadiran.map((t) => t.hadir) },
                    { name: "Terlambat", color: "#f5a524", data: data.tren_kehadiran.map((t) => t.terlambat) },
                  ]}
                />
              ) : (
                <p className="py-8 text-center text-sm text-navy-400">Belum ada data kehadiran pada periode ini.</p>
              )}
            </Card>

            {/* Layanan & operasional */}
            <SectionTitle>Layanan & Operasional</SectionTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile
                icon={<CalendarCheck className="size-4.5" />}
                label="Booking Menunggu"
                value={data.booking["menunggu"] ?? 0}
                sub={`${sum(data.booking)} total booking`}
                accent="navy"
                delay={0}
              />
              <StatTile
                icon={<DoorOpen className="size-4.5" />}
                label="Izin Diajukan"
                value={data.izin["diajukan"] ?? 0}
                sub={`${sum(data.izin)} total pengajuan`}
                accent="navy"
                delay={1}
              />
              <StatTile
                icon={<Wrench className="size-4.5" />}
                label="Tiket BMN Aktif"
                value={(data.bmn["diajukan"] ?? 0) + (data.bmn["diproses"] ?? 0)}
                sub={`${data.bmn["selesai"] ?? 0} selesai`}
                accent="navy"
                delay={2}
              />
              <StatTile
                icon={<UserCheck className="size-4.5" />}
                label="Akun Menunggu Verifikasi"
                value={data.akun_masyarakat_pending}
                accent={data.akun_masyarakat_pending > 0 ? "amber" : "navy"}
                delay={3}
              />
            </div>

            {/* Pengawasan */}
            <SectionTitle>Pengawasan & Penindakan</SectionTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile
                icon={<MapPinned className="size-4.5" />}
                label="Apotek Terdaftar"
                value={data.apotek.total}
                sub={`${data.apotek.aktif} aktif • ${data.apotek.pernah_diperiksa} pernah diperiksa`}
                accent="bpom"
                delay={0}
              />
              <StatTile
                icon={<AlertTriangle className="size-4.5" />}
                label="Total Pelanggaran Apotek"
                value={data.apotek.total_pelanggaran}
                sub={`${data.apotek.dicabut} izin dicabut`}
                accent={data.apotek.total_pelanggaran > 0 ? "rose" : "bpom"}
                delay={1}
              />
              <StatTile
                icon={<Boxes className="size-4.5" />}
                label="Barang Bukti Disimpan"
                value={data.barang_bukti["disimpan"] ?? 0}
                sub={`${sum(data.barang_bukti)} total tercatat`}
                accent="navy"
                delay={2}
              />
              <StatTile
                icon={<Activity className="size-4.5" />}
                label="Barang Bukti Diproses"
                value={data.barang_bukti["dalam_proses"] ?? 0}
                accent="navy"
                delay={3}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
              <Card className="min-w-0">
                <h3 className="mb-4 text-sm font-bold text-navy-700">Status Izin Apotek (SIG)</h3>
                {data.apotek.total > 0 ? (
                  <DonutChart
                    centerLabel={`${data.apotek.total} apotek terdaftar`}
                    slices={[
                      { label: "Aktif", value: data.apotek.aktif, color: "#17a361" },
                      { label: "Kadaluarsa", value: data.apotek.kadaluarsa, color: "#f5a524" },
                      { label: "Dicabut", value: data.apotek.dicabut, color: "#e5484d" },
                    ]}
                  />
                ) : (
                  <p className="py-8 text-center text-sm text-navy-400">Belum ada data apotek.</p>
                )}
              </Card>
              <Card className="min-w-0">
                <h3 className="mb-4 text-sm font-bold text-navy-700">Status Barang Bukti</h3>
                {sum(data.barang_bukti) > 0 ? (
                  <DonutChart
                    centerLabel={`${sum(data.barang_bukti)} total tercatat`}
                    slices={[
                      { label: "Disimpan", value: data.barang_bukti["disimpan"] ?? 0, color: "#0b5cad" },
                      { label: "Dalam Proses", value: data.barang_bukti["dalam_proses"] ?? 0, color: "#f5a524" },
                      { label: "Dimusnahkan", value: data.barang_bukti["dimusnahkan"] ?? 0, color: "#e5484d" },
                      { label: "Dikembalikan", value: data.barang_bukti["dikembalikan"] ?? 0, color: "#17a361" },
                    ].filter((s) => s.value > 0)}
                  />
                ) : (
                  <p className="py-8 text-center text-sm text-navy-400">Belum ada data barang bukti.</p>
                )}
              </Card>
            </div>

            {/* Aktivitas terbaru */}
            <SectionTitle>Aktivitas Sistem Terbaru</SectionTitle>
            <Card className="!p-0">
              {data.aktivitas_terbaru.length === 0 && (
                <p className="py-10 text-center text-sm text-navy-400">Belum ada aktivitas.</p>
              )}
              <div className="divide-y divide-navy-900/5">
                {data.aktivitas_terbaru.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-500">
                      <Activity className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-navy-800">
                        <span className="font-semibold">{a.user?.name ?? "Sistem"}</span>{" "}
                        <span className="text-navy-500">{a.deskripsi ?? a.aksi}</span>
                      </p>
                      <p className="text-xs text-navy-400">
                        {new Date(a.created_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Jakarta",
                        })}{" "}
                        WIB
                      </p>
                    </div>
                    {a.modul && (
                      <span className="hidden shrink-0 sm:inline-flex">
                        <Badge tone="neutral">{a.modul}</Badge>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

function sum(obj: Record<string, number>): number {
  return Object.values(obj).reduce((a, b) => a + Number(b), 0);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-7 text-sm font-bold uppercase tracking-wide text-navy-400">{children}</h2>;
}

const ACCENT_STYLES: Record<string, string> = {
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
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  accent: keyof typeof ACCENT_STYLES;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.06, duration: 0.35 }}
      className="min-w-0 h-full"
    >
      <Card className="h-full !p-4">
        <div className={cn("mb-3 inline-flex size-9 items-center justify-center rounded-xl", ACCENT_STYLES[accent])}>
          {icon}
        </div>
        <p className="text-2xl font-extrabold tabular-nums text-navy-900">{value}</p>
        <p className="mt-0.5 text-xs font-semibold text-navy-600">{label}</p>
        {sub && <p className="mt-0.5 text-[11px] text-navy-400">{sub}</p>}
      </Card>
    </motion.div>
  );
}
