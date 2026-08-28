"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Home,
  Clock3,
  MapPin,
  CheckCircle2,
  XCircle,
  CalendarOff,
  CalendarRange,
  ShieldCheck,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PresensiTabs } from "@/components/presensi/PresensiTabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

interface WfhPending {
  id: number;
  label: string;
  alamat: string | null;
  latitude: number;
  longitude: number;
  user: { id: number; name: string; email: string; jenis_pegawai: string | null };
}

interface KantorInfo {
  batas_absen: string;
  radius_meter: number;
  jadwal_hari_ini: { jam_masuk: string | null; jam_pulang: string | null };
}

export default function ManajemenPresensiPage() {
  const [wfh, setWfh] = useState<WfhPending[]>([]);
  const [kantor, setKantor] = useState<KantorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  async function loadWfh() {
    try {
      const { data } = await api.get("/admin/wfh-pending");
      setWfh(data.lokasi ?? []);
    } catch {
      setWfh([]);
    }
  }

  useEffect(() => {
    Promise.all([
      loadWfh(),
      api.get("/presensi/kantor-info").then(({ data }) => setKantor(data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function verifikasi(id: number, aksi: "setujui" | "tolak") {
    setBusy(id);
    try {
      await api.patch(`/admin/wfh/${id}/verifikasi`, {
        aksi,
        catatan: aksi === "tolak" ? "Lokasi tidak sesuai / perlu perbaikan." : null,
      });
      await loadWfh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <PresensiTabs />

        {/* Jam kerja */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoCard
            icon={<Clock3 className="size-5" />}
            title="Jam Kerja Hari Ini"
            value={kantor ? `${kantor.jadwal_hari_ini.jam_masuk ?? "—"} – ${kantor.jadwal_hari_ini.jam_pulang ?? "—"}` : "…"}
            sub={kantor ? `Batas absen ${kantor.batas_absen} WIB` : ""}
          />
          <InfoCard
            icon={<MapPin className="size-5" />}
            title="Radius Geofence"
            value={kantor ? `${kantor.radius_meter} meter` : "…"}
            sub="Dua titik kantor BPOM Jember"
          />
          <InfoCard
            icon={<Home className="size-5" />}
            title="Lokasi WFH Menunggu"
            value={`${wfh.length} pengajuan`}
            sub="Perlu verifikasi admin"
            accent={wfh.length > 0}
          />
        </div>

        {/* Verifikasi lokasi WFH */}
        <h2 className="mb-3 mt-7 text-sm font-bold uppercase tracking-wide text-navy-400">
          Verifikasi Lokasi WFH
        </h2>
        <Card className="!p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-navy-400">
              <Loader2 className="size-4 animate-spin" /> Memuat…
            </div>
          ) : wfh.length === 0 ? (
            <p className="flex flex-col items-center gap-2 py-12 text-center text-sm text-navy-400">
              <CheckCircle2 className="size-8 text-bpom-300" /> Tidak ada pengajuan lokasi WFH yang menunggu.
            </p>
          ) : (
            <div className="divide-y divide-navy-900/5">
              {wfh.map((w) => (
                <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900">{w.user?.name ?? "Pengguna tidak ditemukan"}</p>
                    <p className="text-xs text-navy-400">{w.user.email}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-navy-600">
                      <MapPin className="size-3.5 text-navy-300" />
                      <strong>{w.label}</strong>
                      {w.alamat ? ` — ${w.alamat}` : ""}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${w.latitude},${w.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-bpom-600 hover:underline"
                    >
                      Lihat di peta ({w.latitude.toFixed(5)}, {w.longitude.toFixed(5)})
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" loading={busy === w.id} onClick={() => verifikasi(w.id, "setujui")}>
                      <CheckCircle2 className="size-4" /> Setujui
                    </Button>
                    <Button size="sm" variant="danger" loading={busy === w.id} onClick={() => verifikasi(w.id, "tolak")}>
                      <XCircle className="size-4" /> Tolak
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pintasan pengelolaan */}
        <h2 className="mb-3 mt-7 text-sm font-bold uppercase tracking-wide text-navy-400">
          Kelola Kehadiran & Pengecualian
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LinkCard href="/persetujuan" icon={<CalendarOff className="size-5" />} title="Persetujuan Izin, Cuti & Sakit" desc="Setujui/tolak pengajuan izin, cuti tahunan, dan sakit pegawai." />
          <LinkCard href="/rekap-presensi" icon={<CalendarRange className="size-5" />} title="Rekapitulasi Presensi" desc="Rekap harian/bulanan/tahunan + ekspor Excel & PDF." />
          <LinkCard href="/roster-keamanan" icon={<ShieldCheck className="size-5" />} title="Roster Shift Keamanan" desc="Atur jadwal shift petugas keamanan (pagi/malam)." />
          <LinkCard href="/pegawai" icon={<Home className="size-5" />} title="Data User" desc="Kelola akun pegawai dan masyarakat, jenis pegawai, dan status kepegawaian." />
        </div>
      </div>
    </AppShell>
  );
}

function InfoCard({
  icon,
  title,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className="!p-4">
      <div className={`mb-3 inline-flex size-10 items-center justify-center rounded-xl ${accent ? "bg-amber-500/10 text-amber-600" : "bg-navy-50 text-navy-600"}`}>
        {icon}
      </div>
      <p className="text-lg font-extrabold text-navy-900">{value}</p>
      <p className="text-xs font-semibold text-navy-600">{title}</p>
      {sub && <p className="mt-0.5 text-[11px] text-navy-400">{sub}</p>}
    </Card>
  );
}

function LinkCard({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href}>
      <Card className="group flex h-full items-center gap-4 transition-all hover:border-navy-200 hover:shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-bpom-50 to-navy-50 text-bpom-600">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-navy-900">{title}</p>
          <p className="text-xs text-navy-500">{desc}</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-navy-300 transition-transform group-hover:translate-x-1" />
      </Card>
    </Link>
  );
}
