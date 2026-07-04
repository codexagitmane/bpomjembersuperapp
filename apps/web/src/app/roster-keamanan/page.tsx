"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Wand2, Trash2, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { extractApiErrorMessage } from "@bpom/shared";
import { cn } from "@/lib/utils";

interface RosterEntry {
  id: number;
  user_id: number;
  nama: string;
  tanggal: string;
  shift: string;
}
interface Petugas {
  id: number;
  name: string;
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function RosterKeamananPage() {
  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/roster-keamanan", { params: { tahun, bulan } });
      setRoster(data.roster ?? []);
      setPetugas(data.petugas ?? []);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, [tahun, bulan]);

  useEffect(() => {
    load();
  }, [load]);

  const jumlahHari = new Date(tahun, bulan, 0).getDate();
  const rosterByDay: Record<number, RosterEntry> = {};
  roster.forEach((r) => {
    const d = new Date(r.tanggal).getDate();
    rosterByDay[d] = r;
  });

  async function toggleHari(hari: number) {
    if (petugas.length === 0) {
      setMsg("Belum ada petugas keamanan terdaftar.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const tgl = `${tahun}-${String(bulan).padStart(2, "0")}-${String(hari).padStart(2, "0")}`;
    const existing = rosterByDay[hari];
    try {
      if (existing) {
        await api.delete(`/roster-keamanan/${existing.id}`);
      } else {
        await api.post("/roster-keamanan", {
          user_id: petugas[0].id,
          tanggal: tgl,
          shift: "malam",
        });
      }
      await load();
    } catch (err) {
      setMsg(extractApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (petugas.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await api.post("/roster-keamanan/generate", {
        tahun,
        bulan,
        petugas_ids: petugas.map((p) => p.id),
      });
      setMsg(data.message);
      await load();
    } catch (err) {
      setMsg(extractApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (forbidden) {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <ShieldOff className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Halaman ini khusus Kepala Subag TU / Superadmin</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-navy-900">
          <ShieldCheck className="size-6 text-bpom-600" /> Roster Shift Petugas Keamanan
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Klik tanggal untuk menandai hari petugas bertugas. Petugas hanya bisa presensi di hari terjadwal.
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Select label="Bulan" value={bulan} onChange={(e) => setBulan(Number(e.target.value))}>
              {BULAN.map((b, i) => (
                <option key={i} value={i + 1}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-28">
            <Select label="Tahun" value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
              {[now.getFullYear(), now.getFullYear() + 1].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <Button className="ml-auto" variant="secondary" loading={busy} onClick={generate}>
            <Wand2 className="size-4" /> Generate Otomatis (ganjil-genap)
          </Button>
        </div>

        {petugas.length > 0 && (
          <p className="mt-3 text-xs text-navy-500">
            Petugas keamanan: {petugas.map((p) => p.name).join(", ")}
          </p>
        )}
        {msg && <div className="mt-3 rounded-xl bg-navy-50 px-4 py-3 text-sm font-medium text-navy-700">{msg}</div>}

        <Card className="mt-4">
          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {[...Array(31)].map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-navy-100/60" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {[...Array(jumlahHari)].map((_, i) => {
                const hari = i + 1;
                const aktif = !!rosterByDay[hari];
                return (
                  <button
                    key={hari}
                    disabled={busy}
                    onClick={() => toggleHari(hari)}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center rounded-xl border text-sm font-bold transition-all disabled:opacity-50",
                      aktif
                        ? "border-bpom-600 bg-bpom-500 text-white shadow-md"
                        : "border-navy-100 bg-white text-navy-500 hover:border-navy-300"
                    )}
                  >
                    {hari}
                    {aktif ? (
                      <ShieldCheck className="mt-0.5 size-3" />
                    ) : (
                      <Plus className="mt-0.5 size-3 opacity-30" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <div className="mt-3 flex items-center gap-4 text-xs text-navy-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-bpom-500" /> Bertugas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded border border-navy-200 bg-white" /> Libur
          </span>
          <Badge tone="neutral" className="ml-auto">
            {roster.length} hari terjadwal bulan ini
          </Badge>
        </div>
      </div>
    </AppShell>
  );
}
