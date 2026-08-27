"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, History, FileSpreadsheet, FileText, Download, Filter } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PresensiTabs } from "@/components/presensi/PresensiTabs";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api, downloadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatJam, formatTanggalIndonesia } from "@/lib/utils";

interface RiwayatItem {
  id: number;
  tanggal: string;
  jam_masuk: string | null;
  jam_keluar: string | null;
  status_masuk: string | null;
  mode_masuk: string | null;
}

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  tepat_waktu: { label: "Tepat Waktu", tone: "success" },
  terlambat: { label: "Terlambat", tone: "warning" },
  pulang_awal: { label: "Pulang Awal", tone: "warning" },
  di_luar_geofence: { label: "Di Luar Radius", tone: "danger" },
};

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const inputCls =
  "rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200";

export default function RiwayatPresensiPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "superadmin" || user?.role === "kepala_balai" || user?.role === "kepala_subag_tu";

  const [items, setItems] = useState<RiwayatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    api.get("/presensi/riwayat")
      .then(({ data }) => setItems(data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (filter ? items.filter((i) => i.status_masuk === filter) : items),
    [items, filter]
  );

  async function handleExport(jenis: "excel" | "pdf") {
    setExporting(jenis);
    try {
      const ext = jenis === "excel" ? "xlsx" : "pdf";
      await downloadFile(
        `/rekap-presensi/${jenis}`,
        `rekap-presensi-${tahun}-${String(bulan).padStart(2, "0")}.${ext}`,
        { mode: "bulanan", tahun, bulan }
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <PresensiTabs />

        {/* Panel export — khusus admin/pimpinan */}
        {isAdmin && (
          <Card className="mb-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 font-bold text-navy-900">
                  <Download className="size-4.5 text-bpom-600" /> Rekap & Ekspor
                </h2>
                <p className="mt-1 text-sm text-navy-500">
                  Rekapitulasi kehadiran seluruh pegawai — untuk lampiran TPP.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-navy-500">Bulan</span>
                  <select className={inputCls} value={bulan} onChange={(e) => setBulan(Number(e.target.value))}>
                    {BULAN.map((b, i) => (
                      <option key={i} value={i + 1}>{b}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-navy-500">Tahun</span>
                  <select className={inputCls} value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
                    {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </label>
                <Button variant="secondary" loading={exporting === "excel"} onClick={() => handleExport("excel")}>
                  <FileSpreadsheet className="size-4" /> Excel
                </Button>
                <Button variant="outline" loading={exporting === "pdf"} onClick={() => handleExport("pdf")}>
                  <FileText className="size-4" /> PDF
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Riwayat pribadi */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-navy-900">
            <History className="size-4.5" /> Riwayat Presensi Saya
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-navy-400" />
            <select className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Semua status</option>
              <option value="tepat_waktu">Tepat Waktu</option>
              <option value="terlambat">Terlambat</option>
              <option value="di_luar_geofence">Di Luar Radius</option>
            </select>
          </div>
        </div>

        <Card className="!p-0">
          {loading ? (
            <div className="space-y-px p-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-navy-100/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="flex flex-col items-center gap-2 py-14 text-center text-sm text-navy-400">
              <History className="size-8 text-navy-200" /> Belum ada riwayat presensi.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-navy-900/5 bg-navy-50/50 text-xs uppercase tracking-wide text-navy-500">
                    <th className="px-5 py-3 font-semibold">Tanggal</th>
                    <th className="px-5 py-3 font-semibold">Masuk</th>
                    <th className="px-5 py-3 font-semibold">Pulang</th>
                    <th className="px-5 py-3 font-semibold">Mode</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-navy-900/5 last:border-0 hover:bg-navy-50/40">
                      <td className="px-5 py-3 font-semibold text-navy-900">{formatTanggalIndonesia(r.tanggal)}</td>
                      <td className="px-5 py-3 text-navy-600">
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3.5 text-navy-300" /> {formatJam(r.jam_masuk)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-navy-600">{formatJam(r.jam_keluar)}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold uppercase text-navy-500">{r.mode_masuk ?? "—"}</span>
                      </td>
                      <td className="px-5 py-3">
                        {r.status_masuk ? (
                          <Badge tone={STATUS_LABEL[r.status_masuk]?.tone ?? "neutral"}>
                            {STATUS_LABEL[r.status_masuk]?.label ?? r.status_masuk}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
