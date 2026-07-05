"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarOff, Plus, X, ShieldOff, Sun } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { extractApiErrorMessage } from "@bpom/shared";
import { formatTanggalIndonesia } from "@/lib/utils";

interface CutiItem {
  id: number;
  jenis: "cuti" | "izin" | "sakit";
  tanggal_mulai: string;
  tanggal_selesai: string;
  jumlah_hari: number;
  alasan: string;
  status: "diajukan" | "disetujui" | "ditolak";
  catatan_approval: string | null;
  approver: { id: number; name: string } | null;
}

interface Jatah {
  tahun: number;
  jatah_cuti_tahunan: number;
  cuti_terpakai: number;
  sisa_cuti: number;
}

const STATUS_TONE: Record<string, "info" | "success" | "danger"> = {
  diajukan: "info",
  disetujui: "success",
  ditolak: "danger",
};

const JENIS_LABEL: Record<string, string> = {
  cuti: "Cuti Tahunan",
  izin: "Izin",
  sakit: "Sakit",
};

export default function CutiPage() {
  const [items, setItems] = useState<CutiItem[]>([]);
  const [jatah, setJatah] = useState<Jatah | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ jenis: "cuti", tanggal_mulai: "", tanggal_selesai: "", alasan: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/cuti-izin");
      setItems(data.data ?? []);
      setJatah(data.jatah ?? null);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.post("/cuti-izin", form);
      setSuccess("Pengajuan terkirim — menunggu persetujuan Kasubag TU.");
      setShowForm(false);
      setForm({ jenis: "cuti", tanggal_mulai: "", tanggal_selesai: "", alasan: "" });
      await load();
    } catch (err) {
      setError(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (forbidden) {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <ShieldOff className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Modul ini khusus pegawai internal</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-navy-900">
              <CalendarOff className="size-6 text-bpom-600" /> Cuti, Izin & Sakit
            </h1>
            <p className="mt-1 text-sm text-navy-500">Pengajuan cuti tahunan, izin, dan sakit — disetujui Kasubag TU.</p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
            {showForm ? "Batal" : "Ajukan"}
          </Button>
        </div>

        {jatah && (
          <Card className="mt-4 flex items-center gap-4 !py-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-bpom-50 text-bpom-700">
              <Sun className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-navy-800">Jatah Cuti Tahun {jatah.tahun}</p>
              <p className="text-xs text-navy-400">
                Terpakai {jatah.cuti_terpakai} dari {jatah.jatah_cuti_tahunan} hari
              </p>
            </div>
            <p className="text-2xl font-extrabold tabular-nums text-bpom-600">
              {jatah.sisa_cuti}
              <span className="ml-1 text-xs font-semibold text-navy-400">hari tersisa</span>
            </p>
          </Card>
        )}

        {showForm && (
          <Card className="mt-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select label="Jenis" value={form.jenis} onChange={(e) => setForm((f) => ({ ...f, jenis: e.target.value }))}>
                <option value="cuti">Cuti Tahunan</option>
                <option value="izin">Izin</option>
                <option value="sakit">Sakit</option>
              </Select>
              <Input label="Tanggal Mulai" type="date" value={form.tanggal_mulai} onChange={(e) => setForm((f) => ({ ...f, tanggal_mulai: e.target.value }))} required />
              <Input label="Tanggal Selesai" type="date" value={form.tanggal_selesai} min={form.tanggal_mulai} onChange={(e) => setForm((f) => ({ ...f, tanggal_selesai: e.target.value }))} required />
              <div className="sm:col-span-3">
                <Textarea label="Alasan" placeholder="Jelaskan alasan pengajuan (min. 5 karakter)" value={form.alasan} onChange={(e) => setForm((f) => ({ ...f, alasan: e.target.value }))} required />
              </div>
              {error && <p className="sm:col-span-3 text-sm font-medium text-rose-600">{error}</p>}
              <Button type="submit" loading={submitting} className="sm:col-span-3">
                Kirim Pengajuan
              </Button>
            </form>
          </Card>
        )}

        {success && (
          <div className="mt-4 rounded-xl bg-bpom-50 px-4 py-3 text-sm font-medium text-bpom-700">{success}</div>
        )}

        <div className="mt-5 flex flex-col gap-3">
          {loading && [...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-navy-100/60" />)}
          {!loading && items.length === 0 && (
            <Card className="flex flex-col items-center gap-3 py-16 text-center">
              <CalendarOff className="size-10 text-navy-200" />
              <p className="font-semibold text-navy-700">Belum ada pengajuan</p>
            </Card>
          )}
          {items.map((item) => (
            <Card key={item.id} className="!p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-navy-900">{JENIS_LABEL[item.jenis]}</p>
                    <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-navy-400">
                    {formatTanggalIndonesia(item.tanggal_mulai)} — {formatTanggalIndonesia(item.tanggal_selesai)} • {item.jumlah_hari} hari kerja
                  </p>
                  <p className="mt-1.5 text-sm text-navy-600">{item.alasan}</p>
                  {item.catatan_approval && (
                    <p className="mt-1 text-xs italic text-navy-400">
                      Catatan {item.approver?.name ?? "approver"}: {item.catatan_approval}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
