"use client";

import { useEffect, useState } from "react";
import {
  X, MapPin, ClipboardList, AlertTriangle, ListChecks, Share2, History,
  Building2, ExternalLink, Plus, CheckCircle2, Clock, Gauge,
} from "lucide-react";
import { Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Apotek, DetailApotek as Detail, Temuan } from "../types";
import { WARNA_STATUS, LABEL_STATUS_SARANA } from "../types";
import { apotekService, temuanService } from "../services/sigService";
import { DisclaimerSig, KosongSig } from "./Panels";

type Tab = "profil" | "lokasi" | "pemeriksaan" | "temuan" | "tindak_lanjut" | "distribusi" | "riwayat";

const TAB: { id: Tab; label: string; ikon: React.ReactNode }[] = [
  { id: "profil", label: "Profil", ikon: <Building2 className="size-3.5" /> },
  { id: "lokasi", label: "Lokasi", ikon: <MapPin className="size-3.5" /> },
  { id: "pemeriksaan", label: "Pemeriksaan", ikon: <ClipboardList className="size-3.5" /> },
  { id: "temuan", label: "Temuan", ikon: <AlertTriangle className="size-3.5" /> },
  { id: "tindak_lanjut", label: "Tindak Lanjut", ikon: <ListChecks className="size-3.5" /> },
  { id: "distribusi", label: "Distribusi", ikon: <Share2 className="size-3.5" /> },
  { id: "riwayat", label: "Riwayat", ikon: <History className="size-3.5" /> },
];

const KELAS =
  "w-full rounded-xl border border-navy-900/10 bg-white px-3 py-2 text-sm outline-none focus:border-bpom-500";

export function DetailApotekPanel({
  id, bolehUbah, onTutup, onLihatPeta, onPerubahan,
}: {
  id: number;
  bolehUbah: boolean;
  onTutup: () => void;
  onLihatPeta: (a: Apotek) => void;
  onPerubahan: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [tab, setTab] = useState<Tab>("profil");
  const [muat, setMuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [tik, setTik] = useState(0);
  const [formPeriksa, setFormPeriksa] = useState(false);

  useEffect(() => {
    let batal = false;
    apotekService
      .detail(id)
      .then((d) => { if (!batal) setDetail(d); })
      .catch(() => { if (!batal) setGalat("Gagal memuat data. Silakan coba kembali."); })
      .finally(() => { if (!batal) setMuat(false); });
    return () => { batal = true; };
  }, [id, tik]);

  const segarkan = () => { setMuat(true); setTik((t) => t + 1); onPerubahan(); };

  return (
    <div className="fixed inset-0 z-[550] flex justify-end">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm" onClick={onTutup} />
      <div className="relative flex h-full w-full max-w-3xl flex-col bg-background shadow-2xl">
        {/* Kepala */}
        <div className="flex items-start justify-between gap-3 border-b border-navy-900/10 bg-gradient-to-br from-navy-900 to-navy-800 px-5 py-4 text-white">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Profil Apotek</p>
            <h3 className="truncate text-lg font-extrabold">
              {detail?.profil.nama_apotek ?? (muat ? "Memuat…" : "—")}
            </h3>
            {detail && (
              <p className="mt-0.5 text-xs text-white/70">
                {[detail.profil.kecamatan, detail.profil.kabupaten].filter(Boolean).join(", ") || "Wilayah belum lengkap"}
              </p>
            )}
          </div>
          <button onClick={onTutup} className="rounded-lg p-1 hover:bg-white/10"><X className="size-5" /></button>
        </div>

        {/* Tab */}
        <div className="flex gap-1 overflow-x-auto border-b border-navy-900/5 bg-white px-3 py-2 scrollbar-none">
          {TAB.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors",
                tab === t.id ? "bg-navy-900 text-white" : "text-navy-500 hover:bg-navy-50"
              )}
            >
              {t.ikon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {muat && <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-navy-100/60" />)}</div>}
          {galat && <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{galat}</p>}

          {detail && !muat && (
            <>
              {tab === "profil" && <TabProfil d={detail} />}
              {tab === "lokasi" && <TabLokasi d={detail} onLihatPeta={onLihatPeta} />}
              {tab === "pemeriksaan" && (
                <TabPemeriksaan
                  d={detail} bolehUbah={bolehUbah}
                  formTerbuka={formPeriksa} setFormTerbuka={setFormPeriksa}
                  onSelesai={() => { setFormPeriksa(false); segarkan(); }}
                />
              )}
              {tab === "temuan" && <TabTemuan d={detail} bolehUbah={bolehUbah} onUbah={segarkan} />}
              {tab === "tindak_lanjut" && <TabTindakLanjut d={detail} bolehUbah={bolehUbah} onUbah={segarkan} />}
              {tab === "distribusi" && <TabDistribusi d={detail} />}
              {tab === "riwayat" && <TabRiwayat d={detail} />}

              <div className="mt-5"><DisclaimerSig teks={detail.disclaimer} /></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Profil ────────────────────────────────────────────────────────────

function TabProfil({ d }: { d: Detail }) {
  const p = d.profil;
  const warnaTingkat: Record<string, string> = {
    tinggi: "bg-rose-500/10 text-rose-600",
    sedang: "bg-amber-500/10 text-amber-600",
    rendah: "bg-bpom-50 text-bpom-700",
  };

  return (
    <div className="space-y-4">
      {p.is_demo && (
        <p className="rounded-xl bg-navy-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-navy-600">
          Data Demo
        </p>
      )}

      {/* Skor prioritas beserta rinciannya */}
      <div className="rounded-2xl border border-navy-900/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-400">
            <Gauge className="size-3.5" /> Skor Prioritas Monitoring
          </p>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold", warnaTingkat[d.prioritas.tingkat])}>
            {d.prioritas.skor} — Prioritas {d.prioritas.tingkat}
          </span>
        </div>
        <div className="mt-3 space-y-1.5">
          {d.prioritas.rincian.map((r, i) => (
            <div key={i} className="rounded-xl bg-navy-50/60 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-navy-700">{r.parameter}</span>
                <span className="text-xs font-bold tabular-nums text-navy-500">{r.nilai}/{r.maksimum}</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-navy-500">{r.alasan}</p>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[10px] leading-relaxed text-navy-400">
          Skor ini membantu menyusun urutan kunjungan monitoring. Skor tinggi tidak berarti sarana
          melakukan pelanggaran.
        </p>
      </div>

      <Baris label="Nama Apotek" nilai={p.nama_apotek} />
      <Baris label="Nama Pemilik" nilai={p.pemilik} internal />
      <Baris label="Penanggung Jawab" nilai={p.penanggung_jawab} internal />
      <Baris label="Alamat" nilai={p.alamat} />
      <Baris label="Kabupaten" nilai={p.kabupaten} />
      <Baris label="Kecamatan" nilai={p.kecamatan} />
      <Baris label="Desa/Kelurahan" nilai={p.desa} />
      <Baris label="Nomor Telepon" nilai={p.telepon} internal />
      <Baris label="Email" nilai={p.email} internal />
      <Baris label="NIB" nilai={p.nib} />
      <Baris label="Nomor Izin / Identitas Sarana" nilai={p.nomor_identitas} />
      <Baris label="Jenis Sarana" nilai={p.jenis_sarana?.replace("_", " ")} />
      <Baris label="Status Sarana" nilai={LABEL_STATUS_SARANA[p.status_sarana] ?? p.status_sarana} />
      <Baris label="Status Monitoring" nilai={WARNA_STATUS[p.status_peta].label} />
      <Baris label="Tanggal Input" nilai={p.tanggal_input?.slice(0, 10)} />
      <Baris label="Tanggal Update" nilai={p.tanggal_update?.slice(0, 10)} />
      {p.keterangan && <Baris label="Keterangan" nilai={p.keterangan} />}
    </div>
  );
}

function Baris({ label, nilai, internal }: { label: string; nilai?: string | null; internal?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-navy-900/5 pb-2 last:border-0">
      <span className="w-56 shrink-0 text-xs font-semibold text-navy-500">
        {label}
        {internal && <span className="ml-1 rounded bg-navy-100 px-1 text-[9px] font-bold text-navy-500">INTERNAL</span>}
      </span>
      <span className="min-w-0 flex-1 text-sm text-navy-800">{nilai || <span className="text-navy-300">—</span>}</span>
    </div>
  );
}

// ── Tab: Lokasi ────────────────────────────────────────────────────────────

function TabLokasi({ d, onLihatPeta }: { d: Detail; onLihatPeta: (a: Apotek) => void }) {
  const p = d.profil;

  if (!p.punya_koordinat) {
    return (
      <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 p-6 text-center">
        <MapPin className="mx-auto size-8 text-navy-300" />
        <p className="mt-2 text-sm font-semibold text-navy-700">Lokasi belum memiliki koordinat.</p>
        <p className="mt-1 text-xs leading-relaxed text-navy-500">
          Alamat sudah tercatat, namun titik koordinatnya belum diisi sehingga sarana ini belum
          muncul di peta. Gunakan menu Ubah untuk melengkapi koordinatnya.
        </p>
        <p className="mt-3 text-xs text-navy-600">{p.alamat}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Baris label="Latitude" nilai={String(p.latitude)} />
      <Baris label="Longitude" nilai={String(p.longitude)} />
      <Baris label="Alamat" nilai={p.alamat} />

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="secondary" onClick={() => onLihatPeta(p)}>
          <MapPin className="size-4" /> Buka di Peta
        </Button>
        <a
          href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white px-3 py-2 text-xs font-bold text-navy-700 hover:bg-navy-50"
        >
          <ExternalLink className="size-3.5" /> OpenStreetMap
        </a>
      </div>
    </div>
  );
}

// ── Tab: Pemeriksaan ───────────────────────────────────────────────────────

function TabPemeriksaan({
  d, bolehUbah, formTerbuka, setFormTerbuka, onSelesai,
}: {
  d: Detail;
  bolehUbah: boolean;
  formTerbuka: boolean;
  setFormTerbuka: (v: boolean) => void;
  onSelesai: () => void;
}) {
  return (
    <div className="space-y-3">
      {bolehUbah && !formTerbuka && (
        <Button size="sm" variant="secondary" onClick={() => setFormTerbuka(true)}>
          <Plus className="size-4" /> Catat Pemeriksaan
        </Button>
      )}

      {formTerbuka && <FormPemeriksaan apotekId={d.profil.id} onBatal={() => setFormTerbuka(false)} onSelesai={onSelesai} />}

      {d.pemeriksaan.length === 0 && !formTerbuka && (
        <KosongSig pesan="Belum ada riwayat pemeriksaan pada sarana ini." />
      )}

      {/* Linimasa pemeriksaan */}
      <div className="relative space-y-3 pl-5">
        {d.pemeriksaan.length > 0 && (
          <span className="absolute left-1.5 top-2 bottom-2 w-px bg-navy-200" aria-hidden />
        )}
        {d.pemeriksaan.map((p) => (
          <div key={p.id} className="relative rounded-2xl border border-navy-900/10 p-3.5">
            <span className="absolute -left-[18px] top-5 size-3 rounded-full border-2 border-white bg-bpom-500" aria-hidden />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-navy-900">{p.tanggal ?? "—"}</p>
              <Badge tone="info">{p.jenis.replace("_", " ")}</Badge>
              {p.jumlah_temuan > 0
                ? <Badge tone="warning">{p.jumlah_temuan} temuan</Badge>
                : <Badge tone="success">Tanpa temuan</Badge>}
            </div>
            {p.petugas && <p className="mt-1 text-xs text-navy-500">Petugas: {p.petugas}</p>}
            {p.hasil && <p className="mt-1.5 text-xs leading-relaxed text-navy-700">{p.hasil}</p>}
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-navy-500">
              <span>Status tindak lanjut: <b>{p.status_tindak_lanjut.replace("_", " ")}</b></span>
              {p.target_penyelesaian && <span>Target: {p.target_penyelesaian}</span>}
              {p.jumlah_temuan > 0 && (
                <span>{p.temuan_selesai} selesai • {p.temuan_proses} dalam tindak lanjut</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormPemeriksaan({
  apotekId, onBatal, onSelesai,
}: { apotekId: number; onBatal: () => void; onSelesai: () => void }) {
  const [f, setF] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    jenis: "pemeriksaan_sarana",
    petugas: "",
    hasil: "",
    catatan: "",
    target_penyelesaian: "",
  });
  const [temuan, setTemuan] = useState<{ kategori: string; deskripsi: string; pic: string }[]>([]);
  const [simpan, setSimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function kirim() {
    setSimpan(true); setGalat(null);
    try {
      await apotekService.simpanPemeriksaan(apotekId, {
        ...f,
        target_penyelesaian: f.target_penyelesaian || null,
        temuan: temuan.filter((t) => t.deskripsi.trim() !== ""),
      });
      onSelesai();
    } catch {
      setGalat("Data gagal disimpan. Silakan coba kembali.");
    } finally {
      setSimpan(false);
    }
  }

  return (
    <div className="rounded-2xl border border-navy-900/10 bg-navy-50/40 p-4">
      <p className="text-sm font-bold text-navy-800">Catat Pemeriksaan</p>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold text-navy-500">Tanggal Pemeriksaan *</label>
          <input type="date" className={cn(KELAS, "mt-1")} value={f.tanggal} onChange={(e) => set("tanggal", e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-navy-500">Jenis Pemeriksaan</label>
          <select className={cn(KELAS, "mt-1")} value={f.jenis} onChange={(e) => set("jenis", e.target.value)}>
            <option value="pemeriksaan_sarana">Pemeriksaan Sarana</option>
            <option value="pemeriksaan_rutin">Pemeriksaan Rutin</option>
            <option value="pemeriksaan_khusus">Pemeriksaan Khusus</option>
            <option value="verifikasi">Verifikasi Tindak Lanjut</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-navy-500">Tim / Petugas</label>
          <input className={cn(KELAS, "mt-1")} value={f.petugas} onChange={(e) => set("petugas", e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-navy-500">Target Penyelesaian</label>
          <input type="date" className={cn(KELAS, "mt-1")} value={f.target_penyelesaian}
            onChange={(e) => set("target_penyelesaian", e.target.value)} />
        </div>
      </div>

      <div className="mt-2.5">
        <label className="text-[11px] font-semibold text-navy-500">Hasil Pemeriksaan</label>
        <textarea className={cn(KELAS, "mt-1")} rows={2} value={f.hasil} onChange={(e) => set("hasil", e.target.value)} />
      </div>

      {/* Temuan */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-navy-700">Temuan ({temuan.length})</p>
          <button
            onClick={() => setTemuan((t) => [...t, { kategori: "", deskripsi: "", pic: "" }])}
            className="inline-flex items-center gap-1 rounded-lg border border-navy-200 bg-white px-2 py-1 text-[11px] font-bold text-navy-600 hover:bg-navy-50"
          >
            <Plus className="size-3" /> Tambah
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {temuan.map((t, i) => (
            <div key={i} className="rounded-xl bg-white p-2.5">
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={KELAS} placeholder="Kategori (mis. dokumen)" value={t.kategori}
                  onChange={(e) => setTemuan((r) => r.map((x, j) => j === i ? { ...x, kategori: e.target.value } : x))} />
                <input className={KELAS} placeholder="PIC" value={t.pic}
                  onChange={(e) => setTemuan((r) => r.map((x, j) => j === i ? { ...x, pic: e.target.value } : x))} />
              </div>
              <textarea className={cn(KELAS, "mt-2")} rows={2} placeholder="Uraian temuan *" value={t.deskripsi}
                onChange={(e) => setTemuan((r) => r.map((x, j) => j === i ? { ...x, deskripsi: e.target.value } : x))} />
              <button
                onClick={() => setTemuan((r) => r.filter((_, j) => j !== i))}
                className="mt-1 text-[11px] font-semibold text-rose-600 hover:underline"
              >
                Hapus temuan ini
              </button>
            </div>
          ))}
        </div>
      </div>

      {galat && <p className="mt-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-700">{galat}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="danger" onClick={onBatal}>Batal</Button>
        <Button size="sm" variant="secondary" loading={simpan} onClick={kirim}>Simpan Pemeriksaan</Button>
      </div>
    </div>
  );
}

// ── Tab: Temuan ────────────────────────────────────────────────────────────

const NADA_TEMUAN: Record<string, "danger" | "warning" | "success"> = {
  belum: "danger",
  proses: "warning",
  selesai: "success",
};

function TabTemuan({ d, bolehUbah, onUbah }: { d: Detail; bolehUbah: boolean; onUbah: () => void }) {
  if (d.temuan.length === 0) {
    return <KosongSig pesan="Belum terdapat temuan pada data ini." />;
  }

  return (
    <div className="space-y-2.5">
      {d.temuan.map((t) => <KartuTemuan key={t.id} t={t} bolehUbah={bolehUbah} onUbah={onUbah} />)}
    </div>
  );
}

function KartuTemuan({ t, bolehUbah, onUbah }: { t: Temuan; bolehUbah: boolean; onUbah: () => void }) {
  const [sibuk, setSibuk] = useState(false);

  async function ubahStatus(status: string) {
    setSibuk(true);
    try {
      await temuanService.ubahStatus(t.id, { status });
      onUbah();
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="rounded-2xl border border-navy-900/10 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={NADA_TEMUAN[t.status]}>{t.status}</Badge>
        {t.kategori && <Badge tone="neutral">{t.kategori}</Badge>}
        {t.lewat_target && <Badge tone="danger">Lewat target</Badge>}
        <span className="text-[11px] text-navy-400">{t.tanggal}</span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-navy-800">{t.deskripsi}</p>
      <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-navy-500">
        {t.pic && <span>PIC: {t.pic}</span>}
        {t.target && <span>Target: {t.target}</span>}
        <span>{t.tindak_lanjut.length} tindak lanjut tercatat</span>
      </div>

      {bolehUbah && t.status !== "selesai" && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {t.status === "belum" && (
            <button disabled={sibuk} onClick={() => ubahStatus("proses")}
              className="rounded-lg border border-navy-200 bg-white px-2.5 py-1 text-[11px] font-bold text-navy-600 hover:bg-navy-50 disabled:opacity-50">
              Tandai diproses
            </button>
          )}
          <button disabled={sibuk} onClick={() => ubahStatus("selesai")}
            className="rounded-lg border border-bpom-200 bg-bpom-50 px-2.5 py-1 text-[11px] font-bold text-bpom-700 hover:bg-bpom-100 disabled:opacity-50">
            Tandai selesai
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab: Tindak Lanjut ─────────────────────────────────────────────────────

const TAHAP = ["tindakan", "bukti", "verifikasi", "selesai"] as const;

function TabTindakLanjut({ d, bolehUbah, onUbah }: { d: Detail; bolehUbah: boolean; onUbah: () => void }) {
  const [aktif, setAktif] = useState<number | null>(null);

  if (d.temuan.length === 0) {
    return <KosongSig pesan="Belum terdapat temuan yang perlu ditindaklanjuti." />;
  }

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-navy-50 px-3 py-2 text-[11px] leading-relaxed text-navy-600">
        Alur tindak lanjut: <b>Temuan → Tindakan Koreksi → Bukti → Verifikasi → Selesai</b>. Status di sini
        merupakan status administratif pada sistem, bukan pernyataan bahwa tindakan telah sah menurut regulator.
      </p>

      {d.temuan.map((t) => (
        <div key={t.id} className="rounded-2xl border border-navy-900/10 p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={NADA_TEMUAN[t.status]}>{t.status}</Badge>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-navy-800">{t.deskripsi}</p>
          </div>

          {/* Linimasa tahapan */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {TAHAP.map((tahap, i) => {
              const tercapai = t.tindak_lanjut.some((x) => TAHAP.indexOf(x.tahap) >= i) || t.status === "selesai";
              return (
                <span key={tahap} className="flex items-center gap-1.5">
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold",
                    tercapai ? "bg-bpom-50 text-bpom-700" : "bg-navy-50 text-navy-400"
                  )}>
                    {tercapai ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                    {tahap}
                  </span>
                  {i < TAHAP.length - 1 && <span className="text-navy-200">→</span>}
                </span>
              );
            })}
          </div>

          {t.tindak_lanjut.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {t.tindak_lanjut.map((x) => (
                <div key={x.id} className="rounded-xl bg-navy-50/60 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-navy-500">
                    <b className="text-navy-700">{x.tanggal}</b>
                    <Badge tone="neutral">{x.tahap}</Badge>
                    {x.pic && <span>PIC: {x.pic}</span>}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-navy-700">{x.uraian}</p>
                  <p className="mt-0.5 text-[11px] text-navy-500">
                    Bukti: {x.bukti || <span className="text-navy-400">Belum ada bukti objektif yang dapat ditampilkan.</span>}
                  </p>
                </div>
              ))}
            </div>
          )}

          {bolehUbah && t.status !== "selesai" && (
            aktif === t.id
              ? <FormTindakLanjut temuanId={t.id} onBatal={() => setAktif(null)} onSelesai={() => { setAktif(null); onUbah(); }} />
              : (
                <button
                  onClick={() => setAktif(t.id)}
                  className="mt-2.5 inline-flex items-center gap-1 rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-navy-600 hover:bg-navy-50"
                >
                  <Plus className="size-3" /> Catat Tindak Lanjut
                </button>
              )
          )}
        </div>
      ))}
    </div>
  );
}

function FormTindakLanjut({
  temuanId, onBatal, onSelesai,
}: { temuanId: number; onBatal: () => void; onSelesai: () => void }) {
  const [f, setF] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    uraian: "",
    bukti: "",
    tahap: "tindakan",
    pic: "",
  });
  const [simpan, setSimpan] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function kirim() {
    setSimpan(true);
    try {
      await temuanService.tambahTindakLanjut(temuanId, { ...f, bukti: f.bukti || null });
      onSelesai();
    } finally {
      setSimpan(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-white p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <input type="date" className={KELAS} value={f.tanggal} onChange={(e) => set("tanggal", e.target.value)} />
        <select className={KELAS} value={f.tahap} onChange={(e) => set("tahap", e.target.value)}>
          {TAHAP.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input className={KELAS} placeholder="PIC" value={f.pic} onChange={(e) => set("pic", e.target.value)} />
      </div>
      <textarea className={cn(KELAS, "mt-2")} rows={2} placeholder="Uraian tindakan *"
        value={f.uraian} onChange={(e) => set("uraian", e.target.value)} />
      <input className={cn(KELAS, "mt-2")} placeholder="Bukti objektif (kosongkan bila belum ada)"
        value={f.bukti} onChange={(e) => set("bukti", e.target.value)} />
      <div className="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="danger" onClick={onBatal}>Batal</Button>
        <Button size="sm" variant="secondary" loading={simpan} disabled={f.uraian.trim().length < 3} onClick={kirim}>
          Simpan
        </Button>
      </div>
    </div>
  );
}

// ── Tab: Distribusi & Riwayat ──────────────────────────────────────────────

function TabDistribusi({ d }: { d: Detail }) {
  if (d.distribusi.length === 0) {
    return <KosongSig pesan="Belum tersedia data hubungan distribusi." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-navy-900/10 text-left text-[11px] uppercase tracking-wide text-navy-500">
            <th className="py-2 pr-3">Arah</th>
            <th className="py-2 pr-3">Sarana Lawan</th>
            <th className="py-2 pr-3">Tanggal</th>
            <th className="py-2 pr-3">Produk</th>
            <th className="py-2 pr-3">Jumlah</th>
            <th className="py-2 pr-3">Referensi</th>
          </tr>
        </thead>
        <tbody>
          {d.distribusi.map((x) => (
            <tr key={`${x.arah}-${x.id}`} className="border-b border-navy-900/5 last:border-0">
              <td className="py-2 pr-3">
                <Badge tone={x.arah === "keluar" ? "info" : "neutral"}>{x.arah}</Badge>
              </td>
              <td className="py-2 pr-3 text-navy-800">{x.lawan ?? "—"}</td>
              <td className="py-2 pr-3 text-xs text-navy-600">{x.tanggal ?? "—"}</td>
              <td className="py-2 pr-3 text-xs text-navy-600">{x.produk ?? "—"}</td>
              <td className="py-2 pr-3 text-xs text-navy-600">
                {x.jumlah != null ? `${x.jumlah} ${x.satuan ?? ""}` : "—"}
              </td>
              <td className="py-2 pr-3 text-xs text-navy-500">{x.referensi ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabRiwayat({ d }: { d: Detail }) {
  if (d.audit.length === 0) {
    return <KosongSig pesan="Belum ada riwayat perubahan data untuk sarana ini." />;
  }

  return (
    <div className="space-y-2">
      {d.audit.map((a) => (
        <div key={a.id} className="rounded-xl border border-navy-900/10 px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-navy-500">
            <b className="text-navy-700">{a.waktu?.slice(0, 10)}</b>
            <Badge tone="neutral">{a.aksi}</Badge>
            <span>{a.user ?? "Sistem"}</span>
          </div>
          {a.sebelum && a.sesudah && (
            <div className="mt-1.5 space-y-0.5">
              {Object.keys(a.sesudah)
                .filter((k) => JSON.stringify(a.sebelum?.[k]) !== JSON.stringify(a.sesudah?.[k]))
                .slice(0, 6)
                .map((k) => (
                  <p key={k} className="text-[11px] text-navy-600">
                    <b>{k}</b>: <span className="text-navy-400">{String(a.sebelum?.[k] ?? "—")}</span>
                    {" → "}
                    <span className="text-navy-800">{String(a.sesudah?.[k] ?? "—")}</span>
                  </p>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
