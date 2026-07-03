"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPinned, ShieldOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { api } from "@/lib/api";
import type { ApotekPoint } from "@/components/sig/ApotekMap";

const ApotekMap = dynamic(() => import("@/components/sig/ApotekMap").then((m) => m.ApotekMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-navy-100" />,
});

const STATUS_TONE: Record<string, "success" | "warning" | "danger"> = {
  aktif: "success",
  kadaluarsa: "warning",
  dicabut: "danger",
};

export default function SigApotekPage() {
  const [apotek, setApotek] = useState<ApotekPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    api
      .get("/sig-apotek")
      .then(({ data }) => setApotek(data.apotek ?? []))
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
          <p className="font-semibold text-navy-700">Anda tidak memiliki akses ke modul ini</p>
          <p className="text-sm text-navy-400">Modul SIG Apotek khusus untuk Fungsi Pemeriksaan.</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto flex h-full max-w-6xl flex-col">
        <div className="mb-4">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-navy-900">
            <MapPinned className="size-6 text-bpom-600" /> SIG Monitoring Distribusi Apotek
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            Pemetaan geografis sebaran dan status pengawasan apotek se-Kabupaten Jember.
          </p>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card-elevated h-[28rem] overflow-hidden bg-white lg:col-span-2 lg:h-[32rem]">
            {!loading && <ApotekMap apotek={apotek} />}
          </div>

          <div className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1">
            {loading && [...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-navy-100/60" />)}
            {!loading && apotek.length === 0 && (
              <Card className="py-10 text-center text-sm text-navy-400">Belum ada data apotek.</Card>
            )}
            {apotek.map((a) => (
              <Card key={a.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-navy-900">{a.nama_apotek}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-navy-500">{a.alamat}</p>
                  </div>
                  <Badge tone={STATUS_TONE[a.status_izin] ?? "neutral"}>{a.status_izin}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
