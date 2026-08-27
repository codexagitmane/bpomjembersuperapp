"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight, LayoutGrid, ArrowLeft, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { DynamicIcon } from "@/components/DynamicIcon";
import { APLIKASI_ROUTES } from "@/lib/aplikasi-routes";
import type { AplikasiSlug } from "@bpom/shared";

interface AplikasiItem {
  slug: string;
  nama: string;
  deskripsi: string;
  icon: string;
}
interface FungsiItem {
  slug: string;
  nama: string;
  deskripsi: string;
  icon: string;
  aplikasi: AplikasiItem[];
}

function FungsiContent() {
  const searchParams = useSearchParams();
  const selected = searchParams.get("f");
  const [fungsi, setFungsi] = useState<FungsiItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/menu")
      .then(({ data }) => setFungsi(data.fungsi ?? []))
      .finally(() => setLoading(false));
  }, []);

  // Jika sebuah fungsi dipilih (?f=slug), tampilkan HANYA fungsi itu.
  const shown = selected ? fungsi.filter((f) => f.slug === selected) : fungsi;
  const single = selected ? shown[0] : null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        {selected && (
          <Link
            href="/beranda"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-700"
          >
            <ArrowLeft className="size-4" /> Kembali ke Beranda
          </Link>
        )}
        <h1 className="text-2xl font-extrabold text-navy-900">{single ? single.nama : "Fungsi & Layanan"}</h1>
        <p className="mt-1 text-sm text-navy-500">
          {single
            ? single.deskripsi
            : "Semua layanan yang tersedia untuk peran Anda, dikelompokkan per fungsi organisasi."}
        </p>
      </div>

      {loading && (
        <div className="space-y-8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-[1.25rem] bg-navy-100/60" />
          ))}
        </div>
      )}

      {!loading && shown.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <LayoutGrid className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Belum ada layanan yang bisa diakses</p>
          <p className="text-sm text-navy-400">Hubungi administrator jika ini tidak sesuai.</p>
        </Card>
      )}

      <div className="space-y-9">
        {shown.map((f, fi) => (
          <motion.section
            key={f.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: fi * 0.08, duration: 0.4 }}
          >
            {/* Header fungsi hanya bila menampilkan semua fungsi */}
            {!single && (
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-navy-900 text-white">
                  <DynamicIcon name={f.icon} className="size-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-navy-900">{f.nama}</h2>
                  <p className="text-xs text-navy-400">{f.deskripsi}</p>
                </div>
              </div>
            )}

            {f.aplikasi.length === 0 ? (
              <Card className="py-10 text-center text-sm text-navy-400">Belum ada aplikasi pada fungsi ini.</Card>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {f.aplikasi.map((a) => {
                  const href = APLIKASI_ROUTES[a.slug as AplikasiSlug] ?? "#";
                  const external = href.startsWith("http");
                  const card = (
                    <Card className="group flex h-full flex-col gap-3 hover:!bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-bpom-50 to-bpom-100 text-bpom-700 transition-colors group-hover:from-bpom-500 group-hover:to-bpom-600 group-hover:text-white">
                          <DynamicIcon name={a.icon} className="size-5" />
                        </div>
                        {external ? (
                          <ExternalLink className="size-4 text-navy-300 group-hover:text-bpom-600" />
                        ) : (
                          <ChevronRight className="size-4 text-navy-300 transition-transform group-hover:translate-x-0.5 group-hover:text-bpom-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold leading-snug text-navy-900">{a.nama}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-navy-500">{a.deskripsi}</p>
                      </div>
                    </Card>
                  );
                  return external ? (
                    <a key={a.slug} href={href} target="_blank" rel="noopener noreferrer">
                      {card}
                    </a>
                  ) : (
                    <Link key={a.slug} href={href}>
                      {card}
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.section>
        ))}
      </div>
    </div>
  );
}

export default function FungsiPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-40 max-w-5xl animate-pulse rounded-[1.25rem] bg-navy-100/60" />}>
      <FungsiContent />
    </Suspense>
  );
}
