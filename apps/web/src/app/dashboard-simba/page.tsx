"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, ShieldOff, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { LineChart } from "@/components/charts/LineChart";
import { HBarChart } from "@/components/charts/HBarChart";
import { api } from "@/lib/api";

interface Penguji {
  id: number;
  name: string;
}
interface Top5Item {
  nama_bahan: string;
  satuan: string;
  total_diambil: number;
}
interface PengadaanItem {
  nama: string;
  sisa_stok: number;
  satuan: string;
  keterangan: string;
}
interface EdItem {
  id: number;
  nama_bahan: string;
  tanggal_kedaluwarsa: string;
}
interface SimbaData {
  total_penggunaan_bahan: number;
  jumlah_bahan_aktif: number;
  jumlah_bahan_kedaluwarsa: number;
  tren_bulanan: { bulan: string; jumlah: number }[];
  top5_bahan: Top5Item[];
  bahan_perlu_pengadaan: PengadaanItem[];
  list_tanggal_ed: { data: EdItem[]; current_page: number; last_page: number; total: number };
  daftar_penguji: Penguji[];
  data_terakhir_update: string;
}

const BULAN_OPSI = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("id-ID", { month: "long", year: "numeric" }) };
});

export default function DashboardSimbaPage() {
  const [data, setData] = useState<SimbaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [bulan, setBulan] = useState("");
  const [pengujiId, setPengujiId] = useState("");
  const [edPage, setEdPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/dashboard/simba", {
        params: {
          ...(bulan ? { bulan } : {}),
          ...(pengujiId ? { penguji_id: pengujiId } : {}),
          page_ed: edPage,
        },
      });
      setData(data);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, [bulan, pengujiId, edPage]);

  useEffect(() => {
    load();
  }, [load]);

  if (forbidden) {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <ShieldOff className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Halaman ini khusus Fungsi Pengujian</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        {/* Header ala "Dashboard SIMBA" */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-white shadow-md">
                <FlaskConical className="size-7 text-bpom-600" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">DASHBOARD &quot;SIMBA&quot;</h1>
                <p className="text-sm italic text-navy-200">Laboratorium Balai POM di Jember</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-40">
                <Select
                  value={bulan}
                  onChange={(e) => setBulan(e.target.value)}
                  className="!border-white/20 !bg-white/10 !text-white [&>option]:text-navy-900"
                >
                  <option value="">Semua Bulan</option>
                  {BULAN_OPSI.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-44">
                <Select
                  value={pengujiId}
                  onChange={(e) => setPengujiId(e.target.value)}
                  className="!border-white/20 !bg-white/10 !text-white [&>option]:text-navy-900"
                >
                  <option value="">Semua Penguji</option>
                  {data?.daftar_penguji.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-navy-100/60" />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* Stat pills */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatPill label="TOTAL PENGGUNAAN BAHAN" value={data.total_penggunaan_bahan} />
              <StatPill label="JUMLAH BAHAN AKTIF" value={data.jumlah_bahan_aktif} />
              <StatPill label="JUMLAH BAHAN KEDALUWARSA" value={data.jumlah_bahan_kedaluwarsa} danger={data.jumlah_bahan_kedaluwarsa > 0} />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy-700">
                  Penggunaan Bahan Berdasarkan Bulan
                </h2>
                <LineChart
                  labels={data.tren_bulanan.map((t) => t.bulan)}
                  series={[{ name: "Penggunaan Bahan", color: "#0f854e", data: data.tren_bulanan.map((t) => t.jumlah) }]}
                />
              </Card>

              <Card className="!p-0">
                <div className="border-b border-navy-900/5 bg-bpom-600 px-5 py-3">
                  <h2 className="text-sm font-bold text-white">List Bahan Perlu Pengadaan</h2>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {data.bahan_perlu_pengadaan.length === 0 ? (
                    <p className="py-10 text-center text-sm text-navy-400">Tidak ada bahan yang perlu diadakan.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-navy-400">
                          <th className="px-5 py-2">Nama</th>
                          <th className="px-3 py-2 text-center">Sisa Stok</th>
                          <th className="px-3 py-2">Satuan</th>
                          <th className="px-5 py-2">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.bahan_perlu_pengadaan.map((b, i) => (
                          <tr key={i} className="border-t border-navy-900/5">
                            <td className="px-5 py-2 font-semibold text-navy-900">{b.nama}</td>
                            <td className="px-3 py-2 text-center font-bold tabular-nums text-rose-500">{b.sisa_stok}</td>
                            <td className="px-3 py-2 text-navy-500">{b.satuan}</td>
                            <td className="px-5 py-2 text-xs text-amber-600">{b.keterangan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>

              <Card>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy-700">
                  Top 5 Bahan Paling Banyak Digunakan
                </h2>
                <HBarChart
                  items={data.top5_bahan.map((t) => ({ label: t.nama_bahan, value: t.total_diambil, sublabel: t.satuan }))}
                />
              </Card>

              <Card className="!p-0">
                <div className="border-b border-navy-900/5 bg-bpom-600 px-5 py-3">
                  <h2 className="text-sm font-bold text-white">List Tanggal ED Bahan</h2>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-navy-400">
                        <th className="px-5 py-2 w-10">No</th>
                        <th className="px-3 py-2">Nama Bahan</th>
                        <th className="px-3 py-2">Tanggal ED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.list_tanggal_ed.data.map((e, i) => (
                        <tr key={e.id} className="border-t border-navy-900/5">
                          <td className="px-5 py-2 text-navy-400">
                            {(data.list_tanggal_ed.current_page - 1) * 10 + i + 1}.
                          </td>
                          <td className="px-3 py-2 font-medium text-navy-900">{e.nama_bahan}</td>
                          <td className="px-3 py-2 text-navy-600">{e.tanggal_kedaluwarsa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-navy-900/5 px-5 py-2.5 text-xs text-navy-400">
                  <span>
                    {(data.list_tanggal_ed.current_page - 1) * 10 + 1} - {Math.min(data.list_tanggal_ed.current_page * 10, data.list_tanggal_ed.total)} / {data.list_tanggal_ed.total}
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={edPage <= 1}
                      onClick={() => setEdPage((p) => p - 1)}
                      className="rounded px-2 py-1 hover:bg-navy-50 disabled:opacity-30"
                    >
                      ‹
                    </button>
                    <button
                      disabled={edPage >= data.list_tanggal_ed.last_page}
                      onClick={() => setEdPage((p) => p + 1)}
                      className="rounded px-2 py-1 hover:bg-navy-50 disabled:opacity-30"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </Card>
            </div>

            <p className="mt-4 flex items-center gap-1.5 text-xs text-navy-400">
              <Clock className="size-3.5" /> Data Last Updated:{" "}
              {new Date(data.data_terakhir_update).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "medium" })}
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}

function StatPill({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <Card className="flex flex-col items-center gap-2 !py-6 text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-navy-700">{label}</p>
      <div
        className={`rounded-full border-2 px-8 py-2.5 text-3xl font-extrabold tabular-nums ${
          danger ? "border-rose-300 text-rose-500" : "border-navy-800 text-bpom-600"
        }`}
      >
        {value}
      </div>
    </Card>
  );
}
