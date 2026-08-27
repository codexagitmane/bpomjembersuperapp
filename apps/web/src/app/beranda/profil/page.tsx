"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LogOut, Mail, Phone, IdCard, BadgeCheck, Pencil, Check, X, Camera, Trash2,
  ShieldCheck, ShieldAlert, KeyRound, Copy, Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { ROLE_LABELS, extractApiErrorMessage, type RoleSlug } from "@bpom/shared";

export default function ProfilPage() {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!user) return null;

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.replace("/login");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-navy-900">Profil Saya</h1>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4" /> Edit Profil
          </Button>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <AvatarUploader />
          <div>
            <h2 className="text-lg font-bold text-navy-900">{user.name}</h2>
            <Badge tone="info" className="mt-1.5">{ROLE_LABELS[user.role as RoleSlug] ?? user.role}</Badge>
          </div>
        </Card>

        {editing ? (
          <EditForm onDone={async () => { await refresh(); setEditing(false); }} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <Card className="mt-4 divide-y divide-navy-900/5 !p-0">
              <InfoRow icon={<Mail className="size-4" />} label="Email" value={user.email} />
              {user.nip_nik && <InfoRow icon={<IdCard className="size-4" />} label="NIP / NIK" value={user.nip_nik} />}
              <InfoRow icon={<Phone className="size-4" />} label="Nomor HP" value={user.phone || "—"} />
              <InfoRow icon={<BadgeCheck className="size-4" />} label="Status Akun" value={user.is_active ? "Aktif" : "Nonaktif"} />
            </Card>

            <TwoFactorCard onChanged={refresh} />

            <Button variant="danger" size="lg" onClick={handleLogout} loading={loggingOut} className="mt-6 w-full">
              {!loggingOut && <LogOut className="size-4" />} Keluar dari Akun
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}

function AvatarUploader() {
  const { user, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("foto", file);
      await api.post("/profil/avatar", fd);
      await refresh();
    } finally { setBusy(false); }
  }
  async function hapus() {
    setBusy(true);
    try { await api.delete("/profil/avatar"); await refresh(); } finally { setBusy(false); }
  }

  return (
    <div className="relative">
      <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-navy-800 to-navy-950 text-3xl font-bold text-white">
        {user?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt="Foto profil" className="size-full object-cover" />
        ) : (
          user?.name.slice(0, 1).toUpperCase()
        )}
        {busy && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-navy-950/50"><Loader2 className="size-6 animate-spin text-white" /></div>}
      </div>
      <button onClick={() => fileRef.current?.click()} disabled={busy}
        className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-bpom-600 text-white shadow-md ring-2 ring-background hover:bg-bpom-700">
        <Camera className="size-4" />
      </button>
      {user?.avatar_url && (
        <button onClick={hapus} disabled={busy} title="Hapus foto"
          className="absolute bottom-0 left-0 flex size-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-md ring-2 ring-background hover:bg-rose-600">
          <Trash2 className="size-3.5" />
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </div>
  );
}

function TwoFactorCard({ onChanged }: { onChanged: () => Promise<void> }) {
  const { user } = useAuth();
  const enabled = !!user?.two_factor_enabled;
  const [mode, setMode] = useState<"idle" | "setup" | "disable">("idle");
  const [setupData, setSetupData] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function mulaiSetup() {
    setBusy(true); setErr(null);
    try {
      const { data } = await api.post("/profil/2fa/setup");
      setSetupData({ qr: data.qr, secret: data.secret });
      setMode("setup");
    } catch (e) { setErr(extractApiErrorMessage(e)); } finally { setBusy(false); }
  }
  async function konfirmasi() {
    setBusy(true); setErr(null);
    try {
      const { data } = await api.post("/profil/2fa/confirm", { code });
      setRecovery(data.recovery_codes);
      setSetupData(null); setCode(""); setMode("idle");
      await onChanged();
    } catch (e) { setErr(extractApiErrorMessage(e)); } finally { setBusy(false); }
  }
  async function nonaktifkan() {
    setBusy(true); setErr(null);
    try {
      await api.post("/profil/2fa/disable", { password });
      setPassword(""); setMode("idle");
      await onChanged();
    } catch (e) { setErr(extractApiErrorMessage(e)); } finally { setBusy(false); }
  }

  return (
    <Card className="mt-4 !p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`flex size-10 items-center justify-center rounded-xl ${enabled ? "bg-bpom-50 text-bpom-600" : "bg-navy-50 text-navy-400"}`}>
            {enabled ? <ShieldCheck className="size-5" /> : <ShieldAlert className="size-5" />}
          </div>
          <div>
            <p className="font-bold text-navy-900">Verifikasi Dua Faktor (2FA)</p>
            <p className="text-xs text-navy-500">
              {enabled ? "Aktif — login memerlukan kode dari authenticator." : "Tambahkan lapisan keamanan dengan aplikasi authenticator."}
            </p>
          </div>
        </div>
        <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "Aktif" : "Nonaktif"}</Badge>
      </div>

      {/* Kode pemulihan (tampil sekali setelah aktivasi) */}
      {recovery && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs font-bold text-amber-800">Simpan kode pemulihan ini di tempat aman — hanya ditampilkan sekali.</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {recovery.map((c) => <code key={c} className="rounded bg-white px-2 py-1 text-center font-mono text-xs text-navy-800">{c}</code>)}
          </div>
          <button onClick={() => navigator.clipboard?.writeText(recovery.join("\n"))} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline">
            <Copy className="size-3.5" /> Salin semua
          </button>
        </div>
      )}

      {err && <p className="mt-3 text-sm font-medium text-rose-600">{err}</p>}

      {/* Aksi */}
      {!enabled && mode === "idle" && (
        <Button className="mt-4" variant="secondary" loading={busy} onClick={mulaiSetup}><ShieldCheck className="size-4" /> Aktifkan 2FA</Button>
      )}
      {mode === "setup" && setupData && (
        <div className="mt-4 rounded-xl bg-navy-50/60 p-4">
          <p className="text-sm font-semibold text-navy-800">1. Pindai QR di aplikasi authenticator</p>
          <div className="mt-2 flex flex-col items-center gap-2 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setupData.qr} alt="QR 2FA" className="size-40 rounded-lg bg-white p-2" />
            <div className="text-xs text-navy-500">
              <p>Google Authenticator, Authy, Microsoft Authenticator, dll.</p>
              <p className="mt-2 font-semibold text-navy-700">Atau masukkan kode manual:</p>
              <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-[11px] text-navy-800">{setupData.secret}</code>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-navy-800">2. Masukkan 6 digit kode</p>
          <div className="mt-2 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="123456"
              className="w-full rounded-xl border border-navy-900/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-bpom-500" />
            <Button loading={busy} onClick={konfirmasi} className="shrink-0"><Check className="size-4" /> Aktifkan</Button>
          </div>
          <button onClick={() => { setMode("idle"); setSetupData(null); setErr(null); }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100">
            <X className="size-4" /> Batal
          </button>
        </div>
      )}
      {enabled && mode === "idle" && (
        <Button className="mt-4" variant="outline" onClick={() => setMode("disable")}><ShieldAlert className="size-4" /> Nonaktifkan 2FA</Button>
      )}
      {mode === "disable" && (
        <div className="mt-4 rounded-xl bg-navy-50/60 p-4">
          <p className="text-sm font-semibold text-navy-800">Konfirmasi kata sandi untuk menonaktifkan 2FA</p>
          <div className="mt-2 flex gap-2">
            <Input type="password" placeholder="Kata sandi" value={password} onChange={(e) => setPassword(e.target.value)} icon={<KeyRound className="size-4" />} className="flex-1" />
            <Button variant="danger" loading={busy} onClick={nonaktifkan} className="shrink-0">Nonaktifkan</Button>
          </div>
          <button onClick={() => { setMode("idle"); setPassword(""); setErr(null); }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100">
            <X className="size-4" /> Batal
          </button>
        </div>
      )}
    </Card>
  );
}

function EditForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function simpan() {
    setErr(null);
    if (name.trim().length < 2) return setErr("Nama tidak boleh kosong.");
    if (password && password.length < 8) return setErr("Kata sandi baru minimal 8 karakter.");
    if (password && password !== password2) return setErr("Konfirmasi kata sandi tidak cocok.");
    setLoading(true);
    try {
      const payload: Record<string, string> = { name: name.trim(), phone: phone.trim() };
      if (password) payload.password = password;
      await api.patch("/profil", payload);
      onDone();
    } catch (e) { setErr(extractApiErrorMessage(e)); } finally { setLoading(false); }
  }

  return (
    <Card className="mt-4 flex flex-col gap-4 !p-5">
      <Input label="Nama Lengkap" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Nomor HP" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
      <div className="rounded-xl bg-navy-50/60 p-3">
        <p className="mb-2 text-xs font-semibold text-navy-500">Ubah Kata Sandi (opsional)</p>
        <div className="flex flex-col gap-3">
          <Input label="Kata Sandi Baru" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" />
          <Input label="Konfirmasi Kata Sandi" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
        </div>
      </div>
      {err && <p className="text-sm font-medium text-rose-600">{err}</p>}
      <div className="flex gap-2">
        <Button loading={loading} onClick={simpan} className="flex-1"><Check className="size-4" /> Simpan Perubahan</Button>
        <Button variant="outline" onClick={onCancel} disabled={loading}><X className="size-4" /> Batal</Button>
      </div>
    </Card>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="flex size-9 items-center justify-center rounded-xl bg-navy-50 text-navy-500">{icon}</span>
      <div>
        <p className="text-xs text-navy-400">{label}</p>
        <p className="text-sm font-semibold text-navy-900">{value}</p>
      </div>
    </div>
  );
}
