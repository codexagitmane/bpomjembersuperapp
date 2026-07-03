"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, Calendar, ImageOff } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Badge } from "@/components/ui/Card";
import { formatTanggalIndonesia } from "@/lib/utils";

interface BeritaItem {
  id: number;
  judul: string;
  slug: string;
  ringkasan: string | null;
  gambar_path: string | null;
  kategori: string;
  published_at: string | null;
}

const KATEGORI_LABEL: Record<string, string> = {
  obat: "Obat",
  makanan: "Makanan",
  kosmetik: "Kosmetik",
  pengumuman: "Pengumuman",
};

const KATEGORI_TONE: Record<string, "info" | "success" | "warning" | "neutral"> = {
  obat: "info",
  makanan: "success",
  kosmetik: "warning",
  pengumuman: "neutral",
};

export default function BeritaPage() {
  const [items, setItems] = useState<BeritaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/berita")
      .then(({ data }) => setItems(data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-navy-900">Berita & Informasi</h1>
        <p className="mt-1 text-sm text-navy-500">
          Kabar terkini seputar pengawasan obat dan makanan di Kabupaten Jember.
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-[1.25rem] bg-navy-100/60" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <Newspaper className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Belum ada berita yang dipublikasikan</p>
          <p className="text-sm text-navy-400">Pantau terus halaman ini untuk update terbaru.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.4 }}
          >
            <Card className="flex h-full flex-col overflow-hidden !p-0">
              <div className="flex h-36 items-center justify-center bg-gradient-to-br from-navy-100 to-navy-50">
                {item.gambar_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.gambar_path} alt={item.judul} className="h-full w-full object-cover" />
                ) : (
                  <ImageOff className="size-8 text-navy-300" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2.5 p-4">
                <Badge tone={KATEGORI_TONE[item.kategori] ?? "neutral"} className="w-fit">
                  {KATEGORI_LABEL[item.kategori] ?? item.kategori}
                </Badge>
                <h3 className="line-clamp-2 font-bold leading-snug text-navy-900">{item.judul}</h3>
                {item.ringkasan && (
                  <p className="line-clamp-2 flex-1 text-sm text-navy-500">{item.ringkasan}</p>
                )}
                {item.published_at && (
                  <p className="flex items-center gap-1.5 text-xs text-navy-400">
                    <Calendar className="size-3.5" />
                    {formatTanggalIndonesia(item.published_at)}
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
