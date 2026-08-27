"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, DoorOpen, Check, X, ShieldOff, CalendarOff, Clock, History } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { extractApiErrorMessage } from "@bpom/shared";
import { formatTanggalIndonesia, formatJam, cn } from "@/lib/utils";

interface IzinItem {
  id: number;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string | null;
  jenis: string;
  keperluan: string;
  status: string;
  user: { id: number; name: string; email: string } | null;
}

const JENIS_IZIN: Record<string, string> = {
  keluar_sementara: "Keluar Sementara",
  dinas_luar: "Dinas Luar",
  izin_pribadi: "Izin Pribadi",
};

interface CutiItem {
  id: number;
  jenis: "cuti" | "izin" | "sakit";
  tanggal_mulai: string;
  tanggal_selesai: string;
  jumlah_hari: number;
  alasan: string;
  status: string;
  tahap: "menunggu_kasubag" | "menunggu_kabalai" | "selesai";
  user: { id: number; name: string; jenis_pegawai: string } | null;
}

const TAHAP_LABEL: Record<string, string> = {
  menunggu_kasubag: "Menunggu Kasubag TU",
  menunggu_kabalai: "Menunggu Kepala Balai",
};

const JENIS_CUTI_TONE: Record<string, "info" | "warning" | "danger"> = {
  cuti: "info",
  izin: "warning",
  sakit: "danger",
};

// Status yang sudah "diputuskan" (masuk riwayat).
const STATUS_TONE: Record<string, "success" | "danger" | "info" | "warning" | "neutral"> = {
  disetujui: "success",
  diproses: "info",
  selesai: "success",
  ditolak: "danger",
  diajukan: "warning",
};
const STATUS_LABEL: Record<string, string> = {
  disetujui: "Disetujui",
  diproses: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
  diajukan: "Menunggu",
};
const isPending = (s: string) => s === "diajukan";

export default function PersetujuanPage() {
  const [tab, setTab] = useState<"cuti" | "izin">("cuti");
  const [mode, setMode] = useState<"menunggu" | "riwayat">("menunggu");
  const [izin, setIzin] = useState<IzinItem[]>([]);
  const [cuti, setCuti] = useState<CutiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // Ambil SEMUA status (tanpa filter) → dipisah menjadi antrean & riwayat.
      const [izinRes, cutiRes] = await Promise.all([
        api.get("/izin-keluar-masuk-semua"),
        api.get("/cuti-izin-semua"),
      ]);
      setIzin(izinRes.data.data ?? []);
      setCuti(cutiRes.data.data ?? []);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 403) {
        setForbidden(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function putuskanCuti(id: number, aksi: "setujui" | "tolak") {
    setActingId(id);
    setMsg(null);
    try {
      await api.patch(`/cuti-izin/${id}/approve`, { aksi });
      setMsg(`Pengajuan cuti/izin #${id} ${aksi === "setujui" ? "disetujui" : "ditolak"}.`);
      await load();
    } catch (err) {
      setMsg(extractApiErrorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  async function putuskanIzin(id: number, status: "disetujui" | "ditolak") {
    setActingId(id);
    setMsg(null);
    try {
      await api.patch(`/izin-keluar-masuk/${id}/approve`, { status });
      setMsg(`Izin #${id} ${status}.`);
      await load();
    } catch (err) {
      setMsg(extractApiErrorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  if (forbidden) {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <ShieldOff className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Halaman ini khusus Kepala Subag TU / pimpinan</p>
        </Card>
      </AppShell>
    );
  }

  const menunggu = mode === "menunggu";
  const cutiList = cuti.filter((c) => (menunggu ? isPending(c.status) : !isPending(c.status)));
  const izinList = izin.filter((c) => (menunggu ? isPending(c.status) : !isPending(c.status)));
  const pendingCount = {
    cuti: cuti.filter((c) => isPending(c.status)).length,
    izin: izin.filter((c) => isPending(c.status)).length,
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-navy-900">
          <ClipboardCheck className="size-6 text-bpom-600" /> Persetujuan Tata Usaha
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Antrean & riwayat pengajuan cuti/izin dan izin keluar-masuk. Permohonan BMN kini di menu Pengajuan BMN.
        </p>

        {/* Toggle Menunggu / Riwayat */}
        <div className="mt-5 inline-flex rounded-2xl border border-navy-900/5 bg-white p-1 shadow-sm">
          <button
            onClick={() => setMode("menunggu")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              menunggu ? "bg-navy-900 text-white" : "text-navy-500 hover:text-navy-800"
            )}
          >
            <Clock className="size-4" /> Menunggu
          </button>
          <button
            onClick={() => setMode("riwayat")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              !menunggu ? "bg-navy-900 text-white" : "text-navy-500 hover:text-navy-800"
            )}
          >
            <History className="size-4" /> Riwayat
          </button>
        </div>

        {/* Tab jenis */}
        <div className="mt-4 flex flex-wrap gap-2">
          <TabButton active={tab === "cuti"} onClick={() => setTab("cuti")} icon={<CalendarOff className="size-4" />}>
            Cuti / Izin / Sakit{menunggu ? ` (${pendingCount.cuti})` : ""}
          </TabButton>
          <TabButton active={tab === "izin"} onClick={() => setTab("izin")} icon={<DoorOpen className="size-4" />}>
            Izin Keluar Masuk{menunggu ? ` (${pendingCount.izin})` : ""}
          </TabButton>
        </div>

        {msg && <div className="mt-4 rounded-xl bg-navy-50 px-4 py-3 text-sm font-medium text-navy-700">{msg}</div>}

        <div className="mt-4 flex flex-col gap-3">
          {loading &&
            [...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-navy-100/60" />)}

          {!loading && tab === "cuti" && cutiList.length === 0 && (
            <EmptyState menunggu={menunggu} what="cuti/izin/sakit" />
          )}
          {!loading && tab === "izin" && izinList.length === 0 && (
            <EmptyState menunggu={menunggu} what="izin keluar-masuk" />
          )}

          {tab === "cuti" &&
            cutiList.map((item) => (
              <Card key={item.id} className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-navy-900">{item.user?.name ?? "Pengguna tidak ditemukan"}</p>
                      <Badge tone={JENIS_CUTI_TONE[item.jenis]}>{item.jenis}</Badge>
                      <Badge tone="neutral">{item.jumlah_hari} hari kerja</Badge>
                      {menunggu && item.tahap === "menunggu_kabalai" && (
                        <Badge tone="warning">{TAHAP_LABEL[item.tahap]}</Badge>
                      )}
                      {!menunggu && <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>{STATUS_LABEL[item.status] ?? item.status}</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-navy-400">
                      {formatTanggalIndonesia(item.tanggal_mulai)} — {formatTanggalIndonesia(item.tanggal_selesai)}
                    </p>
                    <p className="mt-1.5 text-sm text-navy-600">{item.alasan}</p>
                  </div>
                  {menunggu && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" loading={actingId === item.id} onClick={() => putuskanCuti(item.id, "setujui")}>
                        <Check className="size-4" /> Setujui
                      </Button>
                      <Button size="sm" variant="danger" disabled={actingId === item.id} onClick={() => putuskanCuti(item.id, "tolak")}>
                        <X className="size-4" /> Tolak
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}

          {tab === "izin" &&
            izinList.map((item) => (
              <Card key={item.id} className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-navy-900">{item.user?.name ?? "Pengguna tidak ditemukan"}</p>
                      <Badge tone="info">{JENIS_IZIN[item.jenis] ?? item.jenis}</Badge>
                      {!menunggu && <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>{STATUS_LABEL[item.status] ?? item.status}</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-navy-400">
                      {formatTanggalIndonesia(item.tanggal)} • {formatJam(item.jam_mulai)}
                      {item.jam_selesai ? ` – ${formatJam(item.jam_selesai)}` : ""}
                    </p>
                    <p className="mt-1.5 text-sm text-navy-600">{item.keperluan}</p>
                  </div>
                  {menunggu && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" loading={actingId === item.id} onClick={() => putuskanIzin(item.id, "disetujui")}>
                        <Check className="size-4" /> Setujui
                      </Button>
                      <Button size="sm" variant="danger" disabled={actingId === item.id} onClick={() => putuskanIzin(item.id, "ditolak")}>
                        <X className="size-4" /> Tolak
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
        </div>
      </div>
    </AppShell>
  );
}

function EmptyState({ menunggu, what }: { menunggu: boolean; what: string }) {
  return (
    <Card className="py-12 text-center text-sm text-navy-400">
      {menunggu ? `Tidak ada pengajuan ${what} menunggu persetujuan. 🎉` : `Belum ada riwayat pengajuan ${what}.`}
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
        active ? "bg-navy-900 text-white" : "bg-white text-navy-600 hover:bg-navy-50"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
