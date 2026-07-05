"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, FileText, CalendarRange, ShieldOff, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { api, downloadFile } from "@/lib/api";
import { cn } from "@/lib/utils";

type Mode = "harian" | "bulanan" | "tahunan";

type RekapRow = Record<string, string | number>;

interface Rekap {
  mode: Mode;
  periode: string;
  hari_kerja?: number;
  headers: string[];
  kolom: string[];
  rows: RekapRow[];
  ringkasan: { total_pegawai: number; total_hadir: number; total_terlambat?: number; total_tidak_hadir?: number };
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const MODE_LABEL: Record<Mode, string> = { harian: "Harian", bulanan: "Bulanan", tahunan: "Tahunan" };

export default function RekapPresensiPage() {
  const now = new Date();
  const [mode, setMode] = useState<Mode>("bulanan");
  const [tanggal, setTanggal] = useState(now.toISOString().slice(0, 10));
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [rekap, setRekap] = useState<Rekap | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [exporting, setExporting] = useState<false | "excel" | "pdf">(false);

  const params = useCallback((): Record<string, string | number> => {
    if (mode === "harian") return { mode, tanggal };
    if (mode === "tahunan") return { mode, tahun };
    return { mode, tahun, bulan };
  }, [mode, tanggal, tahun, bulan]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/rekap-presensi", { params: params() });
      setRekap(data);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport(jenis: "excel" | "pdf") {
    setExporting(jenis);
    try {
      const ext = jenis === "excel" ? "xlsx" : "pdf";
      const suffix = mode === "harian" ? tanggal : mode === "tahunan" ? tahun : `${tahun}-${String(bulan).padStart(2, "0")}`;
      await downloadFile(`/rekap-presensi/${jenis}`, `rekap-presensi-${mode}-${suffix}.${ext}`, params());
    } finally {
      setExporting(false);
    }
  }

  if (forbidden) {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <ShieldOff className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Halaman ini khusus Tata Usaha & pimpinan</p>
        </Card>
      </AppShell>
    );
  }

  const jumlahKolom = (rekap?.headers.length ?? 8) + 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-navy-900">
          <CalendarRange className="size-6 text-bpom-600" /> Rekap Presensi
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Rekapitulasi kehadiran harian, bulanan, dan tahunan — dapat diekspor ke Excel & PDF untuk lampiran TPP.
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="flex rounded-xl bg-navy-50 p-1">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  mode === m ? "bg-navy-900 text-white shadow-sm" : "text-navy-500 hover:text-navy-800"
                )}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>

          {mode === "harian" && (
            <div className="w-44">
              <Input label="Tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
          )}
          {mode === "bulanan" && (
            <div className="w-40">
              <Select label="Bulan" value={bulan} onChange={(e) => setBulan(Number(e.target.value))}>
                {BULAN.map((b, i) => (
                  <option key={i} value={i + 1}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {mode !== "harian" && (
            <div className="w-28">
              <Select label="Tahun" value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
                {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" loading={exporting === "excel"} onClick={() => handleExport("excel")}>
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
            <Button variant="outline" loading={exporting === "pdf"} onClick={() => handleExport("pdf")}>
              <FileText className="size-4" /> PDF
            </Button>
          </div>
        </div>

        {rekap && (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat label="Periode" value={rekap.periode} />
            {rekap.hari_kerja !== undefined ? (
              <MiniStat label="Hari Kerja" value={`${rekap.hari_kerja} hari`} />
            ) : (
              <MiniStat label="Hadir Hari Ini" value={String(rekap.ringkasan.total_hadir)} />
            )}
            <MiniStat label="Total Pegawai" value={String(rekap.ringkasan.total_pegawai)} />
            <MiniStat
              label={rekap.mode === "harian" ? "Tidak Hadir" : "Total Terlambat"}
              value={String(rekap.mode === "harian" ? rekap.ringkasan.total_tidak_hadir ?? 0 : rekap.ringkasan.total_terlambat ?? 0)}
            />
          </div>
        )}

        <Card className="mt-4 !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-900/10 text-left text-xs uppercase tracking-wide text-navy-400">
                  {(rekap?.headers ?? []).map((h) => (
                    <th key={h} className={cn("px-4 py-3", !["No", "Nama", "NIP/NIK"].includes(h) && "text-center")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading &&
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-navy-900/5">
                      <td colSpan={jumlahKolom} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-navy-100/60" />
                      </td>
                    </tr>
                  ))}
                {!loading && rekap?.rows.length === 0 && (
                  <tr>
                    <td colSpan={jumlahKolom} className="px-4 py-10 text-center text-navy-400">
                      <Users className="mx-auto mb-2 size-8 text-navy-200" />
                      Tidak ada data pegawai.
                    </td>
                  </tr>
                )}
                {!loading &&
                  rekap?.rows.map((r, i) => (
                    <tr key={i} className="border-b border-navy-900/5 hover:bg-navy-50/50">
                      <td className="px-4 py-3 text-navy-400">{i + 1}</td>
                      {rekap.kolom.map((k) => (
                        <td
                          key={k}
                          className={cn(
                            "px-4 py-3",
                            k === "nama" && "font-semibold text-navy-900",
                            k === "nip_nik" && "text-navy-500",
                            !["nama", "nip_nik", "jenis_pegawai"].includes(k) && "text-center tabular-nums text-navy-600"
                          )}
                        >
                          {k === "jenis_pegawai" ? <Badge tone="neutral">{r[k]}</Badge> : r[k]}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="!p-4">
      <p className="text-xs text-navy-400">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold text-navy-900">{value}</p>
    </Card>
  );
}
