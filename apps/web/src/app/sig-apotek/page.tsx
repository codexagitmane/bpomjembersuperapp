"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapPinned, ShieldOff, Upload, FileSpreadsheet, Map as MapIcon, AlertTriangle, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { extractApiErrorMessage } from "@bpom/shared";
import type { ApotekPoint } from "@/components/sig/ApotekMap";
import { cn } from "@/lib/utils";

const ApotekMap = dynamic(() => import("@/components/sig/ApotekMap").then((m) => m.ApotekMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-navy-100" />,
});

const STATUS_TONE: Record<string, "success" | "warning" | "danger"> = {
  aktif: "success",
  kadaluarsa: "warning",
  dicabut: "danger",
};

const FILTERS = [
  { value: "", label: "Semua" },
  { value: "aktif", label: "Aktif" },
  { value: "kadaluarsa", label: "Kadaluarsa" },
  { value: "dicabut", label: "Dicabut" },
];

interface ImportResult {
  berhasil: number;
  gagal: number;
  errors: string[];
}

export default function SigApotekPage() {
  const [apotek, setApotek] = useState<ApotekPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [filter, setFilter] = useState("");
  const [cari, setCari] = useState("");

  const excelInputRef = useRef<HTMLInputElement>(null);
  const shpInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<false | "excel" | "shp">(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const load = useCallback(async (statusIzin?: string) => {
    try {
      const { data } = await api.get("/sig-apotek", {
        params: statusIzin ? { status_izin: statusIzin } : {},
      });
      setApotek(data.apotek ?? []);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter || undefined);
  }, [load, filter]);

  async function handleImport(jenis: "excel" | "shp", file: File) {
    setImporting(jenis);
    setImportResult(null);
    setImportError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await api.post(
        jenis === "excel" ? "/sig-apotek/import-excel" : "/sig-apotek/import-shp",
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setImportResult(data);
      await load(filter || undefined);
    } catch (err) {
      setImportError(extractApiErrorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  const tampil = cari
    ? apotek.filter(
        (a) =>
          a.nama_apotek.toLowerCase().includes(cari.toLowerCase()) ||
          (a.kecamatan ?? "").toLowerCase().includes(cari.toLowerCase())
      )
    : apotek;

  if (forbidden) {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <ShieldOff className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Anda tidak memiliki akses ke modul ini</p>
          <p className="text-sm text-navy-400">Modul SIG Apotek khusus untuk Fungsi Pemeriksaan.</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto flex h-full max-w-6xl flex-col">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-navy-900">
              <MapPinned className="size-6 text-bpom-600" /> SIG Monitoring Distribusi Apotek
            </h1>
            <p className="mt-1 text-sm text-navy-500">
              Pemetaan sebaran, status izin, riwayat pemeriksaan & pelanggaran apotek se-Kabupaten Jember.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImport("excel", e.target.files[0])}
            />
            <input
              ref={shpInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImport("shp", e.target.files[0])}
            />
            <Button
              variant="outline"
              size="sm"
              loading={importing === "excel"}
              onClick={() => excelInputRef.current?.click()}
            >
              <FileSpreadsheet className="size-4" /> Impor Excel/CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={importing === "shp"}
              onClick={() => shpInputRef.current?.click()}
            >
              <Upload className="size-4" /> Impor SHP (ZIP)
            </Button>
          </div>
        </div>

        {importResult && (
          <div className="mb-3 rounded-xl bg-bpom-50 px-4 py-3 text-sm text-bpom-700">
            <strong>Impor selesai:</strong> {importResult.berhasil} berhasil, {importResult.gagal} gagal.
            {importResult.errors.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-navy-600">
                {importResult.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {importError && (
          <div className="mb-3 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600">
            {importError}
          </div>
        )}

        {/* Filter & pencarian */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors",
                filter === f.value ? "bg-navy-900 text-white" : "bg-white text-navy-600 hover:bg-navy-50"
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto w-56">
            <Input
              placeholder="Cari nama / kecamatan..."
              icon={<Search className="size-4" />}
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="!py-2 text-xs"
            />
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card-elevated relative h-[28rem] overflow-hidden bg-white lg:col-span-2 lg:h-[34rem]">
            {!loading && <ApotekMap apotek={tampil} />}
            {/* Legenda */}
            <div className="absolute bottom-3 left-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-[11px] shadow-md backdrop-blur">
              <div className="flex items-center gap-4">
                <LegendDot color="#17a361" label="Aktif" />
                <LegendDot color="#f5a524" label="Kadaluarsa" />
                <LegendDot color="#e5484d" label="Dicabut" />
              </div>
            </div>
          </div>

          <div className="flex max-h-[34rem] flex-col gap-3 overflow-y-auto pr-1">
            {loading &&
              [...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-navy-100/60" />)}
            {!loading && tampil.length === 0 && (
              <Card className="py-10 text-center text-sm text-navy-400">
                Tidak ada apotek yang cocok. Gunakan tombol impor untuk menambahkan data massal.
              </Card>
            )}
            {tampil.map((a) => (
              <Card key={a.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy-900">{a.nama_apotek}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-navy-500">
                      {a.alamat}
                      {a.kecamatan ? ` — Kec. ${a.kecamatan}` : ""}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-navy-400">
                      <span className="inline-flex items-center gap-1">
                        <MapIcon className="size-3" />
                        {a.tanggal_pemeriksaan_terakhir
                          ? `Diperiksa ${a.tanggal_pemeriksaan_terakhir}`
                          : "Belum pernah diperiksa"}
                      </span>
                      {a.jumlah_pelanggaran > 0 && (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-500">
                          <AlertTriangle className="size-3" /> {a.jumlah_pelanggaran} pelanggaran
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[a.status_izin] ?? "neutral"}>{a.status_izin}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-navy-400">
          Format Excel/CSV: baris pertama header —{" "}
          <code className="rounded bg-navy-50 px-1">
            nama_apotek, alamat, kecamatan, latitude, longitude, nomor_izin, status_izin, penanggung_jawab,
            tanggal_pemeriksaan_terakhir, hasil_pemeriksaan_terakhir, jumlah_pelanggaran, keterangan_pelanggaran
          </code>
          . SHP: unggah ZIP berisi file .shp + .dbf (geometri Point).
        </p>
      </div>
    </AppShell>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-navy-700">
      <span className="size-2.5 rounded-full border-2 border-white" style={{ background: color, boxShadow: `0 0 0 1px ${color}` }} />
      {label}
    </span>
  );
}
