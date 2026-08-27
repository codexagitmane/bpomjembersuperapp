"use client";

import { useMemo, useState } from "react";
import { Eye, MapPin, Pencil, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { Card, Badge } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Apotek } from "../types";
import { WARNA_STATUS, LABEL_STATUS_SARANA } from "../types";
import { KosongSig } from "./Panels";

type Kolom = "nama_apotek" | "kabupaten" | "kecamatan" | "tanggal_pemeriksaan_terakhir" | "temuan_aktif";

const PER_HALAMAN = 10;

/**
 * Tabel data sarana dengan pengurutan, halaman, dan aksi.
 * Pada layar kecil tabel dapat digeser mendatar.
 */
export function TabelApotek({
  data, muat, bolehUbah, onDetail, onPeta, onEdit,
}: {
  data: Apotek[];
  muat: boolean;
  bolehUbah: boolean;
  onDetail: (id: number) => void;
  onPeta: (a: Apotek) => void;
  onEdit: (a: Apotek) => void;
}) {
  const [urut, setUrut] = useState<{ kolom: Kolom; naik: boolean }>({ kolom: "nama_apotek", naik: true });
  const [halaman, setHalaman] = useState(1);

  const terurut = useMemo(() => {
    const salinan = [...data];
    salinan.sort((a, b) => {
      const x = a[urut.kolom] ?? "";
      const y = b[urut.kolom] ?? "";
      if (typeof x === "number" && typeof y === "number") return urut.naik ? x - y : y - x;
      return urut.naik
        ? String(x).localeCompare(String(y), "id")
        : String(y).localeCompare(String(x), "id");
    });
    return salinan;
  }, [data, urut]);

  const totalHalaman = Math.max(1, Math.ceil(terurut.length / PER_HALAMAN));
  const halamanAman = Math.min(halaman, totalHalaman);
  const baris = terurut.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);

  function ubahUrut(kolom: Kolom) {
    setUrut((u) => ({ kolom, naik: u.kolom === kolom ? !u.naik : true }));
    setHalaman(1);
  }

  if (muat) {
    return (
      <Card className="!p-4">
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-navy-100/60" />)}
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return <Card><KosongSig pesan="Data tidak ditemukan untuk filter yang dipilih." /></Card>;
  }

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-navy-900/10 bg-navy-50/60 text-left">
              <Th>No</Th>
              <Th sortir onClick={() => ubahUrut("nama_apotek")}>Nama</Th>
              <Th sortir onClick={() => ubahUrut("kabupaten")}>Kabupaten</Th>
              <Th sortir onClick={() => ubahUrut("kecamatan")}>Kecamatan</Th>
              <Th>Status</Th>
              <Th sortir onClick={() => ubahUrut("tanggal_pemeriksaan_terakhir")}>Pemeriksaan Terakhir</Th>
              <Th sortir onClick={() => ubahUrut("temuan_aktif")}>Temuan</Th>
              <Th>Tindak Lanjut</Th>
              <Th>Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {baris.map((a, i) => (
              <tr key={a.id} className="border-b border-navy-900/5 last:border-0 hover:bg-navy-50/40">
                <td className="px-3 py-2.5 text-xs text-navy-400">
                  {(halamanAman - 1) * PER_HALAMAN + i + 1}
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-semibold text-navy-900">{a.nama_apotek}</p>
                  <p className="truncate text-[11px] text-navy-400">{a.alamat}</p>
                </td>
                <td className="px-3 py-2.5 text-xs text-navy-600">{a.kabupaten ?? "—"}</td>
                <td className="px-3 py-2.5 text-xs text-navy-600">{a.kecamatan ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-700">
                    <span className="size-2 rounded-full" style={{ background: WARNA_STATUS[a.status_peta].warna }} />
                    {LABEL_STATUS_SARANA[a.status_sarana] ?? a.status_sarana}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-navy-600">
                  {a.tanggal_pemeriksaan_terakhir ?? <span className="text-navy-400">Belum ada</span>}
                </td>
                <td className="px-3 py-2.5">
                  {a.temuan_aktif > 0
                    ? <Badge tone="danger">{a.temuan_aktif} aktif</Badge>
                    : <span className="text-xs text-navy-400">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  {a.tindak_lanjut_belum > 0
                    ? <Badge tone="warning">{a.tindak_lanjut_belum} belum</Badge>
                    : <span className="text-xs text-navy-400">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    <Aksi judul="Detail" onClick={() => onDetail(a.id)}><Eye className="size-3.5" /></Aksi>
                    <Aksi
                      judul={a.punya_koordinat ? "Lihat di peta" : "Belum berkoordinat"}
                      onClick={() => onPeta(a)}
                      nonaktif={!a.punya_koordinat}
                    >
                      <MapPin className="size-3.5" />
                    </Aksi>
                    {bolehUbah && (
                      <Aksi judul="Ubah" onClick={() => onEdit(a)}><Pencil className="size-3.5" /></Aksi>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-900/5 px-4 py-3">
        <p className="text-xs text-navy-500">
          Menampilkan {baris.length} dari {terurut.length} sarana
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setHalaman((h) => Math.max(1, h - 1))}
            disabled={halamanAman <= 1}
            className="rounded-lg border border-navy-200 p-1.5 text-navy-500 disabled:opacity-40 hover:bg-navy-50"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-2 text-xs font-semibold text-navy-600">
            {halamanAman} / {totalHalaman}
          </span>
          <button
            onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
            disabled={halamanAman >= totalHalaman}
            className="rounded-lg border border-navy-200 p-1.5 text-navy-500 disabled:opacity-40 hover:bg-navy-50"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function Th({ children, sortir, onClick }: { children: React.ReactNode; sortir?: boolean; onClick?: () => void }) {
  return (
    <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-navy-500">
      {sortir ? (
        <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-navy-800">
          {children} <ArrowUpDown className="size-3 opacity-50" />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

function Aksi({
  children, judul, onClick, nonaktif,
}: { children: React.ReactNode; judul: string; onClick: () => void; nonaktif?: boolean }) {
  return (
    <button
      title={judul}
      aria-label={judul}
      onClick={onClick}
      disabled={nonaktif}
      className={cn(
        "rounded-lg border border-navy-200 bg-white p-1.5 text-navy-500 transition-colors",
        nonaktif ? "cursor-not-allowed opacity-40" : "hover:bg-navy-50 hover:text-bpom-600"
      )}
    >
      {children}
    </button>
  );
}
