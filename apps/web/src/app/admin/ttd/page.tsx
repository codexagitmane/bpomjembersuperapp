"use client";

import { useCallback, useEffect, useState } from "react";
import { QrCode, Search, Trash2, RefreshCw, ShieldOff, Pencil } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface Row {
  user_id: number;
  name: string;
  nip_nik: string | null;
  jabatan: string | null;
  kode: string | null;
  is_active: boolean;
  aktif_terdaftar: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function TtdAdminPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [preview, setPreview] = useState<Row | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/tanda-tangan");
      setRows(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function simpan(r: Row, is_active: boolean, jabatan?: string) {
    setBusy(r.user_id);
    try {
      await api.post("/admin/tanda-tangan", { user_id: r.user_id, jabatan: jabatan ?? r.jabatan, is_active });
      await load();
    } finally {
      setBusy(null);
    }
  }
  function editJabatan(r: Row) {
    const j = window.prompt("Jabatan untuk tanda tangan:", r.jabatan ?? "");
    if (j === null) return;
    simpan(r, r.is_active, j);
  }
  async function hapus(r: Row) {
    if (!confirm(`Hapus tanda tangan ${r.name}?`)) return;
    setBusy(r.user_id);
    try {
      await api.delete(`/admin/tanda-tangan/${r.user_id}`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (user && user.role !== "superadmin") {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <ShieldOff className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Halaman ini khusus Superadmin.</p>
        </Card>
      </AppShell>
    );
  }

  const filtered = rows.filter(
    (r) => r.name.toLowerCase().includes(q.toLowerCase()) || (r.nip_nik ?? "").includes(q)
  );

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy-900 sm:text-2xl">
          <QrCode className="size-6 shrink-0 text-bpom-600" /> Daftar Tanda Tangan
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Kelola barcode/QR tanda tangan pegawai. QR yang dipindai menampilkan Nama, NIP, dan Jabatan.
        </p>

        <div className="relative mt-5">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama / NIP…"
            className="w-full rounded-xl border border-navy-900/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-bpom-500"
          />
        </div>

        <div className="mt-4 space-y-2.5">
          {loading && [...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-navy-100/60" />)}
          {filtered.map((r) => (
            <Card key={r.user_id} className="!p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-navy-900">{r.name}</p>
                    {r.aktif_terdaftar ? (
                      <Badge tone={r.is_active ? "success" : "neutral"}>{r.is_active ? "Aktif" : "Nonaktif"}</Badge>
                    ) : (
                      <Badge tone="neutral">Belum ada</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-navy-400">
                    {r.nip_nik ?? "—"} • {r.jabatan ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {r.aktif_terdaftar && r.kode && (
                    <button onClick={() => setPreview(r)} className="flex size-9 items-center justify-center rounded-lg text-navy-600 hover:bg-navy-50" title="Lihat QR">
                      <QrCode className="size-4.5" />
                    </button>
                  )}
                  {!r.aktif_terdaftar ? (
                    <Button size="sm" loading={busy === r.user_id} onClick={() => simpan(r, true)}>Buat TTD</Button>
                  ) : (
                    <>
                      <button onClick={() => editJabatan(r)} disabled={busy === r.user_id} title="Edit jabatan" className="flex size-9 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-50">
                        <Pencil className="size-4" />
                      </button>
                      <button onClick={() => simpan(r, !r.is_active)} disabled={busy === r.user_id} className="flex items-center gap-1 rounded-lg border border-navy-900/10 px-2.5 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50">
                        <RefreshCw className="size-3.5" /> {r.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button onClick={() => hapus(r)} disabled={busy === r.user_id} className="flex size-9 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50">
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {preview && preview.kode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={() => setPreview(null)}>
          <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-xs rounded-3xl bg-background p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-navy-900">{preview.name}</p>
            <p className="text-xs text-navy-400">{preview.jabatan ?? "—"}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${API}/publik/ttd/${preview.kode}/qr`} alt="QR TTD" className="mx-auto mt-4 size-48" />
            <p className="mt-3 break-all font-mono text-[11px] text-navy-400">{preview.kode}</p>
            <button onClick={() => setPreview(null)} className={cn("mt-4 w-full rounded-2xl bg-navy-900 py-2.5 text-sm font-bold text-white")}>Tutup</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
