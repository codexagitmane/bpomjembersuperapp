"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PackageOpen,
  ChevronDown,
  Package,
  Boxes,
  AlertTriangle,
  CalendarClock,
  Plus,
  Trash2,
  Pencil,
  FileDown,
  Check,
  X,
  Send,
  Search,
  RotateCcw,
  ArrowDownToLine,
  ClipboardList,
  Warehouse,
  FileUp,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { extractApiErrorMessage } from "@bpom/shared";
import { formatTanggalIndonesia, cn } from "@/lib/utils";

interface Item {
  id: number;
  nama: string;
  kategori: string;
  kelompok?: string;
  satuan: string;
  lokasi?: string | null;
  stok: number;
  stok_minimum: number;
  menipis: boolean;
  tanggal_kedaluwarsa: string | null;
  sisa_hari_kedaluwarsa: number | null;
  status_kedaluwarsa: string | null;
  keterangan: string | null;
}
interface Ringkasan {
  total: number;
  stok_menipis: number;
  kedaluwarsa: number;
}
interface PermintaanItem {
  nama: string;
  jumlah: number;
  jumlah_disetujui?: number;
  satuan: string;
  ditolak?: boolean;
  keterangan?: string | null;
}
interface Permintaan {
  id: number;
  nomor: string;
  user: { id: number; name: string } | null;
  items: PermintaanItem[];
  keperluan: string;
  unit_kerja: string | null;
  status: string;
  alasan_tolak: string | null;
  justifikasi: string | null;
  ketua_tim: string | null;
  ketua_tim_id: number | null;
  ketua_tim_fungsi: string | null;
  approved_katim: string | null;
  approved_gudang: string | null;
  approved_kasubag: string | null;
  approved_katim_id: number | null;
  approved_gudang_id: number | null;
  approved_kasubag_id: number | null;
  created_at: string;
}

const KATEGORI_LABEL: Record<string, string> = {
  atk: "ATK", reagen: "Reagen", test_kit: "Test Kit", alat: "Alat", lainnya: "Lainnya",
};
const STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  diajukan: { label: "Menunggu Ketua Tim", tone: "warning" },
  disetujui_katim: { label: "Menunggu Kasubag TU", tone: "info" },
  disetujui_kasubag: { label: "Menunggu Pengelola Gudang", tone: "info" },
  disetujui_gudang: { label: "Menunggu Kasubag TU", tone: "info" }, // legacy data lama
  disetujui: { label: "Disetujui", tone: "success" },
  ditolak: { label: "Ditolak", tone: "danger" },
};

export default function PersediaanBmnPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"katalog" | "ajukan" | "permintaan" | "masuk" | "opname">("katalog");
  const [items, setItems] = useState<Item[]>([]);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [permintaan, setPermintaan] = useState<Permintaan[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [approving, setApproving] = useState<Permintaan | null>(null);
  // Filter katalog & stok.
  const [fNama, setFNama] = useState("");
  const [fJenis, setFJenis] = useState("");
  const [fMenipis, setFMenipis] = useState(false);
  const [fKedaluwarsa, setFKedaluwarsa] = useState(false);

  const itemsFiltered = items.filter((it) =>
    it.nama.toLowerCase().includes(fNama.toLowerCase()) &&
    (!fJenis || (it.kelompok ?? "") === fJenis) &&
    (!fMenipis || it.menipis) &&
    (!fKedaluwarsa || it.status_kedaluwarsa === "mendekati" || it.status_kedaluwarsa === "kadaluarsa"));
  const [katPage, setKatPage] = useState(1);
  useEffect(() => { setKatPage(1); }, [fNama, fJenis, fMenipis, fKedaluwarsa]);
  const itemsPaged = itemsFiltered.slice((katPage - 1) * 10, katPage * 10);

  const isSuper = user?.role === "superadmin";
  const isKasubag = user?.role === "kepala_subag_tu" || isSuper;
  const isGudang = !!user?.is_pengelola_gudang || isSuper;

  // Alur: Pegawai → Ketua Tim (dipilih pemohon) → Kasubag TU → Pengelola Gudang (TTD terakhir).
  // Tombol mengikuti tahap saat ini; hilang otomatis saat tahap berpindah.
  function canAct(p: Permintaan): boolean {
    // Tahap-1 hanya boleh oleh Ketua Tim yang dipilih (fallback ke Kasubag utk data lama).
    if (p.status === "diajukan") return (p.ketua_tim_id ? user?.id === p.ketua_tim_id : isKasubag) || isSuper;
    if (p.status === "disetujui_katim") return isKasubag; // Kasubag TU
    if (p.status === "disetujui_kasubag" || p.status === "disetujui_gudang") return isGudang; // Pengelola Gudang (final)
    return false;
  }
  const menungguSaya = permintaan.filter(canAct).length;

  const load = useCallback(async () => {
    try {
      const [kat, perm] = await Promise.all([
        api.get("/persediaan-bmn/katalog"),
        api.get("/persediaan-bmn/permintaan"),
      ]);
      setItems(kat.data.data ?? []);
      setRingkasan(kat.data.ringkasan ?? null);
      setCanManage(!!kat.data.can_manage);
      setPermintaan(perm.data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function putuskan(
    id: number,
    aksi: "setujui" | "tolak",
    opts?: { alasan?: string; keputusan?: { jumlah_disetujui: number; ditolak: boolean; keterangan: string | null }[] }
  ) {
    setActingId(id);
    setMsg(null);
    try {
      const { data } = await api.patch(`/persediaan-bmn/permintaan/${id}/putuskan`, {
        aksi,
        alasan: opts?.alasan,
        keputusan: opts?.keputusan,
      });
      setMsg(data.message);
      setApproving(null);
      await load();
    } catch (err) {
      setMsg(extractApiErrorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  function tolakSemua(id: number) {
    const alasan = window.prompt("Alasan penolakan seluruh permintaan:");
    if (alasan === null) return;
    putuskan(id, "tolak", { alasan: alasan || undefined });
  }

  async function hapusItem(id: number) {
    if (!confirm("Hapus item persediaan ini?")) return;
    await api.delete(`/persediaan-bmn/${id}`).catch(() => {});
    await load();
  }

  async function unduh(p: Permintaan, jenis: "spb" | "sbbk") {
    try {
      const res = await api.get(`/persediaan-bmn/permintaan/${p.id}/${jenis}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${jenis.toUpperCase()}-${p.nomor.replaceAll("/", "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const blob = (err as { response?: { data?: unknown } })?.response?.data;
      if (blob instanceof Blob) {
        try {
          const j = JSON.parse(await blob.text());
          setMsg(j.message ?? `Gagal mengunduh ${jenis.toUpperCase()}.`);
          return;
        } catch {}
      }
      setMsg(`Gagal mengunduh ${jenis.toUpperCase()}.`);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy-900 sm:text-2xl">
          <PackageOpen className="size-6 shrink-0 text-bpom-600" /> Persediaan BMN
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Permintaan persediaan, monitoring stok &amp; kedaluwarsa reagen/test kit, persetujuan berjenjang.
        </p>

        <div className="mt-5 flex gap-1 overflow-x-auto rounded-2xl border border-navy-900/5 bg-white p-1.5 shadow-sm scrollbar-none">
          {(["katalog", "ajukan", "permintaan", ...(canManage ? (["masuk", "opname"] as const) : [])] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative flex shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all sm:flex-1",
                tab === t ? "bg-navy-900 text-white shadow-sm" : "text-navy-500 hover:bg-navy-50"
              )}
            >
              {t === "katalog" ? "Katalog & Stok" : t === "ajukan" ? "Pengajuan" : t === "permintaan" ? "Permintaan" : t === "masuk" ? "Transaksi Masuk" : "Stock Opname"}
              {t === "permintaan" && menungguSaya > 0 && (
                <span className="flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                  {menungguSaya}
                </span>
              )}
            </button>
          ))}
        </div>

        {msg && <div className="mt-4 rounded-xl bg-navy-50 px-4 py-3 text-sm font-medium text-navy-700">{msg}</div>}

        {/* KATALOG */}
        {tab === "katalog" && (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-3">
              <MiniStat icon={<Boxes className="size-4.5" />} label="Total Item" value={ringkasan?.total ?? 0} tone="navy" />
              <MiniStat icon={<AlertTriangle className="size-4.5" />} label="Stok Menipis" value={ringkasan?.stok_menipis ?? 0} tone="amber" />
              <MiniStat icon={<CalendarClock className="size-4.5" />} label="Kedaluwarsa" value={ringkasan?.kedaluwarsa ?? 0} tone="rose" />
            </div>

            {/* Filter bar */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
                <input value={fNama} onChange={(e) => setFNama(e.target.value)} placeholder="Cari nama item…"
                  className="w-full rounded-xl border border-navy-900/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-bpom-500" />
              </div>
              <select value={fJenis} onChange={(e) => setFJenis(e.target.value)}
                className="rounded-xl border border-navy-900/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-bpom-500">
                <option value="">Semua Jenis</option>
                <option value="atk">ATK</option>
                <option value="psd">Persediaan</option>
              </select>
              <FilterToggle active={fMenipis} onClick={() => setFMenipis((v) => !v)} tone="amber">Stok Menipis</FilterToggle>
              <FilterToggle active={fKedaluwarsa} onClick={() => setFKedaluwarsa((v) => !v)} tone="rose">Segera Kedaluwarsa</FilterToggle>
              {canManage && (
                <Button size="sm" onClick={() => { setEditItem(null); setShowItemForm(true); }} className="ml-auto">
                  <Plus className="size-4" /> Tambah Item
                </Button>
              )}
            </div>

            {/* Datatable */}
            <div className="mt-3 overflow-hidden rounded-2xl border border-navy-900/5 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-navy-900/10 bg-navy-50/60 text-left text-xs uppercase tracking-wide text-navy-500">
                      <th className="px-4 py-3 font-bold">Nama Item</th>
                      <th className="px-4 py-3 font-bold">Kategori</th>
                      <th className="px-4 py-3 font-bold">Jenis</th>
                      <th className="px-4 py-3 font-bold">Lokasi</th>
                      <th className="px-4 py-3 text-right font-bold">Stok</th>
                      <th className="px-4 py-3 font-bold">Kedaluwarsa</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      {canManage && <th className="px-4 py-3 text-right font-bold">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-900/5">
                    {loading && [...Array(5)].map((_, i) => <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-navy-100/60" /></td></tr>)}
                    {!loading && itemsFiltered.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-navy-400">
                        {items.length === 0 ? "Belum ada item persediaan." : "Tidak ada item yang cocok dengan filter."}
                      </td></tr>
                    )}
                    {itemsPaged.map((it) => (
                      <tr key={it.id} className="hover:bg-navy-50/40">
                        <td className="px-4 py-3 font-semibold text-navy-900">{it.nama}</td>
                        <td className="px-4 py-3"><Badge tone="neutral">{KATEGORI_LABEL[it.kategori] ?? it.kategori}</Badge></td>
                        <td className="px-4 py-3 text-navy-600">{(it.kelompok ?? "").toUpperCase() === "ATK" ? "ATK" : it.kelompok ? "Persediaan" : "—"}</td>
                        <td className="px-4 py-3 text-navy-600">{it.lokasi || "—"}</td>
                        <td className={cn("px-4 py-3 text-right tabular-nums font-semibold", it.menipis ? "text-amber-600" : "text-navy-800")}>
                          {it.stok} <span className="text-xs font-normal text-navy-400">{it.satuan} • min {it.stok_minimum}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-navy-500">
                          {it.tanggal_kedaluwarsa ? (
                            <>{formatTanggalIndonesia(it.tanggal_kedaluwarsa)}
                              {it.sisa_hari_kedaluwarsa !== null && <span className="text-navy-400"> ({it.sisa_hari_kedaluwarsa < 0 ? `lewat ${Math.abs(it.sisa_hari_kedaluwarsa)} hari` : `${it.sisa_hari_kedaluwarsa} hari lagi`})</span>}</>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {it.menipis && <Badge tone="warning">Menipis</Badge>}
                            {it.status_kedaluwarsa === "kadaluarsa" && <Badge tone="danger">Kadaluarsa</Badge>}
                            {it.status_kedaluwarsa === "mendekati" && <Badge tone="warning">Segera KL</Badge>}
                            {!it.menipis && it.status_kedaluwarsa !== "kadaluarsa" && it.status_kedaluwarsa !== "mendekati" && <Badge tone="success">Aman</Badge>}
                          </div>
                        </td>
                        {canManage && (
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => { setEditItem(it); setShowItemForm(true); }} className="flex size-8 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-100"><Pencil className="size-4" /></button>
                              <button onClick={() => hapusItem(it.id)} className="flex size-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="size-4" /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginator page={katPage} setPage={setKatPage} total={itemsFiltered.length} />
            </div>
            <p className="mt-2 text-right text-xs text-navy-400">{itemsFiltered.length} dari {items.length} item</p>
          </div>
        )}

        {/* AJUKAN */}
        {tab === "ajukan" && <FormAjukan catalog={items} onDone={() => { setTab("permintaan"); load(); }} setMsg={setMsg} />}

        {/* PERMINTAAN */}
        {tab === "permintaan" && (
          <div className="mt-4 space-y-3">
            {loading && [...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-navy-100/60" />)}
            {!loading && permintaan.length === 0 && (
              <Card className="py-12 text-center text-sm text-navy-400">Belum ada permintaan persediaan.</Card>
            )}
            {permintaan.map((p) => (
              <Card key={p.id} className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-xs font-bold text-navy-500">{p.nomor}</p>
                      <Badge tone={STATUS[p.status]?.tone ?? "neutral"}>{STATUS[p.status]?.label ?? p.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-navy-900">{p.user?.name}</p>
                    <p className="text-xs text-navy-400">{formatTanggalIndonesia(p.created_at)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => unduh(p, "spb")} className="flex items-center gap-1.5 rounded-lg border border-navy-900/10 px-2.5 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50">
                      <FileDown className="size-3.5" /> SPB
                    </button>
                    {p.status === "disetujui" && (
                      <button onClick={() => unduh(p, "sbbk")} className="flex items-center gap-1.5 rounded-lg border border-bpom-200 bg-bpom-50 px-2.5 py-1.5 text-xs font-semibold text-bpom-700 hover:bg-bpom-100">
                        <FileDown className="size-3.5" /> SBBK
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2 rounded-xl bg-navy-50/60 p-3">
                  {p.ketua_tim && (
                    <p className="mb-1.5 text-xs font-semibold text-navy-500">
                      Ketua Tim: <span className="text-navy-700">{p.ketua_tim}</span>
                      {p.ketua_tim_fungsi ? <span className="text-navy-400"> ({p.ketua_tim_fungsi})</span> : null}
                    </p>
                  )}
                  <p className="mb-1.5 text-xs font-semibold text-navy-500">Keperluan: {p.keperluan}</p>
                  <ul className="space-y-1 text-sm">
                    {p.items.map((it, i) => {
                      const decided = p.status !== "diajukan";
                      const acc = it.jumlah_disetujui ?? it.jumlah;
                      const rejected = !!it.ditolak;
                      const approved = decided && !rejected;
                      return (
                        <li key={i} className={cn("flex items-start justify-between gap-2 rounded-lg px-2.5 py-1.5",
                          rejected ? "bg-rose-500/10" : approved ? "bg-bpom-50" : "bg-navy-50/60")}>
                          <div className="min-w-0">
                            <span className={cn("font-medium", rejected ? "text-rose-600 line-through" : approved ? "text-bpom-700" : "text-navy-700")}>{it.nama}</span>
                            {it.keterangan && (
                              <p className={cn("text-[11px]", rejected ? "text-rose-500" : "text-navy-400")}>
                                {rejected ? "Alasan: " : ""}{it.keterangan}
                              </p>
                            )}
                          </div>
                          <span className={cn("shrink-0 tabular-nums text-xs font-semibold", rejected ? "text-rose-500" : approved ? "text-bpom-600" : "text-navy-500")}>
                            {rejected ? "Ditolak" : decided && acc !== it.jumlah ? `${acc}/${it.jumlah} ${it.satuan}` : `${it.jumlah} ${it.satuan}`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Jejak persetujuan */}
                {(p.approved_katim || p.approved_gudang || p.approved_kasubag) && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-navy-400">
                    {p.approved_katim && <span>✓ Ketua Tim: {p.approved_katim}</span>}
                    {p.approved_kasubag && <span>✓ Kasubag TU: {p.approved_kasubag}</span>}
                    {p.approved_gudang && <span>✓ Pengelola Gudang: {p.approved_gudang}</span>}
                  </div>
                )}

                {p.status === "ditolak" && p.alasan_tolak && (
                  <p className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-600">
                    Ditolak: {p.alasan_tolak}
                  </p>
                )}

                {/* Aksi pimpinan — muncul hanya bila boleh bertindak di tahap saat ini */}
                {canAct(p) && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="secondary" disabled={actingId === p.id} onClick={() => setApproving(p)}>
                      <Check className="size-4" /> Setujui & TTD
                    </Button>
                    <Button size="sm" variant="danger" disabled={actingId === p.id} onClick={() => tolakSemua(p.id)}>
                      <X className="size-4" /> Tolak Semua
                    </Button>
                  </div>
                )}

                {/* Revisi oleh pemohon */}
                {p.status === "ditolak" && p.user?.id === user?.id && (
                  <RevisiForm p={p} catalog={items} onDone={() => { setMsg("Permintaan diajukan ulang."); load(); }} />
                )}
              </Card>
            ))}
          </div>
        )}

        {/* TRANSAKSI MASUK & STOCK OPNAME (khusus pengelola gudang) */}
        {tab === "masuk" && canManage && <TransaksiMasukTab catalog={items} setMsg={setMsg} onChanged={load} />}
        {tab === "opname" && canManage && <StockOpnameTab catalog={items} />}

        {showItemForm && (
          <ItemFormModal
            item={editItem}
            onClose={() => setShowItemForm(false)}
            onSaved={() => { setShowItemForm(false); load(); }}
          />
        )}

        {approving && (
          <ApprovalModal
            permintaan={approving}
            loading={actingId === approving.id}
            onClose={() => setApproving(null)}
            onSubmit={(keputusan) => putuskan(approving.id, "setujui", { keputusan })}
          />
        )}
      </div>
    </AppShell>
  );
}

function ApprovalModal({
  permintaan,
  loading,
  onClose,
  onSubmit,
}: {
  permintaan: Permintaan;
  loading: boolean;
  onClose: () => void;
  onSubmit: (keputusan: { jumlah_disetujui: number; ditolak: boolean; keterangan: string | null }[]) => void;
}) {
  const [rows, setRows] = useState(
    permintaan.items.map((it) => ({
      jumlah: it.jumlah,
      jumlah_disetujui: it.jumlah_disetujui ?? it.jumlah,
      ditolak: it.ditolak ?? false,
      keterangan: it.keterangan ?? "",
    }))
  );

  function set(i: number, patch: Partial<(typeof rows)[number]>) {
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl">
        <div className="border-b border-navy-900/5 p-5">
          <h3 className="text-lg font-extrabold text-navy-900">Persetujuan & Tanda Tangan</h3>
          <p className="text-xs text-navy-400">Setujui sebagian / tolak sebagian barang, lalu tanda tangani.</p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {permintaan.items.map((it, i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl border p-3 transition-colors",
                rows[i].ditolak ? "border-rose-200 bg-rose-500/5" : "border-navy-900/10 bg-white"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy-900">{it.nama}</p>
                  <p className="text-xs text-navy-400">Diminta: {it.jumlah} {it.satuan}</p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-semibold text-rose-600">
                  <input type="checkbox" checked={rows[i].ditolak} onChange={(e) => set(i, { ditolak: e.target.checked })} className="size-4 accent-rose-500" />
                  Tolak
                </label>
              </div>
              {!rows[i].ditolak ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-medium text-navy-500">Disetujui:</span>
                  <input
                    type="number"
                    min={0}
                    max={it.jumlah}
                    value={rows[i].jumlah_disetujui}
                    onChange={(e) => set(i, { jumlah_disetujui: Math.min(it.jumlah, Number(e.target.value) || 0) })}
                    className="w-20 rounded-lg border border-navy-900/10 bg-white px-2 py-1.5 text-center text-sm outline-none focus:border-bpom-500"
                  />
                  <span className="text-xs text-navy-400">{it.satuan}</span>
                </div>
              ) : (
                <input
                  value={rows[i].keterangan}
                  onChange={(e) => set(i, { keterangan: e.target.value })}
                  placeholder="Alasan penolakan barang ini…"
                  className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-rose-400"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-navy-900/5 p-5">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-navy-100 py-3 text-sm font-bold text-navy-600">Batal</button>
          <Button
            loading={loading}
            className="flex-1"
            onClick={() =>
              onSubmit(
                rows.map((r) => ({
                  jumlah_disetujui: r.ditolak ? 0 : r.jumlah_disetujui,
                  ditolak: r.ditolak,
                  keterangan: r.ditolak ? r.keterangan || "Ditolak" : null,
                }))
              )
            }
          >
            <Check className="size-4" /> Setujui &amp; TTD
          </Button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "navy" | "amber" | "rose" }) {
  const c = { navy: "bg-navy-50 text-navy-600", amber: "bg-amber-500/10 text-amber-600", rose: "bg-rose-500/10 text-rose-600" }[tone];
  return (
    <Card className="!p-3.5">
      <div className={cn("mb-2 inline-flex size-8 items-center justify-center rounded-lg", c)}>{icon}</div>
      <p className="text-xl font-extrabold tabular-nums text-navy-900">{value}</p>
      <p className="text-[11px] font-semibold text-navy-500">{label}</p>
    </Card>
  );
}

function FilterToggle({ active, onClick, tone, children }: { active: boolean; onClick: () => void; tone: "amber" | "rose"; children: React.ReactNode }) {
  const on = tone === "amber" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-rose-300 bg-rose-50 text-rose-700";
  return (
    <button onClick={onClick} className={cn("rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
      active ? on : "border-navy-900/10 bg-white text-navy-500 hover:bg-navy-50")}>
      {children}
    </button>
  );
}

const KATEGORI_DOT: Record<string, string> = {
  atk: "bg-sky-500", reagen: "bg-violet-500", test_kit: "bg-amber-500", alat: "bg-teal-500", lainnya: "bg-navy-400",
};

function BarangCombobox({ catalog, value, onSelect }: { catalog: Item[]; value: string; onSelect: (nama: string, satuan?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Buka ke atas bila ruang di bawah sempit — agar tidak terpotong.
  function openMenu() {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setDropUp(window.innerHeight - rect.bottom < 300);
    setOpen(true);
  }

  const filtered = catalog.filter((c) => c.nama.toLowerCase().includes(query.toLowerCase())).slice(0, 8);

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); onSelect(e.target.value); openMenu(); }}
          onFocus={openMenu}
          placeholder="Cari / pilih barang"
          className="w-full rounded-xl border border-navy-900/10 bg-white py-2 pl-3 pr-8 text-sm outline-none transition focus:border-bpom-500 focus:ring-2 focus:ring-bpom-500/20"
        />
        <ChevronDown className={cn("pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-navy-300 transition-transform", open && "rotate-180")} />
      </div>
      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute z-30 max-h-64 w-full overflow-auto rounded-2xl border border-navy-900/10 bg-white p-1.5 shadow-xl shadow-navy-900/10 scrollbar-none",
              dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
            )}
          >
            {filtered.map((c, idx) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                <button
                  type="button"
                  onClick={() => { onSelect(c.nama, c.satuan); setQuery(c.nama); setOpen(false); }}
                  className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-bpom-50"
                >
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-white transition-transform group-hover:scale-110", KATEGORI_DOT[c.kategori] ?? "bg-navy-400")}>
                    <Package className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-navy-900">{c.nama}</span>
                    <span className="block truncate text-[11px] text-navy-400">
                      {KATEGORI_LABEL[c.kategori] ?? c.kategori} • stok {c.stok} {c.satuan}
                    </span>
                  </span>
                  {c.menipis && <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">menipis</span>}
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

interface KetuaTim { id: number; name: string; fungsi: string; fungsi_label: string }
function FormAjukan({ catalog, onDone, setMsg }: { catalog: Item[]; onDone: () => void; setMsg: (m: string) => void }) {
  const [keperluan, setKeperluan] = useState("");
  const [rows, setRows] = useState([{ nama: "", jumlah: 1, satuan: "unit" }]);
  const [ketuaTimList, setKetuaTimList] = useState<KetuaTim[]>([]);
  const [ketuaTimId, setKetuaTimId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get("/persediaan-bmn/ketua-tim").then(({ data }) => setKetuaTimList(data.data ?? [])).catch(() => {});
  }, []);

  function setRow(i: number, patch: Partial<{ nama: string; jumlah: number; satuan: string }>) {
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const list = rows.filter((r) => r.nama.trim() && r.jumlah > 0);
    if (keperluan.trim().length < 5) return setErr("Keperluan minimal 5 karakter.");
    if (!ketuaTimId) return setErr("Pilih Ketua Tim penyetuju terlebih dahulu.");
    if (list.length === 0) return setErr("Tambahkan minimal satu barang.");
    setLoading(true);
    try {
      await api.post("/persediaan-bmn/permintaan", { keperluan, ketua_tim_id: Number(ketuaTimId), items: list });
      setMsg("Permintaan berhasil diajukan.");
      onDone();
    } catch (e2) {
      setErr(extractApiErrorMessage(e2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <Card className="!p-4">
        <label className="text-sm font-semibold text-navy-700">Ketua Tim Penyetuju</label>
        <p className="text-xs text-navy-400">Permintaan akan disetujui &amp; ditandatangani oleh Ketua Tim fungsi yang Anda pilih.</p>
        <select
          value={ketuaTimId}
          onChange={(e) => setKetuaTimId(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-bpom-500"
        >
          <option value="">— pilih Ketua Tim —</option>
          {ketuaTimList.map((k) => (
            <option key={k.id} value={k.id}>{k.name} — {k.fungsi_label}</option>
          ))}
        </select>

        <label className="mt-4 block text-sm font-semibold text-navy-700">Keperluan</label>
        <textarea
          value={keperluan}
          onChange={(e) => setKeperluan(e.target.value)}
          rows={2}
          placeholder="Contoh: Kebutuhan pengujian sampel lapangan bulan ini"
          className="mt-1.5 w-full rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-bpom-500"
        />

        <p className="mt-4 text-sm font-semibold text-navy-700">Daftar Barang</p>
        <p className="text-xs text-navy-400">Pilih dari katalog (ketik untuk mencari) — satuan mengikuti katalog.</p>
        <div className="mt-2 space-y-2">
          {rows.map((r, i) => {
            const found = catalog.find((c) => c.nama.toLowerCase() === r.nama.toLowerCase());
            return (
              <div key={i}>
                <div className="flex gap-2">
                  <BarangCombobox
                    catalog={catalog}
                    value={r.nama}
                    onSelect={(nama, satuan) => setRow(i, satuan ? { nama, satuan } : { nama })}
                  />
                  <input
                    type="number"
                    min={1}
                    value={r.jumlah}
                    onChange={(e) => setRow(i, { jumlah: Number(e.target.value) || 0 })}
                    className="w-16 rounded-xl border border-navy-900/10 bg-white px-2 py-2 text-center text-sm outline-none focus:border-bpom-500"
                  />
                  <input
                    value={r.satuan}
                    onChange={(e) => setRow(i, { satuan: e.target.value })}
                    placeholder="satuan"
                    className="w-20 rounded-xl border border-navy-900/10 bg-white px-2 py-2 text-sm outline-none focus:border-bpom-500"
                  />
                  {rows.length > 1 && (
                    <button type="button" onClick={() => setRows((rr) => rr.filter((_, idx) => idx !== i))} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50">
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                {found && (
                  <p className={cn("mt-0.5 pl-1 text-[11px]", r.jumlah > found.stok ? "text-rose-500" : "text-navy-400")}>
                    Stok tersedia: {found.stok} {found.satuan}
                    {r.jumlah > found.stok ? " — melebihi stok" : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => setRows((r) => [...r, { nama: "", jumlah: 1, satuan: "unit" }])} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-bpom-600 hover:underline">
          <Plus className="size-4" /> Tambah baris
        </button>

        {err && <p className="mt-3 text-sm font-medium text-rose-600">{err}</p>}

        <Button type="submit" size="lg" loading={loading} className="mt-4 w-full">
          <Send className="size-4" /> Ajukan Permintaan
        </Button>
      </Card>
    </form>
  );
}

function RevisiForm({ p, catalog, onDone }: { p: Permintaan; catalog: Item[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [justifikasi, setJustifikasi] = useState("");
  const [rows, setRows] = useState(() => p.items.map((it) => ({ nama: it.nama, jumlah: it.jumlah, satuan: it.satuan })));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setRow(i: number, patch: Partial<{ nama: string; jumlah: number; satuan: string }>) {
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  async function kirim() {
    setErr(null);
    if (justifikasi.trim().length < 5) return setErr("Justifikasi minimal 5 karakter.");
    const list = rows.filter((r) => r.nama.trim() && r.jumlah > 0);
    if (list.length === 0) return setErr("Tambahkan minimal satu barang.");
    setLoading(true);
    try {
      await api.patch(`/persediaan-bmn/permintaan/${p.id}/ajukan-ulang`, { justifikasi, items: list });
      onDone();
    } catch (e) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-bpom-600 hover:underline">
        <RotateCcw className="size-4" /> Revisi & Ajukan Ulang
      </button>
    );
  }
  return (
    <div className="mt-3 rounded-xl border border-navy-900/10 p-3">
      <p className="text-xs font-semibold text-navy-600">Sesuaikan daftar barang</p>
      <p className="mb-2 text-[11px] text-navy-400">Ubah jumlah, ganti barang, atau hapus sesuai alasan penolakan.</p>
      <div className="space-y-2">
        {rows.map((r, i) => {
          const found = catalog.find((c) => c.nama.toLowerCase() === r.nama.toLowerCase());
          return (
            <div key={i}>
              <div className="flex gap-2">
                <BarangCombobox catalog={catalog} value={r.nama} onSelect={(nama, satuan) => setRow(i, satuan ? { nama, satuan } : { nama })} />
                <input type="number" min={1} value={r.jumlah} onChange={(e) => setRow(i, { jumlah: Number(e.target.value) || 0 })}
                  className="w-16 rounded-xl border border-navy-900/10 bg-white px-2 py-2 text-center text-sm outline-none focus:border-bpom-500" />
                <input value={r.satuan} onChange={(e) => setRow(i, { satuan: e.target.value })} placeholder="satuan"
                  className="w-20 rounded-xl border border-navy-900/10 bg-white px-2 py-2 text-sm outline-none focus:border-bpom-500" />
                {rows.length > 1 && (
                  <button type="button" onClick={() => setRows((rr) => rr.filter((_, idx) => idx !== i))} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50">
                    <X className="size-4" />
                  </button>
                )}
              </div>
              {found && (
                <p className={cn("mt-0.5 pl-1 text-[11px]", r.jumlah > found.stok ? "text-rose-500" : "text-navy-400")}>
                  Stok tersedia: {found.stok} {found.satuan}{r.jumlah > found.stok ? " — melebihi stok" : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => setRows((r) => [...r, { nama: "", jumlah: 1, satuan: "unit" }])} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-bpom-600 hover:underline">
        <Plus className="size-3.5" /> Tambah baris
      </button>

      <label className="mt-3 block text-xs font-semibold text-navy-600">Justifikasi / perbaikan</label>
      <textarea
        value={justifikasi}
        onChange={(e) => setJustifikasi(e.target.value)}
        rows={2}
        placeholder="Jelaskan perbaikan atas alasan penolakan…"
        className="mt-1 w-full rounded-lg border border-navy-900/10 bg-white px-3 py-2 text-sm outline-none focus:border-bpom-500"
      />
      {err && <p className="mt-2 text-xs font-medium text-rose-600">{err}</p>}
      <div className="mt-2 flex gap-2">
        <Button size="sm" loading={loading} onClick={kirim}>Ajukan Ulang</Button>
        <button onClick={() => setOpen(false)} className="rounded-xl px-3 text-sm font-semibold text-navy-500">Batal</button>
      </div>
    </div>
  );
}

function ItemFormModal({ item, onClose, onSaved }: { item: Item | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    nama: item?.nama ?? "",
    kategori: item?.kategori ?? "atk",
    kelompok: item?.kelompok ?? "atk",
    satuan: item?.satuan ?? "unit",
    lokasi: item?.lokasi ?? "",
    stok: item?.stok ?? 0,
    stok_minimum: item?.stok_minimum ?? 0,
    tanggal_kedaluwarsa: item?.tanggal_kedaluwarsa ?? "",
    keterangan: item?.keterangan ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const payload = { ...f, tanggal_kedaluwarsa: f.tanggal_kedaluwarsa || null };
    try {
      if (item) await api.patch(`/persediaan-bmn/${item.id}`, payload);
      else await api.post("/persediaan-bmn", payload);
      onSaved();
    } catch (e2) {
      setErr(extractApiErrorMessage(e2));
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-bpom-500";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl bg-background p-5 shadow-2xl sm:rounded-3xl">
        <h3 className="text-lg font-extrabold text-navy-900">{item ? "Edit Item" : "Tambah Item Persediaan"}</h3>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <input className={inputCls} placeholder="Nama barang" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} />
          <div>
            <label className="text-xs text-navy-400">Kelompok kode</label>
            <div className="mt-1 flex gap-2">
              {([["atk", "ATK — Alat Tulis Kantor"], ["psd", "PSD — Persediaan lain"]] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setF({ ...f, kelompok: val })}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                    f.kelompok === val ? "border-navy-900 bg-navy-900 text-white" : "border-navy-900/10 bg-white text-navy-600"
                  )}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <select className={inputCls} value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })}>
              <option value="atk">ATK</option>
              <option value="reagen">Reagen</option>
              <option value="test_kit">Test Kit</option>
              <option value="alat">Alat</option>
              <option value="lainnya">Lainnya</option>
            </select>
            <input className={inputCls} placeholder="Satuan" value={f.satuan} onChange={(e) => setF({ ...f, satuan: e.target.value })} />
          </div>
          <input className={inputCls} placeholder="Lokasi penyimpanan (mis. Gudang ATK Lt. 1)" value={f.lokasi} onChange={(e) => setF({ ...f, lokasi: e.target.value })} />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-navy-400">Stok</label>
              <input type="number" min={0} className={inputCls} value={f.stok} onChange={(e) => setF({ ...f, stok: Number(e.target.value) || 0 })} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-navy-400">Stok minimum</label>
              <input type="number" min={0} className={inputCls} value={f.stok_minimum} onChange={(e) => setF({ ...f, stok_minimum: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-navy-400">Tanggal kedaluwarsa (reagen/test kit, opsional)</label>
            <input type="date" className={inputCls} value={f.tanggal_kedaluwarsa} onChange={(e) => setF({ ...f, tanggal_kedaluwarsa: e.target.value })} />
          </div>
          {err && <p className="text-sm font-medium text-rose-600">{err}</p>}
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-2xl bg-navy-100 py-3 text-sm font-bold text-navy-600">Batal</button>
            <Button type="submit" loading={loading} className="flex-1">Simpan</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================== Transaksi Masuk (pembelian / transfer masuk) =====================

interface MasukRow {
  id: number; persediaan_id: number; nama: string | null; satuan: string | null;
  jenis: string; jenis_label: string; jumlah: number; sisa: number;
  lokasi: string | null; tanggal: string | null; sumber: string | null;
  keterangan: string | null; petugas: string | null;
}

function TransaksiMasukTab({ catalog, setMsg, onChanged }: { catalog: Item[]; setMsg: (m: string) => void; onChanged: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState<MasukRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  // filter
  const [fq, setFq] = useState("");
  const [fJenis, setFJenis] = useState("");
  const [fDari, setFDari] = useState("");
  const [fSampai, setFSampai] = useState("");
  // form
  const [f, setF] = useState({ persediaan_id: 0, jenis: "pembelian", jumlah: 1, tanggal: today, lokasi: "", sumber: "", keterangan: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function unduhTemplate() {
    const res = await api.get("/persediaan-bmn/masuk-template", { responseType: "blob" });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a"); a.href = url; a.download = "Template-Persediaan-Masuk.xlsx"; a.click();
    URL.revokeObjectURL(url);
  }
  async function importExcel(file: File) {
    setImporting(true); setErr(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/persediaan-bmn/masuk-import", fd);
      setMsg(data.message ?? "Impor selesai.");
      onChanged(); load();
    } catch (e2) { setMsg(extractApiErrorMessage(e2)); } finally { setImporting(false); }
  }

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (fq) params.q = fq;
    if (fJenis) params.jenis = fJenis;
    if (fDari) params.dari = fDari;
    if (fSampai) params.sampai = fSampai;
    try {
      const { data } = await api.get("/persediaan-bmn/masuk", { params });
      setRows(data.data ?? []);
    } finally { setLoading(false); }
  }, [fq, fJenis, fDari, fSampai]);
  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.persediaan_id) { setErr("Pilih item persediaan."); return; }
    setSaving(true); setErr(null);
    try {
      await api.post("/persediaan-bmn/masuk", f);
      setShowForm(false);
      setF({ persediaan_id: 0, jenis: "pembelian", jumlah: 1, tanggal: today, lokasi: "", sumber: "", keterangan: "" });
      setMsg("Transaksi masuk dicatat & stok bertambah.");
      onChanged(); load();
    } catch (e2) { setErr(extractApiErrorMessage(e2)); } finally { setSaving(false); }
  }

  const inputCls = "w-full rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-bpom-500";

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
          <input value={fq} onChange={(e) => setFq(e.target.value)} placeholder="Cari nama item…" className={inputCls + " pl-9"} />
        </div>
        <select value={fJenis} onChange={(e) => setFJenis(e.target.value)} className="rounded-xl border border-navy-900/10 bg-white px-3 py-2.5 text-sm">
          <option value="">Semua jenis</option>
          <option value="pembelian">Pembelian</option>
          <option value="transfer_masuk">Transfer Masuk</option>
        </select>
        <input type="date" value={fDari} onChange={(e) => setFDari(e.target.value)} className="rounded-xl border border-navy-900/10 bg-white px-3 py-2.5 text-sm" title="Dari tanggal" />
        <input type="date" value={fSampai} onChange={(e) => setFSampai(e.target.value)} className="rounded-xl border border-navy-900/10 bg-white px-3 py-2.5 text-sm" title="Sampai tanggal" />
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; if (file) importExcel(file); e.target.value = ""; }} />
        <Button size="sm" variant="outline" onClick={unduhTemplate}><FileDown className="size-4" /> Template Excel</Button>
        <Button size="sm" variant="outline" loading={importing} onClick={() => fileRef.current?.click()}><FileUp className="size-4" /> Import Excel</Button>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="size-4" /> Catat Masuk</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy-900/5 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-navy-900/5 bg-navy-50/50 text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="px-4 py-3 font-bold">Tanggal</th>
                <th className="px-4 py-3 font-bold">Item</th>
                <th className="px-4 py-3 font-bold">Jenis</th>
                <th className="px-4 py-3 text-right font-bold">Jumlah</th>
                <th className="px-4 py-3 font-bold">Lokasi</th>
                <th className="px-4 py-3 font-bold">Sumber</th>
                <th className="px-4 py-3 font-bold">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/5">
              {loading && [...Array(4)].map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-navy-100/60" /></td></tr>)}
              {!loading && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-navy-400">Belum ada transaksi masuk.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-navy-50/40">
                  <td className="px-4 py-3 text-navy-600">{r.tanggal ? formatTanggalIndonesia(r.tanggal) : "—"}</td>
                  <td className="px-4 py-3 font-semibold text-navy-900">{r.nama ?? "—"}</td>
                  <td className="px-4 py-3"><Badge tone={r.jenis === "pembelian" ? "info" : "neutral"}>{r.jenis_label}</Badge></td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-bpom-700">+{r.jumlah} <span className="text-xs font-normal text-navy-400">{r.satuan}</span></td>
                  <td className="px-4 py-3 text-navy-600">{r.lokasi || "—"}</td>
                  <td className="px-4 py-3 text-navy-500">{r.sumber || "—"}</td>
                  <td className="px-4 py-3 text-xs text-navy-500">{r.petugas || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl bg-background p-5 shadow-2xl sm:rounded-3xl">
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-navy-900"><ArrowDownToLine className="size-5 text-bpom-600" /> Catat Barang Masuk</h3>
            <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-xs text-navy-400">Item persediaan</label>
                <select className={inputCls} value={f.persediaan_id} onChange={(e) => { const id = Number(e.target.value); const c = catalog.find((x) => x.id === id); setF({ ...f, persediaan_id: id, lokasi: f.lokasi || (c?.lokasi ?? "") }); }}>
                  <option value={0}>— Pilih item —</option>
                  {catalog.map((c) => <option key={c.id} value={c.id}>{c.nama} (stok {c.stok} {c.satuan})</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-navy-400">Jenis</label>
                  <select className={inputCls} value={f.jenis} onChange={(e) => setF({ ...f, jenis: e.target.value })}>
                    <option value="pembelian">Pembelian</option>
                    <option value="transfer_masuk">Transfer Masuk</option>
                  </select>
                </div>
                <div className="w-28">
                  <label className="text-xs text-navy-400">Jumlah</label>
                  <input type="number" min={1} className={inputCls} value={f.jumlah} onChange={(e) => setF({ ...f, jumlah: Number(e.target.value) || 1 })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-navy-400">Tanggal masuk</label>
                <input type="date" className={inputCls} value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} />
              </div>
              <input className={inputCls} placeholder="Lokasi penyimpanan (opsional)" value={f.lokasi} onChange={(e) => setF({ ...f, lokasi: e.target.value })} />
              <input className={inputCls} placeholder="Sumber / pemasok / asal transfer (opsional)" value={f.sumber} onChange={(e) => setF({ ...f, sumber: e.target.value })} />
              <textarea className={inputCls} rows={2} placeholder="Keterangan (opsional)" value={f.keterangan} onChange={(e) => setF({ ...f, keterangan: e.target.value })} />
              {err && <p className="text-sm font-medium text-rose-600">{err}</p>}
              <div className="mt-1 flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-2xl border border-rose-200 bg-rose-50 py-3 text-sm font-bold text-rose-600">Batal</button>
                <Button type="submit" loading={saving} className="flex-1">Simpan</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== Stock Opname (stok terkini + barang keluar FIFO) =====================

interface KeluarRow {
  id: number; nama: string | null; satuan: string | null; jumlah: number;
  tanggal: string | null; lokasi: string | null; keterangan: string | null;
  lot_tanggal: string | null; lot_jenis: string | null; petugas: string | null;
}

function StockOpnameTab({ catalog }: { catalog: Item[] }) {
  const [stok, setStok] = useState<Item[]>([]);
  const [keluar, setKeluar] = useState<KeluarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fq, setFq] = useState("");
  const [fPid, setFPid] = useState("");
  const [fDari, setFDari] = useState("");
  const [fSampai, setFSampai] = useState("");
  const [fLokasi, setFLokasi] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (fq) params.q = fq;
    if (fPid) params.persediaan_id = fPid;
    if (fDari) params.dari = fDari;
    if (fSampai) params.sampai = fSampai;
    if (fLokasi) params.lokasi = fLokasi;
    try {
      const { data } = await api.get("/persediaan-bmn/stock-opname", { params });
      setStok(data.stok ?? []);
      setKeluar(data.keluar ?? []);
    } finally { setLoading(false); }
  }, [fq, fPid, fDari, fSampai, fLokasi]);
  useEffect(() => { load(); }, [load]);

  const inputCls = "rounded-xl border border-navy-900/10 bg-white px-3 py-2.5 text-sm";

  return (
    <div className="mt-4 space-y-6">
      {/* Stok terkini */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-navy-800"><Warehouse className="size-4.5 text-navy-500" /> Stok Terkini (Opname)</h3>
        <div className="overflow-hidden rounded-2xl border border-navy-900/5 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-navy-900/5 bg-navy-50/50 text-left text-xs uppercase tracking-wide text-navy-400">
                  <th className="px-4 py-3 font-bold">Item</th>
                  <th className="px-4 py-3 font-bold">Lokasi</th>
                  <th className="px-4 py-3 text-right font-bold">Stok</th>
                  <th className="px-4 py-3 text-right font-bold">Min</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {loading && [...Array(4)].map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-navy-100/60" /></td></tr>)}
                {!loading && stok.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-navy-400">Belum ada item.</td></tr>}
                {stok.map((it) => (
                  <tr key={it.id} className="hover:bg-navy-50/40">
                    <td className="px-4 py-3 font-semibold text-navy-900">{it.nama}</td>
                    <td className="px-4 py-3 text-navy-600">{it.lokasi || "—"}</td>
                    <td className={cn("px-4 py-3 text-right tabular-nums font-bold", it.menipis ? "text-amber-600" : "text-navy-800")}>{it.stok} <span className="text-xs font-normal text-navy-400">{it.satuan}</span></td>
                    <td className="px-4 py-3 text-right tabular-nums text-navy-500">{it.stok_minimum}</td>
                    <td className="px-4 py-3">
                      {it.menipis ? <Badge tone="warning">Menipis</Badge> : it.status_kedaluwarsa === "kadaluarsa" ? <Badge tone="danger">Kadaluarsa</Badge> : it.status_kedaluwarsa === "mendekati" ? <Badge tone="warning">Segera KL</Badge> : <Badge tone="success">Aman</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Barang keluar FIFO */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-navy-800"><ClipboardList className="size-4.5 text-navy-500" /> Barang Keluar (FIFO — urut tanggal masuk)</h3>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[160px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
            <input value={fq} onChange={(e) => setFq(e.target.value)} placeholder="Cari item…" className={inputCls + " w-full pl-9"} />
          </div>
          <select value={fPid} onChange={(e) => setFPid(e.target.value)} className={inputCls}>
            <option value="">Semua item</option>
            {catalog.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
          </select>
          <input className={inputCls} placeholder="Lokasi" value={fLokasi} onChange={(e) => setFLokasi(e.target.value)} />
          <input type="date" value={fDari} onChange={(e) => setFDari(e.target.value)} className={inputCls} title="Dari tanggal" />
          <input type="date" value={fSampai} onChange={(e) => setFSampai(e.target.value)} className={inputCls} title="Sampai tanggal" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-navy-900/5 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-navy-900/5 bg-navy-50/50 text-left text-xs uppercase tracking-wide text-navy-400">
                  <th className="px-4 py-3 font-bold">Tgl Keluar</th>
                  <th className="px-4 py-3 font-bold">Item</th>
                  <th className="px-4 py-3 text-right font-bold">Jumlah</th>
                  <th className="px-4 py-3 font-bold">Lot Masuk</th>
                  <th className="px-4 py-3 font-bold">Lokasi</th>
                  <th className="px-4 py-3 font-bold">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {loading && [...Array(4)].map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-navy-100/60" /></td></tr>)}
                {!loading && keluar.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-navy-400">Belum ada barang keluar.</td></tr>}
                {keluar.map((k) => (
                  <tr key={k.id} className="hover:bg-navy-50/40">
                    <td className="px-4 py-3 text-navy-600">{k.tanggal ? formatTanggalIndonesia(k.tanggal) : "—"}</td>
                    <td className="px-4 py-3 font-semibold text-navy-900">{k.nama ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-rose-600">−{k.jumlah} <span className="text-xs font-normal text-navy-400">{k.satuan}</span></td>
                    <td className="px-4 py-3 text-xs text-navy-500">{k.lot_tanggal ? formatTanggalIndonesia(k.lot_tanggal) : "—"}</td>
                    <td className="px-4 py-3 text-navy-600">{k.lokasi || "—"}</td>
                    <td className="px-4 py-3 text-xs text-navy-500">{k.keterangan || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== Paginator (10/halaman) =====================
function Paginator({ page, setPage, total, per = 10 }: { page: number; setPage: (p: number) => void; total: number; per?: number }) {
  const pages = Math.max(1, Math.ceil(total / per));
  if (total <= per) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t border-navy-900/5 px-4 py-3 text-sm">
      <span className="text-navy-400">Menampilkan {Math.min((page - 1) * per + 1, total)}–{Math.min(page * per, total)} dari {total}</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}
          className="rounded-lg border border-navy-900/10 px-2.5 py-1.5 font-semibold text-navy-600 disabled:opacity-40 hover:bg-navy-50">Sebelumnya</button>
        <span className="px-2 text-xs font-semibold text-navy-500">Hal {page}/{pages}</span>
        <button disabled={page >= pages} onClick={() => setPage(page + 1)}
          className="rounded-lg border border-navy-900/10 px-2.5 py-1.5 font-semibold text-navy-600 disabled:opacity-40 hover:bg-navy-50">Selanjutnya</button>
      </div>
    </div>
  );
}
