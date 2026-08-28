"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, History, FileSpreadsheet, FileText, Download, Filter, ChevronRight, Camera } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PresensiTabs } from "@/components/presensi/PresensiTabs";
import {
  DetailPresensi,
  LencanaStatus,
  type PresensiDetail,
} from "@/components/presensi/DetailPresensi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api, downloadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatJam, formatTanggalIndonesia } from "@/lib/utils";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const inputCls =
  "w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200";

export default function RiwayatPresensiPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "superadmin" || user?.role === "kepala_balai" || user?.role === "kepala_subag_tu";

  const [items, setItems] = useState<PresensiDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [detail, setDetail] = useState<PresensiDetail | null>(null);

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
      <div className="mx-auto w-full max-w-4xl">
        <PresensiTabs />

        {/* Panel export — khusus admin/pimpinan */}
        {isAdmin && (
          <Card className="mb-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 font-bold text-navy-900">
                  <Download className="size-4.5 shrink-0 text-bpom-600" /> Rekap &amp; Ekspor
                </h2>
                <p className="mt-1 text-sm text-navy-500">
                  Rekapitulasi kehadiran seluruh pegawai — untuk lampiran TPP.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-xs font-semibold text-navy-500">Bulan</span>
                  <select className={inputCls} value={bulan} onChange={(e) => setBulan(Number(e.target.value))}>
                    {BULAN.map((b, i) => (
                      <option key={i} value={i + 1}>{b}</option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-col gap-1">
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
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-bold text-navy-900">
            <History className="size-4.5 shrink-0" /> Riwayat Presensi Saya
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="size-4 shrink-0 text-navy-400" />
            <select className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Semua status</option>
              <option value="tepat_waktu">Tepat Waktu</option>
              <option value="terlambat">Terlambat</option>
              <option value="di_luar_geofence">Di Luar Radius</option>
            </select>
          </div>
        </div>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="space-y-2 p-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-navy-100/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="flex flex-col items-center gap-2 py-14 text-center text-sm text-navy-400">
              <History className="size-8 text-navy-200" /> Belum ada riwayat presensi.
            </p>
          ) : (
            <>
              {/* Ponsel: daftar kartu yang bisa diketuk — tabel terlalu sempit
                  di layar ponsel dan kolomnya terpotong. */}
              <ul className="divide-y divide-navy-900/5 md:hidden">
                {filtered.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setDetail(r)}
                      className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-navy-50/50"
                    >
                      <Thumbnail url={r.foto_masuk_url} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-navy-900">
                          {formatTanggalIndonesia(r.tanggal)}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-navy-500">
                          <Clock className="size-3 shrink-0 text-navy-300" />
                          {formatJam(r.jam_masuk)} — {formatJam(r.jam_keluar)}
                          {r.mode_masuk && (
                            <span className="uppercase text-navy-400">· {r.mode_masuk}</span>
                          )}
                        </p>
                        <div className="mt-1.5">
                          <LencanaStatus status={r.status_masuk} />
                        </div>
                      </div>

                      <ChevronRight className="size-4 shrink-0 text-navy-300" />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Desktop: tabel */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-navy-900/5 bg-navy-50/50 text-xs uppercase tracking-wide text-navy-500">
                      <th className="px-5 py-3 font-semibold">Tanggal</th>
                      <th className="px-5 py-3 font-semibold">Masuk</th>
                      <th className="px-5 py-3 font-semibold">Pulang</th>
                      <th className="px-5 py-3 font-semibold">Mode</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 text-right font-semibold">Rincian</th>
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
                        <td className="px-5 py-3"><LencanaStatus status={r.status_masuk} /></td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setDetail(r)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-navy-600 transition-colors hover:bg-navy-100 hover:text-navy-900"
                          >
                            Lihat detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>

      {detail && <DetailPresensi data={detail} onClose={() => setDetail(null)} />}
    </AppShell>
  );
}

/** Cuplikan foto selfie masuk pada daftar ponsel. */
function Thumbnail({ url }: { url: string | null }) {
  if (!url) {
    return (
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-navy-300">
        <Camera className="size-4.5" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
  );
}
