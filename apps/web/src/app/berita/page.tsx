"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Newspaper, Plus, Pencil, Trash2, Eye, EyeOff, X, Search, Image as ImageIcon, Save,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { extractApiErrorMessage } from "@bpom/shared";
import { formatTanggalIndonesia, cn } from "@/lib/utils";

interface BeritaItem {
  id: number;
  judul: string;
  slug: string;
  ringkasan: string | null;
  konten: string;
  kategori: "obat" | "makanan" | "kosmetik" | "pengumuman";
  status: "draft" | "terbit";
  gambar_url: string | null;
  penulis: string | null;
  published_at: string | null;
  created_at: string;
}

const KATEGORI = ["obat", "makanan", "kosmetik", "pengumuman"] as const;
const KATEGORI_LABEL: Record<string, string> = {
  obat: "Obat",
  makanan: "Makanan",
  kosmetik: "Kosmetik",
  pengumuman: "Pengumuman",
};

const KELAS_INPUT =
  "w-full rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-bpom-500";

export default function KelolaBeritaPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<BeritaItem[]>([]);
  const [ringkasan, setRingkasan] = useState({ total: 0, terbit: 0, draft: 0 });
  const [cari, setCari] = useState("");
  const [saringStatus, setSaringStatus] = useState("");
  const [muat, setMuat] = useState(true);
  const [tik, setTik] = useState(0);
  const [pesan, setPesan] = useState<string | null>(null);
  const [form, setForm] = useState<BeritaItem | "baru" | null>(null);
  const [sibuk, setSibuk] = useState<number | null>(null);

  const bolehKelola =
    !!user && ["superadmin", "kepala_balai", "kepala_subag_tu", "pegawai_asn_pppk"].includes(user.role);

  useEffect(() => {
    let batal = false;
    api
      .get("/kelola-berita", { params: { q: cari, status: saringStatus } })
      .then(({ data }) => {
        if (batal) return;
        setRows(data.data ?? []);
        setRingkasan(data.ringkasan ?? { total: 0, terbit: 0, draft: 0 });
      })
      .catch(() => { if (!batal) setRows([]); })
      .finally(() => { if (!batal) setMuat(false); });

    return () => { batal = true; };
  }, [cari, saringStatus, tik]);

  const segarkan = useCallback(() => { setMuat(true); setTik((t) => t + 1); }, []);

  async function ubahStatus(b: BeritaItem) {
    const status = b.status === "terbit" ? "draft" : "terbit";
    setSibuk(b.id); setPesan(null);
    try {
      const { data } = await api.patch(`/berita/${b.id}/status`, { status });
      setPesan(data.message);
      segarkan();
    } catch (e) {
      setPesan(extractApiErrorMessage(e));
    } finally {
      setSibuk(null);
    }
  }

  async function hapus(b: BeritaItem) {
    if (!window.confirm(`Hapus berita "${b.judul}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setSibuk(b.id); setPesan(null);
    try {
      const { data } = await api.delete(`/berita/${b.id}`);
      setPesan(data.message);
      segarkan();
    } catch (e) {
      setPesan(extractApiErrorMessage(e));
    } finally {
      setSibuk(null);
    }
  }

  if (!bolehKelola) {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <Newspaper className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Halaman ini khusus pengelola berita.</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy-900 sm:text-2xl">
              <Newspaper className="size-6 shrink-0 text-bpom-600" /> Kelola Berita
            </h1>
            <p className="mt-1 text-sm text-navy-500">
              Buat, ubah, terbitkan, dan hapus berita serta pengumuman Balai POM di Jember.
            </p>
          </div>
          <Button onClick={() => setForm("baru")}><Plus className="size-4" /> Tulis Berita</Button>
        </div>

        {pesan && <div className="mt-3 rounded-xl bg-navy-50 px-4 py-2.5 text-sm font-medium text-navy-700">{pesan}</div>}

        {/* Ringkasan */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "Total", nilai: ringkasan.total, warna: "text-navy-900" },
            { label: "Terbit", nilai: ringkasan.terbit, warna: "text-bpom-600" },
            { label: "Draft", nilai: ringkasan.draft, warna: "text-amber-500" },
          ].map((s) => (
            <Card key={s.label} className="!p-4">
              <p className={cn("text-2xl font-extrabold tabular-nums", s.warna)}>{s.nilai}</p>
              <p className="mt-0.5 text-xs font-semibold text-navy-400">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Pencarian & saringan */}
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari judul atau ringkasan…"
              className={cn(KELAS_INPUT, "pl-9")}
            />
          </div>
          {[
            { v: "", l: "Semua" },
            { v: "terbit", l: "Terbit" },
            { v: "draft", l: "Draft" },
          ].map((s) => (
            <button
              key={s.v}
              onClick={() => setSaringStatus(s.v)}
              className={cn(
                "rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors",
                saringStatus === s.v ? "bg-bpom-600 text-white" : "bg-navy-50 text-navy-600 hover:bg-navy-100"
              )}
            >
              {s.l}
            </button>
          ))}
        </div>

        {/* Daftar */}
        <div className="mt-4 space-y-2.5">
          {muat && [...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-navy-100/60" />)}
          {!muat && rows.length === 0 && (
            <Card className="py-12 text-center text-sm text-navy-400">Belum ada berita.</Card>
          )}

          {rows.map((b) => (
            <Card key={b.id} className="!p-4">
              <div className="flex flex-wrap items-start gap-3">
                {b.gambar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.gambar_url} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-navy-50">
                    <ImageIcon className="size-5 text-navy-300" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={b.status === "terbit" ? "success" : "warning"}>
                      {b.status === "terbit" ? "Terbit" : "Draft"}
                    </Badge>
                    <Badge tone="info">{KATEGORI_LABEL[b.kategori]}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-navy-900">{b.judul}</p>
                  {b.ringkasan && <p className="mt-0.5 line-clamp-2 text-xs text-navy-500">{b.ringkasan}</p>}
                  <p className="mt-1 text-[11px] text-navy-400">
                    {b.penulis ?? "—"} • {formatTanggalIndonesia(b.published_at ?? b.created_at)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <button
                    onClick={() => ubahStatus(b)}
                    disabled={sibuk === b.id}
                    title={b.status === "terbit" ? "Kembalikan ke draft" : "Terbitkan"}
                    className="flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50 disabled:opacity-50"
                  >
                    {b.status === "terbit" ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    {b.status === "terbit" ? "Draft" : "Terbitkan"}
                  </button>
                  <button
                    onClick={() => setForm(b)}
                    className="rounded-lg border border-navy-200 bg-white p-1.5 text-navy-500 hover:bg-navy-50 hover:text-bpom-600"
                    aria-label="Ubah berita"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => hapus(b)}
                    disabled={sibuk === b.id}
                    className="rounded-lg border border-navy-200 bg-white p-1.5 text-navy-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    aria-label="Hapus berita"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {form && (
          <FormBerita
            awal={form === "baru" ? null : form}
            onTutup={() => setForm(null)}
            onSimpan={(m) => { setForm(null); setPesan(m); segarkan(); }}
          />
        )}
      </div>
    </AppShell>
  );
}

function FormBerita({
  awal, onTutup, onSimpan,
}: { awal: BeritaItem | null; onTutup: () => void; onSimpan: (pesan: string) => void }) {
  const [f, setF] = useState({
    judul: awal?.judul ?? "",
    ringkasan: awal?.ringkasan ?? "",
    konten: awal?.konten ?? "",
    kategori: awal?.kategori ?? "pengumuman",
    status: awal?.status ?? "draft",
  });
  const [gambar, setGambar] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(awal?.gambar_url ?? null);
  const [hapusGambar, setHapusGambar] = useState(false);
  const [simpan, setSimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.judul.trim().length >= 3 && f.konten.trim().length >= 10;

  function pilihGambar(file?: File) {
    setGalat(null);
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setGalat("Ukuran gambar melebihi 3 MB.");
      return;
    }
    setGambar(file);
    setPratinjau(URL.createObjectURL(file));
    setHapusGambar(false);
  }

  async function kirim() {
    setSimpan(true); setGalat(null);
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, v));
      if (gambar) fd.append("gambar", gambar);
      if (hapusGambar) fd.append("hapus_gambar", "1");

      const { data } = awal
        ? await api.post(`/berita/${awal.id}`, fd)
        : await api.post("/berita", fd);
      onSimpan(data.message ?? "Berita disimpan.");
    } catch (e) {
      setGalat(extractApiErrorMessage(e));
    } finally {
      setSimpan(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onTutup} />
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-navy-900/10 bg-gradient-to-br from-navy-900 to-navy-800 px-5 py-3.5 text-white">
          <h3 className="flex items-center gap-2 text-base font-extrabold">
            <Newspaper className="size-5" /> {awal ? "Ubah Berita" : "Tulis Berita"}
          </h3>
          <button onClick={onTutup} className="rounded-lg p-1 hover:bg-white/10"><X className="size-5" /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <div>
            <label className="text-xs font-semibold text-navy-500">Judul *</label>
            <input className={cn(KELAS_INPUT, "mt-1")} value={f.judul} onChange={(e) => set("judul", e.target.value)} placeholder="Judul berita" />
          </div>

          <div>
            <label className="text-xs font-semibold text-navy-500">Ringkasan</label>
            <textarea className={cn(KELAS_INPUT, "mt-1")} rows={2} maxLength={300} value={f.ringkasan ?? ""} onChange={(e) => set("ringkasan", e.target.value)} placeholder="Ringkasan singkat (maks. 300 karakter)" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-navy-500">Kategori</label>
              <select className={cn(KELAS_INPUT, "mt-1")} value={f.kategori} onChange={(e) => set("kategori", e.target.value)}>
                {KATEGORI.map((k) => <option key={k} value={k}>{KATEGORI_LABEL[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-navy-500">Status</label>
              <select className={cn(KELAS_INPUT, "mt-1")} value={f.status} onChange={(e) => set("status", e.target.value)}>
                <option value="draft">Draft (belum tampil publik)</option>
                <option value="terbit">Terbit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-navy-500">Gambar</label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {pratinjau ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pratinjau} alt="Pratinjau" className="size-20 rounded-xl border border-navy-900/10 object-cover" />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-xl bg-navy-50">
                  <ImageIcon className="size-6 text-navy-300" />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="cursor-pointer rounded-xl border border-navy-200 bg-white px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-navy-50">
                  Pilih gambar
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pilihGambar(e.target.files?.[0])} />
                </label>
                {pratinjau && (
                  <button
                    onClick={() => { setGambar(null); setPratinjau(null); setHapusGambar(true); }}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Hapus gambar
                  </button>
                )}
                <span className="text-[11px] text-navy-400">JPG/PNG/WEBP, maks. 3 MB</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-navy-500">Isi Berita *</label>
            <textarea className={cn(KELAS_INPUT, "mt-1")} rows={9} value={f.konten} onChange={(e) => set("konten", e.target.value)} placeholder="Tulis isi berita di sini…" />
          </div>

          {galat && <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-700">{galat}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-navy-900/10 bg-white px-5 py-3.5">
          <Button variant="danger" onClick={onTutup}>Batal</Button>
          <Button variant="secondary" loading={simpan} disabled={!valid} onClick={kirim}>
            <Save className="size-4" /> Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}
