"use client";

import { useEffect, useState } from "react";
import { Wrench, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { extractApiErrorMessage } from "@bpom/shared";

interface Pengajuan {
  id: number;
  nama_barang_lain: string | null;
  jenis_pengajuan: string;
  deskripsi_kerusakan: string;
  prioritas: string;
  status: string;
}

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  diajukan: "warning",
  diproses: "neutral",
  selesai: "success",
  ditolak: "danger",
};

const PRIORITAS_TONE: Record<string, "neutral" | "warning" | "danger"> = {
  rendah: "neutral",
  sedang: "warning",
  tinggi: "danger",
};

export default function PengajuanBmnPage() {
  const [form, setForm] = useState({
    nama_barang_lain: "",
    jenis_pengajuan: "perbaikan",
    deskripsi_kerusakan: "",
    prioritas: "sedang",
  });
  const [riwayat, setRiwayat] = useState<Pengajuan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadRiwayat() {
    const { data } = await api.get("/pengajuan-bmn");
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
      await api.post("/pengajuan-bmn", form);
      setSuccess("Pengajuan berhasil dikirim ke Tata Usaha.");
      setForm({ nama_barang_lain: "", jenis_pengajuan: "perbaikan", deskripsi_kerusakan: "", prioritas: "sedang" });
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
          <h1 className="text-2xl font-extrabold text-navy-900">Pengajuan Pemeliharaan & Perbaikan BMN</h1>
          <p className="mt-1 text-sm text-navy-500">Laporkan kerusakan atau ajukan pemeliharaan Barang Milik Negara.</p>

          <Card className="mt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Nama Barang"
                placeholder="Contoh: AC Ruang Pemeriksaan Lt. 2"
                value={form.nama_barang_lain}
                onChange={(e) => setForm((f) => ({ ...f, nama_barang_lain: e.target.value }))}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Jenis Pengajuan"
                  value={form.jenis_pengajuan}
                  onChange={(e) => setForm((f) => ({ ...f, jenis_pengajuan: e.target.value }))}
                >
                  <option value="perbaikan">Perbaikan</option>
                  <option value="pemeliharaan">Pemeliharaan</option>
                </Select>
                <Select
                  label="Prioritas"
                  value={form.prioritas}
                  onChange={(e) => setForm((f) => ({ ...f, prioritas: e.target.value }))}
                >
                  <option value="rendah">Rendah</option>
                  <option value="sedang">Sedang</option>
                  <option value="tinggi">Tinggi</option>
                </Select>
              </div>

              <Textarea
                label="Deskripsi Kerusakan"
                placeholder="Jelaskan kondisi kerusakan secara detail..."
                value={form.deskripsi_kerusakan}
                onChange={(e) => setForm((f) => ({ ...f, deskripsi_kerusakan: e.target.value }))}
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
                <Send className="size-4" /> Kirim Pengajuan
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <Wrench className="size-4.5" /> Riwayat Pengajuan
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {loading && [...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-navy-100/60" />)}
            {!loading && riwayat.length === 0 && (
              <Card className="py-10 text-center text-sm text-navy-400">Belum ada riwayat pengajuan.</Card>
            )}
            {riwayat.map((p) => (
              <Card key={p.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-navy-900">{p.nama_barang_lain}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-navy-500">{p.deskripsi_kerusakan}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
                    <Badge tone={PRIORITAS_TONE[p.prioritas] ?? "neutral"}>{p.prioritas}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
