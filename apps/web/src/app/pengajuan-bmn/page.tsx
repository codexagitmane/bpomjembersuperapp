"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Wrench, Plus, X, Check, ChevronLeft, ChevronRight, ClipboardList, PackageOpen, ShieldCheck,
  Eye, Clock, CheckCircle2, QrCode, Inbox, CircleDot, FileDown, FileUp, Boxes, ZoomIn, ZoomOut, RotateCcw, Search, History,
  Pencil, Trash2, CalendarClock, FileBarChart2, CreditCard, FileSpreadsheet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea, Select } from "@/components/ui/Field";
import { api, downloadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { extractApiErrorMessage } from "@bpom/shared";
import { cn, formatTanggalIndonesia } from "@/lib/utils";

interface Row {
  id: number;
  nomor_permohonan: string;
  tanggal_permohonan: string;
  nama_bmn: string | null;
  no_bmn: string | null;
  deskripsi_kerusakan: string;
  status: string;
  pemohon: string;
  pengelola_bmn: string | null;
  pengelola_bmn_id: number | null;
}
interface TtdSlot { nama: string | null; signed: boolean; qr: string | null }
interface Detail extends Row {
  nip: string | null; jabatan: string | null; kelompok_substansi: string | null; lokasi: string | null; kondisi: string | null;
  kerusakan_mulai: string | null; tindakan: string | null; tanggal_diperbaiki: string | null;
  selesai_tanggal: string | null; keterangan_perbaikan: string | null; catatan_penyelesaian: string | null;
  foto_url: string | null;
  ttd: { pemohon: TtdSlot; pengelola: TtdSlot; kasubag: TtdSlot };
  timeline: { label: string; at: string }[];
}
interface BmnOpt { id: number; kode_barang: string; nama_barang: string; lokasi: string | null }
interface PengelolaOpt { id: number; name: string; jabatan: string | null }

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  diajukan: { label: "Menunggu Pengelola BMN", tone: "warning" },
  diperbaiki: { label: "Menunggu Kasubag TU", tone: "info" },
  selesai: { label: "Selesai", tone: "success" },
  ditolak: { label: "Ditolak", tone: "danger" },
};
const today = () => new Date().toISOString().slice(0, 10);

export default function PengajuanBmnPage() {
  const { user } = useAuth();
  const isSuper = user?.role === "superadmin";
  const isKasubag = !!user && ["superadmin", "kepala_subag_tu"].includes(user.role);
  const isPimpinan = !!user && ["superadmin", "kepala_balai", "kepala_subag_tu"].includes(user.role);
  const isPengelola = !!user?.is_pengelola_bmn;
  const bisaAntrean = isPimpinan || isPengelola;

  const actionable = useCallback((r: Row) =>
    (r.status === "diajukan" && (isSuper || r.pengelola_bmn_id === user?.id)) ||
    (r.status === "diperbaiki" && isKasubag), [isSuper, isKasubag, user?.id]);

  const [tab, setTab] = useState<"saya" | "antrean" | "daftar" | "jadwal" | "laporan" | "kartu">("saya");
  const [rows, setRows] = useState<Row[]>([]);
  const [perlu, setPerlu] = useState(0);
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function importExcel(file: File) {
    setImporting(true); setImportMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/pengajuan-bmn/bmn-import", fd);
      setImportMsg(data.message ?? "Impor selesai.");
    } catch (e) {
      setImportMsg(extractApiErrorMessage(e));
    } finally { setImporting(false); }
  }

  const loadCount = useCallback(async () => {
    if (!bisaAntrean) return;
    try {
      const { data } = await api.get("/pengajuan-bmn-semua");
      setPerlu((data.data ?? []).filter(actionable).length);
    } catch { /* abaikan */ }
  }, [bisaAntrean, actionable]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = tab === "antrean" ? "/pengajuan-bmn-semua" : "/pengajuan-bmn";
      const { data } = await api.get(url);
      setRows(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCount(); }, [loadCount]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy-900 sm:text-2xl">
              <Wrench className="size-6 shrink-0 text-bpom-600" /> Pengajuan Pemeliharaan dan Perbaikan BMN
            </h1>
            <p className="mt-1 text-sm text-navy-500">Permohonan perbaikan Barang Milik Negara dengan tanda tangan berjenjang.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {bisaAntrean && (
              <>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importExcel(f); e.target.value = ""; }} />
                <Button variant="outline" loading={importing} onClick={() => fileRef.current?.click()}><FileUp className="size-4" /> Import BMN</Button>
                <Button variant="outline" onClick={() => downloadFile("/pengajuan-bmn/export", `Pemeliharaan-BMN-${today()}.xlsx`)}><FileDown className="size-4" /> Export Excel</Button>
              </>
            )}
            <Button onClick={() => setWizard(true)}><Plus className="size-4" /> Buat Permohonan</Button>
          </div>
        </div>

        {importMsg && <div className="mt-3 rounded-xl bg-navy-50 px-4 py-2.5 text-sm font-medium text-navy-700">{importMsg}</div>}

        {bisaAntrean && (
          <div className="mt-4 inline-flex flex-wrap rounded-2xl border border-navy-900/5 bg-white p-1 shadow-sm">
            <TabBtn active={tab === "saya"} onClick={() => setTab("saya")} icon={<ClipboardList className="size-4" />}>Permohonan Saya</TabBtn>
            <TabBtn active={tab === "antrean"} onClick={() => setTab("antrean")} icon={<Inbox className="size-4" />}>
              Perlu Tindakan
              {perlu > 0 && (
                <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold leading-5 text-white">
                  {perlu}
                </span>
              )}
            </TabBtn>
            <TabBtn active={tab === "daftar"} onClick={() => setTab("daftar")} icon={<Boxes className="size-4" />}>Daftar BMN</TabBtn>
            <TabBtn active={tab === "jadwal"} onClick={() => setTab("jadwal")} icon={<CalendarClock className="size-4" />}>Jadwal Pemeliharaan</TabBtn>
            <TabBtn active={tab === "laporan"} onClick={() => setTab("laporan")} icon={<FileBarChart2 className="size-4" />}>Laporan Pemeliharaan</TabBtn>
            <TabBtn active={tab === "kartu"} onClick={() => setTab("kartu")} icon={<CreditCard className="size-4" />}>Kartu Pemeliharaan</TabBtn>
          </div>
        )}

        {tab === "jadwal" ? (
          <JadwalPemeliharaan />
        ) : tab === "laporan" ? (
          <LaporanPemeliharaan />
        ) : tab === "kartu" ? (
          <KartuPemeliharaan />
        ) : tab === "daftar" ? (
          <DaftarBmn key={importMsg /* refresh setelah import */} />
        ) : (
        <div className="mt-4 space-y-3">
          {loading && [...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-navy-100/60" />)}
          {!loading && rows.length === 0 && (
            <Card className="flex flex-col items-center gap-2 py-14 text-center">
              <Wrench className="size-9 text-navy-200" />
              <p className="text-sm font-semibold text-navy-600">
                {tab === "antrean" ? "Tidak ada permohonan untuk Anda tindak lanjuti." : "Belum ada permohonan. Klik “Buat Permohonan”."}
              </p>
            </Card>
          )}
          {rows.map((r) => {
            const st = STATUS[r.status] ?? { label: r.status, tone: "neutral" as const };
            return (
              <Card key={r.id} className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-bpom-600">{r.nomor_permohonan}</span>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <p className="mt-1 font-bold text-navy-900">{r.nama_bmn}{r.no_bmn ? <span className="ml-1 text-xs font-normal text-navy-400">({r.no_bmn})</span> : null}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-navy-500">{r.deskripsi_kerusakan}</p>
                    <p className="mt-1 text-[11px] text-navy-400">
                      {r.tanggal_permohonan} • Pemohon: {r.pemohon} • Pengelola: {r.pengelola_bmn ?? "—"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setDetailId(r.id)}><Eye className="size-4" /> Detail</Button>
                </div>
              </Card>
            );
          })}
        </div>
        )}
      </div>

      <AnimatePresence>
        {wizard && <Wizard onClose={() => setWizard(false)} onSaved={() => { setWizard(false); setTab("saya"); load(); }} />}
        {detailId != null && (
          <DetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={() => { load(); loadCount(); }} />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
      active ? "bg-navy-900 text-white" : "text-navy-500 hover:text-navy-800")}>{icon}{children}</button>
  );
}

const inputCls = "w-full rounded-xl border border-navy-900/10 bg-white px-3 py-2.5 text-sm text-navy-900 outline-none focus:border-bpom-500";
const STEPS = ["Informasi Kendala", "Tinjau & TTD"];

/* ============================= WIZARD ============================= */
function Wizard({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [pengelola, setPengelola] = useState<PengelolaOpt[]>([]);
  const [bmnOpts, setBmnOpts] = useState<BmnOpt[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    pengelola_bmn_id: "", nama_pemohon: user?.name ?? "", nip: user?.nip_nik ?? "", jabatan: user?.jabatan ?? "",
    kelompok_substansi: user?.kelompok_substansi ?? "",
    bmn_item_id: "", nama_barang_lain: "", no_bmn: "", lokasi: "", kondisi: "", kerusakan_mulai: "", deskripsi_kerusakan: "",
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    // Tujuan Pengelola BMN tunggal (Qithfirul) → otomatis terpilih, tak perlu dropdown.
    api.get("/pengajuan-bmn/pengelola-bmn").then(({ data }) => {
      const list = data.data ?? [];
      setPengelola(list);
      if (list[0]) setF((s) => ({ ...s, pengelola_bmn_id: String(list[0].id) }));
    }).catch(() => {});
    api.get("/pengajuan-bmn/bmn-list").then(({ data }) => setBmnOpts(data.data ?? [])).catch(() => {});
  }, []);

  // Preview foto (revoke saat ganti/tutup).
  useEffect(() => {
    if (!foto) { setFotoUrl(null); return; }
    const url = URL.createObjectURL(foto);
    setFotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  function pickBmn(id: string) {
    const it = bmnOpts.find((b) => String(b.id) === id);
    setF((s) => ({ ...s, bmn_item_id: id, nama_barang_lain: it?.nama_barang ?? "", no_bmn: it?.kode_barang ?? "", lokasi: it?.lokasi ?? "" }));
  }

  const kendalaOk = !!((f.bmn_item_id || f.nama_barang_lain.trim()) && f.no_bmn.trim() && f.kerusakan_mulai && f.deskripsi_kerusakan.trim());

  async function submit() {
    setSaving(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append("pengelola_bmn_id", f.pengelola_bmn_id);
      fd.append("nama_pemohon", f.nama_pemohon);
      fd.append("nip", f.nip);
      fd.append("jabatan", f.jabatan);
      fd.append("kelompok_substansi", f.kelompok_substansi);
      if (f.bmn_item_id) fd.append("bmn_item_id", f.bmn_item_id);
      fd.append("nama_barang_lain", f.nama_barang_lain);
      fd.append("no_bmn", f.no_bmn);
      fd.append("lokasi", f.lokasi);
      if (f.kondisi) fd.append("kondisi", f.kondisi);
      fd.append("kerusakan_mulai", f.kerusakan_mulai);
      fd.append("deskripsi_kerusakan", f.deskripsi_kerusakan);
      if (foto) fd.append("foto", foto);
      await api.post("/pengajuan-bmn", fd);
      onSaved();
    } catch (e) {
      setErr(extractApiErrorMessage(e));
    } finally { setSaving(false); }
  }

  return (
    <Sheet onClose={onClose} title="Form Permohonan Perbaikan">
      {/* steps */}
      <div className="border-b border-navy-900/10 px-5 pb-3.5 pt-3">
        <div className="flex items-start">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div className={cn("h-0.5 flex-1 rounded-full", i === 0 ? "opacity-0" : i <= step ? "bg-bpom-500" : "bg-navy-200")} />
                <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all",
                  i < step ? "bg-bpom-500 text-white"
                    : i === step ? "bg-gradient-to-br from-bpom-500 to-bpom-600 text-white shadow-md ring-4 ring-bpom-500/15"
                      : "bg-navy-100 text-navy-400")}>
                  {i < step ? <Check className="size-4" /> : i + 1}
                </div>
                <div className={cn("h-0.5 flex-1 rounded-full", i === STEPS.length - 1 ? "opacity-0" : i < step ? "bg-bpom-500" : "bg-navy-200")} />
              </div>
              <span className={cn("mt-1.5 text-center text-[11px] font-semibold leading-tight",
                i === step ? "text-navy-900" : i < step ? "text-bpom-600" : "text-navy-400")}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.18 }}>
            {step === 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-navy-50/60 p-2.5 text-xs text-navy-500 sm:col-span-2">
                  Pemohon <b>{user?.name}</b> ({f.kelompok_substansi || "—"}) & tujuan Pengelola BMN terisi otomatis dari akun Anda. Lengkapi informasi kendala di bawah.
                </div>
                <Select label="Nama BMN *" value={f.bmn_item_id} onChange={(e) => pickBmn(e.target.value)}>
                  <option value="">— Pilih Barang —</option>
                  {bmnOpts.map((b) => <option key={b.id} value={b.id}>{b.nama_barang}</option>)}
                </Select>
                <Input label="No. BMN *" value={f.no_bmn} onChange={(e) => set("no_bmn", e.target.value)} />
                <Input label="Lokasi" value={f.lokasi} onChange={(e) => set("lokasi", e.target.value)} />
                <Select label="Kondisi BMN" value={f.kondisi} onChange={(e) => set("kondisi", e.target.value)}>
                  <option value="">— Pilih Kondisi —</option>
                  <option value="rusak_ringan">Rusak Ringan</option>
                  <option value="rusak_sedang">Rusak Sedang</option>
                  <option value="rusak_berat">Rusak Berat</option>
                </Select>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-navy-800">Kerusakan Mulai Tgl *
                  <input type="date" value={f.kerusakan_mulai} onChange={(e) => set("kerusakan_mulai", e.target.value)} className={inputCls} /></label>
                <div className="sm:col-span-2"><Textarea label="Deskripsi Kerusakan *" value={f.deskripsi_kerusakan} onChange={(e) => set("deskripsi_kerusakan", e.target.value)} placeholder="Uraikan masalah/indikasi kerusakan…" /></div>
                <div className="sm:col-span-2">
                  <p className="mb-1 text-sm font-medium text-navy-800">Foto / Screenshot kendala</p>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <input type="file" accept="image/png,image/jpeg" onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy-700" />
                      <p className="mt-1 text-[11px] text-navy-400">Opsional. Maksimal 2 MB (JPG/PNG).</p>
                    </div>
                    {fotoUrl && (
                      <div className="flex shrink-0 flex-col items-center gap-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={fotoUrl} alt="Pratinjau" className="size-16 rounded-lg border border-navy-900/10 object-cover" />
                        <button type="button" onClick={() => setFoto(null)} className="text-[11px] font-semibold text-rose-500 hover:underline">Hapus</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {step === 1 && (
              <div>
                <div className="rounded-xl bg-bpom-50 p-3 text-xs text-bpom-800">
                  <ShieldCheck className="mr-1 inline size-4" /> Dengan mengirim, Anda menandatangani permohonan ini. Token TTE &amp; QR-Code dibuat di server (berisi payload &amp; HMAC yang dapat diverifikasi).
                </div>
                <div className="mt-3 divide-y divide-navy-900/5 overflow-hidden rounded-xl border border-navy-900/5">
                  <RevRow k="Pengelola BMN" v={pengelola.find((p) => String(p.id) === f.pengelola_bmn_id)?.name ?? "—"} />
                  <RevRow k="Pemohon" v={`${user?.name} (${user?.nip_nik ?? "-"})`} />
                  <RevRow k="Jabatan / Kel. Substansi" v={`${f.jabatan} — ${f.kelompok_substansi}`} />
                  <RevRow k="BMN" v={`${f.nama_barang_lain} (${f.no_bmn})`} />
                  <RevRow k="Kerusakan mulai" v={f.kerusakan_mulai} />
                  <RevRow k="Deskripsi" v={f.deskripsi_kerusakan} />
                  <RevRow k="Lampiran" v={foto ? foto.name : "Tanpa foto"} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{err}</p>}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-navy-900/10 px-5 py-3.5">
        <Button variant="ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>
          <ChevronLeft className="size-4" /> {step === 0 ? "Batal" : "Sebelumnya"}
        </Button>
        {step < 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!kendalaOk}>Lanjut <ChevronRight className="size-4" /></Button>
        ) : (
          <Button variant="secondary" loading={saving} onClick={submit}><Check className="size-4" /> Kirim Permohonan</Button>
        )}
      </div>
    </Sheet>
  );
}

function RevRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 px-3 py-2 text-sm">
      <span className="text-navy-500">{k}</span>
      <span className="col-span-2 font-medium text-navy-800">{v}</span>
    </div>
  );
}

/* ============================= DETAIL ============================= */
function DetailModal({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const { user } = useAuth();
  const [d, setD] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [form, setForm] = useState({ tindakan: "", tanggal_diperbaiki: today(), keterangan_perbaikan: "", selesai_tanggal: today() });

  const load = useCallback(async () => {
    const { data } = await api.get(`/pengajuan-bmn/${id}`);
    setD(data.data);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const isKasubag = !!user && ["kepala_subag_tu", "superadmin"].includes(user.role);
  const isSelectedPengelola = !!d && (d.pengelola_bmn_id === user?.id || user?.role === "superadmin");
  const canProses = d?.status === "diajukan" && isSelectedPengelola;
  const canSelesai = d?.status === "diperbaiki" && isKasubag;

  async function proses() {
    if (!form.tindakan.trim()) return setMsg("Isi tindakan perbaikan.");
    setBusy(true); setMsg(null);
    try {
      await api.patch(`/pengajuan-bmn/${id}/proses`, { tindakan: form.tindakan, tanggal_diperbaiki: form.tanggal_diperbaiki });
      await load(); onChanged();
    } catch (e) { setMsg(extractApiErrorMessage(e)); } finally { setBusy(false); }
  }
  async function selesaikan() {
    setBusy(true); setMsg(null);
    try {
      // Tanggal selesai mengikuti tanggal diperbaiki (diisi Pengelola BMN) — tak perlu input Kasubag.
      await api.patch(`/pengajuan-bmn/${id}/selesaikan`, { keterangan_perbaikan: form.keterangan_perbaikan });
      await load(); onChanged();
    } catch (e) { setMsg(extractApiErrorMessage(e)); } finally { setBusy(false); }
  }

  const st = d ? STATUS[d.status] ?? { label: d.status, tone: "neutral" as const } : null;

  return (
    <Sheet onClose={onClose} title="Detail Permohonan Perbaikan" wide
      headerAction={d && d.ttd.pemohon.signed && d.ttd.pengelola.signed && d.ttd.kasubag.signed && (
        <button onClick={() => downloadFile(`/pengajuan-bmn/${id}/pdf`, `Permohonan-Perbaikan-${d.nomor_permohonan.replace(/\//g, "-")}.pdf`)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/25">
          <FileDown className="size-4" /> Cetak PDF
        </button>
      )}>
      {!d ? (
        <div className="flex-1 space-y-3 p-5">{[...Array(4)].map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-navy-100/60" />)}</div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Kiri: info */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-bpom-600">{d.nomor_permohonan}</span>
                {st && <Badge tone={st.tone}>{st.label}</Badge>}
              </div>
              <Section title="Detail Permohonan" />
              <Grid rows={[["Tanggal Permohonan", d.tanggal_permohonan], ["Tujuan (Pengelola BMN)", d.pengelola_bmn ?? "—"]]} />
              <Section title="Informasi Pemohon" />
              <Grid rows={[["NIP", d.nip ?? "—"], ["Nama Pemohon", d.pemohon], ["Jabatan", d.jabatan ?? "—"], ["Kelompok Substansi", d.kelompok_substansi ?? "—"]]} />
              <Section title="Informasi Kerusakan" />
              <Grid rows={[["Nama BMN", d.nama_bmn ?? "—"], ["No. BMN", d.no_bmn ?? "—"], ["Lokasi", d.lokasi ?? "—"], ["Kondisi", d.kondisi ?? "—"], ["Kerusakan mulai", d.kerusakan_mulai ?? "—"]]} />
              <div className="mt-2 rounded-xl bg-navy-50/60 p-3 text-sm">
                <p className="text-xs font-semibold text-navy-400">Deskripsi Kerusakan</p>
                <p className="mt-0.5 text-navy-800">{d.deskripsi_kerusakan}</p>
              </div>
              {(d.tindakan || d.keterangan_perbaikan) && (
                <>
                  <Section title="Tindak Lanjut Pengelola" />
                  <Grid rows={[["Tindakan", d.tindakan ?? "—"], ["Tanggal diperbaiki", d.tanggal_diperbaiki ?? "—"], ["Selesai tanggal", d.selesai_tanggal ?? "—"]]} />
                  {d.keterangan_perbaikan && (
                    <div className="mt-2 rounded-xl bg-navy-50/60 p-3 text-sm">
                      <p className="text-xs font-semibold text-navy-400">Keterangan Perbaikan</p>
                      <p className="mt-0.5 text-navy-800">{d.keterangan_perbaikan}</p>
                    </div>
                  )}
                </>
              )}
              {d.status === "ditolak" && d.catatan_penyelesaian && (
                <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-600">Ditolak: {d.catatan_penyelesaian}</p>
              )}

              {/* Aksi tanda tangan */}
              {canProses && (
                <div className="mt-4 rounded-xl border border-bpom-200 bg-bpom-50/50 p-4">
                  <p className="mb-2 text-sm font-bold text-navy-800">Tindak Lanjut &amp; Tanda Tangan (Pengelola BMN)</p>
                  <Textarea label="Tindakan Perbaikan" value={form.tindakan} onChange={(e) => setForm({ ...form, tindakan: e.target.value })} className="min-h-16" />
                  <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium text-navy-800">Tanggal Diperbaiki
                    <input type="date" value={form.tanggal_diperbaiki} onChange={(e) => setForm({ ...form, tanggal_diperbaiki: e.target.value })} className={inputCls} /></label>
                  <Button className="mt-3 w-full" variant="secondary" loading={busy} onClick={proses}><Check className="size-4" /> Proses &amp; Tanda Tangan</Button>
                </div>
              )}
              {canSelesai && (
                <div className="mt-4 rounded-xl border border-bpom-200 bg-bpom-50/50 p-4">
                  <p className="mb-2 text-sm font-bold text-navy-800">Pengesahan Selesai (Kasubag TU)</p>
                  <Textarea label="Keterangan / Feedback (opsional)" value={form.keterangan_perbaikan} onChange={(e) => setForm({ ...form, keterangan_perbaikan: e.target.value })} className="min-h-16" />
                  <p className="mt-2 text-[11px] text-navy-400">Tanggal selesai otomatis mengikuti tanggal diperbaiki oleh Pengelola BMN{d.tanggal_diperbaiki ? ` (${d.tanggal_diperbaiki})` : ""}.</p>
                  <Button className="mt-3 w-full" variant="secondary" loading={busy} onClick={selesaikan}><CheckCircle2 className="size-4" /> Setujui &amp; Tanda Tangan</Button>
                </div>
              )}
              {msg && <p className="mt-3 text-sm font-medium text-rose-600">{msg}</p>}
            </div>

            {/* Kanan: status + TTE/QR + foto */}
            <div className="space-y-4">
              <Card className="!p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-navy-800">Status</p>
                  {st && <Badge tone={st.tone}>{st.label}</Badge>}
                </div>
                <div className="mt-3 space-y-3">
                  {d.timeline.map((t, i) => (
                    <div key={i} className="flex gap-2.5">
                      <div className="flex flex-col items-center">
                        <CircleDot className="size-4 text-bpom-500" />
                        {i < d.timeline.length - 1 && <div className="my-0.5 w-px flex-1 bg-navy-200" />}
                      </div>
                      <div className="pb-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-navy-400">{t.label}</p>
                        <p className="text-sm text-navy-700">{t.at}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="!p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-navy-800"><QrCode className="size-4" /> TTE &amp; QR</p>
                <div className="mt-3 space-y-3">
                  {([["Pemohon", d.ttd.pemohon], ["Pengelola BMN", d.ttd.pengelola], ["Kasubag TU", d.ttd.kasubag]] as const).map(([lbl, slot]) => (
                    <div key={lbl} className="flex items-center gap-3">
                      <button type="button" onClick={() => slot.qr && setLightbox(slot.qr)} disabled={!slot.qr}
                        className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-navy-900/10 bg-white">
                        {slot.qr ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={slot.qr} alt="QR" className="size-11" />
                        ) : (
                          <Clock className="size-5 text-navy-300" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-navy-800">{lbl}</p>
                        <p className={cn("text-xs font-medium", slot.signed ? "text-bpom-600" : "text-navy-400")}>
                          {slot.signed ? `Sudah TTD${slot.nama ? ` — ${slot.nama}` : ""}` : "Belum TTD"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {d.foto_url && (
                <Card className="!p-4">
                  <p className="mb-2 text-sm font-bold text-navy-800">Lampiran Foto</p>
                  <button type="button" onClick={() => setLightbox(d.foto_url!)} className="block w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.foto_url} alt="Lampiran" className="w-full cursor-zoom-in rounded-lg transition hover:opacity-90" />
                  </button>
                  <p className="mt-1 text-center text-[11px] text-navy-400">Klik untuk perbesar</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </Sheet>
  );
}

/* ============================= LIGHTBOX (zoom) ============================= */
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/80 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute right-4 top-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <IconRound onClick={() => setScale((s) => Math.min(s + 0.25, 4))}><ZoomIn className="size-5" /></IconRound>
        <IconRound onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}><ZoomOut className="size-5" /></IconRound>
        <IconRound onClick={() => setScale(1)}><RotateCcw className="size-5" /></IconRound>
        <IconRound onClick={onClose}><X className="size-5" /></IconRound>
      </div>
      <div className="max-h-[88vh] max-w-[92vw] overflow-auto" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Pratinjau" style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
          className="max-h-[88vh] max-w-[92vw] select-none rounded-lg transition-transform" />
      </div>
      <p className="absolute bottom-4 text-xs text-white/70" onClick={(e) => e.stopPropagation()}>{Math.round(scale * 100)}%</p>
    </motion.div>
  );
}
function IconRound({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
      {children}
    </button>
  );
}

function Section({ title }: { title: string }) {
  return <p className="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wide text-navy-400">{title}</p>;
}
function Grid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-navy-900/5">
      {rows.map(([k, v], i) => (
        <div key={k} className={cn("grid grid-cols-3 gap-2 px-3 py-2 text-sm", i % 2 === 0 && "bg-navy-50/40")}>
          <span className="text-navy-500">{k}</span>
          <span className="col-span-2 font-medium text-navy-800">{v}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================= DAFTAR BMN + RIWAYAT ============================= */
interface BmnRow { id: number; kode_barang: string; nup: string | null; nama_barang: string; jenis_bmn: string | null; lokasi: string | null; kondisi: string; tahun_perolehan: number | null; foto_path?: string | null; bast_path?: string | null }
const KONDISI_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  baik: { label: "Baik", tone: "success" },
  rusak_ringan: { label: "Rusak Ringan", tone: "warning" },
  rusak_sedang: { label: "Rusak Sedang", tone: "warning" },
  rusak_berat: { label: "Rusak Berat", tone: "danger" },
};

function DaftarBmn() {
  const { user } = useAuth();
  const canManage = !!user && (!!user.is_pengelola_bmn || ["superadmin", "kepala_subag_tu"].includes(user.role));
  const [items, setItems] = useState<BmnRow[]>([]);
  const [q, setQ] = useState("");
  // Filter per-kolom (SIMAK-style).
  const [col, setCol] = useState({ nama_barang: "", kode_barang: "", jenis_bmn: "", lokasi: "", kondisi: "" });
  const setColF = (k: string, v: string) => setCol((s) => ({ ...s, [k]: v }));
  const [loading, setLoading] = useState(true);
  const [riwayatId, setRiwayatId] = useState<number | null>(null);
  const [form, setForm] = useState<BmnRow | null | "new">(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/pengajuan-bmn/bmn-list").then(({ data }) => setItems(data.data ?? [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function hapus(i: BmnRow) {
    if (!confirm(`Hapus BMN "${i.nama_barang}"?`)) return;
    await api.delete(`/pengajuan-bmn/bmn/${i.id}`);
    load();
  }

  // Unduh QR master aset + tanda internal "Si Pandu Aja" di tengah (dikomposit di kanvas).
  async function unduhQr(i: BmnRow) {
    const { data } = await api.get(`/pengajuan-bmn/bmn/${i.id}/qr`);
    const d = data.data as { qr: string; nama: string; no_bmn: string };
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("qr")); img.src = d.qr; });

    const W = 520, QR = 420, PAD = 50, CAPTION = 92;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = QR + PAD * 2 + CAPTION;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, PAD, PAD, QR, QR);

    // Tanda internal Si Pandu Aja di tengah QR — kotak putih + logo maskot (fallback lentera).
    const cx = W / 2, cy = PAD + QR / 2, box = 96;
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath(); ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    };
    ctx.save();
    ctx.shadowColor = "rgba(11,31,58,0.18)"; ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffffff"; rr(cx - box / 2, cy - box / 2, box, box, 20); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 2.5; rr(cx - box / 2, cy - box / 2, box, box, 20); ctx.stroke();
    // Coba muat logo maskot Si Pandu Aja; jika tidak ada, gambar lentera sebagai fallback.
    const logo = new Image();
    // Turunan 192 px sudah cukup untuk kotak tengah QR dan jauh lebih ringan
    // daripada berkas asli 1254 px.
    const logoOk = await new Promise<boolean>((res) => { logo.onload = () => res(true); logo.onerror = () => res(false); logo.src = "/pandu-mascot-192.png"; });
    if (logoOk) {
      const pad = 12, s = box - pad * 2;
      ctx.save(); rr(cx - s / 2, cy - s / 2, s, s, 12); ctx.clip();
      ctx.drawImage(logo, cx - s / 2, cy - s / 2, s, s); ctx.restore();
    } else {
      ctx.strokeStyle = "#0B1F3A"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy - 26, 6, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = "#0B1F3A"; rr(cx - 12, cy - 22, 24, 5, 2); ctx.fill();
      ctx.fillStyle = "#16a34a"; rr(cx - 13, cy - 6, 26, 26, 6); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.font = "bold 7px system-ui"; ctx.textAlign = "center"; ctx.fillText("PANDU", cx, cy + 10);
      ctx.fillStyle = "#0B1F3A"; rr(cx - 9, cy + 20, 18, 4, 2); ctx.fill();
    }

    // Caption
    ctx.textAlign = "center"; ctx.fillStyle = "#0B1F3A";
    ctx.font = "bold 22px system-ui"; ctx.fillText(d.nama.slice(0, 34), cx, QR + PAD * 2 + 12);
    ctx.font = "14px system-ui"; ctx.fillStyle = "#5b6b86";
    ctx.fillText(`No. BMN ${d.no_bmn}`, cx, QR + PAD * 2 + 36);
    ctx.font = "italic 12px system-ui"; ctx.fillStyle = "#16a34a";
    ctx.fillText("Si Pandu Aja — Aset Internal Balai POM di Jember", cx, QR + PAD * 2 + 60);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `QR-${d.no_bmn.replaceAll("/", "-")}.png`; a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  const kl = (v: string | null | undefined) => (v ?? "").toLowerCase();
  const filtered = items.filter((i) =>
    [i.nama_barang, i.kode_barang, i.nup, i.jenis_bmn].some((v) => kl(v).includes(q.toLowerCase())) &&
    kl(i.nama_barang).includes(col.nama_barang.toLowerCase()) &&
    (kl(i.kode_barang).includes(col.kode_barang.toLowerCase()) || kl(i.nup).includes(col.kode_barang.toLowerCase())) &&
    kl(i.jenis_bmn).includes(col.jenis_bmn.toLowerCase()) &&
    kl(i.lokasi).includes(col.lokasi.toLowerCase()) &&
    (!col.kondisi || i.kondisi === col.kondisi));
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [q, col]);
  const paged = filtered.slice((page - 1) * 10, page * 10);

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / nomor / NUP BMN…"
            className="w-full rounded-xl border border-navy-900/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-bpom-500" />
        </div>
        {canManage && (
          <>
            <Button variant="outline" size="sm" onClick={() => downloadFile("/pengajuan-bmn/bmn-template", "Template-Import-BMN.xlsx")}>
              <FileDown className="size-4" /> Template Excel
            </Button>
            <Button size="sm" onClick={() => setForm("new")}><Plus className="size-4" /> Tambah BMN</Button>
          </>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-navy-900/5 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-navy-900/10 bg-navy-50/60 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-4 py-3 font-bold">Nama BMN</th>
                <th className="px-4 py-3 font-bold">No. BMN / NUP</th>
                <th className="px-4 py-3 font-bold">Jenis</th>
                <th className="px-4 py-3 font-bold">Lokasi</th>
                <th className="px-4 py-3 font-bold">Kondisi</th>
                <th className="px-4 py-3 text-right font-bold">Aksi</th>
              </tr>
              <tr className="border-b border-navy-900/5 bg-white">
                {[["nama_barang", "Cari nama…"], ["kode_barang", "No./NUP…"], ["jenis_bmn", "Jenis…"], ["lokasi", "Lokasi…"]].map(([k, ph]) => (
                  <th key={k} className="px-2 py-2">
                    <input value={col[k as keyof typeof col]} onChange={(e) => setColF(k, e.target.value)} placeholder={ph}
                      className="w-full rounded-lg border border-navy-900/10 bg-white px-2 py-1.5 text-xs font-normal outline-none focus:border-bpom-500" />
                  </th>
                ))}
                <th className="px-2 py-2">
                  <select value={col.kondisi} onChange={(e) => setColF("kondisi", e.target.value)} className="w-full rounded-lg border border-navy-900/10 bg-white px-2 py-1.5 text-xs font-normal">
                    <option value="">Semua</option>
                    <option value="baik">Baik</option>
                    <option value="rusak_ringan">Rusak Ringan</option>
                    <option value="rusak_sedang">Rusak Sedang</option>
                    <option value="rusak_berat">Rusak Berat</option>
                  </select>
                </th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/5">
              {loading && [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-navy-100/60" /></td></tr>)}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-navy-400">Belum ada BMN. Tambah manual atau import via Excel (unduh Template dulu).</td></tr>}
              {paged.map((i) => {
                const k = KONDISI_LABEL[i.kondisi] ?? { label: i.kondisi, tone: "neutral" as const };
                return (
                  <tr key={i.id} className="hover:bg-navy-50/40">
                    <td className="cursor-pointer px-4 py-3 font-semibold text-navy-900" onClick={() => setRiwayatId(i.id)}>
                      {i.nama_barang}{i.tahun_perolehan ? <span className="ml-1 text-xs font-normal text-navy-400">({i.tahun_perolehan})</span> : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-navy-600">{i.kode_barang}{i.nup ? ` • NUP ${i.nup}` : ""}</td>
                    <td className="px-4 py-3 text-navy-600">{i.jenis_bmn ?? "—"}</td>
                    <td className="px-4 py-3 text-navy-600">{i.lokasi ?? "—"}</td>
                    <td className="px-4 py-3"><Badge tone={k.tone}>{k.label}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setRiwayatId(i.id)} title="Riwayat & QR" className="flex size-8 items-center justify-center rounded-lg text-bpom-600 hover:bg-bpom-50"><History className="size-4" /></button>
                        {canManage && (
                          <>
                            <button onClick={() => unduhQr(i)} title="Unduh QR aset" className="flex size-8 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-100"><QrCode className="size-4" /></button>
                            <button onClick={() => setForm(i)} title="Edit" className="flex size-8 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-100"><Pencil className="size-4" /></button>
                            <button onClick={() => hapus(i)} title="Hapus" className="flex size-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="size-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Paginator page={page} setPage={setPage} total={filtered.length} />
      </div>
      <p className="mt-2 text-right text-xs text-navy-400">{filtered.length} dari {items.length} BMN</p>
      <AnimatePresence>
        {riwayatId != null && <RiwayatModal id={riwayatId} onClose={() => setRiwayatId(null)} />}
        {form != null && <BmnFormModal item={form === "new" ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      </AnimatePresence>
    </div>
  );
}

function BmnFormModal({ item, onClose, onSaved }: { item: BmnRow | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    nama_barang: item?.nama_barang ?? "", kode_barang: item?.kode_barang ?? "", nup: item?.nup ?? "",
    jenis_bmn: item?.jenis_bmn ?? "", lokasi: item?.lokasi ?? "", kondisi: item?.kondisi ?? "baik",
    tahun_perolehan: item?.tahun_perolehan ? String(item.tahun_perolehan) : "",
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [bast, setBast] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  useEffect(() => { if (!foto) { setFotoUrl(null); return; } const u = URL.createObjectURL(foto); setFotoUrl(u); return () => URL.revokeObjectURL(u); }, [foto]);

  async function simpan() {
    if (!f.nama_barang.trim() || !f.kode_barang.trim()) return setErr("Nama & Nomor BMN wajib diisi.");
    setSaving(true); setErr(null);
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => v && fd.append(k, v));
      if (foto) fd.append("foto", foto);
      if (bast) fd.append("bast", bast);
      await api.post(item ? `/pengajuan-bmn/bmn/${item.id}` : "/pengajuan-bmn/bmn", fd);
      onSaved();
    } catch (e) { setErr(extractApiErrorMessage(e)); } finally { setSaving(false); }
  }

  return (
    <Sheet onClose={onClose} title={item ? "Edit BMN" : "Tambah BMN"}>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Input label="Nama BMN *" value={f.nama_barang} onChange={(e) => set("nama_barang", e.target.value)} /></div>
          <Input label="Nomor BMN *" value={f.kode_barang} onChange={(e) => set("kode_barang", e.target.value)} />
          <Input label="NUP" value={f.nup} onChange={(e) => set("nup", e.target.value)} />
          <Input label="Jenis BMN" value={f.jenis_bmn} onChange={(e) => set("jenis_bmn", e.target.value)} />
          <Input label="Lokasi" value={f.lokasi} onChange={(e) => set("lokasi", e.target.value)} />
          <Select label="Kondisi" value={f.kondisi} onChange={(e) => set("kondisi", e.target.value)}>
            <option value="baik">Baik</option>
            <option value="rusak_ringan">Rusak Ringan</option>
            <option value="rusak_sedang">Rusak Sedang</option>
            <option value="rusak_berat">Rusak Berat</option>
          </Select>
          <Input label="Tahun Perolehan" type="number" value={f.tahun_perolehan} onChange={(e) => set("tahun_perolehan", e.target.value)} />
          <div className="sm:col-span-2">
            <p className="mb-1 text-sm font-medium text-navy-800">Foto BMN</p>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <input type="file" accept="image/png,image/jpeg" onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy-700" />
                <p className="mt-1 text-[11px] text-navy-400">Opsional. Maks 2 MB (JPG/PNG).</p>
              </div>
              {fotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotoUrl} alt="Pratinjau" className="size-16 rounded-lg border border-navy-900/10 object-cover" />
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1 text-sm font-medium text-navy-800">Dokumen BAST (PDF)</p>
            <input type="file" accept="application/pdf" onChange={(e) => setBast(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy-700" />
            <p className="mt-1 text-[11px] text-navy-400">Berita Acara Serah Terima. Opsional. Maks 2 MB (PDF). {item?.bast_path ? "BAST tersimpan — unggah baru untuk mengganti." : ""}{bast ? ` • ${bast.name}` : ""}</p>
          </div>
        </div>
        {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{err}</p>}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-navy-900/10 px-5 py-3.5">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button variant="secondary" loading={saving} onClick={simpan}><Check className="size-4" /> Simpan</Button>
      </div>
    </Sheet>
  );
}

function RiwayatModal({ id, onClose }: { id: number; onClose: () => void }) {
  const [d, setD] = useState<{ nama: string; nup: string | null; no_bmn: string; jenis_bmn: string | null; lokasi: string | null; kondisi: string; tahun_perolehan: number | null; foto_url: string | null; bast_url: string | null; qr: string | null; total_perbaikan: number; riwayat: { id: number; nomor: string; judul: string; kondisi: string; tanggal: string; tanggal_diperbaiki: string | null; status: string }[] } | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  useEffect(() => { api.get(`/pengajuan-bmn/bmn/${id}/riwayat`).then(({ data }) => setD(data.data)); }, [id]);

  return (
    <Sheet onClose={onClose} title="Detail & Riwayat BMN">
      {!d ? (
        <div className="flex-1 space-y-3 p-5">{[...Array(3)].map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-navy-100/60" />)}</div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800 p-4 text-white">
            <p className="text-lg font-extrabold">{d.nama}</p>
            <p className="mt-0.5 font-mono text-xs text-navy-200">No. BMN {d.no_bmn}{d.nup ? ` • NUP ${d.nup}` : ""}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-200">
              <span>Jenis: {d.jenis_bmn ?? "—"}</span><span>Lokasi: {d.lokasi ?? "—"}</span>
              <span>Kondisi: {d.kondisi}</span><span>Tahun: {d.tahun_perolehan ?? "—"}</span>
            </div>
          </div>

          {/* Foto BMN + QR aset */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-navy-900/5 bg-white p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-400">Foto BMN</p>
              {d.foto_url ? (
                <button type="button" onClick={() => setZoom(d.foto_url)} className="block w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.foto_url} alt={d.nama} className="h-40 w-full cursor-zoom-in rounded-lg object-cover" />
                </button>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-lg bg-navy-50 text-xs text-navy-400">Belum ada foto</div>
              )}
            </div>
            <div className="rounded-xl border border-navy-900/5 bg-white p-3 text-center">
              <p className="mb-2 text-left text-xs font-bold uppercase tracking-wide text-navy-400">QR Aset</p>
              {d.qr && (
                <button type="button" onClick={() => setZoom(d.qr)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.qr} alt="QR Aset BMN" className="mx-auto size-36 cursor-zoom-in" />
                </button>
              )}
              <p className="mt-1 text-[11px] text-navy-400">Pindai untuk melihat detail aset.</p>
            </div>
          </div>

          {/* Dokumen BAST — pratinjau saja (tanpa unduh) */}
          <div className="mt-4 rounded-xl border border-navy-900/5 bg-white p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-400">Dokumen BAST</p>
            {d.bast_url ? (
              <object data={`${d.bast_url}#toolbar=0&navpanes=0`} type="application/pdf" className="h-72 w-full rounded-lg border border-navy-900/10">
                <div className="flex h-72 items-center justify-center rounded-lg bg-navy-50 text-xs text-navy-400">Pratinjau BAST tidak dapat ditampilkan di perangkat ini.</div>
              </object>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg bg-navy-50 text-xs text-navy-400">Belum ada dokumen BAST.</div>
            )}
          </div>

          <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-navy-400">Riwayat Pemeliharaan / Perbaikan ({d.total_perbaikan})</p>
          {d.riwayat.length === 0 ? (
            <Card className="py-10 text-center text-sm text-navy-400">Belum ada riwayat perbaikan untuk BMN ini.</Card>
          ) : (
            <div className="space-y-2.5">
              {d.riwayat.map((r) => {
                const st = STATUS[r.status] ?? { label: r.status, tone: "neutral" as const };
                return (
                  <div key={r.id} className="flex gap-3 rounded-xl border border-navy-900/5 bg-white p-3">
                    <div className="mt-0.5"><CircleDot className="size-4 text-bpom-500" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-bpom-600">{r.nomor}</span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {r.kondisi !== "-" && <Badge tone="neutral">{r.kondisi}</Badge>}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-navy-800">{r.judul}</p>
                      <p className="mt-0.5 text-[11px] text-navy-400">
                        Diajukan: {r.tanggal}{r.tanggal_diperbaiki ? ` • Diperbaiki: ${r.tanggal_diperbaiki}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <AnimatePresence>{zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}</AnimatePresence>
    </Sheet>
  );
}

function Sheet({ onClose, title, children, wide, headerAction }: { onClose: () => void; title: string; children: React.ReactNode; wide?: boolean; headerAction?: React.ReactNode }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className={cn("relative flex max-h-[93vh] w-full flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl", wide ? "max-w-4xl" : "max-w-2xl")}>
        <div className="flex items-center justify-between gap-3 bg-gradient-to-br from-navy-900 to-navy-800 px-5 py-4 text-white">
          <h3 className="flex min-w-0 items-center gap-2 text-base font-bold"><PackageOpen className="size-5 shrink-0" /> <span className="truncate">{title}</span></h3>
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10"><X className="size-5" /></button>
          </div>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

// ===================== Paginator (10/halaman) =====================
function Paginator({ page, setPage, total, per = 10 }: { page: number; setPage: (p: number) => void; total: number; per?: number }) {
  const pages = Math.max(1, Math.ceil(total / per));
  if (total <= per) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t border-navy-900/5 px-4 py-3 text-sm">
      <span className="text-navy-400">Menampilkan {Math.min((page - 1) * per + 1, total)}–{Math.min(page * per, total)} dari {total}</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}
          className="flex items-center gap-1 rounded-lg border border-navy-900/10 px-2.5 py-1.5 font-semibold text-navy-600 disabled:opacity-40 hover:bg-navy-50"><ChevronLeft className="size-4" /> Sebelumnya</button>
        <span className="px-2 text-xs font-semibold text-navy-500">Hal {page}/{pages}</span>
        <button disabled={page >= pages} onClick={() => setPage(page + 1)}
          className="flex items-center gap-1 rounded-lg border border-navy-900/10 px-2.5 py-1.5 font-semibold text-navy-600 disabled:opacity-40 hover:bg-navy-50">Selanjutnya <ChevronRight className="size-4" /></button>
      </div>
    </div>
  );
}

// ===================== Jadwal Pemeliharaan BMN =====================

// ===================== Jadwal Pemeliharaan BMN (matriks per tahun) =====================
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
interface JadwalRow {
  bmn_item_id: number; nama: string; no_bmn: string; nup: string | null; lokasi: string;
  jumlah: number; keterangan: string | null; bulan: Record<string, { r: number; e: number }>;
}

function JadwalPemeliharaan() {
  const { user } = useAuth();
  const canManage = !!user && (!!user.is_pengelola_bmn || ["superadmin", "kepala_subag_tu"].includes(user.role));
  const [tahunList, setTahunList] = useState<number[]>([]);
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [rows, setRows] = useState<JadwalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [addBmn, setAddBmn] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => { api.get("/pengajuan-bmn/jadwal-tahun").then(({ data }) => { setTahunList(data.data ?? []); if (data.data?.length && !data.data.includes(tahun)) setTahun(data.data[0]); }); }, []); // eslint-disable-line
  const load = useCallback(() => {
    setLoading(true);
    api.get("/pengajuan-bmn/jadwal", { params: { tahun } }).then(({ data }) => setRows(data.data ?? [])).finally(() => setLoading(false));
  }, [tahun]);
  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => [r.nama, r.no_bmn, r.lokasi].some((v) => (v ?? "").toLowerCase().includes(q.toLowerCase())));
  useEffect(() => { setPage(1); }, [q, tahun]);
  const paged = filtered.slice((page - 1) * 10, page * 10);

  async function toggle(row: JadwalRow, m: number, type: "r" | "e") {
    if (!canManage) return;
    const nb = { ...row.bulan, [m]: { ...(row.bulan[m] ?? { r: 0, e: 0 }), [type]: row.bulan[m]?.[type] ? 0 : 1 } };
    setRows((rs) => rs.map((x) => (x.bmn_item_id === row.bmn_item_id ? { ...x, bulan: nb } : x)));
    try { await api.post(`/pengajuan-bmn/jadwal/${row.bmn_item_id}`, { tahun, jumlah: row.jumlah, keterangan: row.keterangan, bulan: nb }); }
    catch { setMsg("Gagal menyimpan, coba lagi."); load(); }
  }

  async function unduhTemplate() {
    const res = await api.get("/pengajuan-bmn/jadwal-template", { params: { tahun }, responseType: "blob" });
    const url = URL.createObjectURL(res.data as Blob); const a = document.createElement("a"); a.href = url; a.download = `Template-Jadwal-Pemeliharaan-${tahun}.xlsx`; a.click(); URL.revokeObjectURL(url);
  }
  async function importExcel(file: File) {
    setImporting(true); setMsg(null);
    try { const fd = new FormData(); fd.append("file", file); fd.append("tahun", String(tahun)); const { data } = await api.post("/pengajuan-bmn/jadwal-import", fd); setMsg(data.message ?? "Impor selesai."); load(); }
    catch (e) { setMsg(extractApiErrorMessage(e)); } finally { setImporting(false); }
  }

  return (
    <div className="mt-4">
      {/* Grid tahun */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-bold uppercase tracking-wide text-navy-400">Tahun:</span>
        {(tahunList.length ? tahunList : [tahun]).map((t) => (
          <button key={t} onClick={() => setTahun(t)}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-bold transition-colors", t === tahun ? "bg-navy-900 text-white shadow-sm" : "bg-white text-navy-500 ring-1 ring-navy-900/10 hover:bg-navy-50")}>{t}</button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari fasilitas / No. BMN / ruangan…"
            className="w-full rounded-xl border border-navy-900/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-bpom-500" />
        </div>
        {canManage && <>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importExcel(f); e.target.value = ""; }} />
          <Button size="sm" variant="outline" onClick={unduhTemplate}><FileDown className="size-4" /> Template {tahun}</Button>
          <Button size="sm" variant="outline" loading={importing} onClick={() => fileRef.current?.click()}><FileUp className="size-4" /> Import {tahun}</Button>
          <Button size="sm" onClick={() => setAddBmn(true)}><Plus className="size-4" /> Tambah BMN</Button>
        </>}
      </div>
      {msg && <div className="mb-3 rounded-xl bg-navy-50 px-4 py-2.5 text-sm font-medium text-navy-700">{msg}</div>}

      <div className="overflow-hidden rounded-2xl border border-navy-900/5 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] text-sm">
            <thead>
              <tr className="border-b border-navy-900/10 bg-navy-50/60 text-left text-[11px] uppercase tracking-wide text-navy-500">
                <th rowSpan={2} className="sticky left-0 z-10 bg-navy-50/60 px-3 py-2 font-bold">Fasilitas / Ruangan</th>
                <th rowSpan={2} className="px-3 py-2 font-bold">No. BMN</th>
                <th rowSpan={2} className="px-3 py-2 text-right font-bold">Jml</th>
                {BLN.map((b) => <th key={b} colSpan={2} className="border-l border-navy-900/10 px-2 py-1.5 text-center font-bold">{b}</th>)}
                <th rowSpan={2} className="border-l border-navy-900/10 px-3 py-2 font-bold">Keterangan</th>
              </tr>
              <tr className="border-b border-navy-900/10 bg-navy-50/40 text-[10px] text-navy-400">
                {BLN.map((b) => <Fragment key={b}><th className="border-l border-navy-900/10 px-1 py-1 text-center font-semibold">R</th><th className="px-1 py-1 text-center font-semibold">RL</th></Fragment>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/5">
              {loading && [...Array(6)].map((_, i) => <tr key={i}><td colSpan={28} className="px-3 py-3"><div className="h-5 animate-pulse rounded bg-navy-100/60" /></td></tr>)}
              {!loading && filtered.length === 0 && <tr><td colSpan={28} className="px-3 py-12 text-center text-sm text-navy-400">Belum ada data. Import Excel jadwal atau tambah BMN.</td></tr>}
              {paged.map((r) => (
                <tr key={r.bmn_item_id} className="hover:bg-navy-50/40">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2">
                    <p className="font-semibold text-navy-900">{r.nama}</p>
                    <p className="text-[11px] text-navy-400">{r.lokasi}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-navy-600">{r.no_bmn}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-navy-600">{r.jumlah}</td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <Fragment key={m}>
                      <td className="border-l border-navy-900/5 px-1 py-2 text-center">
                        <input type="checkbox" disabled={!canManage} checked={!!r.bulan[m]?.r} onChange={() => toggle(r, m, "r")}
                          className="size-4 cursor-pointer accent-navy-600 disabled:cursor-default" title={`Rencana ${BLN[m - 1]}`} />
                      </td>
                      <td className="px-1 py-2 text-center">
                        <input type="checkbox" disabled={!canManage} checked={!!r.bulan[m]?.e} onChange={() => toggle(r, m, "e")}
                          className="size-4 cursor-pointer accent-bpom-600 disabled:cursor-default" title={`Realisasi ${BLN[m - 1]}`} />
                      </td>
                    </Fragment>
                  ))}
                  <td className="border-l border-navy-900/5 px-3 py-2 text-xs text-navy-500">{r.keterangan ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginator page={page} setPage={setPage} total={filtered.length} />
      </div>
      <p className="mt-2 flex items-center gap-3 text-[11px] text-navy-400">
        <span className="inline-flex items-center gap-1"><span className="inline-block size-3 rounded-sm accent-navy-600 ring-1 ring-navy-400" /> R = Rencana</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-3 rounded-sm bg-bpom-500/30 ring-1 ring-bpom-500" /> RL = Realisasi</span>
        <span>• Centang tersimpan otomatis.</span>
      </p>
      <AnimatePresence>{addBmn && <BmnFormModal item={null} onClose={() => setAddBmn(false)} onSaved={() => { setAddBmn(false); load(); }} />}</AnimatePresence>
    </div>
  );
}

// ===================== Laporan Pemeliharaan BMN =====================
interface LaporanItem { no: number; nama: string; kode: string; nup: string | null; jumlah: number; hasil: string; keterangan: string }
interface LaporanData {
  judul: string; periode_label: string; tahun: number;
  grup: Record<string, LaporanItem[]>;
  total: number;
  ringkasan: { total_bmn: number; terpelihara: number; belum: number; kondisi: Record<string, number> };
}

const HASIL_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  "Baik": "success", "Rusak Ringan": "warning", "Rusak Sedang": "warning", "Rusak Berat": "danger",
};

function LaporanPemeliharaan() {
  const [tahunList, setTahunList] = useState<number[]>([]);
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [periode, setPeriode] = useState<"bulan" | "semester" | "tahun">("bulan");
  const [bulan, setBulan] = useState<number>(new Date().getMonth() + 1);
  const [semester, setSemester] = useState<number>(new Date().getMonth() < 6 ? 1 : 2);
  const [data, setData] = useState<LaporanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mengunduh, setMengunduh] = useState<"pdf" | "excel" | null>(null);

  useEffect(() => { api.get("/pengajuan-bmn/jadwal-tahun").then(({ data }) => { setTahunList(data.data ?? []); if (data.data?.length && !data.data.includes(tahun)) setTahun(data.data[0]); }); }, []); // eslint-disable-line

  const params = useMemo(() => {
    const p: Record<string, string | number> = { tahun, periode };
    if (periode === "bulan") p.bulan = bulan;
    if (periode === "semester") p.semester = semester;
    return p;
  }, [tahun, periode, bulan, semester]);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/pengajuan-bmn/laporan", { params }).then(({ data }) => setData(data.data)).finally(() => setLoading(false));
  }, [params]);
  useEffect(() => { load(); }, [load]);

  async function unduh(jenis: "pdf" | "excel") {
    setMengunduh(jenis);
    try {
      const path = jenis === "pdf" ? "/pengajuan-bmn/laporan/pdf" : "/pengajuan-bmn/laporan/excel";
      const ext = jenis === "pdf" ? "pdf" : "xlsx";
      await downloadFile(path, `Laporan-Pemeliharaan-BMN-${tahun}.${ext}`, params);
    } finally { setMengunduh(null); }
  }

  const grup = data ? Object.entries(data.grup) : [];

  return (
    <div className="mt-4">
      {/* Kontrol periode */}
      <Card className="!p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Tahun" value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className="min-w-[110px]">
            {(tahunList.length ? tahunList : [tahun]).map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select label="Periode" value={periode} onChange={(e) => setPeriode(e.target.value as typeof periode)} className="min-w-[140px]">
            <option value="bulan">Per Bulan</option>
            <option value="semester">Per Semester</option>
            <option value="tahun">Per Tahun</option>
          </Select>
          {periode === "bulan" && (
            <Select label="Bulan" value={bulan} onChange={(e) => setBulan(Number(e.target.value))} className="min-w-[140px]">
              {BULAN_PENUH.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
            </Select>
          )}
          {periode === "semester" && (
            <Select label="Semester" value={semester} onChange={(e) => setSemester(Number(e.target.value))} className="min-w-[190px]">
              <option value={1}>Semester I (Jan–Jun)</option>
              <option value={2}>Semester II (Jul–Des)</option>
            </Select>
          )}
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" loading={mengunduh === "pdf"} disabled={!data || data.total === 0} onClick={() => unduh("pdf")}><FileDown className="size-4" /> PDF</Button>
            <Button size="sm" variant="outline" loading={mengunduh === "excel"} disabled={!data || data.total === 0} onClick={() => unduh("excel")}><FileSpreadsheet className="size-4" /> Excel</Button>
          </div>
        </div>
      </Card>

      <p className="mt-3 text-sm font-bold text-navy-700">{data?.periode_label}</p>

      <div className="mt-2 overflow-hidden rounded-2xl border border-navy-900/5 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-navy-900/10 bg-navy-50/60 text-left text-[11px] uppercase tracking-wide text-navy-500">
                <th className="px-3 py-2 font-bold">No</th>
                <th className="px-3 py-2 font-bold">Fasilitas</th>
                <th className="px-3 py-2 font-bold">Kode Barang</th>
                <th className="px-3 py-2 text-center font-bold">NUP</th>
                <th className="px-3 py-2 text-center font-bold">Jml</th>
                <th className="px-3 py-2 font-bold">Hasil Pemeliharaan</th>
                <th className="px-3 py-2 font-bold">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/5">
              {loading && [...Array(6)].map((_, i) => <tr key={i}><td colSpan={7} className="px-3 py-3"><div className="h-5 animate-pulse rounded bg-navy-100/60" /></td></tr>)}
              {!loading && grup.length === 0 && <tr><td colSpan={7} className="px-3 py-12 text-center text-sm text-navy-400">Belum ada data BMN untuk periode ini.</td></tr>}
              {!loading && grup.map(([lokasi, items], gi) => (
                <Fragment key={lokasi}>
                  <tr className="bg-navy-50/70"><td className="px-3 py-1.5 text-center text-xs font-bold text-navy-500">{gi + 1}</td><td colSpan={6} className="px-3 py-1.5 text-sm font-bold text-navy-800">{lokasi}</td></tr>
                  {items.map((it) => (
                    <tr key={it.no} className="hover:bg-navy-50/40">
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2 font-medium text-navy-900">{it.nama}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-navy-600">{it.kode}</td>
                      <td className="px-3 py-2 text-center text-navy-600">{it.nup ?? "—"}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-navy-600">{it.jumlah}</td>
                      <td className="px-3 py-2"><Badge tone={HASIL_TONE[it.hasil] ?? "neutral"}>{it.hasil}</Badge></td>
                      <td className="px-3 py-2 text-xs text-navy-500">{it.keterangan}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-navy-400">Kolom “Hasil Pemeliharaan” diambil dari kondisi BMN pada Daftar BMN; “Keterangan” disinkronkan dengan realisasi Jadwal Pemeliharaan.</p>
    </div>
  );
}

// ===================== Kartu Pemeliharaan BMN =====================
function KartuPemeliharaan() {
  const [tahunList, setTahunList] = useState<number[]>([]);
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [items, setItems] = useState<BmnOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [unduh, setUnduh] = useState<string | null>(null);

  useEffect(() => { api.get("/pengajuan-bmn/jadwal-tahun").then(({ data }) => { setTahunList(data.data ?? []); if (data.data?.length && !data.data.includes(tahun)) setTahun(data.data[0]); }); }, []); // eslint-disable-line
  useEffect(() => {
    setLoading(true);
    api.get("/pengajuan-bmn/bmn-list").then(({ data }) => setItems(data.data ?? [])).finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((b) => [b.nama_barang, b.kode_barang, b.lokasi].some((v) => (v ?? "").toLowerCase().includes(q.toLowerCase())));
  useEffect(() => { setPage(1); }, [q]);
  const paged = filtered.slice((page - 1) * 10, page * 10);

  async function download(b: BmnOpt, jenis: "pdf" | "excel") {
    const kunci = `${b.id}-${jenis}`;
    setUnduh(kunci);
    try {
      const path = jenis === "pdf" ? `/pengajuan-bmn/bmn/${b.id}/kartu-pdf` : `/pengajuan-bmn/bmn/${b.id}/kartu-excel`;
      const ext = jenis === "pdf" ? "pdf" : "xlsx";
      const nama = b.nama_barang.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
      await downloadFile(path, `Kartu-Pemeliharaan-${nama}-${tahun}.${ext}`, { tahun });
    } finally { setUnduh(null); }
  }

  return (
    <div className="mt-4">
      <Card className="!p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Tahun" value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className="min-w-[110px]">
            {(tahunList.length ? tahunList : [tahun]).map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari BMN / kode / lokasi…"
              className="w-full rounded-xl border border-navy-900/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-bpom-500" />
          </div>
        </div>
      </Card>

      <div className="mt-3 space-y-2">
        {loading && [...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-navy-100/60" />)}
        {!loading && filtered.length === 0 && (
          <Card className="flex flex-col items-center gap-2 py-12 text-center">
            <CreditCard className="size-8 text-navy-200" />
            <p className="text-sm font-semibold text-navy-600">Tidak ada BMN yang cocok.</p>
          </Card>
        )}
        {paged.map((b) => (
          <Card key={b.id} className="!p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-navy-900">{b.nama_barang}</p>
                <p className="mt-0.5 text-[11px] text-navy-400"><span className="font-mono">{b.kode_barang}</span>{b.lokasi ? ` • ${b.lokasi}` : ""}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" loading={unduh === `${b.id}-pdf`} onClick={() => download(b, "pdf")}><FileDown className="size-4" /> Kartu PDF</Button>
                <Button size="sm" variant="outline" loading={unduh === `${b.id}-excel`} onClick={() => download(b, "excel")}><FileSpreadsheet className="size-4" /> Excel</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Paginator page={page} setPage={setPage} total={filtered.length} />
      <p className="mt-2 text-[11px] text-navy-400">Kartu mengikuti Formulir POM-14.01/CFM.01/SOP.01/IK.33B.01/F.01 revisi 06 — bagian Mandiri, Pihak Ketiga, dan Lain-lain. Bulan yang sudah terealisasi pada Jadwal Pemeliharaan ikut ditandai.</p>
    </div>
  );
}

const BULAN_PENUH = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
