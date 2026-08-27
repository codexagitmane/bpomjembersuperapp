"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const KEY = "lentera_2fa_nudged";

/**
 * Pop-up ajakan mengaktifkan 2FA — tampil SETIAP KALI user login (login()
 * membersihkan penanda sesi) selama pegawai belum mengaktifkan 2FA. Dalam satu
 * sesi (navigasi antar halaman) hanya tampil sekali agar tidak mengganggu.
 */
export function TwoFactorNudge() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.two_factor_enabled) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(KEY)) return;
    const t = setTimeout(() => setShow(true), 900);
    return () => clearTimeout(t);
  }, [user]);

  function dismiss() {
    if (typeof window !== "undefined") sessionStorage.setItem(KEY, "1");
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={dismiss} />
          <motion.div initial={{ y: 30, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-background shadow-2xl">
            <button onClick={dismiss} className="absolute right-3 top-3 rounded-lg p-1 text-navy-400 hover:bg-navy-50"><X className="size-5" /></button>
            <div className="bg-gradient-to-br from-navy-900 to-navy-800 px-6 pb-8 pt-7 text-center text-white">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-bpom-500/20 ring-1 ring-bpom-400/40">
                <ShieldCheck className="size-7 text-bpom-300" />
              </div>
              <h3 className="mt-3 text-lg font-extrabold">Amankan Akun Anda</h3>
              <p className="mt-1 text-sm text-navy-200">Aktifkan Verifikasi Dua Faktor (2FA) agar akun lebih aman dari akses tidak sah.</p>
            </div>
            <div className="flex flex-col gap-2 p-5">
              <Link href="/beranda/profil" onClick={dismiss}
                className="flex items-center justify-center gap-2 rounded-2xl bg-bpom-600 py-3 text-sm font-bold text-white hover:bg-bpom-700">
                <ShieldCheck className="size-4" /> Aktifkan Sekarang
              </Link>
              <button onClick={dismiss} className="rounded-2xl py-2.5 text-sm font-semibold text-navy-500 hover:bg-navy-50">
                Nanti saja
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
