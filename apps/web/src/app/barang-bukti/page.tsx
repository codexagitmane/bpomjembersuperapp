"use client";

import { useEffect, useState } from "react";
import { Boxes, Plus, Search, ShieldOff, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { extractApiErrorMessage } from "@bpom/shared";
import { formatTanggalIndonesia } from "@/lib/utils";

interface BarangBukti {
  id: number;
  nomor_bb: string;
  nama_barang: string;
  kategori: string | null;
  jumlah: number;
  satuan: string;
  status: string;
  tanggal_penyitaan: string;
  lokasi_penyimpanan: string | null;
}

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  disimpan: "success",
  dalam_proses: "warning",
  dimusnahkan: "danger",
  dikembalikan: "neutral",
  dilimpahkan: "neutral",
};

export default function BarangBuktiPage() {
  const [items, setItems] = useState<BarangBukti[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [cari, setCari] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nomor_bb: "",
    nama_barang: "",
    kategori: "",
    jumlah: "1",
    satuan: "pcs",
    tanggal_penyitaan: "",
    lokasi_penyimpanan: "",
    asal_perkara: "",
  });

  async function loadItems() {
    try {
      const { data } = await api.get("/barang-bukti", { params: cari ? { cari } : {} });
      setItems(data.data ?? []);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 403) {
        setForbidden(true);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/barang-bukti", { ...form, jumlah: Number(form.jumlah) });
      setShowForm(false);
      setForm({
        nomor_bb: "",
        nama_barang: "",
        kategori: "",
        jumlah: "1",
        satuan: "pcs",
        tanggal_penyitaan: "",
        lokasi_penyimpanan: "",
        asal_perkara: "",
      });
      await loadItems();
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
          <p className="font-semibold text-navy-700">Anda tidak memiliki akses ke modul ini</p>
          <p className="text-sm text-navy-400">Modul Barang Bukti khusus untuk Fungsi Penindakan.</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-900">Monitoring Barang Bukti</h1>
            <p className="mt-1 text-sm text-navy-500">Pelacakan status dan rantai pengelolaan barang bukti.</p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
            {showForm ? "Batal" : "Catat Baru"}
          </Button>
        </div>

        {showForm && (
          <Card className="mt-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Nomor Barang Bukti" value={form.nomor_bb} onChange={(e) => setForm((f) => ({ ...f, nomor_bb: e.target.value }))} required />
              <Input label="Nama Barang" value={form.nama_barang} onChange={(e) => setForm((f) => ({ ...f, nama_barang: e.target.value }))} required />
              <Input label="Kategori" value={form.kategori} onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Jumlah" type="number" min={1} value={form.jumlah} onChange={(e) => setForm((f) => ({ ...f, jumlah: e.target.value }))} required />
                <Input label="Satuan" value={form.satuan} onChange={(e) => setForm((f) => ({ ...f, satuan: e.target.value }))} required />
              </div>
              <Input label="Tanggal Penyitaan" type="date" value={form.tanggal_penyitaan} onChange={(e) => setForm((f) => ({ ...f, tanggal_penyitaan: e.target.value }))} required />
              <Input label="Lokasi Penyimpanan" value={form.lokasi_penyimpanan} onChange={(e) => setForm((f) => ({ ...f, lokasi_penyimpanan: e.target.value }))} />
              <div className="sm:col-span-2">
                <Textarea label="Asal Perkara" value={form.asal_perkara} onChange={(e) => setForm((f) => ({ ...f, asal_perkara: e.target.value }))} />
              </div>
              {error && <p className="sm:col-span-2 text-sm font-medium text-rose-600">{error}</p>}
              <Button type="submit" loading={submitting} className="sm:col-span-2">
                Simpan Barang Bukti
              </Button>
            </form>
          </Card>
        )}

        <div className="mt-6 flex gap-2">
          <Input
            placeholder="Cari nomor atau nama barang..."
            icon={<Search className="size-4" />}
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadItems()}
          />
          <Button variant="outline" onClick={loadItems}>Cari</Button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {loading && [...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-navy-100/60" />)}
          {!loading && items.length === 0 && (
            <Card className="flex flex-col items-center gap-3 py-16 text-center">
              <Boxes className="size-10 text-navy-200" />
              <p className="font-semibold text-navy-700">Belum ada barang bukti tercatat</p>
            </Card>
          )}
          {items.map((item) => (
            <Card key={item.id} className="!p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-mono text-navy-400">{item.nomor_bb}</p>
                  <p className="text-sm font-bold text-navy-900">{item.nama_barang}</p>
                  <p className="mt-0.5 text-xs text-navy-500">
                    {item.jumlah} {item.satuan} • {formatTanggalIndonesia(item.tanggal_penyitaan)}
                    {item.lokasi_penyimpanan ? ` • ${item.lokasi_penyimpanan}` : ""}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>{item.status.replace(/_/g, " ")}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
