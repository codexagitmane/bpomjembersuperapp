"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, DoorOpen, Wrench, Check, X, ShieldOff, CalendarOff } from "lucide-react";
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
  user: { id: number; name: string; email: string };
}

interface BmnItem {
  id: number;
  nama_barang_lain: string | null;
  jenis_pengajuan: string;
  deskripsi_kerusakan: string;
  prioritas: string;
  status: string;
  user: { id: number; name: string };
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
  user: { id: number; name: string; jenis_pegawai: string };
}

const JENIS_CUTI_TONE: Record<string, "info" | "warning" | "danger"> = {
  cuti: "info",
  izin: "warning",
  sakit: "danger",
};

export default function PersetujuanPage() {
  const [tab, setTab] = useState<"cuti" | "izin" | "bmn">("cuti");
  const [izin, setIzin] = useState<IzinItem[]>([]);
  const [bmn, setBmn] = useState<BmnItem[]>([]);
  const [cuti, setCuti] = useState<CutiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [izinRes, bmnRes, cutiRes] = await Promise.all([
        api.get("/izin-keluar-masuk-semua", { params: { status: "diajukan" } }),
        api.get("/pengajuan-bmn-semua", { params: { status: "diajukan" } }),
        api.get("/cuti-izin-semua", { params: { status: "diajukan" } }),
      ]);
      setIzin(izinRes.data.data ?? []);
      setBmn(bmnRes.data.data ?? []);
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

  async function putuskanBmn(id: number, status: "diproses" | "ditolak") {
    setActingId(id);
    setMsg(null);
    try {
      await api.patch(`/pengajuan-bmn/${id}/status`, { status });
      setMsg(`Pengajuan BMN #${id} → ${status}.`);
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

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-navy-900">
          <ClipboardCheck className="size-6 text-bpom-600" /> Persetujuan Tata Usaha
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Antrean pengajuan izin keluar-masuk kantor dan pemeliharaan/perbaikan BMN.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <TabButton active={tab === "cuti"} onClick={() => setTab("cuti")} icon={<CalendarOff className="size-4" />}>
            Cuti / Izin / Sakit ({cuti.length})
          </TabButton>
          <TabButton active={tab === "izin"} onClick={() => setTab("izin")} icon={<DoorOpen className="size-4" />}>
            Izin Keluar Masuk ({izin.length})
          </TabButton>
          <TabButton active={tab === "bmn"} onClick={() => setTab("bmn")} icon={<Wrench className="size-4" />}>
            Pengajuan BMN ({bmn.length})
          </TabButton>
        </div>

        {msg && (
          <div className="mt-4 rounded-xl bg-navy-50 px-4 py-3 text-sm font-medium text-navy-700">{msg}</div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {loading &&
            [...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-navy-100/60" />)}

          {!loading && tab === "cuti" && cuti.length === 0 && (
            <Card className="py-12 text-center text-sm text-navy-400">Tidak ada pengajuan cuti/izin/sakit menunggu persetujuan. 🎉</Card>
          )}
          {!loading && tab === "izin" && izin.length === 0 && (
            <Card className="py-12 text-center text-sm text-navy-400">Tidak ada pengajuan izin menunggu persetujuan. 🎉</Card>
          )}
          {!loading && tab === "bmn" && bmn.length === 0 && (
            <Card className="py-12 text-center text-sm text-navy-400">Tidak ada pengajuan BMN menunggu tindakan. 🎉</Card>
          )}

          {tab === "cuti" &&
            cuti.map((item) => (
              <Card key={item.id} className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-navy-900">{item.user.name}</p>
                      <Badge tone={JENIS_CUTI_TONE[item.jenis]}>{item.jenis}</Badge>
                      <Badge tone="neutral">{item.jumlah_hari} hari kerja</Badge>
                    </div>
                    <p className="mt-1 text-xs text-navy-400">
                      {formatTanggalIndonesia(item.tanggal_mulai)} — {formatTanggalIndonesia(item.tanggal_selesai)}
                    </p>
                    <p className="mt-1.5 text-sm text-navy-600">{item.alasan}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={actingId === item.id}
                      onClick={() => putuskanCuti(item.id, "setujui")}
                    >
                      <Check className="size-4" /> Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={actingId === item.id}
                      onClick={() => putuskanCuti(item.id, "tolak")}
                    >
                      <X className="size-4" /> Tolak
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

          {tab === "izin" &&
            izin.map((item) => (
              <Card key={item.id} className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-navy-900">{item.user.name}</p>
                      <Badge tone="info">{JENIS_IZIN[item.jenis] ?? item.jenis}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-navy-400">
                      {formatTanggalIndonesia(item.tanggal)} • {formatJam(item.jam_mulai)}
                      {item.jam_selesai ? ` – ${formatJam(item.jam_selesai)}` : ""}
                    </p>
                    <p className="mt-1.5 text-sm text-navy-600">{item.keperluan}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={actingId === item.id}
                      onClick={() => putuskanIzin(item.id, "disetujui")}
                    >
                      <Check className="size-4" /> Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={actingId === item.id}
                      onClick={() => putuskanIzin(item.id, "ditolak")}
                    >
                      <X className="size-4" /> Tolak
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

          {tab === "bmn" &&
            bmn.map((item) => (
              <Card key={item.id} className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-navy-900">{item.nama_barang_lain}</p>
                      <Badge tone={item.prioritas === "tinggi" ? "danger" : item.prioritas === "sedang" ? "warning" : "neutral"}>
                        {item.prioritas}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-navy-400">
                      Diajukan oleh {item.user.name} • {item.jenis_pengajuan}
                    </p>
                    <p className="mt-1.5 text-sm text-navy-600">{item.deskripsi_kerusakan}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={actingId === item.id}
                      onClick={() => putuskanBmn(item.id, "diproses")}
                    >
                      <Check className="size-4" /> Proses
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={actingId === item.id}
                      onClick={() => putuskanBmn(item.id, "ditolak")}
                    >
                      <X className="size-4" /> Tolak
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      </div>
    </AppShell>
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
