"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Newspaper,
  LayoutGrid,
  UserRound,
  LogOut,
  Loader2,
  LayoutDashboard,
  ClipboardCheck,
  UserCheck,
  Building2,
  CalendarOff,
  CalendarCheck,
  Users,
  Fingerprint,
  DoorOpen,
  QrCode,
  Settings,
  Sun,
  Moon,
  Info,
  Trash2,
  KeyRound,
  ChevronRight,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { NotifikasiBell } from "@/components/NotifikasiBell";
import { TwoFactorNudge } from "@/components/TwoFactorNudge";
import { FungsiNav } from "@/components/FungsiNav";
import { LenteraMark } from "@/components/Logo";
import { ROLE_LABELS, STATUS_KEPEGAWAIAN_LABEL, type RoleSlug } from "@bpom/shared";
import { cn } from "@/lib/utils";

const HOME_ITEM = { href: "/beranda", label: "Beranda", icon: LayoutGrid };

const NAV_ITEMS = [
  { href: "/beranda/berita", label: "Berita", icon: Newspaper },
  { href: "/beranda/profil", label: "Profil", icon: UserRound },
];

// Menu grid ringkas untuk bottom-nav mobile (Fungsi tetap dari FungsiNav di desktop).
const MOBILE_FUNGSI = { href: "/beranda/fungsi", label: "Fungsi", icon: LayoutGrid };

// Menu tambahan sesuai role — server tetap menegakkan RBAC via API;
// ini hanya visibilitas navigasi.
const ROLE_NAV: Record<string, { href: string; label: string; icon: typeof Newspaper }[]> = {
  superadmin: [
    { href: "/dashboard", label: "Dashboard Kabalai", icon: LayoutDashboard },
    { href: "/dashboard-tu", label: "Dashboard TU", icon: Building2 },
    { href: "/pegawai", label: "Data Pegawai", icon: Users },
    { href: "/persetujuan", label: "Persetujuan", icon: ClipboardCheck },
    { href: "/admin/verifikasi", label: "Verifikasi", icon: UserCheck },
    { href: "/admin/ttd", label: "Daftar TTD", icon: QrCode },
  ],
  kepala_balai: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard-tu", label: "Dashboard TU", icon: Building2 },
    { href: "/persetujuan", label: "Persetujuan", icon: ClipboardCheck },
  ],
  kepala_subag_tu: [
    { href: "/dashboard-tu", label: "Dashboard TU", icon: Building2 },
    { href: "/persetujuan", label: "Persetujuan", icon: ClipboardCheck },
    { href: "/cuti", label: "Cuti & Izin", icon: CalendarOff },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tentangOpen, setTentangOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("lentera-theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  async function bersihkanCache() {
    setClearing(true);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {}
    window.location.reload();
  }

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

  // Outsourcing & Magang berbagi satu role, tapi ditampilkan terpisah sesuai
  // status kepegawaian masing-masing.
  const roleDisplay =
    user.role === "pegawai_outsourcing_magang" && user.status_kepegawaian
      ? STATUS_KEPEGAWAIAN_LABEL[user.status_kepegawaian]
      : ROLE_LABELS[user.role as RoleSlug] ?? user.role;

  // Akses per peran:
  // - masyarakat (eksternal): hanya Booking Layanan.
  // - outsourcing/magang: hanya ONTIME + Izin Keluar/Masuk.
  // - ASN: hanya Beranda + grid Fungsi & Aplikasi.
  // - admin/pimpinan: menu manajemen + Fungsi + Berita.
  const role = user.role;
  const isMasyarakat = role === "masyarakat";
  const isAsn = role === "pegawai_asn_pppk";
  const isOutsourcing = role === "pegawai_outsourcing_magang";
  const isAdmin = !!ROLE_NAV[role];

  const userNav = isMasyarakat
    ? [{ href: "/booking-konsultasi", label: "Booking Layanan", icon: CalendarCheck }]
    : isOutsourcing
      ? [
          { href: "/presensi", label: "ONTIME — Presensi", icon: Fingerprint },
          { href: "/izin-keluar-masuk", label: "Izin Keluar/Masuk", icon: DoorOpen },
        ]
      : isAdmin
        ? ROLE_NAV[role]
        : [];

  const showFungsiNav = isAdmin || isAsn;
  const showBerita = isAdmin;
  const profilItem = NAV_ITEMS[1];
  const mobileAll = [HOME_ITEM, ...userNav, ...(showFungsiNav ? [MOBILE_FUNGSI] : []), profilItem];
  const mobileQuick = mobileAll.slice(0, 3);

  return (
    <div className="flex min-h-screen w-full max-w-full flex-1 overflow-x-hidden bg-background">
      {/* Sidebar — desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-navy-900/5 bg-white px-5 py-6 md:flex">
        <Link href="/beranda" className="mb-8 flex items-center gap-2.5 px-1">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-navy-50 ring-1 ring-navy-900/5">
            <LenteraMark className="size-8" />
          </div>
          <div className="leading-none">
            <span className="text-base font-extrabold tracking-tight text-navy-900">
              LENTE<span className="text-bpom-500">RA</span>
            </span>
            <p className="mt-0.5 text-[10px] font-medium text-navy-400">Balai POM di Jember</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-none">
          <SidebarLink item={HOME_ITEM} pathname={pathname} />
          {userNav.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
          {/* Admin/pimpinan diarahkan ke halaman kelola (buat, ubah, terbitkan, hapus). */}
          {showBerita && (
            <SidebarLink
              item={{ href: "/berita", label: "Kelola Berita", icon: Newspaper }}
              pathname={pathname}
            />
          )}
          {showFungsiNav && <FungsiNav />}
          <SidebarLink item={profilItem} pathname={pathname} />
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

      {/* `min-w-0` WAJIB: tanpa itu kolom ini tidak boleh menyusut di bawah
          lebar min-content isinya. Nama pengguna yang panjang pada header
          membuat kolom melebar melewati layar, dan SELURUH halaman di dalam
          <main> ikut terpotong di sisi kanan pada ponsel. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-navy-900/5 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-5 sm:py-3.5 md:px-8">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 ring-1 ring-navy-900/5">
              <LenteraMark className="size-7" />
            </div>
            <span className="text-sm font-extrabold tracking-tight text-navy-900">
              LENTE<span className="text-bpom-500">RA</span>
            </span>
          </div>
          <div className="hidden md:block" />

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <NotifikasiBell />
            <Link href="/beranda/profil" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              {/* Nama dipotong bila panjang, bukan melebarkan header. */}
              <div className="min-w-0 max-w-[42vw] text-right sm:max-w-[16rem]">
                <p className="truncate text-sm font-semibold text-navy-900">{user.name}</p>
                <p className="truncate text-xs text-navy-400">{roleDisplay}</p>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-100 text-sm font-bold text-navy-700">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt={user.name} className="size-full object-cover" />
                ) : (
                  user.name.slice(0, 1).toUpperCase()
                )}
              </div>
            </Link>
          </div>
        </header>

        <main className="w-full min-w-0 max-w-full flex-1 overflow-x-hidden px-4 pb-24 pt-5 sm:px-5 md:px-8 md:pb-8 md:pt-6">
          {children}
        </main>
      </div>

      <TwoFactorNudge />


      {/* Bottom nav — mobile: item cepat + tombol "Menu" yang membuka sheet penuh */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-navy-900/5 bg-white/95 px-1 py-1.5 backdrop-blur-md md:hidden">
        {mobileQuick.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors",
                active ? "text-bpom-600" : "text-navy-400"
              )}
            >
              <item.icon className="size-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold text-navy-500"
        >
          <div className="flex size-6 items-center justify-center">
            <Settings className="size-5" />
          </div>
          Setelan
        </button>
      </nav>

      {/* Bottom sheet "Setelan" */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm"
              onClick={() => setSettingsOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              /* Daftar menu bisa lebih panjang daripada layar ponsel; batasi
                 tingginya dan biarkan digulung agar item terakhir terjangkau. */
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-background p-5 pb-8 shadow-2xl"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-navy-200" />
              <div className="mb-4 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold text-navy-900">{user.name}</p>
                  <p className="text-xs text-navy-400">{roleDisplay}</p>
                </div>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-100 text-navy-500"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              <div className="space-y-2">
                <Link
                  href="/beranda/profil"
                  onClick={() => setSettingsOpen(false)}
                  className="flex items-center gap-3 rounded-2xl border border-navy-900/5 bg-white px-4 py-3 text-sm font-semibold text-navy-800"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
                    <UserRound className="size-4.5" />
                  </span>
                  <span className="flex-1">Profil Saya</span>
                  <ChevronRight className="size-4 text-navy-300" />
                </Link>

                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    setPwOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-navy-900/5 bg-white px-4 py-3 text-left text-sm font-semibold text-navy-800"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
                    <KeyRound className="size-4.5" />
                  </span>
                  <span className="flex-1">Ubah Password</span>
                  <ChevronRight className="size-4 text-navy-300" />
                </button>

                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    setTentangOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-navy-900/5 bg-white px-4 py-3 text-left text-sm font-semibold text-navy-800"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
                    <Info className="size-4.5" />
                  </span>
                  <span className="flex-1">Tentang Aplikasi</span>
                  <ChevronRight className="size-4 text-navy-300" />
                </button>

                <button
                  onClick={bersihkanCache}
                  disabled={clearing}
                  className="flex w-full items-center gap-3 rounded-2xl border border-navy-900/5 bg-white px-4 py-3 text-left text-sm font-semibold text-navy-800 disabled:opacity-60"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
                    {clearing ? <Loader2 className="size-4.5 animate-spin" /> : <Trash2 className="size-4.5" />}
                  </span>
                  <span className="flex-1">Bersihkan Cache</span>
                  <ChevronRight className="size-4 text-navy-300" />
                </button>

                <div className="flex items-center gap-3 rounded-2xl border border-navy-900/5 bg-white px-4 py-3 text-sm font-semibold text-navy-800">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
                    {dark ? <Moon className="size-4.5" /> : <Sun className="size-4.5" />}
                  </span>
                  <span className="flex-1">Mode Gelap</span>
                  <button
                    onClick={toggleTheme}
                    role="switch"
                    aria-checked={dark}
                    aria-label="Ganti mode gelap"
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                      dark ? "bg-bpom-500" : "bg-navy-200"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                        dark ? "translate-x-5" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/10 py-3.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
              >
                {loggingOut ? <Loader2 className="size-4.5 animate-spin" /> : <LogOut className="size-4.5" />}
                Keluar dari Akun
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <UbahPasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />

      {/* Tentang aplikasi */}
      <AnimatePresence>
        {tentangOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm"
              onClick={() => setTentangOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="relative w-full max-w-sm rounded-3xl bg-background p-6 text-center shadow-2xl"
            >
              <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-navy-50 ring-1 ring-navy-900/5">
                <LenteraMark className="size-11" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-navy-900">
                LENTE<span className="text-bpom-500">RA</span>
              </h3>
              <p className="text-xs font-medium text-navy-400">Layanan Elektronik Terpadu — Balai POM di Jember</p>
              <p className="mt-4 text-sm text-navy-600">
                Platform terintegrasi presensi, perizinan, pengawasan, dan layanan konsultasi masyarakat.
              </p>
              <p className="mt-3 text-[11px] text-navy-400">Versi 1.0.0 • © {new Date().getFullYear()} BPOM di Jember</p>
              <button
                onClick={() => setTentangOpen(false)}
                className="mt-5 w-full rounded-2xl bg-navy-900 py-3 text-sm font-bold text-white"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UbahPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw.length < 8) return setErr("Password minimal 8 karakter.");
    if (pw !== pw2) return setErr("Konfirmasi password tidak cocok.");
    setLoading(true);
    try {
      await api.patch("/profil", { password: pw });
      setOk(true);
      setPw("");
      setPw2("");
      setTimeout(() => {
        setOk(false);
        onClose();
      }, 1200);
    } catch {
      setErr("Gagal mengubah password. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="relative w-full max-w-sm rounded-3xl bg-background p-6 shadow-2xl"
          >
            <h3 className="text-lg font-extrabold text-navy-900">Ubah Password</h3>
            <p className="mt-1 text-xs text-navy-400">Masukkan password baru untuk akun Anda.</p>
            <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Password baru (min. 8 karakter)"
                className="w-full rounded-xl border border-navy-900/10 bg-white px-4 py-2.5 text-sm text-navy-900 outline-none focus:border-bpom-500"
              />
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full rounded-xl border border-navy-900/10 bg-white px-4 py-2.5 text-sm text-navy-900 outline-none focus:border-bpom-500"
              />
              {err && <p className="text-xs font-medium text-rose-600">{err}</p>}
              {ok && <p className="text-xs font-medium text-bpom-600">Password berhasil diperbarui ✓</p>}
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-2xl bg-navy-100 py-3 text-sm font-bold text-navy-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-navy-900 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />} Simpan
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SidebarLink({
  item,
  pathname,
}: {
  item: { href: string; label: string; icon: typeof Newspaper };
  pathname: string;
}) {
  const active = pathname === item.href;
  return (
    <Link
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
}
