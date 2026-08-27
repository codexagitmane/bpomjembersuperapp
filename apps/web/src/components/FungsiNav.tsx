"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DynamicIcon } from "@/components/DynamicIcon";
import { APLIKASI_ROUTES } from "@/lib/aplikasi-routes";
import type { AplikasiSlug } from "@bpom/shared";
import { cn } from "@/lib/utils";

interface Aplikasi {
  slug: string;
  nama: string;
  icon: string | null;
}
interface Fungsi {
  slug: string;
  nama: string;
  icon: string | null;
  aplikasi: Aplikasi[];
}

// Sub-menu internal untuk aplikasi tertentu (ditampilkan di bawah app).
const SUBMENU: Record<string, { href: string; label: string; adminOnly?: boolean }[]> = {
  presensi: [
    { href: "/presensi", label: "Dashboard" },
    { href: "/presensi/absen", label: "Absen" },
    { href: "/presensi/riwayat", label: "Riwayat" },
    { href: "/presensi/manajemen", label: "Manajemen", adminOnly: true },
  ],
};

const FUNGSI_SINGKAT: Record<string, string> = {
  tata_usaha: "Tata Usaha",
  pemeriksaan: "Pemeriksaan",
  infokom: "Infokom",
  penindakan: "Penindakan",
  pengujian: "Pengujian",
};

export function FungsiNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === "superadmin" || user?.role === "kepala_subag_tu";

  const [fungsi, setFungsi] = useState<Fungsi[]>([]);
  const [openFungsi, setOpenFungsi] = useState<string | null>(null);
  const [openApp, setOpenApp] = useState<string | null>(null);
  const [rootOpen, setRootOpen] = useState(true);

  useEffect(() => {
    api.get("/menu").then(({ data }) => {
      const list: Fungsi[] = data.fungsi ?? [];
      setFungsi(list);
      // Auto-expand grup & app yang cocok dengan halaman aktif.
      for (const f of list) {
        for (const a of f.aplikasi) {
          const route = APLIKASI_ROUTES[a.slug as AplikasiSlug];
          if (route && pathname.startsWith(route)) {
            setOpenFungsi(f.slug);
            setOpenApp(a.slug);
          }
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (fungsi.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setRootOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-navy-600 transition-colors hover:bg-navy-50"
      >
        <LayoutGrid className="size-4.5" />
        <span className="flex-1 text-left">Fungsi & Layanan</span>
        <ChevronDown className={cn("size-4 transition-transform", rootOpen && "rotate-180")} />
      </button>

      {rootOpen && (
        <div className="mt-0.5 space-y-0.5 pl-3">
          {fungsi.map((f) => {
            const fOpen = openFungsi === f.slug;
            return (
              <div key={f.slug}>
                <button
                  onClick={() => setOpenFungsi(fOpen ? null : f.slug)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-navy-500 transition-colors hover:bg-navy-50"
                >
                  <DynamicIcon name={f.icon} className="size-4 text-navy-400" />
                  <span className="flex-1 text-left">{FUNGSI_SINGKAT[f.slug] ?? f.nama}</span>
                  <ChevronDown className={cn("size-3.5 transition-transform", fOpen && "rotate-180")} />
                </button>

                {fOpen && (
                  <div className="mt-0.5 space-y-0.5 border-l border-navy-900/5 pl-3">
                    {f.aplikasi.map((a) => {
                      const route = APLIKASI_ROUTES[a.slug as AplikasiSlug] ?? "#";
                      const subs = (SUBMENU[a.slug] ?? []).filter((s) => !s.adminOnly || isAdmin);
                      const appOpen = openApp === a.slug;
                      const appActive = pathname === route || (subs.length > 0 && pathname.startsWith(route));

                      if (subs.length === 0) {
                        return (
                          <Link
                            key={a.slug}
                            href={route}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                              pathname === route ? "bg-navy-900 font-semibold text-white" : "text-navy-500 hover:bg-navy-50"
                            )}
                          >
                            <DynamicIcon name={a.icon} className="size-3.5" />
                            <span className="truncate">{a.nama}</span>
                          </Link>
                        );
                      }

                      return (
                        <div key={a.slug}>
                          <button
                            onClick={() => setOpenApp(appOpen ? null : a.slug)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
                              appActive ? "text-bpom-700" : "text-navy-500 hover:bg-navy-50"
                            )}
                          >
                            <DynamicIcon name={a.icon} className="size-3.5" />
                            <span className="flex-1 truncate text-left">{a.nama}</span>
                            <ChevronDown className={cn("size-3 transition-transform", appOpen && "rotate-180")} />
                          </button>
                          {appOpen && (
                            <div className="mt-0.5 space-y-0.5 border-l border-bpom-200 pl-3">
                              {subs.map((s) => (
                                <Link
                                  key={s.href}
                                  href={s.href}
                                  className={cn(
                                    "block rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                                    pathname === s.href ? "bg-navy-900 font-semibold text-white" : "text-navy-500 hover:bg-navy-50"
                                  )}
                                >
                                  {s.label}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
