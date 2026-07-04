"use client";

import { useCallback, useEffect, useState } from "react";
import { TestTube2, Plus, X, ShieldOff, Search, Beaker } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { extractApiErrorMessage } from "@bpom/shared";

interface Bahan {
  id: number;
  nama_bahan: string;
  kategori: string | null;
  satuan: string;
  stok_tersedia: number;
  stok_minimum: number;
  tanggal_kedaluwarsa: string | null;
  status_efektif: string;
  perlu_pengadaan: boolean;
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  aktif: "success",
  nonaktif: "neutral",
  kedaluwarsa: "danger",
};

export default function ManajemenBahanLabPage() {
  const [items, setItems] = useState<Bahan[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [cari, setCari] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nama_bahan: "", kategori: "", satuan: "gram", stok_tersedia: "0", stok_minimum: "0",
    tanggal_kedaluwarsa: "", keterangan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pakaiBahan, setPakaiBahan] = useState<Bahan | null>(null);
  const [pakaiForm, setPakaiForm] = useState({ tanggal: new Date().toISOString().slice(0, 10), jumlah_diambil: "", nama_sampel: "" });
  const [pakaiSubmitting, setPakaiSubmitting] = useState(false);
  const [pakaiError, setPakaiError] = useState<string | null>(null);
  const [pakaiSuccess, setPakaiSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/bahan-lab", { params: cari ? { cari } : {} });
      setItems(data.data ?? []);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, [cari]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/bahan-lab", {
        ...form,
        stok_tersedia: Number(form.stok_tersedia),
        stok_minimum: Number(form.stok_minimum),
        tanggal_kedaluwarsa: form.tanggal_kedaluwarsa || null,
      });
      setShowForm(false);
      setForm({ nama_bahan: "", kategori: "", satuan: "gram", stok_tersedia: "0", stok_minimum: "0", tanggal_kedaluwarsa: "", keterangan: "" });
      await load();
    } catch (err) {
      setError(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCatatPemakaian(e: React.FormEvent) {
    e.preventDefault();
    if (!pakaiBahan) return;
    setPakaiError(null);
    setPakaiSuccess(null);
    setPakaiSubmitting(true);
    try {
      await api.post(`/bahan-lab/${pakaiBahan.id}/pemakaian`, {
        ...pakaiForm,
        jumlah_diambil: Number(pakaiForm.jumlah_diambil),
      });
      setPakaiSuccess(`Pemakaian ${pakaiForm.jumlah_diambil} ${pakaiBahan.satuan} berhasil dicatat.`);
      setPakaiForm({ tanggal: new Date().toISOString().slice(0, 10), jumlah_diambil: "", nama_sampel: "" });
      await load();
    } catch (err) {
      setPakaiError(extractApiErrorMessage(err));
    } finally {
      setPakaiSubmitting(false);
    }
  }

  if (forbidden) {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <ShieldOff className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Anda tidak memiliki akses ke modul ini</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-navy-900">
              <TestTube2 className="size-6 text-bpom-600" /> Manajemen Bahan Laboratorium
            </h1>
            <p className="mt-1 text-sm text-navy-500">Stok, pemakaian, dan tanggal kedaluwarsa bahan/reagen uji.</p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
            {showForm ? "Batal" : "Tambah Bahan"}
          </Button>
        </div>

        {showForm && (
          <Card className="mt-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Nama Bahan" value={form.nama_bahan} onChange={(e) => setForm((f) => ({ ...f, nama_bahan: e.target.value }))} required />
              <Input label="Kategori" placeholder="Reagen / Media / Test Kit" value={form.kategori} onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))} />
              <Input label="Satuan" value={form.satuan} onChange={(e) => setForm((f) => ({ ...f, satuan: e.target.value }))} required />
              <Input label="Tanggal Kedaluwarsa" type="date" value={form.tanggal_kedaluwarsa} onChange={(e) => setForm((f) => ({ ...f, tanggal_kedaluwarsa: e.target.value }))} />
              <Input label="Stok Tersedia" type="number" step="0.01" min={0} value={form.stok_tersedia} onChange={(e) => setForm((f) => ({ ...f, stok_tersedia: e.target.value }))} required />
              <Input label="Stok Minimum" type="number" step="0.01" min={0} value={form.stok_minimum} onChange={(e) => setForm((f) => ({ ...f, stok_minimum: e.target.value }))} required />
              <div className="sm:col-span-2">
                <Textarea label="Keterangan" value={form.keterangan} onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))} />
              </div>
              {error && <p className="sm:col-span-2 text-sm font-medium text-rose-600">{error}</p>}
              <Button type="submit" loading={submitting} className="sm:col-span-2">
                Simpan Bahan
              </Button>
            </form>
          </Card>
        )}

        <div className="mt-6">
          <Input placeholder="Cari nama bahan..." icon={<Search className="size-4" />} value={cari} onChange={(e) => setCari(e.target.value)} />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {loading && [...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-navy-100/60" />)}
          {!loading && items.length === 0 && (
            <Card className="flex flex-col items-center gap-3 py-16 text-center">
              <TestTube2 className="size-10 text-navy-200" />
              <p className="font-semibold text-navy-700">Belum ada bahan tercatat</p>
            </Card>
          )}
          {items.map((b) => (
            <Card key={b.id} className="!p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-navy-900">{b.nama_bahan}</p>
                    <Badge tone={STATUS_TONE[b.status_efektif] ?? "neutral"}>{b.status_efektif}</Badge>
                    {b.perlu_pengadaan && <Badge tone="warning">Perlu Pengadaan</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-navy-500">
                    Stok: <strong>{b.stok_tersedia}</strong> {b.satuan} (min. {b.stok_minimum})
                    {b.tanggal_kedaluwarsa && ` • ED: ${b.tanggal_kedaluwarsa}`}
                    {b.kategori && ` • ${b.kategori}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPakaiBahan(b);
                    setPakaiError(null);
                    setPakaiSuccess(null);
                  }}
                >
                  <Beaker className="size-4" /> Catat Pemakaian
                </Button>
              </div>

              {pakaiBahan?.id === b.id && (
                <form onSubmit={handleCatatPemakaian} className="mt-4 grid grid-cols-1 gap-3 border-t border-navy-900/5 pt-4 sm:grid-cols-3">
                  <Input label="Tanggal" type="date" value={pakaiForm.tanggal} onChange={(e) => setPakaiForm((f) => ({ ...f, tanggal: e.target.value }))} required />
                  <Input
                    label={`Jumlah (${b.satuan})`}
                    type="number"
                    step="0.01"
                    min={0.01}
                    max={b.stok_tersedia}
                    value={pakaiForm.jumlah_diambil}
                    onChange={(e) => setPakaiForm((f) => ({ ...f, jumlah_diambil: e.target.value }))}
                    required
                  />
                  <Input label="Nama Sampel" value={pakaiForm.nama_sampel} onChange={(e) => setPakaiForm((f) => ({ ...f, nama_sampel: e.target.value }))} />
                  {pakaiError && <p className="sm:col-span-3 text-xs font-medium text-rose-600">{pakaiError}</p>}
                  {pakaiSuccess && <p className="sm:col-span-3 text-xs font-medium text-bpom-700">{pakaiSuccess}</p>}
                  <Button type="submit" size="sm" loading={pakaiSubmitting} className="sm:col-span-3">
                    Simpan Pemakaian
                  </Button>
                </form>
              )}
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
