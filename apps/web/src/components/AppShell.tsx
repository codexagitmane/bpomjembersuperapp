"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Newspaper, LayoutGrid, UserRound, LogOut, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABELS, type RoleSlug } from "@bpom/shared";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/beranda/berita", label: "Berita", icon: Newspaper },
  { href: "/beranda/fungsi", label: "Fungsi", icon: LayoutGrid },
  { href: "/beranda/profil", label: "Profil", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-navy-400" />
      </div>
    );
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-1 bg-background">
      {/* Sidebar — desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-navy-900/5 bg-white px-5 py-6 md:flex">
        <Link href="/beranda/berita" className="mb-8 flex items-center gap-2.5 px-1">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-bpom-400 to-bpom-600">
            <ShieldCheck className="size-5 text-white" />
          </div>
          <span className="text-base font-extrabold text-navy-900">SIGAP Jember</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  active ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-navy-50"
                )}
              >
                <item.icon className="size-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-50"
        >
          {loggingOut ? <Loader2 className="size-4.5 animate-spin" /> : <LogOut className="size-4.5" />}
          Keluar
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-navy-900/5 bg-white/80 px-5 py-3.5 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-bpom-400 to-bpom-600">
              <ShieldCheck className="size-4.5 text-white" />
            </div>
            <span className="text-sm font-extrabold text-navy-900">SIGAP Jember</span>
          </div>
          <div className="hidden md:block" />

          <Link href="/beranda/profil" className="flex items-center gap-2.5">
            <div className="text-right">
              <p className="text-sm font-semibold text-navy-900">{user.name}</p>
              <p className="text-xs text-navy-400">{ROLE_LABELS[user.role as RoleSlug] ?? user.role}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-700">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
          </Link>
        </header>

        <main className="flex-1 px-5 pb-24 pt-5 md:px-8 md:pb-8 md:pt-6">{children}</main>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-navy-900/5 bg-white/95 py-2 backdrop-blur-md md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-[11px] font-semibold transition-colors",
                active ? "text-navy-900" : "text-navy-400"
              )}
            >
              <item.icon className={cn("size-5", active && "text-bpom-600")} />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-[11px] font-semibold text-navy-400"
        >
          {loggingOut ? <Loader2 className="size-5 animate-spin" /> : <LogOut className="size-5" />}
          Keluar
        </button>
      </nav>
    </div>
  );
}
