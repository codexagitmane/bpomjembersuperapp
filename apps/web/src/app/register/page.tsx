"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { registerEksternalSchema, extractApiErrorMessage } from "@bpom/shared";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LenteraMark } from "@/components/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const { registerEksternal } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const parsed = registerEksternalSchema.safeParse(form);
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
      await registerEksternal(form);
      router.replace("/beranda");
    } catch (err) {
      setServerError(extractApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-1 flex-col bg-background lg:flex-row">
      {/* Hero brand — kompak di mobile, panel penuh di desktop */}
      <div className="relative flex shrink-0 flex-col justify-center gap-6 overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 px-7 pb-7 pt-8 text-white lg:flex-1 lg:justify-center lg:gap-12 lg:rounded-none lg:px-14 lg:py-14">
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
        <div className="relative max-w-md">
          <h2 className="text-xl font-extrabold leading-tight sm:text-2xl lg:text-3xl">
            Bergabung untuk akses layanan publik Balai POM.
          </h2>
          <p className="mt-2.5 hidden text-sm text-navy-200 sm:block">
            Konsultasi, pengaduan, dan booking layanan masyarakat dalam satu akun.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-6 lg:px-14 lg:py-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-sm"
        >
          <Link
            href="/login"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-700"
          >
            <ArrowLeft className="size-4" /> Kembali ke Masuk
          </Link>

          <h1 className="text-xl font-extrabold text-navy-900 sm:text-2xl">Daftar Akun Lentera</h1>
          <p className="mt-1 text-sm text-navy-500">Untuk layanan konsultasi &amp; pengaduan publik.</p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
            <Input
              label="Nama Lengkap"
              name="name"
              placeholder="Nama sesuai KTP"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              error={fieldErrors.name}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              error={fieldErrors.email}
            />
            <Input
              label="Nomor HP"
              name="phone"
              placeholder="08xxxxxxxxxx"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              error={fieldErrors.phone}
            />
            <Input
              label="Kata Sandi"
              name="password"
              type="password"
              placeholder="Min. 8 karakter, kombinasi huruf/angka/simbol"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              error={fieldErrors.password}
            />
            <Input
              label="Konfirmasi Kata Sandi"
              name="password_confirmation"
              type="password"
              placeholder="Ulangi kata sandi"
              value={form.password_confirmation}
              onChange={(e) => update("password_confirmation", e.target.value)}
              error={fieldErrors.password_confirmation}
            />

            {serverError && (
              <div className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600">
                {serverError}
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Daftar Sekarang <ArrowRight className="size-4" />
            </Button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
