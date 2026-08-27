"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Plus, X, Check, FileDown, RotateCcw, Trash2, ClipboardCheck, Inbox, Eye } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { extractApiErrorMessage } from "@bpom/shared";
import { formatTanggalIndonesia, cn } from "@/lib/utils";

interface ArsipItem { uraian: string; jumlah?: number; nomor?: string | null; kode?: string | null; tahun?: string | null; nomor_boks?: string | null }
// +5 hari kerja (lewati Sabtu/Minggu) untuk tanggal wajib kembali.
function tambahHariKerja(tgl: string, n: number): string {
  const d = new Date(tgl + "T00:00:00"); let added = 0;
  while (added < n) { d.setDate(d.getDate() + 1); const wd = d.getDay(); if (wd !== 0 && wd !== 6) added++; }
  return d.toISOString().slice(0, 10);
}
function tglIndo(iso: string): string { try { return formatTanggalIndonesia(iso); } catch { return iso; } }
interface Peminjaman {
  id: number; nomor: string; jenis: "aktif" | "inaktif";
  peminjam: { id: number; name: string; nip: string | null } | null;
  petugas: string | null; petugas_id: number | null; tim_kerja: string | null; tim_label: string | null;
  unit_pengolah: string | null; keperluan: string; daftar_arsip: ArsipItem[];
  tanggal_pinjam: string | null; tanggal_harus_kembali: string | null; tanggal_dikembalikan: string | null;
  status: string; alasan_tolak: string | null; catatan_petugas: string | null;
  ttd_peminjam: boolean; ttd_petugas: boolean; ttd_kembali: boolean; created_at: string;
}
interface Petugas { id: number; name: string; tim_kerja: string | null; tim_label: string | null }

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  diajukan: { label: "Menunggu Petugas Arsip", tone: "warning" },
  disetujui: { label: "Disetujui — Sedang Dipinjam", tone: "info" },
  dikembalikan: { label: "Menunggu Pemeriksaan", tone: "warning" },
  selesai: { label: "Selesai", tone: "success" },
  ditolak: { label: "Ditolak", tone: "danger" },
};

export default function PeminjamanArsipPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Peminjaman[]>([]);
  const [tab, setTab] = useState<"saya" | "tugas">("saya");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const isPetugas = !!user && (!!user.is_pengelola_arsip || !!user.is_arsiparis || ["superadmin", "kepala_subag_tu", "kepala_balai"].includes(user.role));

  const load = useCallback(() => {
    setLoading(true);
    api.get("/peminjaman-arsip").then(({ data }) => setRows(data.data ?? [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function aksi(id: number, path: string, body?: Record<string, unknown>) {
    setBusy(id); setMsg(null);
    try { const { data } = await api.patch(`/peminjaman-arsip/${id}/${path}`, body ?? {}); setMsg(data.message); load(); }
    catch (e) { setMsg(extractApiErrorMessage(e)); } finally { setBusy(null); }
  }
  function tolak(id: number) { const a = window.prompt("Alasan penolakan:"); if (a) aksi(id, "tolak", { alasan: a }); }
  const [approve, setApprove] = useState<Peminjaman | null>(null);
  async function unduh(p: Peminjaman) {
    try {
      const res = await api.get(`/peminjaman-arsip/${p.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob); const a = document.createElement("a");
      a.href = url; a.download = `Bukti-Peminjaman-Pengembalian-${p.nomor.replaceAll("/", "-")}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch { setMsg("Gagal mengunduh PDF."); }
  }
  async function pratinjau(p: Peminjaman) {
    try {
      const res = await api.get(`/peminjaman-arsip/${p.id}/pdf`, { params: { preview: 1 }, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data as Blob], { type: "application/pdf" }));
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { setMsg("Gagal memuat pratinjau PDF."); }
  }

  const mine = rows.filter((r) => r.peminjam?.id === user?.id);
  const tugas = rows.filter((r) => r.petugas_id === user?.id || (["superadmin", "kepala_subag_tu", "kepala_balai"].includes(user?.role ?? "") && r.peminjam?.id !== user?.id));
  const shown = tab === "saya" ? mine : tugas;
  const perluTindakan = tugas.filter((r) => r.status === "diajukan" || r.status === "dikembalikan").length;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy-900 sm:text-2xl"><Archive className="size-6 shrink-0 text-bpom-600" /> Peminjaman &amp; Pengembalian Arsip</h1>
            <p className="mt-1 text-sm text-navy-500">Arsip Aktif &amp; Inaktif — full aplikasi, dua tanda tangan (peminjam &amp; petugas arsip) via QR.</p>
          </div>
          <Button onClick={() => setForm(true)}><Plus className="size-4" /> Ajukan Peminjaman</Button>
        </div>

        {msg && <div className="mt-3 rounded-xl bg-navy-50 px-4 py-2.5 text-sm font-medium text-navy-700">{msg}</div>}

        <div className="mt-4 inline-flex rounded-2xl border border-navy-900/5 bg-white p-1 shadow-sm">
          <TabBtn active={tab === "saya"} onClick={() => setTab("saya")} icon={<Inbox className="size-4" />}>Peminjaman</TabBtn>
          {isPetugas && (
            <TabBtn active={tab === "tugas"} onClick={() => setTab("tugas")} icon={<ClipboardCheck className="size-4" />}>
              Verifikasi Peminjaman {perluTindakan > 0 && <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold leading-5 text-white">{perluTindakan}</span>}
            </TabBtn>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {loading && [...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-navy-100/60" />)}
          {!loading && shown.length === 0 && <Card className="py-12 text-center text-sm text-navy-400">Belum ada peminjaman arsip.</Card>}
          {shown.map((p) => {
            const mePeminjam = p.peminjam?.id === user?.id;
            const mePetugas = p.petugas_id === user?.id || ["superadmin", "kepala_subag_tu"].includes(user?.role ?? "");
            return (
              <Card key={p.id} className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-xs font-bold text-navy-500">{p.nomor}</p>
                      <Badge tone={p.jenis === "inaktif" ? "neutral" : "info"}>{p.jenis === "inaktif" ? "Arsip Inaktif" : "Arsip Aktif"}</Badge>
                      <Badge tone={STATUS[p.status]?.tone ?? "neutral"}>{STATUS[p.status]?.label ?? p.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-navy-900">{p.peminjam?.name}</p>
                    <p className="text-xs text-navy-400">Petugas: {p.petugas ?? "—"}{p.tim_label ? ` (${p.tim_label})` : ""} • {formatTanggalIndonesia(p.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {["disetujui", "dikembalikan", "selesai"].includes(p.status) && (<>
                      <button onClick={() => pratinjau(p)} title="Pratinjau PDF" className="flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50"><Eye className="size-3.5" /> Pratinjau</button>
                      <button onClick={() => unduh(p)} className="flex items-center gap-1.5 rounded-lg border border-bpom-200 bg-bpom-50 px-2.5 py-1.5 text-xs font-semibold text-bpom-700 hover:bg-bpom-100"><FileDown className="size-3.5" /> Cetak Bukti (PDF)</button>
                    </>)}
                  </div>
                </div>

                <div className="mt-2 rounded-xl bg-navy-50/60 p-3 text-sm">
                  <p className="mb-1.5 text-xs font-semibold text-navy-500">Keperluan: <span className="font-normal text-navy-700">{p.keperluan}</span></p>
                  <p className="mb-1.5 text-xs text-navy-500">Pinjam {p.tanggal_pinjam ? formatTanggalIndonesia(p.tanggal_pinjam) : "—"} → harus kembali {p.tanggal_harus_kembali ? formatTanggalIndonesia(p.tanggal_harus_kembali) : "—"}{p.tanggal_dikembalikan ? ` • dikembalikan ${formatTanggalIndonesia(p.tanggal_dikembalikan)}` : ""}</p>
                  <ul className="space-y-1">
                    {p.daftar_arsip.map((a, i) => (
                      <li key={i} className="flex items-start justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs">
                        <span className="font-medium text-navy-700">{a.uraian}</span>
                        <span className="shrink-0 text-navy-400">{[a.kode, a.tahun, a.nomor_boks].filter(Boolean).join(" • ") || "—"}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {p.status === "ditolak" && p.alasan_tolak && <p className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-600">Ditolak: {p.alasan_tolak}</p>}

                <div className="mt-3 flex flex-wrap gap-2">
                  {mePetugas && p.status === "diajukan" && <>
                    <Button size="sm" variant="secondary" disabled={busy === p.id} onClick={() => setApprove(p)}><Check className="size-4" /> Verifikasi &amp; Lengkapi</Button>
                    <Button size="sm" variant="danger" disabled={busy === p.id} onClick={() => tolak(p.id)}><X className="size-4" /> Tolak</Button>
                  </>}
                  {mePeminjam && p.status === "disetujui" && <Button size="sm" variant="outline" loading={busy === p.id} onClick={() => { if (window.confirm("Kembalikan arsip dan tanda tangani (TTE) pengembalian? Permohonan akan dikirim ke petugas arsip untuk verifikasi.")) aksi(p.id, "kembalikan"); }}><RotateCcw className="size-4" /> Kembalikan &amp; Tanda Tangani</Button>}
                  {mePetugas && p.status === "dikembalikan" && <Button size="sm" variant="secondary" loading={busy === p.id} onClick={() => { const c = window.prompt("Catatan pemeriksaan kondisi arsip (opsional):") ?? undefined; aksi(p.id, "selesaikan", { catatan: c }); }}><ClipboardCheck className="size-4" /> Verifikasi &amp; TTE Pengembalian</Button>}
                </div>
              </Card>
            );
          })}
        </div>

        {form && <FormModal onClose={() => setForm(false)} onSaved={() => { setForm(false); setTab("saya"); load(); }} setMsg={setMsg} />}
        {approve && <ApproveModal p={approve} onClose={() => setApprove(null)} onSaved={() => { setApprove(null); setMsg("Peminjaman disetujui."); load(); }} setMsg={setMsg} />}
      </div>
    </AppShell>
  );
}

// Petugas melengkapi nomor/klasifikasi/tahun tiap arsip lalu menyetujui (TTD petugas).
function ApproveModal({ p, onClose, onSaved, setMsg }: { p: Peminjaman; onClose: () => void; onSaved: () => void; setMsg: (m: string) => void }) {
  const inaktif = p.jenis === "inaktif";
  const [items, setItems] = useState(p.daftar_arsip.map((a) => ({ nomor: a.nomor ?? "", kode: a.kode ?? "", tahun: a.tahun ?? "", nomor_boks: a.nomor_boks ?? "" })));
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (i: number, k: string, v: string) => setItems((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const inputCls = "w-full rounded-lg border border-navy-900/10 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-bpom-500";
  async function submit() {
    setSaving(true);
    try { await api.patch(`/peminjaman-arsip/${p.id}/setujui`, { catatan, items }); onSaved(); }
    catch (e) { setMsg(extractApiErrorMessage(e)); } finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-navy-900/10 bg-gradient-to-br from-navy-900 to-navy-800 px-5 py-3.5 text-white">
          <h3 className="flex items-center gap-2 text-base font-extrabold"><ClipboardCheck className="size-5" /> Verifikasi & Lengkapi Data Arsip</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10"><X className="size-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-3 text-xs text-navy-500">Lengkapi <b>Nomor Arsip, Klasifikasi, Tahun{inaktif ? ", No. Boks" : ""}</b> tiap arsip, lalu setujui. Data ini diisi oleh petugas/arsiparis.</p>
          <div className="space-y-2.5">
            {p.daftar_arsip.map((a, i) => (
              <div key={i} className="rounded-xl border border-navy-900/10 bg-navy-50/40 p-2.5">
                <p className="mb-1.5 text-sm font-semibold text-navy-800">{i + 1}. {a.uraian} <span className="text-xs font-normal text-navy-400">(jumlah {a.jumlah ?? 1})</span></p>
                <div className={cn("grid gap-2", inaktif ? "grid-cols-2" : "grid-cols-3")}>
                  <input className={inputCls} placeholder="Nomor Arsip" value={items[i].nomor} onChange={(e) => set(i, "nomor", e.target.value)} />
                  <input className={inputCls} placeholder="Klasifikasi" value={items[i].kode} onChange={(e) => set(i, "kode", e.target.value)} />
                  <input className={inputCls} placeholder="Tahun" value={items[i].tahun} onChange={(e) => set(i, "tahun", e.target.value)} />
                  {inaktif && <input className={inputCls} placeholder="No. Boks" value={items[i].nomor_boks} onChange={(e) => set(i, "nomor_boks", e.target.value)} />}
                </div>
              </div>
            ))}
          </div>
          <textarea className="mt-3 w-full rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-bpom-500" rows={2} placeholder="Catatan petugas (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-navy-900/10 px-5 py-3.5">
          <button onClick={onClose} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600">Batal</button>
          <Button variant="secondary" loading={saving} onClick={submit}><Check className="size-4" /> Setujui & Tanda Tangani</Button>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors", active ? "bg-navy-900 text-white shadow-sm" : "text-navy-500 hover:bg-navy-50")}>{icon}{children}</button>
  );
}

function FormModal({ onClose, onSaved, setMsg }: { onClose: () => void; onSaved: () => void; setMsg: (m: string) => void }) {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [jenis, setJenis] = useState<"aktif" | "inaktif">("aktif");
  const [petugasList, setPetugasList] = useState<Petugas[]>([]);
  const [f, setF] = useState({ petugas_id: "", keperluan: "", tanggal_pinjam: today });
  const [items, setItems] = useState<ArsipItem[]>([{ uraian: "", jumlah: 1 }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setF((s) => ({ ...s, petugas_id: "" }));
    api.get("/peminjaman-arsip/petugas", { params: { jenis } }).then(({ data }) => {
      const list = data.data ?? []; setPetugasList(list);
      if (jenis === "inaktif" && list[0]) setF((s) => ({ ...s, petugas_id: String(list[0].id) }));
    });
  }, [jenis]);

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const setItem = (i: number, patch: Partial<ArsipItem>) => setItems((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const valid = !!(f.petugas_id && f.keperluan.trim().length >= 5 && f.tanggal_pinjam && items.every((it) => it.uraian.trim() && (it.jumlah ?? 0) >= 1));
  const wajibKembali = f.tanggal_pinjam ? tambahHariKerja(f.tanggal_pinjam, 5) : "";
  const timSel = petugasList.find((p) => String(p.id) === f.petugas_id)?.tim_label;
  const inputCls = "w-full rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-bpom-500";

  async function submit() {
    setSaving(true); setErr(null);
    try {
      await api.post("/peminjaman-arsip", { jenis, petugas_id: Number(f.petugas_id), keperluan: f.keperluan, tanggal_pinjam: f.tanggal_pinjam, items: items.map((it) => ({ uraian: it.uraian, jumlah: it.jumlah ?? 1 })) });
      setMsg("Permohonan peminjaman diajukan."); onSaved();
    } catch (e) { setErr(extractApiErrorMessage(e)); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-navy-900/10 bg-gradient-to-br from-navy-900 to-navy-800 px-5 py-3.5 text-white">
          <h3 className="flex items-center gap-2 text-base font-extrabold"><Archive className="size-5" /> Formulir Peminjaman Arsip</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10"><X className="size-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {/* Pilih jenis → formulir dibedakan */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            {([["aktif", "Arsip Aktif"], ["inaktif", "Arsip Inaktif"]] as const).map(([val, lbl]) => (
              <button key={val} type="button" onClick={() => setJenis(val)}
                className={cn("rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors", jenis === val ? "border-bpom-600 bg-bpom-600 text-white" : "border-navy-900/10 bg-white text-navy-600")}>{lbl}</button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {/* Identitas peminjam otomatis dari akun (tidak perlu diisi) */}
            <div className="rounded-xl bg-navy-50/60 p-2.5 text-xs text-navy-600">
              Peminjam: <b className="text-navy-800">{user?.name}</b>{user?.kelompok_substansi ? <> • Tim/Unit: <b className="text-navy-800">{user.kelompok_substansi}</b></> : null} — terisi otomatis dari akun.
            </div>
            <div>
              <label className="text-xs text-navy-400">{jenis === "inaktif" ? "Arsiparis (Petugas Arsip Inaktif)" : "Petugas Arsip Aktif (per Tim Kerja) *"}</label>
              <select className={inputCls} value={f.petugas_id} onChange={(e) => set("petugas_id", e.target.value)} disabled={jenis === "inaktif" && petugasList.length <= 1}>
                {jenis === "aktif" && <option value="">— Pilih Tim Kerja / Petugas —</option>}
                {petugasList.map((p) => <option key={p.id} value={p.id}>{p.name}{p.tim_label ? ` — ${p.tim_label}` : ""}</option>)}
              </select>
            </div>
            <textarea className={inputCls} rows={2} placeholder="Maksud & keperluan peminjaman arsip…" value={f.keperluan} onChange={(e) => set("keperluan", e.target.value)} />
            <div>
              <label className="text-xs text-navy-400">Tanggal pinjam</label>
              <input type="date" className={inputCls} value={f.tanggal_pinjam} onChange={(e) => set("tanggal_pinjam", e.target.value)} />
              {wajibKembali && (
                <p className="mt-1 text-xs font-semibold text-rose-600">Arsip wajib dikembalikan maksimal tgl {tglIndo(wajibKembali)} (5 HK dari tgl peminjaman arsip).</p>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-sm font-semibold text-navy-800">Nama &amp; Jumlah Arsip yang Dipinjam</p>
              <p className="mb-2 text-[11px] text-navy-400">Nomor, klasifikasi &amp; tahun arsip akan dilengkapi oleh petugas/arsiparis saat verifikasi.</p>
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className={inputCls} placeholder={`Nama/uraian arsip ${i + 1} *`} value={it.uraian} onChange={(e) => setItem(i, { uraian: e.target.value })} />
                    <input type="number" min={1} className="w-20 shrink-0 rounded-xl border border-navy-900/10 bg-white px-2.5 py-2.5 text-sm outline-none focus:border-bpom-500" value={it.jumlah ?? 1} onChange={(e) => setItem(i, { jumlah: Number(e.target.value) || 1 })} title="Jumlah" />
                    {items.length > 1 && <button type="button" onClick={() => setItems((r) => r.filter((_, j) => j !== i))} className="shrink-0 rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 className="size-4" /></button>}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setItems((r) => [...r, { uraian: "", jumlah: 1 }])} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-bpom-600 hover:underline"><Plus className="size-4" /> Tambah arsip</button>
            </div>
            {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{err}</p>}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-navy-900/10 px-5 py-3.5">
          <button onClick={onClose} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600">Batal</button>
          <Button variant="secondary" loading={saving} disabled={!valid} onClick={submit}><Check className="size-4" /> Ajukan &amp; Tanda Tangani</Button>
        </div>
      </div>
    </div>
  );
}
