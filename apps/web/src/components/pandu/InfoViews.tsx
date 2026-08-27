"use client";

import { useEffect, useState } from "react";
import {
  MessageCircle, Search, Tag, Palette, ClipboardList, BookOpen, ShieldCheck,
  ExternalLink, Phone, Mail, Globe, MapPin, ChevronDown, Info, HelpCircle,
  History, Building2,
} from "lucide-react";
import { Card, Badge } from "@/components/ui/Card";
import { Maskot, EmptyState } from "@/components/pandu/Maskot";
import { panduService, type Bootstrap, type TopikKnowledge } from "@/lib/pandu-service";
import type { MenuPandu } from "@/app/si-pandu-ai/page";
import { cn } from "@/lib/utils";

/** Catatan baku bahwa aplikasi bersifat edukatif. */
export function Disclaimer({ teks }: { teks?: string }) {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-[11px] leading-relaxed text-amber-700">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {teks ??
          "Si Pandu AI memberikan informasi dan edukasi awal, bukan keputusan atau persetujuan resmi BPOM. Untuk keputusan resmi, verifikasi melalui kanal resmi BPOM."}
      </span>
    </p>
  );
}

/** Judul bagian yang konsisten di seluruh modul. */
export function JudulBagian({ ikon, judul, anak }: { ikon: React.ReactNode; judul: string; anak?: string }) {
  return (
    <div className="mb-3">
      <h3 className="flex items-center gap-2 text-base font-bold text-navy-900">{ikon} {judul}</h3>
      {anak && <p className="mt-0.5 text-xs text-navy-500">{anak}</p>}
    </div>
  );
}

// ─────────────────────────────── DASHBOARD ───────────────────────────────

const AKSI_CEPAT: { id: MenuPandu; label: string; ikon: React.ReactNode; warna: string }[] = [
  { id: "konsultasi", label: "Konsultasi", ikon: <MessageCircle className="size-5" />, warna: "from-bpom-600 to-bpom-500" },
  { id: "cek_produk", label: "Cek Produk", ikon: <Search className="size-5" />, warna: "from-navy-800 to-navy-600" },
  { id: "cek_label", label: "Cek Label", ikon: <Tag className="size-5" />, warna: "from-sky-600 to-sky-500" },
  { id: "edit_label", label: "Edit Label", ikon: <Palette className="size-5" />, warna: "from-violet-600 to-violet-500" },
  { id: "capa", label: "Buat CAPA", ikon: <ClipboardList className="size-5" />, warna: "from-amber-600 to-amber-500" },
  { id: "regulasi", label: "Regulasi", ikon: <BookOpen className="size-5" />, warna: "from-teal-600 to-teal-500" },
];

/** Menu penunjang — seluruh navigasi tersedia dari beranda (tanpa sidebar). */
const MENU_LAIN: { id: MenuPandu; label: string; teks: string; ikon: React.ReactNode }[] = [
  { id: "faq", label: "FAQ", teks: "Pertanyaan yang sering diajukan pelaku usaha.", ikon: <HelpCircle className="size-5 text-bpom-600" /> },
  { id: "kontak", label: "Hubungi BPOM Jember", teks: "WhatsApp, telepon, email, dan wilayah kerja.", ikon: <Phone className="size-5 text-bpom-600" /> },
  { id: "riwayat", label: "Riwayat", teks: "Catatan konsultasi, review label, dan CAPA Anda.", ikon: <History className="size-5 text-bpom-600" /> },
  { id: "profil", label: "Profil Usaha", teks: "Data usaha agar panduan lebih sesuai.", ikon: <Building2 className="size-5 text-bpom-600" /> },
];

const LAYANAN = [
  { judul: "Konsultasi Regulasi", teks: "Tanya jawab seputar regulasi, sertifikasi, dan layanan Badan POM.", menu: "konsultasi" as MenuPandu },
  { judul: "Cek Persyaratan", teks: "Penilaian awal kesiapan produk dan dokumen yang perlu disiapkan.", menu: "cek_produk" as MenuPandu },
  { judul: "Review Label", teks: "Self-check kelengkapan informasi pada desain label produk.", menu: "cek_label" as MenuPandu },
  { judul: "Edit Desain Label", teks: "Susun rencana perbaikan tampilan label tanpa mengubah informasi produk.", menu: "edit_label" as MenuPandu },
  { judul: "Analisis Temuan", teks: "Telusuri akar masalah dari temuan hasil pemeriksaan sarana.", menu: "capa" as MenuPandu },
  { judul: "Penyusunan CAPA", teks: "Susun draft tindakan perbaikan dan pencegahan yang terstruktur.", menu: "capa" as MenuPandu },
];

export function DashboardView({ boot, pindah }: { boot: Bootstrap | null; pindah: (m: MenuPandu) => void }) {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="!p-0 overflow-hidden">
        <div className="relative flex flex-col gap-4 bg-gradient-to-br from-navy-900 via-navy-800 to-bpom-800 p-6 text-white sm:flex-row sm:items-center">
          <Maskot size={104} bergerak />
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold sm:text-xl">Selamat datang di Si Pandu AI 👋</h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/85">
              Saya siap membantu Anda memahami regulasi dan mempersiapkan produk sebelum mengajukan layanan resmi.
            </p>
            <p className="mt-2 text-[11px] font-medium text-white/70">
              Informasi edukatif. Bukan keputusan resmi BPOM.
            </p>
          </div>
        </div>
      </Card>

      {/* Aksi cepat */}
      <div>
        <JudulBagian ikon={<ShieldCheck className="size-4 text-bpom-600" />} judul="Mulai dari sini" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {AKSI_CEPAT.map((a) => (
            <button
              key={a.id}
              onClick={() => pindah(a.id)}
              className={cn(
                "group flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br p-3.5 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
                a.warna
              )}
            >
              {a.ikon}
              <span className="text-xs font-bold leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layanan */}
      <div>
        <JudulBagian ikon={<Info className="size-4 text-bpom-600" />} judul="Layanan yang bisa saya bantu" />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {LAYANAN.map((l) => (
            <button
              key={l.judul}
              onClick={() => pindah(l.menu)}
              className="rounded-2xl border border-navy-900/5 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-bpom-200 hover:shadow-md"
            >
              <p className="text-sm font-bold text-navy-900">{l.judul}</p>
              <p className="mt-1 text-xs leading-relaxed text-navy-500">{l.teks}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Menu penunjang */}
      <div>
        <JudulBagian ikon={<HelpCircle className="size-4 text-bpom-600" />} judul="Menu lainnya" />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {MENU_LAIN.map((m) => (
            <button
              key={m.id}
              onClick={() => pindah(m.id)}
              className="flex items-start gap-3 rounded-2xl border border-navy-900/5 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-bpom-200 hover:shadow-md"
            >
              <span className="mt-0.5 shrink-0">{m.ikon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-navy-900">{m.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-navy-500">{m.teks}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Topik populer */}
      <div>
        <JudulBagian ikon={<BookOpen className="size-4 text-bpom-600" />} judul="Topik populer" />
        <div className="flex flex-wrap gap-2">
          {(boot?.topik_populer ?? []).map((t) => (
            <button
              key={t.id}
              onClick={() => pindah("regulasi")}
              className="rounded-full border border-navy-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 transition-colors hover:border-bpom-400 hover:bg-bpom-50 hover:text-bpom-700"
            >
              {t.nama}
            </button>
          ))}
          {!boot && [...Array(8)].map((_, i) => <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-navy-100" />)}
        </div>
      </div>

      <Disclaimer teks={boot?.disclaimer} />
    </div>
  );
}

// ─────────────────────────────── REGULASI ───────────────────────────────

interface KategoriRegulasi {
  id: string;
  nama: string;
  deskripsi: string;
  topik: TopikKnowledge[];
}

export function RegulasiView() {
  const [data, setData] = useState<KategoriRegulasi[]>([]);
  const [jdih, setJdih] = useState("https://jdih.pom.go.id/");
  const [aktif, setAktif] = useState<string | null>(null);
  const [muat, setMuat] = useState(true);

  useEffect(() => {
    panduService
      .regulasi()
      .then((r) => { setData(r.data ?? []); setJdih(r.jdih ?? jdih); })
      .catch(() => setData([]))
      .finally(() => setMuat(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <JudulBagian
        ikon={<BookOpen className="size-4 text-bpom-600" />}
        judul="📚 Regulasi"
        anak="Ringkasan topik pengaturan menurut kategori produk."
      />

      {muat && <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-navy-100/70" />)}</div>}

      <div className="space-y-2.5">
        {data.map((k) => (
          <div key={k.id} className="overflow-hidden rounded-2xl border border-navy-900/10">
            <button
              onClick={() => setAktif(aktif === k.id ? null : k.id)}
              className="flex w-full items-center justify-between gap-3 bg-navy-50/60 px-4 py-3 text-left transition-colors hover:bg-navy-50"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-navy-900">{k.nama}</p>
                <p className="mt-0.5 text-xs text-navy-500">{k.deskripsi}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone="neutral">{k.topik.length}</Badge>
                <ChevronDown className={cn("size-4 text-navy-400 transition-transform", aktif === k.id && "rotate-180")} />
              </div>
            </button>

            {aktif === k.id && (
              <div className="space-y-2.5 bg-white p-4">
                {k.topik.map((t) => (
                  <div key={t.id} className="rounded-xl border border-navy-900/5 bg-navy-50/40 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-navy-900">{t.nama}</p>
                      {t.kepanjangan && <span className="text-xs text-navy-500">{t.kepanjangan}</span>}
                      {t.perlu_verifikasi && <Badge tone="warning">Perlu verifikasi</Badge>}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-navy-600">{t.ringkasan}</p>
                  </div>
                ))}
                {k.topik.length === 0 && <p className="text-xs text-navy-400">Belum ada entri untuk kategori ini.</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-navy-50 px-4 py-3">
        <p className="text-xs text-navy-600">
          Nomor dan isi peraturan tidak ditampilkan di sini agar tidak keliru. Verifikasi regulasi terbaru melalui JDIH BPOM.
        </p>
        <a
          href={jdih}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-bpom-700 hover:underline"
        >
          Buka JDIH BPOM <ExternalLink className="size-3.5" />
        </a>
      </div>
      <Disclaimer />
    </Card>
  );
}

// ─────────────────────────────── FAQ ───────────────────────────────

interface EntriFaq {
  id: string;
  kategori: string;
  pertanyaan: string;
  jawaban: string;
  perlu_verifikasi?: boolean;
}

export function FaqView() {
  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState<string>("");
  const [data, setData] = useState<EntriFaq[]>([]);
  const [semuaKategori, setSemuaKategori] = useState<string[]>([]);
  const [buka, setBuka] = useState<string | null>(null);
  const [muat, setMuat] = useState(true);

  useEffect(() => {
    // Penundaan singkat agar pencarian tidak memanggil API tiap ketikan.
    const t = setTimeout(() => {
      setMuat(true);
      panduService
        .faq(q, kategori)
        .then((r) => {
          setData(r.data ?? []);
          if (semuaKategori.length === 0) setSemuaKategori(r.kategori ?? []);
        })
        .catch(() => setData([]))
        .finally(() => setMuat(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, kategori]);

  return (
    <Card>
      <JudulBagian ikon={<BookOpen className="size-4 text-bpom-600" />} judul="❓ FAQ" anak="Pertanyaan yang sering diajukan pelaku usaha." />

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari pertanyaan…"
        className="w-full rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-bpom-500"
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setKategori("")}
          className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
            kategori === "" ? "bg-bpom-600 text-white" : "bg-navy-50 text-navy-600 hover:bg-navy-100")}
        >
          Semua
        </button>
        {semuaKategori.map((k) => (
          <button
            key={k}
            onClick={() => setKategori(k)}
            className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              kategori === k ? "bg-bpom-600 text-white" : "bg-navy-50 text-navy-600 hover:bg-navy-100")}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {muat && [...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-navy-100/70" />)}
        {!muat && data.length === 0 && (
          <EmptyState judul="Belum ada pertanyaan yang cocok." pesan="Coba kata kunci lain atau ajukan langsung melalui menu Konsultasi." />
        )}
        {data.map((f) => (
          <div key={f.id} className="overflow-hidden rounded-2xl border border-navy-900/10">
            <button
              onClick={() => setBuka(buka === f.id ? null : f.id)}
              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-navy-50/60"
            >
              <div className="min-w-0">
                <Badge tone="info" className="mb-1.5">{f.kategori}</Badge>
                <p className="text-sm font-semibold text-navy-900">{f.pertanyaan}</p>
              </div>
              <ChevronDown className={cn("mt-1 size-4 shrink-0 text-navy-400 transition-transform", buka === f.id && "rotate-180")} />
            </button>
            {buka === f.id && (
              <div className="border-t border-navy-900/5 bg-navy-50/40 px-4 py-3">
                <p className="text-xs leading-relaxed text-navy-700">{f.jawaban}</p>
                {f.perlu_verifikasi && (
                  <p className="mt-2 text-[11px] font-medium text-amber-700">
                    Informasi tersebut perlu diverifikasi melalui kanal resmi BPOM.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <Disclaimer />
    </Card>
  );
}

// ─────────────────────────────── KONTAK ───────────────────────────────

export function KontakView({ boot }: { boot: Bootstrap | null }) {
  const k = boot?.kontak;

  return (
    <div className="space-y-4">
      <Card>
        <JudulBagian ikon={<Phone className="size-4 text-bpom-600" />} judul="📞 Hubungi Balai POM di Jember" />

        {!k && <div className="h-32 animate-pulse rounded-xl bg-navy-100/70" />}

        {k && (
          <>
            <div className="rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800 p-5 text-white">
              <p className="text-base font-extrabold">{k.nama}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2.5"><MessageCircle className="size-4 shrink-0 text-bpom-300" /><span>WhatsApp {k.whatsapp}</span></div>
                <div className="flex items-center gap-2.5"><Phone className="size-4 shrink-0 text-bpom-300" /><span>Telepon {k.telepon}</span></div>
                <div className="flex items-center gap-2.5"><Mail className="size-4 shrink-0 text-bpom-300" /><span className="break-all">{k.email}</span></div>
                <div className="flex items-center gap-2.5"><Globe className="size-4 shrink-0 text-bpom-300" /><span className="break-all">{k.website}</span></div>
              </dl>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <a href={k.whatsapp_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-bpom-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-bpom-700">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
              <a href={k.telepon_link}
                className="flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-navy-800">
                <Phone className="size-4" /> Telepon
              </a>
              <a href={k.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:bg-navy-50">
                <Globe className="size-4" /> Website
              </a>
            </div>

            <p className="mt-3 rounded-xl bg-navy-50 px-4 py-3 text-xs leading-relaxed text-navy-600">{k.catatan}</p>
          </>
        )}
      </Card>

      <Card>
        <JudulBagian ikon={<MapPin className="size-4 text-bpom-600" />} judul="Wilayah kerja" anak="Cakupan pengawasan Balai POM di Jember." />
        <div className="flex flex-wrap gap-2">
          {(boot?.wilayah_kerja ?? []).map((w) => (
            <span key={w} className="rounded-full bg-bpom-50 px-3 py-1.5 text-xs font-bold text-bpom-700">{w}</span>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-navy-500">
          Bila lokasi usaha Anda berada di luar wilayah tersebut, silakan mencari Unit Pelaksana Teknis (UPT) BPOM yang sesuai dengan wilayah Anda.
        </p>
      </Card>
    </div>
  );
}
