"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plane, Plus, FileDown, X, Check, Trash2, UserPlus, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea, Select } from "@/components/ui/Field";
import { api, downloadFile } from "@/lib/api";

interface Pegawai { nama: string; nip: string; jabatan: string; pangkat: string }
interface Row {
  id: number;
  nomor_surat: string;
  pembuat: string;
  maksud: string;
  tujuan: string;
  tanggal_berangkat_label: string;
  tanggal_kembali_label: string;
  lama_hari: number;
  pegawai: Pegawai[];
  penandatangan: string | null;
}
interface Ptd { id: number; name: string; jabatan: string | null }

const inputCls = "rounded-lg border border-navy-900/10 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-bpom-500";
const today = () => new Date().toISOString().slice(0, 10);

export default function PerjalananDinasPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [ptd, setPtd] = useState<Ptd[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/perjalanan-dinas");
      setRows(data.data ?? []);
      setPtd(data.penandatangan ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function hapus(r: Row) {
    if (!confirm(`Hapus dokumen ${r.nomor_surat}?`)) return;
    await api.delete(`/perjalanan-dinas/${r.id}`);
    load();
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy-900 sm:text-2xl">
              <Plane className="size-6 shrink-0 text-bpom-600" /> Perjalanan Dinas
            </h1>
            <p className="mt-1 text-sm text-navy-500">Buat dokumen Surat Tugas &amp; SPPD dengan cepat — output PDF siap tanda tangan.</p>
          </div>
          <Button onClick={() => setOpen(true)} className="shrink-0"><Plus className="size-4" /> Buat Dokumen</Button>
        </div>

        <div className="mt-5 space-y-3">
          {loading && [...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-navy-100/60" />)}
          {!loading && rows.length === 0 && (
            <Card className="flex flex-col items-center gap-2 py-14 text-center">
              <Plane className="size-9 text-navy-200" />
              <p className="text-sm font-semibold text-navy-600">Belum ada dokumen perjalanan dinas.</p>
            </Card>
          )}
          {rows.map((r) => (
            <Card key={r.id} className="!p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-bpom-600">{r.nomor_surat}</span>
                    <Badge tone="neutral">{r.lama_hari} hari</Badge>
                  </div>
                  <p className="mt-1 font-bold text-navy-900">{r.maksud}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-navy-500"><MapPin className="size-3.5" /> {r.tujuan}</p>
                  <p className="mt-1 text-xs text-navy-400">
                    {r.tanggal_berangkat_label} — {r.tanggal_kembali_label} • {r.pegawai.length} pegawai
                    {r.penandatangan ? ` • Ttd: ${r.penandatangan}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => downloadFile(`/perjalanan-dinas/${r.id}/pdf`, `SPPD-${r.nomor_surat.replace(/\//g, "-")}.pdf`)}>
                    <FileDown className="size-4" /> PDF
                  </Button>
                  <button onClick={() => hapus(r)} className="flex size-9 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="size-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {open && <FormModal ptd={ptd} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
      </AnimatePresence>
    </AppShell>
  );
}

function FormModal({ ptd, onClose, onSaved }: { ptd: Ptd[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    dasar: "", maksud: "", tujuan: "", tempat_berangkat: "Jember", alat_angkut: "Kendaraan Dinas/Umum",
    tanggal_berangkat: today(), tanggal_kembali: today(), pembebanan_anggaran: "", tingkat_biaya: "", keterangan: "",
    penandatangan_id: "", penandatangan_jabatan: "Kepala Balai POM di Jember",
  });
  const [pegawai, setPegawai] = useState<Pegawai[]>([{ nama: "", nip: "", jabatan: "", pangkat: "" }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const setPg = (i: number, k: keyof Pegawai, v: string) =>
    setPegawai((s) => s.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)));

  const valid = form.maksud && form.tujuan && form.tanggal_berangkat && form.tanggal_kembali &&
    form.tanggal_kembali >= form.tanggal_berangkat && pegawai.some((p) => p.nama.trim());

  async function submit() {
    setSaving(true); setErr(null);
    try {
      await api.post("/perjalanan-dinas", {
        ...form,
        penandatangan_id: form.penandatangan_id ? Number(form.penandatangan_id) : null,
        pegawai: pegawai.filter((p) => p.nama.trim()),
      });
      onSaved();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Gagal menyimpan.");
    } finally { setSaving(false); }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between bg-gradient-to-br from-navy-900 to-navy-800 px-5 py-4 text-white">
          <h3 className="text-base font-bold">Dokumen Perjalanan Dinas</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10"><X className="size-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Textarea label="Dasar (opsional)" value={form.dasar} onChange={(e) => set("dasar", e.target.value)} placeholder="mis. Surat Perintah / DIPA…" className="min-h-16" />
          <Textarea label="Maksud Perjalanan *" value={form.maksud} onChange={(e) => set("maksud", e.target.value)} className="min-h-16" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Tempat Tujuan *" value={form.tujuan} onChange={(e) => set("tujuan", e.target.value)} />
            <Input label="Tempat Berangkat" value={form.tempat_berangkat} onChange={(e) => set("tempat_berangkat", e.target.value)} />
            <label className="flex flex-col gap-1.5 text-sm font-medium text-navy-800">Tanggal Berangkat *
              <input type="date" value={form.tanggal_berangkat} onChange={(e) => set("tanggal_berangkat", e.target.value)} className={inputCls} /></label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-navy-800">Tanggal Kembali *
              <input type="date" value={form.tanggal_kembali} min={form.tanggal_berangkat} onChange={(e) => set("tanggal_kembali", e.target.value)} className={inputCls} /></label>
            <Input label="Alat Angkut" value={form.alat_angkut} onChange={(e) => set("alat_angkut", e.target.value)} />
            <Input label="Tingkat Biaya" value={form.tingkat_biaya} onChange={(e) => set("tingkat_biaya", e.target.value)} />
            <div className="sm:col-span-2"><Input label="Pembebanan Anggaran" value={form.pembebanan_anggaran} onChange={(e) => set("pembebanan_anggaran", e.target.value)} /></div>
          </div>

          {/* pegawai */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-semibold text-navy-800">Pegawai yang Ditugaskan *</p>
              <button onClick={() => setPegawai([...pegawai, { nama: "", nip: "", jabatan: "", pangkat: "" }])}
                className="flex items-center gap-1 text-xs font-semibold text-bpom-600 hover:text-bpom-700"><UserPlus className="size-3.5" /> Tambah</button>
            </div>
            <div className="space-y-2">
              {pegawai.map((p, i) => (
                <div key={i} className="rounded-xl border border-navy-900/10 p-2.5">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input value={p.nama} onChange={(e) => setPg(i, "nama", e.target.value)} placeholder="Nama *" className={inputCls} />
                    <input value={p.nip} onChange={(e) => setPg(i, "nip", e.target.value)} placeholder="NIP" className={inputCls} />
                    <input value={p.pangkat} onChange={(e) => setPg(i, "pangkat", e.target.value)} placeholder="Pangkat/Gol." className={inputCls} />
                    <input value={p.jabatan} onChange={(e) => setPg(i, "jabatan", e.target.value)} placeholder="Jabatan" className={inputCls} />
                  </div>
                  {pegawai.length > 1 && (
                    <button onClick={() => setPegawai(pegawai.filter((_, idx) => idx !== i))}
                      className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600"><Trash2 className="size-3.5" /> Hapus</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Penandatangan" value={form.penandatangan_id} onChange={(e) => set("penandatangan_id", e.target.value)}>
              <option value="">— pilih —</option>
              {ptd.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
            <Input label="Jabatan Penandatangan" value={form.penandatangan_jabatan} onChange={(e) => set("penandatangan_jabatan", e.target.value)} />
          </div>
          <Textarea label="Keterangan" value={form.keterangan} onChange={(e) => set("keterangan", e.target.value)} className="min-h-16" />
          {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{err}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-navy-900/10 px-5 py-3.5">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="secondary" loading={saving} disabled={!valid} onClick={submit}><Check className="size-4" /> Simpan &amp; Buat</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
