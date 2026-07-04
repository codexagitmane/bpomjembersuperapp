"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, ShieldCheck, ArrowRight } from "lucide-react";
import { loginSchema, extractApiErrorMessage } from "@bpom/shared";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace("/beranda/berita");
    } catch (err) {
      setServerError(extractApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-1 bg-background">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-bpom-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-navy-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-bpom-400 to-bpom-600 shadow-lg">
            <ShieldCheck className="size-6 text-white" />
          </div>
          <span className="text-lg font-bold">LENTERA BPOM Jember</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-md"
        >
          <h2 className="text-3xl font-extrabold leading-tight">
            Satu Platform, Seluruh Layanan Balai POM di Jember.
          </h2>
          <p className="mt-4 text-navy-200">
            Presensi, perizinan, pengawasan distribusi, hingga layanan konsultasi masyarakat —
            terintegrasi dalam satu sistem yang aman dan modern.
          </p>
        </motion.div>

        <p className="relative text-xs text-navy-300">
          © {new Date().getFullYear()} Balai Pengawas Obat dan Makanan di Jember
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-bpom-400 to-bpom-600 shadow-lg">
              <ShieldCheck className="size-7 text-white" />
            </div>
            <span className="text-lg font-bold text-navy-900">LENTERA BPOM Jember</span>
          </div>

          <h1 className="text-2xl font-extrabold text-navy-900">Masuk ke Akun Anda</h1>
          <p className="mt-1.5 text-sm text-navy-500">
            Gunakan akun kepegawaian atau akun masyarakat Anda.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@bpomjember.go.id"
              icon={<Mail className="size-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
            />
            <Input
              label="Kata Sandi"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              icon={<Lock className="size-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
            />

            {serverError && (
              <div className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600">
                {serverError}
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Masuk <ArrowRight className="size-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-navy-500">
            Masyarakat umum belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-bpom-600 hover:underline">
              Daftar di sini
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
