"use client";

import { useCallback, useEffect, useState } from "react";
import {
  History, Trash2, Building2, Save, MessageCircle, Search, Tag, Palette, ClipboardList,
} from "lucide-react";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/pandu/Maskot";
import { Disclaimer, JudulBagian } from "@/components/pandu/InfoViews";
import { panduService, type EntriRiwayat, type ProfilUsaha } from "@/lib/pandu-service";
import { extractApiErrorMessage } from "@bpom/shared";
import { formatTanggalIndonesia, cn } from "@/lib/utils";

const KELAS_INPUT =
  "w-full rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-bpom-500";

const JENIS: Record<EntriRiwayat["jenis"], { label: string; ikon: React.ReactNode; nada: "success" | "info" | "warning" | "neutral" }> = {
  konsultasi: { label: "Konsultasi", ikon: <MessageCircle className="size-3.5" />, nada: "success" },
  cek_produk: { label: "Cek Produk", ikon: <Search className="size-3.5" />, nada: "info" },
  cek_label: { label: "Review Label", ikon: <Tag className="size-3.5" />, nada: "info" },
  edit_label: { label: "Desain Label", ikon: <Palette className="size-3.5" />, nada: "neutral" },
  capa: { label: "CAPA", ikon: <ClipboardList className="size-3.5" />, nada: "warning" },
};

// ─────────────────────────────── RIWAYAT ───────────────────────────────

export function RiwayatView() {
  const [data, setData] = useState<EntriRiwayat[]>([]);
  const [saring, setSaring] = useState<string>("");
  const [muat, setMuat] = useState(true);
  const [tik, setTik] = useState(0);
  const [pesan, setPesan] = useState<string | null>(null);

  // Pengambilan data dijalankan sebagai sinkronisasi ke sistem luar; status
  // "memuat" disetel dari penangan aksi agar tidak memicu render berantai.
  useEffect(() => {
    let batal = false;
    panduService
      .riwayat(saring || undefined)
      .then((d) => { if (!batal) setData(d); })
      .catch(() => { if (!batal) setData([]); })
      .finally(() => { if (!batal) setMuat(false); });

    return () => { batal = true; };
  }, [saring, tik]);

  const gantiSaring = useCallback((s: string) => {
    setMuat(true);
    setSaring(s);
  }, []);

  async function hapus(id?: number) {
    const konfirmasi = id
      ? "Hapus entri riwayat ini?"
      : "Hapus SELURUH riwayat Anda? Tindakan ini tidak dapat dibatalkan.";
    if (!window.confirm(konfirmasi)) return;
    try {
      await panduService.hapusRiwayat(id);
      setPesan(id ? "Riwayat dihapus." : "Seluruh riwayat dihapus.");
      setMuat(true);
      setTik((t) => t + 1);
    } catch (e) {
      setPesan(extractApiErrorMessage(e) || "Riwayat gagal dihapus.");
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <JudulBagian
          ikon={<History className="size-4 text-bpom-600" />}
          judul="🕘 Riwayat"
          anak="Catatan konsultasi, review label, CAPA, dan desain label Anda."
        />
        {data.length > 0 && (
          <Button size="sm" variant="danger" onClick={() => hapus()}>
            <Trash2 className="size-4" /> Hapus Riwayat
          </Button>
        )}
      </div>

      {pesan && <p className="mb-3 rounded-xl bg-navy-50 px-4 py-2.5 text-xs font-medium text-navy-700">{pesan}</p>}

      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => gantiSaring("")}
          className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
            saring === "" ? "bg-bpom-600 text-white" : "bg-navy-50 text-navy-600 hover:bg-navy-100")}
        >
          Semua
        </button>
        {Object.entries(JENIS).map(([k, v]) => (
          <button
            key={k}
            onClick={() => gantiSaring(k)}
            className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              saring === k ? "bg-bpom-600 text-white" : "bg-navy-50 text-navy-600 hover:bg-navy-100")}
          >
            {v.label}
          </button>
        ))}
      </div>

      {muat && <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-navy-100/70" />)}</div>}

      {!muat && data.length === 0 && (
        <EmptyState judul="Belum ada riwayat konsultasi." pesan="Mulailah dari menu Konsultasi, Cek Produk, atau Cek Label." />
      )}

      <div className="space-y-2">
        {data.map((r) => {
          const j = JENIS[r.jenis] ?? JENIS.konsultasi;
          return (
            <div key={r.id} className="rounded-2xl border border-navy-900/10 p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Badge tone={j.nada} className="mb-1.5">
                    <span className="mr-1 inline-flex">{j.ikon}</span> {j.label}
                  </Badge>
                  <p className="truncate text-sm font-semibold text-navy-900">{r.judul}</p>
                  <p className="mt-0.5 text-[11px] text-navy-400">{formatTanggalIndonesia(r.created_at)}</p>
                </div>
                <button
                  onClick={() => hapus(r.id)}
                  className="rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Hapus entri"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {r.berkas_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.berkas_url} alt="Berkas terkait" className="mt-2 max-h-32 rounded-xl border border-navy-900/5 object-contain" />
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 rounded-xl bg-navy-50 px-4 py-3 text-[11px] leading-relaxed text-navy-600">
        Riwayat hanya dapat diakses oleh akun Anda sendiri. Hindari mengunggah dokumen yang memuat data pribadi
        atau rahasia usaha yang tidak diperlukan.
      </p>
      <Disclaimer />
    </Card>
  );
}

// ─────────────────────────────── PROFIL USAHA ───────────────────────────────

const MEDAN_PROFIL: { key: keyof ProfilUsaha; label: string; tipe?: "textarea"; pilihan?: string[] }[] = [
  { key: "nama_usaha", label: "Nama Usaha" },
  { key: "nama_pemilik", label: "Nama Pemilik" },
  { key: "jenis_usaha", label: "Jenis Usaha" },
  { key: "lokasi", label: "Lokasi" },
  { key: "kabupaten", label: "Kabupaten", pilihan: ["Jember", "Banyuwangi", "Bondowoso", "Situbondo", "Lumajang", "Lainnya"] },
  { key: "komoditas", label: "Komoditas" },
  { key: "nib", label: "NIB" },
  { key: "status_sertifikasi", label: "Status Sertifikasi" },
  { key: "produk", label: "Produk", tipe: "textarea" },
];

export function ProfilUsahaView() {
  const [f, setF] = useState<ProfilUsaha>({});
  const [muat, setMuat] = useState(true);
  const [simpan, setSimpan] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    panduService
      .profil()
      .then((p) => setF(p ?? {}))
      .catch(() => setF({}))
      .finally(() => setMuat(false));
  }, []);

  const set = (k: keyof ProfilUsaha, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function kirim() {
    setSimpan(true); setPesan(null);
    try {
      const bersih = Object.fromEntries(
        Object.entries(f).filter(([, v]) => v !== null && v !== undefined && v !== "")
      ) as ProfilUsaha;
      await panduService.simpanProfil(bersih);
      setPesan("Profil usaha disimpan.");
    } catch (e) {
      setPesan(extractApiErrorMessage(e) || "Profil gagal disimpan.");
    } finally {
      setSimpan(false);
    }
  }

  return (
    <Card>
      <JudulBagian
        ikon={<Building2 className="size-4 text-bpom-600" />}
        judul="🏢 Profil Usaha"
        anak="Data ini membantu Si Pandu memberikan panduan yang lebih sesuai dengan usaha Anda."
      />

      {muat && <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-navy-100/70" />)}</div>}

      {!muat && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {MEDAN_PROFIL.map((m) => (
              <div key={m.key} className={cn(m.tipe === "textarea" && "sm:col-span-2")}>
                <label className="text-xs font-semibold text-navy-500">{m.label}</label>
                <div className="mt-1">
                  {m.tipe === "textarea" ? (
                    <textarea
                      className={KELAS_INPUT} rows={3}
                      value={(f[m.key] as string) ?? ""}
                      onChange={(e) => set(m.key, e.target.value)}
                      placeholder="Sebutkan produk yang Anda hasilkan…"
                    />
                  ) : m.pilihan ? (
                    <select className={KELAS_INPUT} value={(f[m.key] as string) ?? ""} onChange={(e) => set(m.key, e.target.value)}>
                      <option value="">— Pilih —</option>
                      {m.pilihan.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input
                      className={KELAS_INPUT}
                      value={(f[m.key] as string) ?? ""}
                      onChange={(e) => set(m.key, e.target.value)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button variant="secondary" className="mt-4 w-full sm:w-auto" loading={simpan} onClick={kirim}>
            <Save className="size-4" /> Simpan Profil
          </Button>

          {pesan && <p className="mt-3 rounded-xl bg-navy-50 px-4 py-2.5 text-xs font-medium text-navy-700">{pesan}</p>}
        </>
      )}
    </Card>
  );
}
