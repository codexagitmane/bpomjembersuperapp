"use client";

import { useState } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { exportService, type BarisImpor } from "../services/sigService";

type Tahap = "pilih" | "pratinjau" | "selesai";

/**
 * Impor data sarana melalui dua tahap.
 *
 * Berkas selalu dipratinjau dan divalidasi lebih dahulu; penyimpanan hanya
 * berjalan setelah pengguna menekan konfirmasi. Baris bermasalah dilaporkan
 * beserta alasannya dan tidak ikut disimpan.
 */
export function ImporDialog({ onTutup, onSelesai }: { onTutup: () => void; onSelesai: () => void }) {
  const [tahap, setTahap] = useState<Tahap>("pilih");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [hasil, setHasil] = useState<{
    baris: BarisImpor[]; valid: number; galat: number; kolom_terbaca: string[]; message: string;
  } | null>(null);
  const [ringkas, setRingkas] = useState<{ disimpan: number; dilewati: number; message: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [seret, setSeret] = useState(false);

  async function pratinjau(f?: File) {
    if (!f) return;
    setBerkas(f);
    setSibuk(true);
    setGalat(null);
    try {
      const r = await exportService.pratinjauImpor(f);
      setHasil(r);
      setTahap("pratinjau");
    } catch {
      setGalat("Sebagian data tidak dapat diproses. Periksa format dan kolom.");
    } finally {
      setSibuk(false);
    }
  }

  async function konfirmasi() {
    if (!hasil) return;
    setSibuk(true);
    setGalat(null);
    try {
      const r = await exportService.simpanImpor(hasil.baris.filter((b) => b.valid));
      setRingkas(r);
      setTahap("selesai");
      onSelesai();
    } catch {
      setGalat("Data gagal disimpan. Silakan coba kembali.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onTutup} />
      <div className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-navy-900/10 bg-gradient-to-br from-navy-900 to-navy-800 px-5 py-3.5 text-white">
          <h3 className="flex items-center gap-2 text-base font-extrabold">
            <Upload className="size-5" /> Import Data Apotek
          </h3>
          <button onClick={onTutup} className="rounded-lg p-1 hover:bg-white/10"><X className="size-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Tahap 1 — pilih berkas */}
          {tahap === "pilih" && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setSeret(true); }}
                onDragLeave={() => setSeret(false)}
                onDrop={(e) => { e.preventDefault(); setSeret(false); pratinjau(e.dataTransfer.files?.[0]); }}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
                  seret ? "border-bpom-500 bg-bpom-50" : "border-navy-200 bg-navy-50/40"
                )}
              >
                <FileSpreadsheet className="size-9 text-navy-300" />
                <p className="text-sm font-bold text-navy-800">Unggah berkas CSV atau XLSX</p>
                <p className="text-xs text-navy-500">Seret berkas ke sini, atau pilih dari perangkat Anda.</p>
                <label className="mt-1 cursor-pointer rounded-xl bg-bpom-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-bpom-700">
                  Pilih Berkas
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv"
                    className="hidden"
                    onChange={(e) => pratinjau(e.target.files?.[0])}
                  />
                </label>
              </div>

              <div className="mt-3 rounded-2xl bg-navy-50/60 p-4">
                <p className="text-xs font-bold text-navy-700">Kolom yang dikenali</p>
                <p className="mt-1 text-[11px] leading-relaxed text-navy-500">
                  Nama Apotek, Alamat, Kabupaten, Kecamatan, Desa, Latitude, Longitude, NIB,
                  Nomor Identitas, Pemilik, Penanggung Jawab, Telepon, Email, Status, Keterangan.
                  Kolom boleh berbeda urutan; yang tidak dikenali diabaikan.
                </p>
                <button
                  onClick={() => exportService.unduhTemplate()}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-bpom-700 hover:underline"
                >
                  <Download className="size-3.5" /> Unduh berkas contoh
                </button>
              </div>
            </>
          )}

          {/* Tahap 2 — pratinjau & validasi */}
          {tahap === "pratinjau" && hasil && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Ringkasan nilai={hasil.baris.length} label="Baris terbaca" nada="text-navy-900" />
                <Ringkasan nilai={hasil.valid} label="Siap diimpor" nada="text-bpom-600" />
                <Ringkasan nilai={hasil.galat} label="Perlu diperbaiki" nada="text-rose-600" />
              </div>

              <p className="mt-3 text-[11px] text-navy-500">
                Berkas: <b className="text-navy-700">{berkas?.name}</b> • {hasil.kolom_terbaca.length} kolom dikenali
              </p>

              <div className="mt-3 max-h-80 overflow-auto rounded-2xl border border-navy-900/10">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="sticky top-0 bg-navy-50">
                    <tr className="text-left text-[11px] uppercase tracking-wide text-navy-500">
                      <th className="px-3 py-2">Baris</th>
                      <th className="px-3 py-2">Nama Apotek</th>
                      <th className="px-3 py-2">Wilayah</th>
                      <th className="px-3 py-2">Koordinat</th>
                      <th className="px-3 py-2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hasil.baris.map((b) => (
                      <tr key={b.baris} className={cn("border-t border-navy-900/5", !b.valid && "bg-rose-50/50")}>
                        <td className="px-3 py-2 text-xs text-navy-400">{b.baris}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-navy-800">
                          {b.data.nama_apotek || <span className="text-navy-300">kosong</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-navy-600">
                          {[b.data.kecamatan, b.data.kabupaten].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-navy-600">
                          {b.data.latitude && b.data.longitude
                            ? `${b.data.latitude}, ${b.data.longitude}`
                            : <span className="text-navy-300">belum ada</span>}
                        </td>
                        <td className="px-3 py-2">
                          {b.valid
                            ? <Badge tone="success">Siap</Badge>
                            : <span className="text-[11px] font-medium text-rose-600">{b.masalah.join(" ")}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 rounded-xl bg-navy-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-navy-600">
                Hanya baris bertanda <b>Siap</b> yang akan disimpan. Baris bermasalah dilewati dan
                dapat Anda perbaiki lalu diunggah ulang.
              </p>
            </>
          )}

          {/* Tahap 3 — selesai */}
          {tahap === "selesai" && ringkas && (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto size-12 text-bpom-500" />
              <p className="mt-3 text-base font-extrabold text-navy-900">Import selesai</p>
              <p className="mt-1 text-sm text-navy-600">{ringkas.message}</p>
            </div>
          )}

          {galat && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-700">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {galat}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-navy-900/10 bg-white px-5 py-3.5">
          {tahap === "pratinjau" && (
            <>
              <Button variant="danger" onClick={() => { setTahap("pilih"); setHasil(null); }}>Ganti Berkas</Button>
              <Button variant="secondary" loading={sibuk} disabled={hasil?.valid === 0} onClick={konfirmasi}>
                <CheckCircle2 className="size-4" /> Konfirmasi Import ({hasil?.valid ?? 0} baris)
              </Button>
            </>
          )}
          {tahap !== "pratinjau" && (
            <Button variant={tahap === "selesai" ? "secondary" : "danger"} onClick={onTutup} loading={sibuk}>
              {tahap === "selesai" ? "Tutup" : "Batal"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Ringkasan({ nilai, label, nada }: { nilai: number; label: string; nada: string }) {
  return (
    <div className="rounded-2xl border border-navy-900/5 bg-white p-3.5">
      <p className={cn("text-2xl font-extrabold tabular-nums", nada)}>{nilai}</p>
      <p className="text-[11px] font-semibold text-navy-500">{label}</p>
    </div>
  );
}
