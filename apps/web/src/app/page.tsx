"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { LenteraMark } from "@/components/Logo";

export default function SplashPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      router.replace(user ? "/beranda" : "/login");
    }, 1800);
    return () => clearTimeout(timer);
  }, [isLoading, user, router]);

  return (
    <main className="relative flex min-h-[100dvh] flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
      <div className="pointer-events-none absolute left-1/2 top-1/3 size-80 -translate-x-1/2 rounded-full bg-bpom-500/25 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 size-72 rounded-full bg-navy-400/20 blur-3xl" />

      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <motion.span
            className="absolute inset-0 rounded-[2rem] bg-bpom-400/40 blur-2xl"
            animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.92, 1.08, 0.92] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex size-36 items-center justify-center rounded-[2rem] bg-white shadow-2xl">
            <LenteraMark className="size-24" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-bpom-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </div>

      <p className="absolute bottom-8 text-[11px] font-medium text-navy-400">
        © {new Date().getFullYear()} Balai Pengawas Obat dan Makanan di Jember
      </p>
    </main>
  );
}
