"use client";

import { useMemo, useState } from "react";
import { Share2, ArrowRight, Info, MapPin } from "lucide-react";
import { Card, Badge } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { GarisDistribusi, SimpulDistribusi } from "../types";
import { KosongSig } from "./Panels";

/**
 * Jaringan hubungan distribusi antar sarana.
 *
 * Hubungan HANYA digambar dari data transaksi yang benar-benar tercatat.
 * Sistem tidak pernah menyimpulkan hubungan berdasarkan kedekatan lokasi.
 */
export function PanelDistribusi({
  simpul, garis, catatan, onDetailApotek, onLihatPeta,
}: {
  simpul: SimpulDistribusi[];
  garis: GarisDistribusi[];
  catatan: string;
  onDetailApotek: (id: number) => void;
  onLihatPeta: () => void;
}) {
  const [pilih, setPilih] = useState<string | null>(null);

  // Susun simpul beserta hubungan masing-masing.
  const jaringan = useMemo(() => {
    const petaSimpul = new Map(simpul.map((s) => [s.id, s]));
    const keluar = new Map<string, GarisDistribusi[]>();
    const masuk = new Map<string, GarisDistribusi[]>();

    for (const g of garis) {
      if (!keluar.has(g.dari)) keluar.set(g.dari, []);
      keluar.get(g.dari)!.push(g);
      if (!masuk.has(g.ke)) masuk.set(g.ke, []);
      masuk.get(g.ke)!.push(g);
    }

    // Simpul sumber ditampilkan lebih dahulu karena menjadi pangkal jaringan.
    const urut = [...simpul].sort((a, b) => {
      const ka = (keluar.get(a.id)?.length ?? 0);
      const kb = (keluar.get(b.id)?.length ?? 0);
      if (ka !== kb) return kb - ka;
      return a.nama.localeCompare(b.nama, "id");
    });

    return { petaSimpul, keluar, masuk, urut };
  }, [simpul, garis]);

  if (garis.length === 0) {
    return (
      <Card>
        <KosongSig pesan="Belum tersedia data hubungan distribusi." />
        <p className="mt-2 text-center text-[11px] leading-relaxed text-navy-400">
          Hubungan distribusi hanya muncul bila datanya dicatat. Sistem tidak membuat hubungan
          berdasarkan asumsi lokasi geografis.
        </p>
      </Card>
    );
  }

  const terpilih = pilih ? jaringan.petaSimpul.get(pilih) : null;
  const garisTerpilih = pilih
    ? [...(jaringan.keluar.get(pilih) ?? []), ...(jaringan.masuk.get(pilih) ?? [])]
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-400">
            <Share2 className="size-3.5" /> Jaringan Distribusi
          </p>
          <button
            onClick={onLihatPeta}
            className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white px-3 py-1.5 text-[11px] font-bold text-navy-700 hover:bg-navy-50"
          >
            <MapPin className="size-3.5" /> Tampilkan pada Peta
          </button>
        </div>

        <p className="mt-1 text-[11px] text-navy-500">
          {simpul.length} sarana terhubung • {garis.length} hubungan tercatat
        </p>

        {/* Daftar simpul & hubungannya */}
        <div className="mt-3 space-y-2">
          {jaringan.urut.slice(0, 40).map((s) => {
            const keluar = jaringan.keluar.get(s.id) ?? [];
            const masuk = jaringan.masuk.get(s.id) ?? [];
            if (keluar.length === 0) return null;

            return (
              <div key={s.id} className="rounded-2xl border border-navy-900/10 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => (s.apotek_id ? onDetailApotek(s.apotek_id) : setPilih(s.id))}
                    className="text-sm font-bold text-navy-900 hover:text-bpom-700"
                  >
                    {s.nama}
                  </button>
                  {!s.terdata && <Badge tone="neutral">Belum terdata</Badge>}
                  {s.kabupaten && <span className="text-[11px] text-navy-400">{s.kabupaten}</span>}
                  <Badge tone="info">{keluar.length} penyaluran</Badge>
                  {masuk.length > 0 && <Badge tone="neutral">{masuk.length} penerimaan</Badge>}
                </div>

                <div className="mt-2 space-y-1">
                  {keluar.slice(0, 6).map((g) => {
                    const tujuan = jaringan.petaSimpul.get(g.ke);
                    return (
                      <button
                        key={g.id}
                        onClick={() => setPilih(pilih === `g${g.id}` ? null : `g${g.id}`)}
                        className="flex w-full flex-wrap items-center gap-2 rounded-xl bg-navy-50/60 px-3 py-1.5 text-left hover:bg-navy-50"
                      >
                        <ArrowRight className="size-3.5 shrink-0 text-navy-300" />
                        <span className="text-xs font-semibold text-navy-800">
                          {tujuan?.nama ?? "Sarana tidak dikenal"}
                        </span>
                        <span className="text-[11px] text-navy-500">
                          {g.produk ?? "produk tidak dicantumkan"}
                          {g.jumlah != null && ` • ${g.jumlah} ${g.satuan ?? ""}`}
                        </span>
                        {!g.lengkap && <Badge tone="warning">data belum lengkap</Badge>}
                      </button>
                    );
                  })}
                  {keluar.length > 6 && (
                    <p className="px-3 text-[11px] text-navy-400">
                      dan {keluar.length - 6} hubungan lainnya
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Rincian hubungan terpilih */}
      {pilih?.startsWith("g") && (
        <Card>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-400">Rincian Hubungan</p>
          {garis
            .filter((g) => `g${g.id}` === pilih)
            .map((g) => (
              <dl key={g.id} className="space-y-1.5 text-sm">
                <Baris label="Sumber" nilai={jaringan.petaSimpul.get(g.dari)?.nama} />
                <Baris label="Penerima" nilai={jaringan.petaSimpul.get(g.ke)?.nama} />
                <Baris label="Tanggal" nilai={g.tanggal} />
                <Baris label="Produk" nilai={g.produk} />
                <Baris label="Kategori" nilai={g.kategori} />
                <Baris label="Jumlah" nilai={g.jumlah != null ? `${g.jumlah} ${g.satuan ?? ""}` : null} />
                <Baris label="Dokumen/Referensi" nilai={g.referensi} />
                <Baris label="Status" nilai={g.status} />
                {!g.lengkap && (
                  <p className="mt-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-700">
                    Data hubungan distribusi belum lengkap.
                  </p>
                )}
              </dl>
            ))}
        </Card>
      )}

      {terpilih && !pilih?.startsWith("g") && (
        <Card>
          <p className="text-sm font-bold text-navy-900">{terpilih.nama}</p>
          <p className="mt-0.5 text-[11px] text-navy-500">
            {terpilih.terdata ? "Sarana terdata pada sistem." : "Sarana ini belum terdata sebagai apotek pada sistem."}
          </p>
          <p className="mt-1.5 text-[11px] text-navy-500">{garisTerpilih.length} hubungan tercatat.</p>
        </Card>
      )}

      <p className={cn("flex items-start gap-2 rounded-xl bg-navy-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-navy-600")}>
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {catatan}
      </p>
    </div>
  );
}

function Baris({ label, nilai }: { label: string; nilai?: string | null }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-navy-900/5 pb-1.5 last:border-0">
      <span className="w-44 shrink-0 text-xs font-semibold text-navy-500">{label}</span>
      <span className="min-w-0 flex-1 text-sm text-navy-800">{nilai || <span className="text-navy-300">—</span>}</span>
    </div>
  );
}
