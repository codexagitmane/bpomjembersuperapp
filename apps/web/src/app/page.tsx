"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function SplashPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      router.replace(user ? "/beranda/berita" : "/login");
    }, 1400);
    return () => clearTimeout(timer);
  }, [isLoading, user, router]);

  return (
    <main className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-bpom-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-navy-400/20 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col items-center gap-5"
      >
        <div className="flex size-24 items-center justify-center rounded-[1.75rem] bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-bpom-400 to-bpom-600 shadow-lg">
            <ShieldCheck className="size-9 text-white" strokeWidth={2.25} />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-2xl font-extrabold tracking-tight text-white">SIGAP BPOM Jember</h1>
          <p className="mt-1.5 text-sm font-medium text-navy-200">
            Sistem Informasi Terintegrasi Pengawasan Obat & Makanan
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-2 flex gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-bpom-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </motion.div>
      </motion.div>

      <p className="absolute bottom-8 text-xs font-medium text-navy-300">
        Balai Pengawas Obat dan Makanan di Jember
      </p>
    </main>
  );
}
