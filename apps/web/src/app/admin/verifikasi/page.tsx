"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { UserCheck, Home, Check, X, ShieldOff, Mail, Phone, MapPinned } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { extractApiErrorMessage } from "@bpom/shared";
import { formatTanggalIndonesia, cn } from "@/lib/utils";

// Leaflet mengakses `window` — hanya render di client.
const WfhMap = dynamic(() => import("@/components/WfhMap").then((m) => m.WfhMap), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-2xl bg-navy-100/60 md:h-96" />,
});

interface AkunPending {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

interface WfhPending {
  id: number;
  label: string;
  alamat: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
  user: { id: number; name: string; email: string; jenis_pegawai: string };
}

export default function VerifikasiPage() {
  const [tab, setTab] = useState<"akun" | "wfh">("akun");
  const [akun, setAkun] = useState<AkunPending[]>([]);
  const [wfh, setWfh] = useState<WfhPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [fokusWfhId, setFokusWfhId] = useState<number | null>(null);

  // Identitas array stabil agar WfhMap tidak re-render marker tiap render.
  const petaPoints = useMemo(
    () =>
      wfh.map((w) => ({
        id: w.id,
        label: w.label,
        nama: w.user?.name ?? "Pengguna tidak ditemukan",
        latitude: w.latitude,
        longitude: w.longitude,
      })),
    [wfh]
  );

  const load = useCallback(async () => {
    try {
      const [akunRes, wfhRes] = await Promise.all([
        api.get("/admin/akun-pending"),
        api.get("/admin/wfh-pending"),
      ]);
      setAkun(akunRes.data.users ?? []);
      setWfh(wfhRes.data.lokasi ?? []);
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

  async function prosesAkun(id: number, aksi: "aktifkan" | "tolak") {
    setActingId(id);
    setMsg(null);
    try {
      const { data } = await api.patch(`/admin/akun/${id}/aktivasi`, { aksi });
      setMsg(data.message);
      await load();
    } catch (err) {
      setMsg(extractApiErrorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  async function prosesWfh(id: number, aksi: "setujui" | "tolak") {
    setActingId(id);
    setMsg(null);
    try {
      await api.patch(`/admin/wfh/${id}/verifikasi`, { aksi });
      setMsg(`Lokasi WFH #${id} ${aksi === "setujui" ? "diverifikasi" : "ditolak"}.`);
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
          <p className="font-semibold text-navy-700">Halaman ini khusus tim IT/admin (Superadmin)</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-navy-900">
          <UserCheck className="size-6 text-bpom-600" /> Verifikasi Admin
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Aktivasi akun masyarakat baru dan verifikasi lokasi WFH pegawai.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setTab("akun")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              tab === "akun" ? "bg-navy-900 text-white" : "bg-white text-navy-600 hover:bg-navy-50"
            )}
          >
            <UserCheck className="size-4" /> Akun Masyarakat ({akun.length})
          </button>
          <button
            onClick={() => setTab("wfh")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              tab === "wfh" ? "bg-navy-900 text-white" : "bg-white text-navy-600 hover:bg-navy-50"
            )}
          >
            <Home className="size-4" /> Lokasi WFH ({wfh.length})
          </button>
        </div>

        {msg && (
          <div className="mt-4 rounded-xl bg-navy-50 px-4 py-3 text-sm font-medium text-navy-700">{msg}</div>
        )}

        {/* Peta real-time lokasi WFH: marker rumah berdenyut, radius kantor,
            garis animasi ke kantor terdekat + jarak. */}
        {tab === "wfh" && !loading && wfh.length > 0 && (
          <div className="mt-4">
            <WfhMap points={petaPoints} focusId={fokusWfhId} />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {loading &&
            [...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-navy-100/60" />)}

          {!loading && tab === "akun" && akun.length === 0 && (
            <Card className="py-12 text-center text-sm text-navy-400">Tidak ada akun menunggu verifikasi. 🎉</Card>
          )}
          {!loading && tab === "wfh" && wfh.length === 0 && (
            <Card className="py-12 text-center text-sm text-navy-400">Tidak ada pengajuan lokasi WFH. 🎉</Card>
          )}

          {tab === "akun" &&
            akun.map((u) => (
              <Card key={u.id} className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-navy-900">{u.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-navy-400">
                      <Mail className="size-3.5" /> {u.email}
                      {u.phone && (
                        <>
                          <Phone className="ml-2 size-3.5" /> {u.phone}
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-navy-400">
                      Daftar: {formatTanggalIndonesia(u.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" loading={actingId === u.id} onClick={() => prosesAkun(u.id, "aktifkan")}>
                      <Check className="size-4" /> Aktifkan
                    </Button>
                    <Button size="sm" variant="danger" disabled={actingId === u.id} onClick={() => prosesAkun(u.id, "tolak")}>
                      <X className="size-4" /> Tolak
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

          {tab === "wfh" &&
            wfh.map((w) => (
              <Card key={w.id} className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-navy-900">{w.user?.name ?? "Pengguna tidak ditemukan"}</p>
                      <Badge tone="info">{w.user.jenis_pegawai}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-navy-500">
                      {w.label} — {w.alamat ?? "(tanpa alamat)"}
                    </p>
                    <button
                      onClick={() => setFokusWfhId(w.id)}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-bpom-600 hover:underline"
                    >
                      <MapPinned className="size-3.5" /> Fokus di peta ({w.latitude.toFixed(5)}, {w.longitude.toFixed(5)})
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" loading={actingId === w.id} onClick={() => prosesWfh(w.id, "setujui")}>
                      <Check className="size-4" /> Setujui
                    </Button>
                    <Button size="sm" variant="danger" disabled={actingId === w.id} onClick={() => prosesWfh(w.id, "tolak")}>
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
