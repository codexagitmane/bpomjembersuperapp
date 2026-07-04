"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, FileText, CalendarRange, ShieldOff, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { api, downloadFile } from "@/lib/api";

interface RekapRow {
  nama: string;
  nip_nik: string;
  jenis_pegawai: string;
  hadir: number;
  tepat_waktu: number;
  terlambat: number;
  wfh: number;
  dinas: number;
}
interface Rekap {
  periode: string;
  hari_kerja: number;
  rows: RekapRow[];
  ringkasan: { total_pegawai: number; total_hadir: number; total_terlambat: number };
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function RekapPresensiPage() {
  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [rekap, setRekap] = useState<Rekap | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [exporting, setExporting] = useState<false | "excel" | "pdf">(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/rekap-presensi", { params: { tahun, bulan } });
      setRekap(data);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, [tahun, bulan]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport(jenis: "excel" | "pdf") {
    setExporting(jenis);
    try {
      const ext = jenis === "excel" ? "xlsx" : "pdf";
      await downloadFile(`/rekap-presensi/${jenis}`, `rekap-presensi-${tahun}-${String(bulan).padStart(2, "0")}.${ext}`, {
        tahun,
        bulan,
      });
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

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-navy-900">
          <CalendarRange className="size-6 text-bpom-600" /> Rekap Presensi Bulanan
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Rekapitulasi kehadiran pegawai per bulan — dapat diekspor ke Excel & PDF untuk lampiran TPP.
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Select label="Bulan" value={bulan} onChange={(e) => setBulan(Number(e.target.value))}>
              {BULAN.map((b, i) => (
                <option key={i} value={i + 1}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-28">
            <Select label="Tahun" value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
              {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
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
            <MiniStat label="Hari Kerja" value={`${rekap.hari_kerja} hari`} />
            <MiniStat label="Total Pegawai" value={String(rekap.ringkasan.total_pegawai)} />
            <MiniStat label="Total Terlambat" value={String(rekap.ringkasan.total_terlambat)} />
          </div>
        )}

        <Card className="mt-4 !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-900/10 text-left text-xs uppercase tracking-wide text-navy-400">
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">NIP/NIK</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3 text-center">Hadir</th>
                  <th className="px-4 py-3 text-center">Tepat</th>
                  <th className="px-4 py-3 text-center">Telat</th>
                  <th className="px-4 py-3 text-center">WFH</th>
                  <th className="px-4 py-3 text-center">Dinas</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-navy-900/5">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-navy-100/60" />
                      </td>
                    </tr>
                  ))}
                {!loading && rekap?.rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-navy-400">
                      <Users className="mx-auto mb-2 size-8 text-navy-200" />
                      Tidak ada data pegawai.
                    </td>
                  </tr>
                )}
                {!loading &&
                  rekap?.rows.map((r, i) => (
                    <tr key={i} className="border-b border-navy-900/5 hover:bg-navy-50/50">
                      <td className="px-4 py-3 font-semibold text-navy-900">{r.nama}</td>
                      <td className="px-4 py-3 text-navy-500">{r.nip_nik}</td>
                      <td className="px-4 py-3">
                        <Badge tone="neutral">{r.jenis_pegawai}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center font-bold tabular-nums text-navy-900">{r.hadir}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-bpom-600">{r.tepat_waktu}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-amber-600">{r.terlambat}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-navy-500">{r.wfh}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-navy-500">{r.dinas}</td>
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
