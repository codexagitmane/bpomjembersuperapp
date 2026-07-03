"use client";

import { useEffect, useState } from "react";
import { DoorOpen, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { extractApiErrorMessage } from "@bpom/shared";
import { formatTanggalIndonesia, formatJam } from "@/lib/utils";

interface Izin {
  id: number;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string | null;
  jenis: string;
  keperluan: string;
  status: string;
}

const JENIS_LABEL: Record<string, string> = {
  keluar_sementara: "Keluar Sementara",
  dinas_luar: "Dinas Luar",
  izin_pribadi: "Izin Pribadi",
};

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  diajukan: "warning",
  disetujui: "success",
  ditolak: "danger",
  selesai: "neutral",
};

export default function IzinKeluarMasukPage() {
  const [form, setForm] = useState({
    tanggal: "",
    jam_mulai: "",
    jam_selesai: "",
    jenis: "keluar_sementara",
    keperluan: "",
  });
  const [riwayat, setRiwayat] = useState<Izin[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadRiwayat() {
    const { data } = await api.get("/izin-keluar-masuk");
    setRiwayat(data.data ?? []);
  }

  useEffect(() => {
    loadRiwayat().finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.post("/izin-keluar-masuk", { ...form, jam_selesai: form.jam_selesai || null });
      setSuccess("Pengajuan izin berhasil dikirim, menunggu persetujuan.");
      setForm({ tanggal: "", jam_mulai: "", jam_selesai: "", jenis: "keluar_sementara", keperluan: "" });
      await loadRiwayat();
    } catch (err) {
      setError(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h1 className="text-2xl font-extrabold text-navy-900">Izin Keluar Masuk Kantor</h1>
          <p className="mt-1 text-sm text-navy-500">Ajukan izin keluar sementara, dinas luar, atau izin pribadi.</p>

          <Card className="mt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Select
                label="Jenis Izin"
                value={form.jenis}
                onChange={(e) => setForm((f) => ({ ...f, jenis: e.target.value }))}
              >
                <option value="keluar_sementara">Keluar Sementara</option>
                <option value="dinas_luar">Dinas Luar</option>
                <option value="izin_pribadi">Izin Pribadi</option>
              </Select>

              <Input
                label="Tanggal"
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Jam Mulai"
                  type="time"
                  value={form.jam_mulai}
                  onChange={(e) => setForm((f) => ({ ...f, jam_mulai: e.target.value }))}
                  required
                />
                <Input
                  label="Jam Selesai (opsional)"
                  type="time"
                  value={form.jam_selesai}
                  onChange={(e) => setForm((f) => ({ ...f, jam_selesai: e.target.value }))}
                />
              </div>

              <Textarea
                label="Keperluan"
                placeholder="Jelaskan keperluan izin Anda..."
                value={form.keperluan}
                onChange={(e) => setForm((f) => ({ ...f, keperluan: e.target.value }))}
                required
              />

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 rounded-xl bg-bpom-50 px-4 py-3 text-sm font-medium text-bpom-700">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {success}
                </div>
              )}

              <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
                <Send className="size-4" /> Ajukan Izin
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <DoorOpen className="size-4.5" /> Riwayat Pengajuan
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {loading && [...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-navy-100/60" />)}
            {!loading && riwayat.length === 0 && (
              <Card className="py-10 text-center text-sm text-navy-400">Belum ada riwayat izin.</Card>
            )}
            {riwayat.map((izin) => (
              <Card key={izin.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-navy-900">{JENIS_LABEL[izin.jenis] ?? izin.jenis}</p>
                    <p className="mt-0.5 text-xs text-navy-400">
                      {formatTanggalIndonesia(izin.tanggal)} • {formatJam(izin.jam_mulai)}
                      {izin.jam_selesai ? ` – ${formatJam(izin.jam_selesai)}` : ""}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-navy-500">{izin.keperluan}</p>
                  </div>
                  <Badge tone={STATUS_TONE[izin.status] ?? "neutral"}>{izin.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
