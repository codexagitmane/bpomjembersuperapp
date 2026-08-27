"use client";

import { Fragment, useMemo, useState } from "react";
import { BarChart3, Gauge, ShieldCheck, Copy, ChevronDown, Info } from "lucide-react";
import { Card, Badge } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { BarisPrioritas, KualitasData, RekapKabupaten, RekapKecamatan } from "../types";
import { KosongSig } from "./Panels";

// ── Analisis spasial ───────────────────────────────────────────────────────

const WARNA_DERET = ["#1e4278", "#17a361", "#d99a1e", "#cf4c50", "#2c5596"];

export function AnalisisSpasial({
  perKabupaten, perKecamatan, cakupan, catatan, onPilihKabupaten,
}: {
  perKabupaten: RekapKabupaten[];
  perKecamatan: RekapKecamatan[];
  cakupan: { label: string; jumlah: number }[];
  catatan: string;
  onPilihKabupaten: (k: string) => void;
}) {
  const [urut, setUrut] = useState<keyof RekapKecamatan>("jumlah");
  const maksKab = Math.max(1, ...perKabupaten.map((k) => k.jumlah));
  const maksCakupan = Math.max(1, ...cakupan.map((c) => c.jumlah));

  const kecamatanTerurut = useMemo(() => {
    return [...perKecamatan].sort((a, b) => {
      const x = a[urut];
      const y = b[urut];
      if (typeof x === "number" && typeof y === "number") return y - x;
      return String(x).localeCompare(String(y), "id");
    });
  }, [perKecamatan, urut]);

  return (
    <div className="space-y-4">
      {/* Statistik kabupaten */}
      <Card>
        <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-400">
          <BarChart3 className="size-3.5" /> Statistik per Kabupaten
        </p>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {perKabupaten.map((k, i) => (
            <button
              key={k.kabupaten}
              onClick={() => onPilihKabupaten(k.kabupaten)}
              className="rounded-2xl border border-navy-900/5 bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-bpom-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-navy-900">{k.kabupaten}</p>
                <span className="text-lg font-extrabold tabular-nums" style={{ color: WARNA_DERET[i % WARNA_DERET.length] }}>
                  {k.jumlah}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(k.jumlah / maksKab) * 100}%`, background: WARNA_DERET[i % WARNA_DERET.length] }}
                />
              </div>
              <dl className="mt-2 space-y-0.5 text-[11px] text-navy-500">
                <div>Sudah diperiksa: <b className="text-navy-700">{k.sudah_diperiksa}</b></div>
                <div>Belum diperiksa: <b className="text-navy-700">{k.belum_diperiksa}</b></div>
                <div>Temuan aktif: <b className="text-navy-700">{k.temuan_aktif}</b></div>
              </dl>
            </button>
          ))}
        </div>
      </Card>

      {/* Cakupan pemeriksaan 12 bulan */}
      <Card>
        <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-400">
          <BarChart3 className="size-3.5" /> Pemeriksaan 12 Bulan Terakhir
        </p>
        <div className="flex items-end justify-between gap-1" style={{ height: 120 }}>
          {cakupan.map((c) => (
            <div key={c.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-bold tabular-nums text-navy-600">{c.jumlah}</span>
              <div
                className="w-full max-w-6 rounded-t bg-navy-700"
                style={{ height: Math.max(3, (c.jumlah / maksCakupan) * 80) }}
              />
              <span className="w-full truncate text-center text-[9px] text-navy-400">{c.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Statistik kecamatan */}
      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-400">
            <BarChart3 className="size-3.5" /> Statistik per Kecamatan
          </p>
          <select
            className="rounded-lg border border-navy-900/10 bg-white px-2 py-1 text-xs outline-none"
            value={urut}
            onChange={(e) => setUrut(e.target.value as keyof RekapKecamatan)}
          >
            <option value="jumlah">Urut: Jumlah Apotek</option>
            <option value="temuan">Urut: Temuan</option>
            <option value="belum_monitoring">Urut: Belum Monitoring</option>
            <option value="tindak_lanjut_belum">Urut: Tindak Lanjut Belum</option>
          </select>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y border-navy-900/10 bg-navy-50/60 text-left text-[11px] uppercase tracking-wide text-navy-500">
                <th className="px-4 py-2">Kabupaten</th>
                <th className="px-3 py-2">Kecamatan</th>
                <th className="px-3 py-2">Apotek</th>
                <th className="px-3 py-2">Sudah</th>
                <th className="px-3 py-2">Belum</th>
                <th className="px-3 py-2">Temuan</th>
                <th className="px-3 py-2">TL Belum</th>
              </tr>
            </thead>
            <tbody>
              {kecamatanTerurut.slice(0, 40).map((k) => (
                <tr key={`${k.kabupaten}-${k.kecamatan}`} className="border-b border-navy-900/5 last:border-0">
                  <td className="px-4 py-2 text-xs text-navy-600">{k.kabupaten}</td>
                  <td className="px-3 py-2 text-sm font-semibold text-navy-800">{k.kecamatan}</td>
                  <td className="px-3 py-2 text-sm tabular-nums text-navy-700">{k.jumlah}</td>
                  <td className="px-3 py-2 text-xs tabular-nums text-bpom-700">{k.sudah_monitoring}</td>
                  <td className="px-3 py-2 text-xs tabular-nums text-amber-600">{k.belum_monitoring}</td>
                  <td className="px-3 py-2 text-xs tabular-nums text-navy-700">{k.temuan}</td>
                  <td className="px-3 py-2 text-xs tabular-nums text-rose-600">{k.tindak_lanjut_belum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="flex items-start gap-2 rounded-xl bg-navy-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-navy-600">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {catatan || "Angka pada halaman ini merupakan indikator monitoring, bukan indikator pelanggaran."}
      </p>
    </div>
  );
}

// ── Prioritas monitoring ───────────────────────────────────────────────────

const NADA_PRIORITAS: Record<string, { kelas: string; label: string }> = {
  tinggi: { kelas: "bg-rose-500/10 text-rose-600", label: "Prioritas Tinggi" },
  sedang: { kelas: "bg-amber-500/10 text-amber-600", label: "Prioritas Sedang" },
  rendah: { kelas: "bg-bpom-50 text-bpom-700", label: "Prioritas Rendah" },
};

export function PanelPrioritas({
  data, catatan, onDetail,
}: { data: BarisPrioritas[]; catatan: string; onDetail: (id: number) => void }) {
  const [buka, setBuka] = useState<number | null>(null);

  const jumlah = useMemo(() => ({
    tinggi: data.filter((d) => d.tingkat === "tinggi").length,
    sedang: data.filter((d) => d.tingkat === "sedang").length,
    rendah: data.filter((d) => d.tingkat === "rendah").length,
  }), [data]);

  if (data.length === 0) return <Card><KosongSig pesan="Belum ada data untuk dihitung prioritasnya." /></Card>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {(["tinggi", "sedang", "rendah"] as const).map((t) => (
          <Card key={t} className="!p-4">
            <p className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold", NADA_PRIORITAS[t].kelas)}>
              {NADA_PRIORITAS[t].label}
            </p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-navy-900">{jumlah[t]}</p>
            <p className="text-[11px] text-navy-400">sarana</p>
          </Card>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-navy-900/10 bg-navy-50/60 text-left text-[11px] uppercase tracking-wide text-navy-500">
                <th className="px-4 py-2.5">Nama Apotek</th>
                <th className="px-3 py-2.5">Wilayah</th>
                <th className="px-3 py-2.5">Pemeriksaan Terakhir</th>
                <th className="px-3 py-2.5">Temuan</th>
                <th className="px-3 py-2.5">TL</th>
                <th className="px-3 py-2.5">Skor</th>
                <th className="px-3 py-2.5">Prioritas</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 60).map((d) => (
                <Fragment key={d.id}>
                  <tr className="border-b border-navy-900/5 hover:bg-navy-50/40">
                    <td className="px-4 py-2.5 font-semibold text-navy-900">{d.nama_apotek}</td>
                    <td className="px-3 py-2.5 text-xs text-navy-600">
                      {[d.kecamatan, d.kabupaten].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-navy-600">
                      {d.tanggal_pemeriksaan_terakhir ?? <span className="text-navy-400">Belum ada</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs tabular-nums text-navy-700">{d.temuan_aktif}</td>
                    <td className="px-3 py-2.5 text-xs tabular-nums text-navy-700">{d.tindak_lanjut_belum}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-extrabold tabular-nums text-navy-900">{d.skor}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", NADA_PRIORITAS[d.tingkat].kelas)}>
                        {d.tingkat}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setBuka(buka === d.id ? null : d.id)}
                          title="Rincian skor"
                          className="rounded-lg border border-navy-200 bg-white p-1.5 text-navy-500 hover:bg-navy-50"
                        >
                          <ChevronDown className={cn("size-3.5 transition-transform", buka === d.id && "rotate-180")} />
                        </button>
                        <button
                          onClick={() => onDetail(d.id)}
                          className="rounded-lg border border-navy-200 bg-white px-2 py-1.5 text-[11px] font-bold text-navy-600 hover:bg-navy-50"
                        >
                          Detail
                        </button>
                      </div>
                    </td>
                  </tr>
                  {buka === d.id && (
                    <tr className="bg-navy-50/40">
                      <td colSpan={8} className="px-4 py-3">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-navy-400">
                          Rincian perhitungan skor
                        </p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {d.rincian.map((r, i) => (
                            <div key={i} className="rounded-xl bg-white px-3 py-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-navy-700">{r.parameter}</span>
                                <span className="text-xs font-bold tabular-nums text-navy-500">{r.nilai}/{r.maksimum}</span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-navy-500">{r.alasan}</p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-[11px] leading-relaxed text-amber-700">
        <Gauge className="mt-0.5 size-3.5 shrink-0" />
        {catatan}
      </p>
    </div>
  );
}

// ── Kualitas data ──────────────────────────────────────────────────────────

const LABEL_MASALAH: Record<string, string> = {
  koordinat_kosong: "Koordinat kosong",
  alamat_kosong: "Alamat kosong",
  nib_kosong: "NIB kosong",
  wilayah_kosong: "Wilayah belum lengkap",
  penanggung_jawab_kosong: "Penanggung jawab kosong",
};

export function PanelKualitasData({
  data, catatan, onDetail,
}: { data: KualitasData; catatan: string; onDetail: (id: number) => void }) {
  const [buka, setBuka] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-400">
          <ShieldCheck className="size-3.5" /> Kualitas Data
        </p>

        <div className="flex flex-wrap items-center gap-5">
          <div>
            <p className="text-4xl font-extrabold tabular-nums text-bpom-600">{data.persen_lengkap}%</p>
            <p className="text-xs font-semibold text-navy-500">Data lengkap</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold tabular-nums text-amber-600">{data.perlu_dilengkapi}</p>
            <p className="text-xs font-semibold text-navy-500">Perlu dilengkapi</p>
          </div>
          <div className="min-w-[160px] flex-1">
            <div className="h-2.5 overflow-hidden rounded-full bg-navy-100">
              <div className="h-full rounded-full bg-bpom-500" style={{ width: `${data.persen_lengkap}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-navy-400">
              {data.lengkap} dari {data.total} sarana memiliki data pokok yang lengkap
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-navy-400">Data yang perlu dilengkapi</p>
        <div className="space-y-1.5">
          {Object.entries(data.masalah).map(([kunci, m]) => (
            <div key={kunci} className="rounded-xl border border-navy-900/10">
              <button
                onClick={() => setBuka(buka === kunci ? null : kunci)}
                className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-navy-50/60"
                disabled={m.jumlah === 0}
              >
                <span className="text-sm font-semibold text-navy-800">{LABEL_MASALAH[kunci] ?? kunci}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={m.jumlah > 0 ? "warning" : "success"}>{m.jumlah}</Badge>
                  {m.jumlah > 0 && (
                    <ChevronDown className={cn("size-4 text-navy-400 transition-transform", buka === kunci && "rotate-180")} />
                  )}
                </span>
              </button>
              {buka === kunci && m.contoh.length > 0 && (
                <div className="border-t border-navy-900/5 p-2">
                  {m.contoh.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => c.id && onDetail(c.id)}
                      className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-navy-50"
                    >
                      <span className="font-semibold text-navy-800">{c.nama_apotek}</span>
                      <span className="ml-2 text-navy-400">
                        {[c.kecamatan, c.kabupaten].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-400">
          <Copy className="size-3.5" /> Potensi Data Duplikat
        </p>
        {data.duplikat.length === 0 ? (
          <p className="py-6 text-center text-sm text-navy-400">Tidak ditemukan potensi duplikat.</p>
        ) : (
          <div className="space-y-2">
            {data.duplikat.map((d, i) => (
              <div key={i} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <p className="text-xs font-bold text-amber-700">
                  Kemiripan berdasarkan {d.jenis} — {d.jumlah} data
                </p>
                <div className="mt-1.5 space-y-0.5">
                  {d.anggota.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => a.id && onDetail(a.id)}
                      className="block w-full rounded-lg px-2 py-1 text-left text-xs text-navy-700 hover:bg-white"
                    >
                      {a.nama_apotek} <span className="text-navy-400">— {a.alamat}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2.5 text-[11px] leading-relaxed text-navy-500">{catatan}</p>
      </Card>
    </div>
  );
}
