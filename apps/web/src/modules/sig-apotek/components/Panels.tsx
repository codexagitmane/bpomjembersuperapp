"use client";

import { useMemo } from "react";
import {
  Store, CheckCircle2, Clock, HelpCircle, AlertTriangle, ListChecks,
  RotateCcw, Search, Layers, Info, X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Bootstrap, FilterSig, Kpi, LapisanPeta, Peringatan } from "../types";
import { FILTER_KOSONG, LABEL_STATUS_SARANA } from "../types";

const KELAS_INPUT =
  "w-full rounded-xl border border-navy-900/10 bg-white px-3 py-2 text-sm outline-none focus:border-bpom-500";

// ── KPI ────────────────────────────────────────────────────────────────────

const KARTU: { kunci: keyof Kpi; label: string; ikon: React.ReactNode; nada: string; ket?: string }[] = [
  { kunci: "total_apotek", label: "Total Apotek", ikon: <Store className="size-4" />, nada: "bg-navy-50 text-navy-700" },
  { kunci: "apotek_aktif", label: "Apotek Aktif", ikon: <CheckCircle2 className="size-4" />, nada: "bg-bpom-50 text-bpom-700" },
  { kunci: "perlu_monitoring", label: "Perlu Monitoring", ikon: <Clock className="size-4" />, nada: "bg-amber-500/10 text-amber-600", ket: "Belum diperiksa atau lebih dari 12 bulan" },
  { kunci: "belum_diperiksa", label: "Belum Diperiksa", ikon: <HelpCircle className="size-4" />, nada: "bg-navy-50 text-navy-500" },
  { kunci: "temuan_aktif", label: "Temuan Aktif", ikon: <AlertTriangle className="size-4" />, nada: "bg-rose-500/10 text-rose-600", ket: "Berstatus belum atau dalam proses" },
  { kunci: "tindak_lanjut_belum_selesai", label: "Tindak Lanjut Belum Selesai", ikon: <ListChecks className="size-4" />, nada: "bg-amber-500/10 text-amber-600" },
];

export function KartuKpi({ kpi, muat }: { kpi: Kpi | null; muat: boolean }) {
  if (muat || !kpi) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-navy-100/60" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
      {KARTU.map((k) => (
        <Card key={k.kunci} className="min-w-0 !p-3 sm:!p-3.5">
          <div className={cn("mb-2 flex size-8 items-center justify-center rounded-xl", k.nada)}>{k.ikon}</div>
          <p className="text-2xl font-extrabold tabular-nums text-navy-900">{kpi[k.kunci]}</p>
          <p className="mt-0.5 text-[11px] font-semibold leading-tight text-navy-600">{k.label}</p>
          {k.ket && <p className="mt-0.5 text-[10px] leading-tight text-navy-400">{k.ket}</p>}
        </Card>
      ))}
    </div>
  );
}

// ── Peringatan monitoring ──────────────────────────────────────────────────

export function PanelPeringatan({ daftar }: { daftar: Peringatan[] }) {
  if (daftar.length === 0) return null;

  const nada: Record<string, string> = {
    info: "border-navy-200 bg-navy-50/70 text-navy-600",
    peringatan: "border-amber-200 bg-amber-50/70 text-amber-700",
    bahaya: "border-rose-200 bg-rose-50/70 text-rose-700",
  };

  return (
    <Card className="!p-4">
      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-400">
        <AlertTriangle className="size-3.5" /> Monitoring Alert
      </p>
      <div className="space-y-1.5">
        {daftar.map((p, i) => (
          <div key={i} className={cn("rounded-xl border px-3 py-2 text-xs font-medium", nada[p.tingkat])}>
            {p.pesan}
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[10px] leading-relaxed text-navy-400">
        Peringatan disusun dari data yang tersimpan pada sistem, bukan dari asumsi.
      </p>
    </Card>
  );
}

// ── Filter ─────────────────────────────────────────────────────────────────

export function PanelFilter({
  filter, setFilter, boot, jumlahHasil, onTutup,
}: {
  filter: FilterSig;
  setFilter: (f: FilterSig) => void;
  boot: Bootstrap | null;
  jumlahHasil: number;
  onTutup?: () => void;
}) {
  const set = (k: keyof FilterSig, v: string) => {
    // Mengganti kabupaten mengosongkan kecamatan agar pilihan tetap sahih.
    setFilter(k === "kabupaten" ? { ...filter, kabupaten: v, kecamatan: "" } : { ...filter, [k]: v });
  };

  const aktif = useMemo(
    () => Object.entries(filter).filter(([, v]) => v !== "").length,
    [filter]
  );

  const kecamatan = boot?.kecamatan ?? [];

  return (
    <Card className="!p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-400">
          <Layers className="size-3.5" /> Filter
          {aktif > 0 && <span className="rounded-full bg-bpom-600 px-1.5 text-[10px] text-white">{aktif}</span>}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter({ ...FILTER_KOSONG })}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-navy-500 hover:bg-navy-50"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
          {onTutup && (
            <button onClick={onTutup} className="rounded-lg p-1 text-navy-400 hover:bg-navy-50 lg:hidden">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        <Pilih label="Kabupaten" nilai={filter.kabupaten} onChange={(v) => set("kabupaten", v)}
          opsi={(boot?.kabupaten ?? []).map((k) => ({ value: k, label: k }))} />

        <Pilih label="Kecamatan" nilai={filter.kecamatan} onChange={(v) => set("kecamatan", v)}
          opsi={kecamatan.map((k) => ({ value: k, label: k }))}
          nonaktif={kecamatan.length === 0} />

        <Pilih label="Status Sarana" nilai={filter.status_sarana} onChange={(v) => set("status_sarana", v)}
          opsi={(boot?.status_sarana ?? []).map((s) => ({ value: s, label: LABEL_STATUS_SARANA[s] ?? s }))} />

        <Pilih label="Status Monitoring" nilai={filter.monitoring} onChange={(v) => set("monitoring", v)}
          opsi={[
            { value: "sudah", label: "Sudah diperiksa" },
            { value: "belum", label: "Belum diperiksa" },
            { value: "perlu", label: "Perlu monitoring" },
          ]} />

        <Pilih label="Status Temuan" nilai={filter.temuan} onChange={(v) => set("temuan", v)}
          opsi={[
            { value: "aktif", label: "Ada temuan aktif" },
            { value: "ada", label: "Pernah ada temuan" },
            { value: "tidak_ada", label: "Tidak ada temuan" },
          ]} />

        <Pilih label="Tindak Lanjut" nilai={filter.tindak_lanjut} onChange={(v) => set("tindak_lanjut", v)}
          opsi={[{ value: "belum_selesai", label: "Belum selesai" }]} />

        <Pilih label="Jenis Sarana" nilai={filter.jenis_sarana} onChange={(v) => set("jenis_sarana", v)}
          opsi={(boot?.jenis_sarana ?? []).map((j) => ({ value: j, label: j.replace("_", " ") }))} />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold text-navy-500">Periksa dari</label>
            <input type="date" className={cn(KELAS_INPUT, "mt-1")} value={filter.tanggal_dari}
              onChange={(e) => set("tanggal_dari", e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-navy-500">sampai</label>
            <input type="date" className={cn(KELAS_INPUT, "mt-1")} value={filter.tanggal_sampai}
              onChange={(e) => set("tanggal_sampai", e.target.value)} />
          </div>
        </div>
      </div>

      <p className="mt-3 rounded-xl bg-navy-50 px-3 py-2 text-[11px] font-semibold text-navy-600">
        {jumlahHasil} sarana sesuai filter
      </p>
    </Card>
  );
}

function Pilih({
  label, nilai, onChange, opsi, nonaktif,
}: {
  label: string;
  nilai: string;
  onChange: (v: string) => void;
  opsi: { value: string; label: string }[];
  nonaktif?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-navy-500">{label}</label>
      <select
        className={cn(KELAS_INPUT, "mt-1", nonaktif && "opacity-60")}
        value={nilai}
        disabled={nonaktif}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Semua</option>
        {opsi.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Pencarian ──────────────────────────────────────────────────────────────

export function KotakCari({
  nilai, onChange, hasil, onPilih,
}: {
  nilai: string;
  onChange: (v: string) => void;
  hasil: { id: number; nama_apotek: string; alamat: string; kecamatan: string | null; kabupaten: string | null; status_sarana: string }[];
  onPilih: (id: number) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
      <input
        value={nilai}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cari nama apotek, alamat, NIB, atau nomor izin…"
        className={cn(KELAS_INPUT, "pl-9")}
      />
      {nilai.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-[500] mt-1 max-h-72 overflow-y-auto rounded-2xl border border-navy-900/10 bg-white shadow-lg">
          {hasil.length === 0 && (
            <p className="px-4 py-3 text-xs text-navy-400">Data tidak ditemukan untuk pencarian ini.</p>
          )}
          {hasil.slice(0, 30).map((h) => (
            <button
              key={h.id}
              onClick={() => onPilih(h.id)}
              className="block w-full border-b border-navy-900/5 px-4 py-2.5 text-left last:border-0 hover:bg-navy-50"
            >
              <p className="text-sm font-semibold text-navy-900">{h.nama_apotek}</p>
              <p className="truncate text-[11px] text-navy-500">{h.alamat}</p>
              <p className="text-[11px] text-navy-400">
                {[h.kecamatan, h.kabupaten].filter(Boolean).join(", ")} •{" "}
                {LABEL_STATUS_SARANA[h.status_sarana] ?? h.status_sarana}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Kontrol lapisan peta ───────────────────────────────────────────────────

const LABEL_LAPISAN: { kunci: keyof LapisanPeta; label: string }[] = [
  { kunci: "marker", label: "Marker Apotek" },
  { kunci: "cluster", label: "Kelompokkan (Cluster)" },
  { kunci: "heatmap", label: "Heatmap Persebaran" },
  { kunci: "batasWilayah", label: "Batas Wilayah" },
  { kunci: "distribusi", label: "Jalur Distribusi" },
];

export function KontrolLapisan({
  lapisan, setLapisan, batasTersedia, catatanBatas,
}: {
  lapisan: LapisanPeta;
  setLapisan: (l: LapisanPeta) => void;
  batasTersedia: boolean;
  catatanBatas: string;
}) {
  return (
    <Card className="!p-4">
      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-400">
        <Layers className="size-3.5" /> Lapisan Peta
      </p>
      <div className="space-y-1.5">
        {LABEL_LAPISAN.map((l) => {
          const nonaktif = l.kunci === "batasWilayah" && !batasTersedia;
          return (
            <label
              key={l.kunci}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors",
                nonaktif ? "cursor-not-allowed opacity-50" : "text-navy-700 hover:bg-navy-50"
              )}
            >
              <input
                type="checkbox"
                className="size-3.5 accent-bpom-600"
                checked={lapisan[l.kunci]}
                disabled={nonaktif}
                onChange={(e) => setLapisan({ ...lapisan, [l.kunci]: e.target.checked })}
              />
              {l.label}
            </label>
          );
        })}
      </div>
      {!batasTersedia && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-navy-50 px-2.5 py-2 text-[10px] leading-relaxed text-navy-500">
          <Info className="mt-0.5 size-3 shrink-0" />
          {catatanBatas || "Berkas batas wilayah belum tersedia."}
        </p>
      )}
    </Card>
  );
}

// ── Catatan baku modul ─────────────────────────────────────────────────────

export function DisclaimerSig({ teks }: { teks?: string }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-[11px] leading-relaxed text-amber-700">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {teks ??
          "SIG Monitoring Distribusi Apotek merupakan alat bantu visualisasi, monitoring, dan analisis data. Informasi yang ditampilkan bergantung pada data yang tersedia dan bukan merupakan keputusan regulator."}
      </span>
    </p>
  );
}

/** Keadaan kosong yang konsisten di seluruh modul. */
export function KosongSig({ pesan, aksi }: { pesan: string; aksi?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <Store className="size-9 text-navy-200" />
      <p className="text-sm font-semibold text-navy-600">{pesan}</p>
      {aksi}
    </div>
  );
}
