"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  Users,
  ClipboardCheck,
  UserCheck,
  Fingerprint,
  DoorOpen,
  CalendarOff,
  ShieldCheck,
  Newspaper,
  CalendarCheck,
  MessageSquareText,
  ExternalLink,
  QrCode,
  ChevronRight,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { DynamicIcon } from "@/components/DynamicIcon";
import { ROLE_LABELS, STATUS_KEPEGAWAIAN_LABEL, type RoleSlug } from "@bpom/shared";
import { formatTanggalIndonesia } from "@/lib/utils";

type Tile = { href: string; label: string; icon: typeof Users };

// Akses cepat / manajemen sesuai peran. Rekap Presensi & Patroli kini di dalam
// ONTIME; Roster Keamanan dihapus.
const MANAJEMEN: Record<string, Tile[]> = {
  superadmin: [
    { href: "/dashboard", label: "Dashboard Kabalai", icon: LayoutDashboard },
    { href: "/dashboard-tu", label: "Dashboard TU", icon: Building2 },
    { href: "/pegawai", label: "Data Pegawai", icon: Users },
    { href: "/persetujuan", label: "Persetujuan", icon: ClipboardCheck },
    { href: "/admin/verifikasi", label: "Verifikasi Akun", icon: UserCheck },
    { href: "/admin/ttd", label: "Daftar TTD", icon: QrCode },
    { href: "/beranda/berita", label: "Berita", icon: Newspaper },
  ],
  kepala_balai: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard-tu", label: "Dashboard TU", icon: Building2 },
    { href: "/persetujuan", label: "Persetujuan", icon: ClipboardCheck },
    { href: "/beranda/berita", label: "Berita", icon: Newspaper },
  ],
  kepala_subag_tu: [
    { href: "/dashboard-tu", label: "Dashboard TU", icon: Building2 },
    { href: "/persetujuan", label: "Persetujuan", icon: ClipboardCheck },
    { href: "/cuti", label: "Cuti & Izin", icon: CalendarOff },
    { href: "/beranda/berita", label: "Berita", icon: Newspaper },
  ],
};

// Tautan eksternal "Si Pandu Aja" untuk masyarakat.
const SIPANDU_URL =
  "https://forms.office.com/Pages/ResponsePage.aspx?id=DQSIkWdsW0yxEjajBLZtrQAAAAAAAAAAAANAAR7Z1eZUNFI3VVFJQTJCS1kzSDU4NTJHUThFQk9OWC4u";

// Palet warna tile agar grid lebih hidup & menarik.
const COLORS = [
  "from-bpom-500 to-bpom-600",
  "from-navy-600 to-navy-800",
  "from-sky-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-600",
  "from-teal-500 to-emerald-600",
  "from-cyan-500 to-sky-600",
];

interface FungsiItem {
  slug: string;
  nama: string;
  deskripsi: string;
  icon: string;
  aplikasi: { slug: string }[];
}

export default function BerandaPage() {
  const { user } = useAuth();
  const [fungsi, setFungsi] = useState<FungsiItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/menu")
      .then(({ data }) => setFungsi(data.fungsi ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const role = user.role;
  const isMasyarakat = role === "masyarakat";
  const isAsn = role === "pegawai_asn_pppk";
  const isOutsourcing = role === "pegawai_outsourcing_magang";
  const isAdmin = !!MANAJEMEN[role];

  const roleDisplay =
    role === "pegawai_outsourcing_magang" && user.status_kepegawaian
      ? STATUS_KEPEGAWAIAN_LABEL[user.status_kepegawaian]
      : ROLE_LABELS[role as RoleSlug] ?? role;

  // Akses cepat per peran:
  // - Outsourcing/Magang: HANYA ONTIME + Izin Keluar/Masuk.
  // - Admin/pimpinan: menu manajemen.
  // - ASN: tidak ada (hanya grid fungsi & aplikasi).
  const quick: Tile[] = isOutsourcing
    ? [
        { href: "/presensi", label: "ONTIME — Presensi", icon: Fingerprint },
        { href: "/izin-keluar-masuk", label: "Izin Keluar/Masuk", icon: DoorOpen },
      ]
    : isAdmin
      ? MANAJEMEN[role]
      : [];
  const quickLabel = isOutsourcing ? "Menu Utama" : "Manajemen & Monitoring";
  // Grid fungsi hanya untuk admin/pimpinan & ASN.
  const showFungsi = isAdmin || isAsn;

  const now = new Date();
  const jam = now.getHours();
  const sapa = jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 18 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Sapaan */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative mb-6 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 p-5 text-white sm:p-6"
      >
        <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-bpom-500/25 blur-3xl" />
        <p className="relative text-xs font-medium text-navy-300">{sapa},</p>
        <h1 className="relative mt-0.5 truncate text-xl font-extrabold tracking-tight sm:text-2xl">{user.name}</h1>
        <div className="relative mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/90">{roleDisplay}</span>
          <span className="text-[11px] text-navy-300">{formatTanggalIndonesia(now.toISOString())}</span>
        </div>
      </motion.div>

      {/* MASYARAKAT (eksternal): hanya Booking Layanan + Si Pandu Aja */}
      {isMasyarakat ? (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy-400">Layanan Masyarakat</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Tile href="/si-pandu-ai" label="Si Pandu AI" color={COLORS[1]} delay={0}>
              <Sparkles className="size-5" />
            </Tile>
            <Tile href="/booking-konsultasi" label="Booking Layanan" color={COLORS[0]} delay={1}>
              <CalendarCheck className="size-5" />
            </Tile>
            <Tile href={SIPANDU_URL} label="Si Pandu Aja" color={COLORS[2]} delay={2} external>
              <MessageSquareText className="size-5" />
            </Tile>
          </div>
          <p className="mt-4 text-xs text-navy-400">
            Si Pandu AI membantu Anda memahami regulasi dan menyiapkan produk. Si Pandu Aja membuka
            formulir layanan pengaduan di jendela baru.
          </p>
        </section>
      ) : (
        <>
          {/* Akses cepat */}
          {quick.length > 0 && (
            <section className="mb-7">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy-400">{quickLabel}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {quick.map((t, i) => (
                  <Tile key={t.href} href={t.href} label={t.label} color={COLORS[i % COLORS.length]} delay={i}>
                    <t.icon className="size-5" />
                  </Tile>
                ))}
              </div>
            </section>
          )}

          {/* Fungsi & layanan — grid fungsi dulu, aplikasi di dalamnya (admin & ASN) */}
          {showFungsi && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-navy-400">Aplikasi &amp; Layanan</h2>
                <Link href="/beranda/fungsi" className="text-xs font-semibold text-bpom-600 hover:text-bpom-700">
                  Lihat semua
                </Link>
              </div>

              {loading && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-28 animate-pulse rounded-2xl bg-navy-100/60" />
                  ))}
                </div>
              )}

              {!loading && fungsi.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-navy-900/5 bg-white py-12 text-center">
                  <LayoutGrid className="size-9 text-navy-200" />
                  <p className="text-sm font-semibold text-navy-600">Belum ada layanan untuk peran Anda</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
                {fungsi.map((f, i) => (
                  <motion.div
                    key={f.slug}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.3 }}
                    className="min-w-0"
                  >
                    <Link
                      href={`/beranda/fungsi?f=${f.slug}`}
                      className="group flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-navy-900/5 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${COLORS[i % COLORS.length]} text-white shadow-sm`}>
                          <DynamicIcon name={f.icon} className="size-6" />
                        </div>
                        <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-bold text-navy-500">
                          {f.aplikasi.length} apl
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold leading-snug text-navy-900">{f.nama}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-navy-400">{f.deskripsi}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Tile({
  href,
  label,
  color,
  delay,
  external = false,
  children,
}: {
  href: string;
  label: string;
  color: string;
  delay: number;
  external?: boolean;
  children: React.ReactNode;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-sm`}>
          {children}
        </div>
        {external ? (
          <ExternalLink className="size-4 shrink-0 text-navy-200 group-hover:text-navy-400" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-navy-200 transition-transform group-hover:translate-x-0.5 group-hover:text-navy-400" />
        )}
      </div>
      <p className="min-w-0 truncate text-sm font-bold leading-snug text-navy-900">{label}</p>
    </>
  );
  const cls =
    "group flex h-full min-w-0 flex-col gap-2.5 rounded-2xl border border-navy-900/5 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md active:translate-y-0";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(delay * 0.04, 0.35), duration: 0.3 }}
      className="min-w-0"
    >
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {inner}
        </a>
      ) : (
        <Link href={href} className={cls}>
          {inner}
        </Link>
      )}
    </motion.div>
  );
}
