"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Fingerprint,
  History,
  SlidersHorizontal,
  Clock3,
  CalendarRange,
  ClipboardList,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/presensi", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/presensi/absen", label: "Absen", icon: Fingerprint, adminOnly: false },
  { href: "/presensi/riwayat", label: "Riwayat", icon: History, adminOnly: false },
  { href: "/presensi/kehadiran", label: "Kehadiran", icon: Users, adminOnly: true },
  { href: "/presensi/manajemen", label: "Manajemen", icon: SlidersHorizontal, adminOnly: true },
  { href: "/rekap-presensi", label: "Rekap", icon: CalendarRange, adminOnly: true },
  { href: "/manajemen-patroli", label: "Patroli", icon: ClipboardList, adminOnly: true },
];

/** Header + sub-navigasi modul presensi "ONTIME". */
export function PresensiTabs() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin =
    user?.role === "superadmin" || user?.role === "kepala_subag_tu" || user?.role === "kepala_balai";

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-bpom-400 to-navy-700 shadow-md">
          <Clock3 className="size-6 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-navy-900 sm:text-2xl">
            ON<span className="text-bpom-600">TIME</span>
          </h1>
          <p className="truncate text-xs text-navy-500">
            Presensi &amp; Kehadiran Pegawai — Balai POM di Jember
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-1 overflow-x-auto rounded-2xl border border-navy-900/5 bg-white p-1.5 shadow-sm scrollbar-none">
        {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all sm:flex-1",
                active
                  ? "bg-navy-900 text-white shadow-sm"
                  : "text-navy-500 hover:bg-navy-50 hover:text-navy-800"
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
