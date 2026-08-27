"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PackageOpen, MapPin, Hash, Calendar, Wrench, ShieldCheck, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { LenteraMark } from "@/components/Logo";

interface BmnPublic {
  nama: string; nup: string | null; no_bmn: string; jenis_bmn: string | null;
  lokasi: string | null; kondisi: string; tahun_perolehan: number | null;
  foto_url: string | null; bast_url: string | null; total_perbaikan_selesai: number;
}
const KONDISI_TONE: Record<string, string> = {
  Baik: "bg-bpom-50 text-bpom-700", "Rusak Ringan": "bg-amber-500/10 text-amber-600",
  "Rusak Sedang": "bg-amber-500/10 text-amber-600", "Rusak Berat": "bg-rose-500/10 text-rose-600",
};

export default function BmnPublicPage() {
  const params = useParams<{ id: string }>();
  const [d, setD] = useState<BmnPublic | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    api.get(`/publik/bmn/${params.id}`).then(({ data }) => setD(data.data)).catch(() => setNotFound(true));
  }, [params?.id]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center bg-gradient-to-b from-navy-50 to-background px-4 py-8">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow ring-1 ring-navy-900/5"><LenteraMark className="size-7" /></div>
        <div>
          <p className="text-sm font-extrabold text-navy-900">LENTE<span className="text-bpom-500">RA</span></p>
          <p className="text-[11px] text-navy-400">Balai POM di Jember</p>
        </div>
      </div>

      {notFound ? (
        <div className="mt-16 text-center text-sm text-navy-500">Data aset BMN tidak ditemukan.</div>
      ) : !d ? (
        <div className="mt-16 h-40 w-full max-w-md animate-pulse rounded-3xl bg-navy-100/60" />
      ) : (
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-navy-900/5 bg-white shadow-lg">
          <div className="bg-gradient-to-br from-navy-900 to-navy-800 px-5 py-4 text-white">
            <div className="flex items-center gap-2 text-xs font-semibold text-bpom-300"><ShieldCheck className="size-4" /> DATA ASET TERVERIFIKASI</div>
            <h1 className="mt-1 text-xl font-extrabold">{d.nama}</h1>
            <p className="font-mono text-xs text-navy-200">No. BMN {d.no_bmn}{d.nup ? ` • NUP ${d.nup}` : ""}</p>
          </div>
          {d.foto_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.foto_url} alt={d.nama} className="max-h-64 w-full object-cover" />
          )}
          <div className="divide-y divide-navy-900/5">
            <Row icon={<PackageOpen className="size-4" />} label="Jenis BMN" value={d.jenis_bmn ?? "—"} />
            <Row icon={<MapPin className="size-4" />} label="Lokasi" value={d.lokasi ?? "—"} />
            <Row icon={<Calendar className="size-4" />} label="Tahun Perolehan" value={d.tahun_perolehan ? String(d.tahun_perolehan) : "—"} />
            <Row icon={<Hash className="size-4" />} label="Kondisi" value={<span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${KONDISI_TONE[d.kondisi] ?? "bg-navy-50 text-navy-600"}`}>{d.kondisi}</span>} />
            <Row icon={<Wrench className="size-4" />} label="Perbaikan Selesai" value={`${d.total_perbaikan_selesai} kali`} />
          </div>
          {d.bast_url && (
            <div className="border-t border-navy-900/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-navy-400"><FileText className="size-4" /> Dokumen BAST</div>
              <a href={d.bast_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-bpom-600 px-4 py-3 text-sm font-bold text-white hover:bg-bpom-700">
                <FileText className="size-4" /> Buka Dokumen BAST (PDF)
              </a>
              <p className="mt-1.5 text-center text-[11px] text-navy-400">Dokumen terbuka di tab baru.</p>
            </div>
          )}
        </div>
      )}
      <p className="mt-6 text-center text-[11px] text-navy-400">© {new Date().getFullYear()} Balai Pengawas Obat dan Makanan di Jember</p>
    </main>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-500">{icon}</span>
      <div className="flex flex-1 items-center justify-between gap-2">
        <p className="text-xs text-navy-400">{label}</p>
        <p className="text-sm font-semibold text-navy-900">{value}</p>
      </div>
    </div>
  );
}
