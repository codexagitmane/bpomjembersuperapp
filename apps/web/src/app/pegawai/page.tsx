"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  X,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  BadgeCheck,
  IdCard,
  Mail,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Pegawai {
  id: number;
  name: string;
  email: string;
  nip_nik: string | null;
  phone: string | null;
  jenis_pegawai: string | null;
  status_kepegawaian: string | null;
  status_label: string;
  jabatan: string | null;
  penugasan: string | null;
  role: string | null;
  is_active: boolean;
}

interface Ringkasan {
  status: string;
  label: string;
  jumlah: number;
}

interface Opsi {
  roles: string[];
  status_kepegawaian: { value: string; label: string }[];
  jenis_pegawai: string[];
}

const STATUS_ORDER = ["asn", "pppk", "outsourcing", "magang"];
const STATUS_TONE: Record<string, "info" | "success" | "warning" | "neutral"> = {
  asn: "info",
  pppk: "success",
  outsourcing: "warning",
  magang: "neutral",
};
const STATUS_ACCENT: Record<string, string> = {
  asn: "from-navy-500 to-navy-700",
  pppk: "from-bpom-400 to-bpom-600",
  outsourcing: "from-amber-400 to-amber-500",
  magang: "from-navy-300 to-navy-400",
  masyarakat: "from-sky-400 to-sky-600",
};

const emptyForm = {
  name: "",
  email: "",
  nip_nik: "",
  phone: "",
  role: "pegawai_asn_pppk",
  status_kepegawaian: "asn",
  jabatan: "",
  penugasan: "",
  jenis_pegawai: "pegawai",
  is_active: true,
};

export default function PegawaiPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "superadmin";

  const [items, setItems] = useState<Pegawai[]>([]);
  const [ringkasan, setRingkasan] = useState<Ringkasan[]>([]);
  const [totalPengguna, setTotalPengguna] = useState(0);
  const [opsi, setOpsi] = useState<Opsi | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pegawai | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordReveal, setPasswordReveal] = useState<{ name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/pegawai", { params: q ? { q } : {} });
      setItems(data.data ?? []);
      setRingkasan(data.ringkasan ?? []);
      setTotalPengguna(data.total_pengguna ?? 0);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (isAdmin) api.get("/pegawai/opsi").then(({ data }) => setOpsi(data));
  }, [isAdmin]);

  const filtered = useMemo(
    () => (filter ? items.filter((i) => i.status_kepegawaian === filter) : items),
    [items, filter]
  );

  const grouped = useMemo(() => {
    const map: Record<string, Pegawai[]> = {};
    for (const it of filtered) {
      const key = it.status_kepegawaian ?? "lainnya";
      (map[key] ??= []).push(it);
    }
    return STATUS_ORDER.filter((s) => map[s]?.length).map((s) => ({ status: s, list: map[s] }));
  }, [filtered]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(p: Pegawai) {
    setEditing(p);
    setForm({
      name: p.name,
      email: p.email,
      nip_nik: p.nip_nik ?? "",
      phone: p.phone ?? "",
      role: p.role ?? "pegawai_asn_pppk",
      status_kepegawaian: p.status_kepegawaian ?? "asn",
      jabatan: p.jabatan ?? "",
      penugasan: p.penugasan ?? "",
      jenis_pegawai: p.jenis_pegawai ?? "pegawai",
      is_active: p.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api.patch(`/pegawai/${editing.id}`, form);
      } else {
        const { data } = await api.post("/pegawai", form);
        if (data.generated_password) {
          setPasswordReveal({ name: form.name, password: data.generated_password });
        }
      }
      setModalOpen(false);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message ?? "Gagal menyimpan data. Cek kembali isian.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset(p: Pegawai) {
    if (!confirm(`Reset password untuk ${p.name}?`)) return;
    const { data } = await api.patch(`/pegawai/${p.id}/reset-password`);
    setPasswordReveal({ name: p.name, password: data.generated_password });
  }

  async function handleDelete(p: Pegawai) {
    if (!confirm(`Hapus pegawai ${p.name}? Tindakan ini dapat dibatalkan oleh sistem (soft delete).`)) return;
    await api.delete(`/pegawai/${p.id}`);
    await load();
  }

  return (
    <AppShell>
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Data Pegawai</h1>
          <p className="mt-1 text-sm text-navy-500">
            Direktori pengguna LENTERA — PNS, PPPK, Outsourcing, Magang &amp; Masyarakat.
          </p>
        </div>
        {isAdmin && (
          <Button variant="secondary" onClick={openCreate}>
            <Plus className="size-4" /> Tambah Pegawai
          </Button>
        )}
      </div>

      {/* Statistik: satu kartu besar total pengguna + kartu kategori di sampingnya */}
      <div className="mb-6 grid gap-3 lg:grid-cols-3">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setFilter("")}
          className={cn(
            "relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 text-left transition-all",
            "bg-gradient-to-br from-navy-900 to-navy-700 text-white",
            filter === "" ? "border-navy-900 shadow-md" : "border-transparent hover:shadow-md"
          )}
        >
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15">
            <Users className="size-5" />
          </div>
          <div className="mt-4">
            <p className="text-4xl font-extrabold tabular-nums">{totalPengguna}</p>
            <p className="mt-0.5 text-sm font-semibold text-white/80">Total Pengguna LENTERA</p>
            <p className="mt-1 text-[11px] text-white/60">Pegawai internal &amp; masyarakat terdaftar</p>
          </div>
        </motion.button>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-3">
          {ringkasan.map((r, i) => (
            <motion.button
              key={r.status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i + 1) * 0.05 }}
              onClick={() => setFilter(filter === r.status ? "" : r.status)}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-4 text-left transition-all",
                filter === r.status
                  ? "border-navy-900 shadow-md"
                  : "border-navy-900/5 hover:border-navy-200 hover:shadow-sm"
              )}
            >
              <div
                className={cn(
                  "mb-2.5 flex size-8 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                  STATUS_ACCENT[r.status] ?? "from-navy-300 to-navy-400"
                )}
              >
                <Users className="size-4" />
              </div>
              <p className="text-2xl font-extrabold tabular-nums text-navy-900">{r.jumlah}</p>
              <p className="text-xs font-semibold text-navy-500">{r.label}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-navy-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, NIP, email, atau jabatan…"
            className="w-full rounded-xl border border-navy-200 bg-white py-2.5 pl-10 pr-4 text-sm text-navy-900 placeholder:text-navy-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200"
          />
        </div>
        {filter && (
          <button
            onClick={() => setFilter("")}
            className="flex items-center gap-1.5 rounded-xl bg-navy-50 px-3 py-2 text-sm font-semibold text-navy-600 hover:bg-navy-100"
          >
            <X className="size-3.5" /> Hapus filter
          </button>
        )}
        <span className="text-sm font-medium text-navy-400">{filtered.length} pegawai</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-navy-100/50" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((g) => (
            <section key={g.status}>
              <div className="mb-3 flex items-center gap-2.5">
                <span className={cn("h-5 w-1.5 rounded-full bg-gradient-to-b", STATUS_ACCENT[g.status])} />
                <h2 className="text-sm font-bold uppercase tracking-wide text-navy-700">
                  {g.list[0].status_label}
                </h2>
                <Badge tone={STATUS_TONE[g.status]}>{g.list.length}</Badge>
              </div>

              <Card className="!p-0 overflow-hidden">
                {/* Mobile: daftar kartu (ramah layar sempit) */}
                <div className="divide-y divide-navy-900/5 md:hidden">
                  {g.list.map((p) => (
                    <div key={p.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy-100 to-navy-200 text-sm font-bold text-navy-700">
                          {p.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-navy-900">{p.name}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-navy-400">
                            <Mail className="size-3 shrink-0" /> {p.email}
                          </p>
                        </div>
                        {p.is_active ? (
                          <Badge tone="success">
                            <BadgeCheck className="mr-1 size-3" /> Aktif
                          </Badge>
                        ) : (
                          <Badge tone="danger">Nonaktif</Badge>
                        )}
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <div className="min-w-0 text-xs text-navy-500">
                          <p className="font-mono">{p.nip_nik ?? "—"}</p>
                          <p className="truncate">{p.jabatan ?? "—"}</p>
                        </div>
                        {isAdmin && (
                          <div className="flex shrink-0 items-center gap-1">
                            <IconBtn title="Edit" onClick={() => openEdit(p)}>
                              <Pencil className="size-4" />
                            </IconBtn>
                            <IconBtn title="Reset password" onClick={() => handleReset(p)}>
                              <KeyRound className="size-4" />
                            </IconBtn>
                            <IconBtn title="Hapus" danger onClick={() => handleDelete(p)}>
                              <Trash2 className="size-4" />
                            </IconBtn>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: tabel */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-navy-900/5 bg-navy-50/50 text-xs uppercase tracking-wide text-navy-500">
                        <th className="px-4 py-3 font-semibold">Nama</th>
                        <th className="px-4 py-3 font-semibold">NIP / NIK</th>
                        <th className="px-4 py-3 font-semibold">Jabatan</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        {isAdmin && <th className="px-4 py-3 text-right font-semibold">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {g.list.map((p) => (
                        <tr key={p.id} className="border-b border-navy-900/5 last:border-0 hover:bg-navy-50/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy-100 to-navy-200 text-xs font-bold text-navy-700">
                                {p.name.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-navy-900">{p.name}</p>
                                <p className="flex items-center gap-1 truncate text-xs text-navy-400">
                                  <Mail className="size-3" /> {p.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-navy-600">{p.nip_nik ?? "—"}</td>
                          <td className="px-4 py-3 text-navy-600">{p.jabatan ?? "—"}</td>
                          <td className="px-4 py-3">
                            {p.is_active ? (
                              <Badge tone="success">
                                <BadgeCheck className="mr-1 size-3" /> Aktif
                              </Badge>
                            ) : (
                              <Badge tone="danger">Nonaktif</Badge>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <IconBtn title="Edit" onClick={() => openEdit(p)}>
                                  <Pencil className="size-4" />
                                </IconBtn>
                                <IconBtn title="Reset password" onClick={() => handleReset(p)}>
                                  <KeyRound className="size-4" />
                                </IconBtn>
                                <IconBtn title="Hapus" danger onClick={() => handleDelete(p)}>
                                  <Trash2 className="size-4" />
                                </IconBtn>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          ))}

          {grouped.length === 0 && (
            <Card className="flex flex-col items-center gap-3 py-16 text-center">
              <Users className="size-10 text-navy-200" />
              <p className="font-semibold text-navy-700">Tidak ada pegawai ditemukan</p>
              <p className="text-sm text-navy-400">Coba ubah kata kunci pencarian atau filter.</p>
            </Card>
          )}
        </div>
      )}

      {/* Modal form */}
      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title={editing ? "Edit Pegawai" : "Tambah Pegawai"}>
          <form onSubmit={submitForm} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Nama Lengkap" required>
                <input className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormField>
              <FormField label="Email" required>
                <input type="email" className={inputCls} required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </FormField>
              <FormField label="NIP / NIK">
                <input className={inputCls} value={form.nip_nik} onChange={(e) => setForm({ ...form, nip_nik: e.target.value })} />
              </FormField>
              <FormField label="No. HP">
                <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </FormField>
              <FormField label="Status Kepegawaian">
                <select className={inputCls} value={form.status_kepegawaian} onChange={(e) => setForm({ ...form, status_kepegawaian: e.target.value })}>
                  {(opsi?.status_kepegawaian ?? []).map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Peran (Role)">
                <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {(opsi?.roles ?? []).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Jabatan">
                <input className={inputCls} value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} />
              </FormField>
              <FormField label="Penugasan / Unit">
                <input className={inputCls} value={form.penugasan} onChange={(e) => setForm({ ...form, penugasan: e.target.value })} />
              </FormField>
            </div>

            {!editing && (
              <p className="flex items-center gap-2 rounded-xl bg-bpom-50 px-3.5 py-2.5 text-xs font-medium text-bpom-700">
                <KeyRound className="size-3.5" /> Password akan di-generate otomatis &amp; ditampilkan setelah disimpan.
              </p>
            )}

            {formError && (
              <div className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600">{formError}</div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button type="submit" variant="secondary" loading={saving}>
                {editing ? "Simpan Perubahan" : "Tambah Pegawai"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Password reveal */}
      {passwordReveal && (
        <Modal onClose={() => setPasswordReveal(null)} title="Password Pegawai">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-bpom-50 p-3.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-bpom-600 text-white">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">{passwordReveal.name}</p>
                <p className="text-xs text-navy-500">Simpan/salin sekarang — password tidak ditampilkan lagi.</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-navy-200 bg-navy-50 px-4 py-3">
              <code className="font-mono text-lg font-bold tracking-wider text-navy-900">{passwordReveal.password}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(passwordReveal.password);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Tersalin" : "Salin"}
              </button>
            </div>
            <Button variant="secondary" className="w-full" onClick={() => setPasswordReveal(null)}>Selesai</Button>
          </div>
        </Modal>
      )}
    </div>
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200";

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-navy-600">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function IconBtn({
  children,
  title,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg transition-colors",
        danger ? "text-rose-500 hover:bg-rose-50" : "text-navy-500 hover:bg-navy-100 hover:text-navy-900"
      )}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <IdCard className="size-5 text-bpom-600" /> {title}
          </h3>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50">
            <X className="size-4.5" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
