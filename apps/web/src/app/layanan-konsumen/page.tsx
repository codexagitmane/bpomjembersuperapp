"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ClipboardList, Plus, Search, FileText, FileDown, Eye, X, Check, ChevronLeft, ChevronRight,
  Building2, MessageSquare, AlertTriangle, Filter, CalendarDays,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea, Select } from "@/components/ui/Field";
import { api, downloadFile } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Opsi {
  unit: { value: string; label: string }[];
  petugas: string[];
  pekerjaan: string[];
  jenis_komoditi: string[];
  layanan_melalui: string[];
  klasifikasi: Record<string, string[]>;
}
interface Record_ {
  id: number;
  nomor: string;
  petugas_input: string;
  unit_pelayanan: string;
  unit_pelayanan_label: string;
  nama_konsumen: string;
  tanggal_layanan: string;
  tanggal_layanan_label: string;
  jam_layanan: string | null;
  jenis_layanan: string;
  jenis_layanan_label: string;
  klasifikasi: string;
  petugas: string[];
  perlu_rujuk: boolean;
  detail?: Record<string, Record<string, string>>;
}

const STEPS = ["Konsumen", "Produk", "Layanan", "Klasifikasi", "Tindak Lanjut"];
const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  unit_pelayanan: "balai_pom_jember",
  nama_konsumen: "",
  tanggal_layanan: today(),
  jam_layanan: "",
  jenis_layanan: "permintaan_informasi",
  klasifikasi: "",
  petugas_1: "",
  petugas_2: "",
  petugas_3: "",
  perlu_rujuk: false,
  konsumen: {
    jenis_kelamin: "Laki-Laki", usia: "", pekerjaan: "", instansi: "", jenis_perusahaan: "",
    alamat: "", kota_kabupaten: "", provinsi: "Jawa Timur", negara: "Indonesia", email: "", no_telp: "", no_fax: "",
  } as Record<string, string>,
  produk: {
    nama_dagang: "", nama_generik: "", pabrik: "", nomor_izin_edar: "", nomor_batch: "", alamat: "",
    kota_kabupaten: "", provinsi: "", negara: "", tanggal_kadaluarsa: "", diperoleh_di: "", tanggal_diperoleh: "", tanggal_digunakan: "",
  } as Record<string, string>,
  layanan: {
    inti_masalah: "", pertanyaan: "", jenis_komoditi: "", layanan_melalui: "", sumber_data: "", sub_klasifikasi: "", jawaban: "",
  } as Record<string, string>,
  tindak_lanjut: { rujukan: "", sla: "", keterangan: "" } as Record<string, string>,
});
type Form = ReturnType<typeof emptyForm>;

export default function LayananKonsumenPage() {
  const [rows, setRows] = useState<Record_[]>([]);
  const [opsi, setOpsi] = useState<Opsi | null>(null);
  const [ringkasan, setRingkasan] = useState({ total: 0, permintaan_informasi: 0, pengaduan: 0, perlu_rujuk: 0 });
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState(false);
  const [detail, setDetail] = useState<Record_ | null>(null);

  // filter
  const [f, setF] = useState({ dari: "", sampai: "", unit: "", petugas: "", q: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(f).forEach(([k, v]) => v && (params[k] = v));
      const { data } = await api.get("/layanan-konsumen", { params });
      setRows(data.data ?? []);
      setRingkasan(data.ringkasan);
      setOpsi(data.opsi);
    } finally {
      setLoading(false);
    }
  }, [f]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy-900 sm:text-2xl">
              <ClipboardList className="size-6 shrink-0 text-bpom-600" /> Layanan Informasi Konsumen
            </h1>
            <p className="mt-1 text-sm text-navy-500">
              Record data pelayanan informasi, konsultasi &amp; pengaduan konsumen — Fungsi Infokom.
            </p>
          </div>
          <Button onClick={() => setWizard(true)} className="shrink-0">
            <Plus className="size-4" /> Isi Formulir
          </Button>
        </div>

        {/* Statistik */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={<FileText className="size-4.5" />} label="Total Record" value={ringkasan.total} tone="navy" />
          <Stat icon={<MessageSquare className="size-4.5" />} label="Permintaan Info" value={ringkasan.permintaan_informasi} tone="bpom" />
          <Stat icon={<AlertTriangle className="size-4.5" />} label="Pengaduan" value={ringkasan.pengaduan} tone="amber" />
          <Stat icon={<Building2 className="size-4.5" />} label="Perlu Rujuk" value={ringkasan.perlu_rujuk} tone="rose" />
        </div>

        {/* Filter */}
        <Card className="mt-4 !p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-400">
            <Filter className="size-3.5" /> Filter
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <label className="flex flex-col gap-1 text-xs font-medium text-navy-500">
              Dari tanggal
              <input type="date" value={f.dari} onChange={(e) => setF({ ...f, dari: e.target.value })} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-navy-500">
              Sampai tanggal
              <input type="date" value={f.sampai} onChange={(e) => setF({ ...f, sampai: e.target.value })} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-navy-500">
              Tempat Layanan
              <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className={inputCls}>
                <option value="">Semua</option>
                {opsi?.unit.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-navy-500">
              Petugas Layanan
              <input value={f.petugas} onChange={(e) => setF({ ...f, petugas: e.target.value })} placeholder="Nama petugas…" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-navy-500">
              Cari
              <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Nama / nomor…" className={inputCls} />
            </label>
          </div>
        </Card>

        {/* Tabel */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-navy-900/5 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-navy-900/10 bg-navy-50/60 text-left text-xs uppercase tracking-wide text-navy-500">
                  <th className="px-4 py-3 font-bold">Nomor</th>
                  <th className="px-4 py-3 font-bold">Tanggal</th>
                  <th className="px-4 py-3 font-bold">Konsumen</th>
                  <th className="px-4 py-3 font-bold">Tempat</th>
                  <th className="px-4 py-3 font-bold">Jenis</th>
                  <th className="px-4 py-3 font-bold">Petugas</th>
                  <th className="px-4 py-3 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {loading && [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-6 animate-pulse rounded bg-navy-100/60" /></td></tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-navy-400">Belum ada record. Klik “Isi Formulir” untuk menambahkan.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-navy-50/40">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-700">{r.nomor}</td>
                    <td className="px-4 py-3 text-navy-600">{r.tanggal_layanan_label}{r.jam_layanan ? ` • ${r.jam_layanan}` : ""}</td>
                    <td className="px-4 py-3 font-semibold text-navy-900">{r.nama_konsumen}</td>
                    <td className="px-4 py-3"><Badge tone="neutral">{r.unit_pelayanan_label}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge tone={r.jenis_layanan === "pengaduan" ? "warning" : "success"}>{r.jenis_layanan_label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-navy-500">{r.petugas.join(", ") || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <IconBtn title="Lihat detail" onClick={() => openDetail(r.id, setDetail)}><Eye className="size-4" /></IconBtn>
                        <IconBtn title="Unduh Word" onClick={() => downloadFile(`/layanan-konsumen/${r.id}/word`, `Layanan-${r.nomor.replace(/\//g, "-")}.doc`)}><FileText className="size-4 text-sky-600" /></IconBtn>
                        <IconBtn title="Unduh PDF" onClick={() => downloadFile(`/layanan-konsumen/${r.id}/pdf`, `Layanan-${r.nomor.replace(/\//g, "-")}.pdf`)}><FileDown className="size-4 text-rose-600" /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {wizard && opsi && (
          <Wizard opsi={opsi} onClose={() => setWizard(false)} onSaved={() => { setWizard(false); load(); }} />
        )}
        {detail && <DetailModal r={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>
    </AppShell>
  );
}

const inputCls =
  "rounded-lg border border-navy-900/10 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-bpom-500";

async function openDetail(id: number, setDetail: (r: Record_) => void) {
  const { data } = await api.get(`/layanan-konsumen/${id}`);
  setDetail(data.data);
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title} className="flex size-8 items-center justify-center rounded-lg text-navy-600 hover:bg-navy-100">
      {children}
    </button>
  );
}

const TONE: Record<string, string> = {
  navy: "bg-navy-50 text-navy-600", bpom: "bg-bpom-50 text-bpom-700",
  amber: "bg-amber-500/10 text-amber-600", rose: "bg-rose-500/10 text-rose-600",
};
function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <Card className="!p-4">
      <div className={cn("mb-2 inline-flex size-9 items-center justify-center rounded-xl", TONE[tone])}>{icon}</div>
      <p className="text-2xl font-extrabold tabular-nums text-navy-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-navy-500">{label}</p>
    </Card>
  );
}

/* ============================= WIZARD ============================= */
function Wizard({ opsi, onClose, onSaved }: { opsi: Opsi; onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (patch: Partial<Form>) => setForm((s) => ({ ...s, ...patch }));
  const setK = (k: string, v: string) => setForm((s) => ({ ...s, konsumen: { ...s.konsumen, [k]: v } }));
  const setP = (k: string, v: string) => setForm((s) => ({ ...s, produk: { ...s.produk, [k]: v } }));
  const setL = (k: string, v: string) => setForm((s) => ({ ...s, layanan: { ...s.layanan, [k]: v } }));
  const setT = (k: string, v: string) => setForm((s) => ({ ...s, tindak_lanjut: { ...s.tindak_lanjut, [k]: v } }));

  const stepValid = useMemo(() => {
    if (step === 0)
      return !!(form.nama_konsumen && form.tanggal_layanan && form.konsumen.jenis_kelamin && form.konsumen.alamat && form.konsumen.no_telp && form.konsumen.pekerjaan);
    if (step === 2) return !!(form.layanan.inti_masalah && form.layanan.pertanyaan && form.petugas_1 && form.jenis_layanan && form.klasifikasi);
    if (step === 4) return !!form.layanan.jawaban;
    return true;
  }, [step, form]);

  async function submit() {
    setSaving(true);
    setErr(null);
    try {
      await api.post("/layanan-konsumen", form);
      onSaved();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Gagal menyimpan. Periksa isian wajib.");
    } finally {
      setSaving(false);
    }
  }

  const subOptions = form.klasifikasi ? opsi.klasifikasi[form.klasifikasi] ?? [] : [];

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl"
      >
        {/* header + steps */}
        <div className="bg-gradient-to-br from-navy-900 to-navy-800 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Formulir Layanan Konsumen</h3>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10"><X className="size-5" /></button>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-1.5">
                <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                  i < step ? "bg-bpom-500 text-white" : i === step ? "bg-white text-navy-900" : "bg-white/15 text-white/60")}>
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className={cn("h-0.5 flex-1 rounded", i < step ? "bg-bpom-500" : "bg-white/15")} />}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs font-medium text-navy-200">Langkah {step + 1}/{STEPS.length} — {STEPS[step]}</p>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select label="Unit Pelayanan *" value={form.unit_pelayanan} onChange={(e) => set({ unit_pelayanan: e.target.value })}>
                    {opsi.unit.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </Select>
                  <Select label="Jenis Kelamin *" value={form.konsumen.jenis_kelamin} onChange={(e) => setK("jenis_kelamin", e.target.value)}>
                    <option>Laki-Laki</option><option>Perempuan</option>
                  </Select>
                  <Input label="Nama *" value={form.nama_konsumen} onChange={(e) => set({ nama_konsumen: e.target.value })} />
                  <Input label="Usia" value={form.konsumen.usia} onChange={(e) => setK("usia", e.target.value)} />
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-navy-800">Tanggal Layanan *
                    <input type="date" value={form.tanggal_layanan} onChange={(e) => set({ tanggal_layanan: e.target.value })} className={inputCls} /></label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-navy-800">Jam Layanan
                    <input type="time" value={form.jam_layanan} onChange={(e) => set({ jam_layanan: e.target.value })} className={inputCls} /></label>
                  <Select label="Pekerjaan *" value={form.konsumen.pekerjaan} onChange={(e) => setK("pekerjaan", e.target.value)}>
                    <option value="">— pilih —</option>
                    {opsi.pekerjaan.map((p) => <option key={p}>{p}</option>)}
                  </Select>
                  <Input label="Instansi" value={form.konsumen.instansi} onChange={(e) => setK("instansi", e.target.value)} />
                  <Input label="Jenis Perusahaan" value={form.konsumen.jenis_perusahaan} onChange={(e) => setK("jenis_perusahaan", e.target.value)} />
                  <Input label="No. Telp *" value={form.konsumen.no_telp} onChange={(e) => setK("no_telp", e.target.value)} placeholder="+62…" />
                  <div className="sm:col-span-2"><Input label="Alamat *" value={form.konsumen.alamat} onChange={(e) => setK("alamat", e.target.value)} /></div>
                  <Input label="Kota/Kabupaten" value={form.konsumen.kota_kabupaten} onChange={(e) => setK("kota_kabupaten", e.target.value)} />
                  <Input label="Provinsi" value={form.konsumen.provinsi} onChange={(e) => setK("provinsi", e.target.value)} />
                  <Input label="Negara" value={form.konsumen.negara} onChange={(e) => setK("negara", e.target.value)} />
                  <Input label="Email" value={form.konsumen.email} onChange={(e) => setK("email", e.target.value)} />
                  <Input label="No. Fax" value={form.konsumen.no_fax} onChange={(e) => setK("no_fax", e.target.value)} />
                </div>
              )}

              {step === 1 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <p className="sm:col-span-2 text-xs text-navy-400">Isi jika layanan menyangkut produk tertentu (opsional).</p>
                  <Input label="Nama Dagang" value={form.produk.nama_dagang} onChange={(e) => setP("nama_dagang", e.target.value)} />
                  <Input label="Nama Generik" value={form.produk.nama_generik} onChange={(e) => setP("nama_generik", e.target.value)} />
                  <Input label="Pabrik" value={form.produk.pabrik} onChange={(e) => setP("pabrik", e.target.value)} />
                  <Input label="Nomor Izin Edar" value={form.produk.nomor_izin_edar} onChange={(e) => setP("nomor_izin_edar", e.target.value)} />
                  <Input label="Nomor Batch" value={form.produk.nomor_batch} onChange={(e) => setP("nomor_batch", e.target.value)} />
                  <Input label="Diperoleh di" value={form.produk.diperoleh_di} onChange={(e) => setP("diperoleh_di", e.target.value)} />
                  <div className="sm:col-span-2"><Input label="Alamat Produk" value={form.produk.alamat} onChange={(e) => setP("alamat", e.target.value)} /></div>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-navy-800">Tanggal Kadaluarsa
                    <input type="date" value={form.produk.tanggal_kadaluarsa} onChange={(e) => setP("tanggal_kadaluarsa", e.target.value)} className={inputCls} /></label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-navy-800">Tanggal Diperoleh
                    <input type="date" value={form.produk.tanggal_diperoleh} onChange={(e) => setP("tanggal_diperoleh", e.target.value)} className={inputCls} /></label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-navy-800">Tanggal Digunakan
                    <input type="date" value={form.produk.tanggal_digunakan} onChange={(e) => setP("tanggal_digunakan", e.target.value)} className={inputCls} /></label>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Textarea label="Inti Masalah *" value={form.layanan.inti_masalah} onChange={(e) => setL("inti_masalah", e.target.value)} /></div>
                  <div className="sm:col-span-2"><Textarea label="Pertanyaan *" value={form.layanan.pertanyaan} onChange={(e) => setL("pertanyaan", e.target.value)} /></div>
                  <Select label="Nama Petugas 1 *" value={form.petugas_1} onChange={(e) => set({ petugas_1: e.target.value })}>
                    <option value="">— pilih —</option>
                    {opsi.petugas.map((p) => <option key={p}>{p}</option>)}
                  </Select>
                  <Select label="Nama Petugas 2" value={form.petugas_2} onChange={(e) => set({ petugas_2: e.target.value })}>
                    <option value="">—</option>
                    {opsi.petugas.map((p) => <option key={p}>{p}</option>)}
                  </Select>
                  <Select label="Nama Petugas 3" value={form.petugas_3} onChange={(e) => set({ petugas_3: e.target.value })}>
                    <option value="">—</option>
                    {opsi.petugas.map((p) => <option key={p}>{p}</option>)}
                  </Select>
                  <Select label="Jenis Layanan *" value={form.jenis_layanan} onChange={(e) => set({ jenis_layanan: e.target.value })}>
                    <option value="permintaan_informasi">Permintaan Informasi</option>
                    <option value="pengaduan">Pengaduan</option>
                  </Select>
                  <Select label="Jenis Komoditi" value={form.layanan.jenis_komoditi} onChange={(e) => setL("jenis_komoditi", e.target.value)}>
                    <option value="">— pilih —</option>
                    {opsi.jenis_komoditi.map((p) => <option key={p}>{p}</option>)}
                  </Select>
                  <Select label="Layanan Melalui" value={form.layanan.layanan_melalui} onChange={(e) => setL("layanan_melalui", e.target.value)}>
                    <option value="">— pilih —</option>
                    {opsi.layanan_melalui.map((p) => <option key={p}>{p}</option>)}
                  </Select>
                  <Select label="Klasifikasi *" value={form.klasifikasi} onChange={(e) => { set({ klasifikasi: e.target.value }); setL("sub_klasifikasi", ""); }}>
                    <option value="">— pilih —</option>
                    {Object.keys(opsi.klasifikasi).map((k) => <option key={k}>{k}</option>)}
                  </Select>
                  <Input label="Sumber Data" value={form.layanan.sumber_data} onChange={(e) => setL("sumber_data", e.target.value)} />
                </div>
              )}

              {step === 3 && (
                <div>
                  <p className="mb-3 text-sm font-semibold text-navy-700">Sub Klasifikasi {form.klasifikasi && <span className="text-navy-400">— {form.klasifikasi}</span>}</p>
                  {subOptions.length === 0 ? (
                    <p className="rounded-xl bg-navy-50 px-4 py-8 text-center text-sm text-navy-400">Pilih Klasifikasi pada langkah sebelumnya untuk menampilkan sub klasifikasi.</p>
                  ) : (
                    <div className="grid gap-2">
                      {subOptions.map((s) => (
                        <button key={s} type="button" onClick={() => setL("sub_klasifikasi", s)}
                          className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                            form.layanan.sub_klasifikasi === s ? "border-bpom-500 bg-bpom-50 text-bpom-800" : "border-navy-900/10 text-navy-700 hover:bg-navy-50")}>
                          <span className={cn("flex size-4.5 items-center justify-center rounded-full border-2",
                            form.layanan.sub_klasifikasi === s ? "border-bpom-500 bg-bpom-500 text-white" : "border-navy-300")}>
                            {form.layanan.sub_klasifikasi === s && <Check className="size-3" />}
                          </span>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="mb-1.5 text-sm font-medium text-navy-800">Perlu Rujuk?</p>
                    <div className="flex gap-2">
                      {[["Ya", true], ["Tidak", false]].map(([lbl, val]) => (
                        <button key={String(val)} type="button" onClick={() => set({ perlu_rujuk: val as boolean })}
                          className={cn("flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
                            form.perlu_rujuk === val ? "border-navy-900 bg-navy-900 text-white" : "border-navy-900/10 text-navy-600 hover:bg-navy-50")}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input label="Rujukan" value={form.tindak_lanjut.rujukan} onChange={(e) => setT("rujukan", e.target.value)} />
                  <Input label="SLA" value={form.tindak_lanjut.sla} onChange={(e) => setT("sla", e.target.value)} />
                  <div className="sm:col-span-2"><Textarea label="Jawaban *" value={form.layanan.jawaban} onChange={(e) => setL("jawaban", e.target.value)} /></div>
                  <div className="sm:col-span-2"><Textarea label="Keterangan" value={form.tindak_lanjut.keterangan} onChange={(e) => setT("keterangan", e.target.value)} /></div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{err}</p>}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 border-t border-navy-900/10 px-5 py-3.5">
          <Button variant="ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>
            <ChevronLeft className="size-4" /> {step === 0 ? "Batal" : "Kembali"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!stepValid}>Lanjut <ChevronRight className="size-4" /></Button>
          ) : (
            <Button variant="secondary" loading={saving} disabled={!stepValid} onClick={submit}><Check className="size-4" /> Simpan</Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================= DETAIL ============================= */
const SECTIONS: { key: string; title: string; fields: [string, string][] }[] = [
  { key: "konsumen", title: "Identitas Konsumen", fields: [
    ["jenis_kelamin", "Jenis Kelamin"], ["usia", "Usia"], ["pekerjaan", "Pekerjaan"], ["instansi", "Instansi"],
    ["jenis_perusahaan", "Jenis Perusahaan"], ["alamat", "Alamat"], ["kota_kabupaten", "Kota/Kabupaten"],
    ["provinsi", "Provinsi"], ["negara", "Negara"], ["email", "Email"], ["no_telp", "No. Telp"], ["no_fax", "No. Fax"]] },
  { key: "produk", title: "Identitas Produk", fields: [
    ["nama_dagang", "Nama Dagang"], ["nama_generik", "Nama Generik"], ["pabrik", "Pabrik"], ["nomor_izin_edar", "No. Izin Edar"],
    ["nomor_batch", "No. Batch"], ["alamat", "Alamat"], ["tanggal_kadaluarsa", "Tgl Kadaluarsa"], ["diperoleh_di", "Diperoleh di"],
    ["tanggal_diperoleh", "Tgl Diperoleh"], ["tanggal_digunakan", "Tgl Digunakan"]] },
  { key: "layanan", title: "Layanan", fields: [
    ["inti_masalah", "Inti Masalah"], ["pertanyaan", "Pertanyaan"], ["jenis_komoditi", "Jenis Komoditi"],
    ["layanan_melalui", "Layanan Melalui"], ["sub_klasifikasi", "Sub Klasifikasi"], ["sumber_data", "Sumber Data"], ["jawaban", "Jawaban"]] },
  { key: "tindak_lanjut", title: "Tindak Lanjut", fields: [["rujukan", "Rujukan"], ["sla", "SLA"], ["keterangan", "Keterangan"]] },
];
function DetailModal({ r, onClose }: { r: Record_; onClose: () => void }) {
  const d = r.detail ?? {};
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-navy-900/10 px-5 py-4">
          <div>
            <p className="font-mono text-xs font-bold text-bpom-600">{r.nomor}</p>
            <h3 className="text-lg font-extrabold text-navy-900">{r.nama_konsumen}</h3>
            <p className="text-xs text-navy-400">{r.unit_pelayanan_label} • {r.tanggal_layanan_label} • {r.jenis_layanan_label}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-navy-50"><X className="size-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {SECTIONS.map((sec) => {
            const block = (d[sec.key] ?? {}) as Record<string, string>;
            const rows = sec.fields.filter(([k]) => block[k]);
            if (rows.length === 0) return null;
            return (
              <div key={sec.key} className="mb-4">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-navy-400">{sec.title}</p>
                <div className="overflow-hidden rounded-xl border border-navy-900/5">
                  {rows.map(([k, lbl], i) => (
                    <div key={k} className={cn("grid grid-cols-3 gap-2 px-3 py-2 text-sm", i % 2 === 0 && "bg-navy-50/40")}>
                      <span className="text-navy-500">{lbl}</span>
                      <span className="col-span-2 font-medium text-navy-800">{block[k]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 border-t border-navy-900/10 px-5 py-3.5">
          <Button variant="outline" className="flex-1" onClick={() => downloadFile(`/layanan-konsumen/${r.id}/word`, `Layanan-${r.nomor.replace(/\//g, "-")}.doc`)}><FileText className="size-4" /> Word</Button>
          <Button variant="outline" className="flex-1" onClick={() => downloadFile(`/layanan-konsumen/${r.id}/pdf`, `Layanan-${r.nomor.replace(/\//g, "-")}.pdf`)}><FileDown className="size-4" /> PDF</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
