"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import { registerEksternalSchema, extractApiErrorMessage } from "@bpom/shared";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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
      router.replace("/beranda/berita");
    } catch (err) {
      setServerError(extractApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-background px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-700">
          <ArrowLeft className="size-4" /> Kembali ke Masuk
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-bpom-400 to-bpom-600 shadow-lg">
            <ShieldCheck className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-navy-900">Daftar Akun Masyarakat</h1>
            <p className="text-xs text-navy-500">Untuk layanan konsultasi & pengaduan publik</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
    </main>
  );
}
