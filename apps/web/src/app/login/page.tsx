"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Sparkles, ShieldCheck, KeyRound } from "lucide-react";
import { loginSchema, extractApiErrorMessage } from "@bpom/shared";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LenteraMark } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [code, setCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    if (!twoFA) {
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
        setFieldErrors(errs);
        return;
      }
    } else if (code.trim().length < 6) {
      setServerError("Masukkan 6 digit kode dari aplikasi authenticator.");
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password, { remember, twoFactorCode: twoFA ? code : undefined });
      if (res.twoFactorRequired) {
        setTwoFA(true);
        return;
      }
      router.replace("/beranda");
    } catch (err) {
      setServerError(extractApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex h-[100dvh] flex-1 flex-col overflow-hidden bg-background lg:h-auto lg:min-h-screen lg:flex-row">
      {/* Hero — kompak di mobile, panel penuh di desktop */}
      <div className="relative flex shrink-0 flex-col justify-center overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 px-7 pb-8 pt-9 text-white lg:flex-1 lg:justify-between lg:rounded-none lg:px-14 lg:py-14">
        <div className="pointer-events-none absolute -left-16 -top-16 size-52 rounded-full bg-bpom-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 size-60 rounded-full bg-navy-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-lg lg:size-14">
            <LenteraMark className="size-9 lg:size-10" />
          </div>
          <div>
            <p className="text-lg font-extrabold leading-none lg:text-xl">
              LENTE<span className="text-bpom-400">RA</span>
            </p>
            <p className="mt-1 text-[11px] font-medium text-navy-200">Balai POM di Jember</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mt-6 max-w-md lg:mt-0"
        >
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-bpom-200 ring-1 ring-white/15">
            <Sparkles className="size-3.5" /> Layanan Elektronik Terpadu
          </span>
          <h2 className="text-xl font-extrabold leading-tight sm:text-2xl lg:text-3xl">
            Satu Platform, Seluruh Layanan Balai POM di Jember.
          </h2>
          <p className="mt-2.5 hidden text-sm text-navy-200 sm:block">
            Presensi, perizinan, pengawasan distribusi, hingga layanan konsultasi masyarakat — terintegrasi
            dalam satu sistem yang aman &amp; modern.
          </p>
        </motion.div>

        <p className="relative hidden text-xs text-navy-300 lg:block">
          © {new Date().getFullYear()} Balai Pengawas Obat dan Makanan di Jember
        </p>
      </div>

      {/* Form — di mobile naik ke atas (dekat hero), terpusat di desktop */}
      <div className="flex flex-1 flex-col justify-start px-6 pb-6 pt-8 lg:justify-center lg:px-14 lg:py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-sm"
        >
          <h1 className="text-xl font-extrabold text-navy-900 sm:text-2xl">
            {twoFA ? "Verifikasi Dua Faktor" : "Masuk ke Akun Anda"}
          </h1>
          <p className="mt-1.5 text-sm text-navy-500">
            {twoFA
              ? "Masukkan 6 digit kode dari aplikasi authenticator Anda (atau kode pemulihan)."
              : "Gunakan akun email dan password Anda yang sudah terdaftar."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {!twoFA ? (
              <>
                <Input
                  label="Email" name="email" type="email" autoComplete="email"
                  placeholder="nama@bpomjember.go.id" icon={<Mail className="size-4" />}
                  value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email}
                />
                <Input
                  label="Kata Sandi" name="password" type="password" autoComplete="current-password"
                  placeholder="••••••••" icon={<Lock className="size-4" />}
                  value={password} onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password}
                />
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-navy-600">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                    className="size-4 rounded border-navy-300 text-bpom-600 focus:ring-bpom-500" />
                  Ingat saya selama 30 hari
                </label>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-xl bg-bpom-50 px-3.5 py-2.5 text-xs font-medium text-bpom-700">
                  <ShieldCheck className="size-4 shrink-0" /> Akun Anda dilindungi autentikasi dua faktor.
                </div>
                <Input
                  label="Kode Verifikasi" name="code" inputMode="numeric" autoComplete="one-time-code"
                  placeholder="123456" icon={<KeyRound className="size-4" />} autoFocus
                  value={code} onChange={(e) => setCode(e.target.value)}
                />
              </>
            )}

            {serverError && (
              <div className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600">{serverError}</div>
            )}

            <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
              {twoFA ? "Verifikasi & Masuk" : "Masuk"} <ArrowRight className="size-4" />
            </Button>
            {twoFA && (
              <button type="button" onClick={() => { setTwoFA(false); setCode(""); setServerError(null); }}
                className="text-center text-sm font-medium text-navy-500 hover:text-navy-700">
                ← Kembali
              </button>
            )}
          </form>

          {!twoFA && (
            <p className="mt-5 text-center text-sm text-navy-500">
              Belum punya akun?{" "}
              <Link href="/register" className="font-semibold text-bpom-600 hover:underline">
                Daftar di sini
              </Link>
            </p>
          )}
        </motion.div>
      </div>
    </main>
  );
}
