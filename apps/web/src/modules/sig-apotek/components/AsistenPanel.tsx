"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles, Send, Loader2, Info, TriangleAlert, ListChecks, Gauge, ShieldCheck, RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { asistenService } from "../services/sigService";
import type { JawabanAsisten, RingkasanAsisten } from "../types";
import { cn } from "@/lib/utils";

/** Tingkat dari server bernilai "tinggi" | "sedang" | "rendah". */
const NADA_TINGKAT: Record<string, string> = {
  tinggi: "bg-rose-500/10 text-rose-600",
  sedang: "bg-amber-500/10 text-amber-600",
  rendah: "bg-bpom-50 text-bpom-700",
};

/**
 * Asisten SIG — ringkasan eksekutif + tanya jawab.
 *
 * Seluruh angka yang tampil di sini dihitung server dari data yang tersimpan;
 * penjelasan istilah diambil dari basis pengetahuan terkurasi. Asisten tidak
 * menyusun jawaban di luar kedua sumber itu, dan menyatakannya terang-terangan
 * ketika sebuah pertanyaan berada di luar jangkauannya.
 */
export function AsistenPanel() {
  const [ringkasan, setRingkasan] = useState<RingkasanAsisten | null>(null);
  const [saran, setSaran] = useState<string[]>([]);
  const [muat, setMuat] = useState(true);
  const [tanya, setTanya] = useState("");
  const [proses, setProses] = useState(false);
  const [jawaban, setJawaban] = useState<JawabanAsisten | null>(null);
  const [pertanyaanTerjawab, setPertanyaanTerjawab] = useState<string | null>(null);

  useEffect(() => {
    asistenService
      .ringkasan()
      .then((d) => {
        setRingkasan(d.ringkasan);
        setSaran(d.saran);
      })
      .catch(() => undefined)
      .finally(() => setMuat(false));
  }, []);

  const kirim = useCallback(async (teks: string) => {
    const bersih = teks.trim();
    if (!bersih || proses) return;

    setProses(true);
    setPertanyaanTerjawab(bersih);
    try {
      const d = await asistenService.tanya(bersih);
      setJawaban(d.jawaban);
    } catch {
      setJawaban(null);
    } finally {
      setProses(false);
    }
  }, [proses]);

  if (muat) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-navy-100/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Kepala */}
      <Card className="overflow-hidden !p-0">
        <div className="flex items-start gap-3 bg-gradient-to-br from-navy-900 via-navy-800 to-bpom-700 p-4 text-white sm:p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-extrabold sm:text-lg">Asisten SIG</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-white/75">
              Menjawab dari data monitoring yang tersimpan dan penjelasan istilah modul ini.
              Angka dihitung saat ditanyakan — tidak ada yang dihafal atau dikarang.
            </p>
          </div>
        </div>

        {/* Kotak tanya */}
        <div className="p-4 sm:p-5">
          <form
            onSubmit={(e) => { e.preventDefault(); kirim(tanya); }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input
              value={tanya}
              onChange={(e) => setTanya(e.target.value)}
              placeholder="Tanyakan sesuatu, mis. sarana mana yang paling perlu dimonitoring…"
              className="w-full min-w-0 rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200"
            />
            <button
              type="submit"
              disabled={proses || !tanya.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-navy-800 disabled:opacity-50"
            >
              {proses ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Tanya
            </button>
          </form>

          {saran.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {saran.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setTanya(s); kirim(s); }}
                  className="rounded-full border border-navy-900/10 bg-navy-50 px-3 py-1.5 text-[11px] font-semibold text-navy-600 transition-colors hover:border-navy-300 hover:bg-navy-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Jawaban */}
      {pertanyaanTerjawab && (
        <Card className="!p-0 overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-navy-900/5 bg-navy-50/60 px-4 py-3 sm:px-5">
            <p className="min-w-0 text-sm font-semibold text-navy-700">“{pertanyaanTerjawab}”</p>
            <button
              type="button"
              onClick={() => { setJawaban(null); setPertanyaanTerjawab(null); setTanya(""); }}
              aria-label="Bersihkan jawaban"
              className="shrink-0 rounded-lg p-1 text-navy-400 hover:bg-navy-100 hover:text-navy-700"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {proses && (
              <p className="flex items-center gap-2 text-sm text-navy-500">
                <Loader2 className="size-4 animate-spin" /> Menyusun jawaban dari data…
              </p>
            )}

            {!proses && !jawaban && (
              <p className="text-sm text-rose-600">Gagal mengambil jawaban. Silakan coba lagi.</p>
            )}

            {!proses && jawaban && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-extrabold text-navy-900">{jawaban.judul}</h4>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      jawaban.jenis === "data" && "bg-bpom-50 text-bpom-700",
                      jawaban.jenis === "pengetahuan" && "bg-navy-100 text-navy-600",
                      (jawaban.jenis === "diarahkan" || jawaban.jenis === "tidak_tahu") && "bg-amber-500/10 text-amber-700"
                    )}
                  >
                    {jawaban.jenis === "data" ? "Dari data" : jawaban.jenis === "pengetahuan" ? "Penjelasan" : "Perlu petugas"}
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-navy-700">{jawaban.ringkasan}</p>

                {jawaban.poin.length > 0 && (
                  <ul className="space-y-1.5">
                    {jawaban.poin.map((p, i) => (
                      <li key={i} className="flex gap-2 text-sm leading-relaxed text-navy-600">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-bpom-500" />
                        <span className="min-w-0">{p}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {jawaban.tabel && (
                  <div className="overflow-x-auto rounded-xl border border-navy-900/5">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="border-b border-navy-900/10 bg-navy-50/60 text-left text-[11px] uppercase tracking-wide text-navy-500">
                          {jawaban.tabel.kolom.map((k) => (
                            <th key={k} className="px-3 py-2 font-semibold">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {jawaban.tabel.baris.map((baris, i) => (
                          <tr key={i} className="border-b border-navy-900/5 last:border-0">
                            {baris.map((sel, j) => (
                              <td key={j} className="px-3 py-2 text-navy-700">{sel}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {jawaban.butuh_petugas && (
                  <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                    Hal ini di luar jangkauan asisten. Silakan konfirmasikan kepada petugas Balai POM di Jember.
                  </p>
                )}

                <p className="flex items-start gap-2 border-t border-navy-900/5 pt-3 text-[11px] leading-relaxed text-navy-400">
                  <Info className="mt-0.5 size-3 shrink-0" /> {jawaban.disclaimer}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Ringkasan eksekutif */}
      {ringkasan && (
        <>
          <Card>
            <h4 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-navy-800">
              <ListChecks className="size-4 shrink-0 text-bpom-600" /> Ringkasan Eksekutif
            </h4>
            {ringkasan.sorotan.length === 0 ? (
              <p className="text-sm text-navy-400">Belum ada sorotan yang dapat disusun.</p>
            ) : (
              <ul className="space-y-2">
                {ringkasan.sorotan.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-navy-700">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-navy-300" />
                    <span className="min-w-0">{s}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Angka label="Total Sarana" nilai={ringkasan.kpi.total_apotek} />
              <Angka label="Cakupan Periksa" nilai={`${ringkasan.kpi.cakupan_pemeriksaan}%`} />
              <Angka label="Perlu Monitoring" nilai={ringkasan.kpi.perlu_monitoring} nada="text-amber-600" />
              <Angka label="Data Lengkap" nilai={`${ringkasan.kelengkapan.persen_lengkap}%`} nada="text-bpom-600" />
            </div>
          </Card>

          <Card className="!p-0 overflow-hidden">
            <h4 className="flex items-center gap-2 border-b border-navy-900/5 px-4 py-3 text-sm font-bold text-navy-800 sm:px-5">
              <Gauge className="size-4 shrink-0 text-bpom-600" /> Paling Perlu Dijadwalkan
            </h4>
            {ringkasan.prioritas_teratas.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-navy-400 sm:px-5">Belum ada sarana yang dapat diperingkat.</p>
            ) : (
              <ul className="divide-y divide-navy-900/5">
                {ringkasan.prioritas_teratas.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-xs font-extrabold tabular-nums text-navy-500">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-navy-900">{p.nama_apotek}</p>
                      <p className="truncate text-xs text-navy-500">{p.wilayah}</p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold tabular-nums text-navy-800">{p.skor}</span>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize", NADA_TINGKAT[p.tingkat] ?? "bg-navy-100 text-navy-600")}>
                      {p.tingkat}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="flex items-start gap-2 border-t border-navy-900/5 px-4 py-3 text-[11px] leading-relaxed text-navy-400 sm:px-5">
              <ShieldCheck className="mt-0.5 size-3 shrink-0" />
              Skor menunjukkan urutan penjadwalan kunjungan, bukan penilaian pelanggaran.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function Angka({ label, nilai, nada = "text-navy-900" }: { label: string; nilai: number | string; nada?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-navy-50/70 p-3">
      <p className={cn("text-xl font-extrabold tabular-nums", nada)}>{nilai}</p>
      <p className="mt-0.5 text-[11px] font-semibold leading-tight text-navy-500">{label}</p>
    </div>
  );
}
