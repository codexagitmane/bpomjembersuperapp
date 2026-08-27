"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MessageCircle, Search, Tag, Palette, ClipboardList,
  BookOpen, HelpCircle, Phone, History, Building2, Sparkles, ArrowLeft,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Maskot } from "@/components/pandu/Maskot";
import { DashboardView, RegulasiView, FaqView, KontakView } from "@/components/pandu/InfoViews";
import { KonsultasiView } from "@/components/pandu/KonsultasiView";
import { CekLabelView, EditLabelView } from "@/components/pandu/LabelViews";
import { CekProdukView, CapaView } from "@/components/pandu/AsesmenViews";
import { RiwayatView, ProfilUsahaView } from "@/components/pandu/RiwayatViews";
import { panduService, type Bootstrap } from "@/lib/pandu-service";

export type MenuPandu =
  | "dashboard" | "konsultasi" | "cek_produk" | "cek_label" | "edit_label"
  | "capa" | "regulasi" | "faq" | "kontak" | "riwayat" | "profil";

const JUDUL: Record<MenuPandu, string> = {
  dashboard: "Dashboard",
  konsultasi: "Konsultasi BPOM",
  cek_produk: "Cek Produk",
  cek_label: "Cek Label",
  edit_label: "Edit Label",
  capa: "Bantuan CAPA",
  regulasi: "Regulasi",
  faq: "FAQ",
  kontak: "Hubungi BPOM Jember",
  riwayat: "Riwayat",
  profil: "Profil Usaha",
};

const IKON: Record<Exclude<MenuPandu, "dashboard">, React.ReactNode> = {
  konsultasi: <MessageCircle className="size-5" />,
  cek_produk: <Search className="size-5" />,
  cek_label: <Tag className="size-5" />,
  edit_label: <Palette className="size-5" />,
  capa: <ClipboardList className="size-5" />,
  regulasi: <BookOpen className="size-5" />,
  faq: <HelpCircle className="size-5" />,
  kontak: <Phone className="size-5" />,
  riwayat: <History className="size-5" />,
  profil: <Building2 className="size-5" />,
};

export default function SiPanduAiPage() {
  const [menu, setMenu] = useState<MenuPandu>("dashboard");
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [gagalMuat, setGagalMuat] = useState(false);

  useEffect(() => {
    panduService.bootstrap().then(setBoot).catch(() => setGagalMuat(true));
  }, []);

  const pindah = useCallback((m: MenuPandu) => {
    setMenu(m);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const diDashboard = menu === "dashboard";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl">
        {/* Kepala brand */}
        <div className="flex items-center gap-3">
          <Maskot size={52} />
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-navy-900 sm:text-2xl">
              SI PANDU AI
              <Sparkles className="size-5 shrink-0 text-bpom-600" />
            </h1>
            <p className="text-sm text-navy-500">Asisten Pintar Pelaku Usaha</p>
          </div>
        </div>

        {gagalMuat && (
          <div className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700">
            Maaf, Si Pandu AI sedang mengalami kendala. Silakan coba kembali atau hubungi kanal resmi Balai POM di Jember.
          </div>
        )}

        {/* Tombol kembali muncul saat berada di dalam salah satu layanan */}
        {!diDashboard && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => pindah("dashboard")}
              className="inline-flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-3.5 py-2 text-sm font-semibold text-navy-700 transition-colors hover:border-bpom-400 hover:bg-bpom-50 hover:text-bpom-700"
            >
              <ArrowLeft className="size-4" /> Kembali ke Beranda
            </button>
            <h2 className="text-base font-bold text-navy-900">{JUDUL[menu]}</h2>
          </div>
        )}

        <div className="mt-5">
          {menu === "dashboard" && <DashboardView boot={boot} pindah={pindah} />}
          {menu === "konsultasi" && <KonsultasiView boot={boot} />}
          {menu === "cek_produk" && <CekProdukView />}
          {menu === "cek_label" && <CekLabelView boot={boot} />}
          {menu === "edit_label" && <EditLabelView />}
          {menu === "capa" && <CapaView />}
          {menu === "regulasi" && <RegulasiView />}
          {menu === "faq" && <FaqView />}
          {menu === "kontak" && <KontakView boot={boot} />}
          {menu === "riwayat" && <RiwayatView />}
          {menu === "profil" && <ProfilUsahaView />}
        </div>

        {/* Pintasan ke layanan lain, tersedia tanpa harus kembali ke beranda */}
        {!diDashboard && (
          <div className="mt-6 rounded-2xl border border-navy-900/5 bg-white p-4 shadow-sm">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-navy-400">Layanan lainnya</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(IKON) as Exclude<MenuPandu, "dashboard">[])
                .filter((m) => m !== menu)
                .map((m) => (
                  <button
                    key={m}
                    onClick={() => pindah(m)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white px-3 py-2 text-xs font-semibold text-navy-600 transition-colors hover:border-bpom-400 hover:bg-bpom-50 hover:text-bpom-700"
                  >
                    <span className="[&>svg]:size-3.5">{IKON[m]}</span>
                    {JUDUL[m]}
                  </button>
                ))}
            </div>
          </div>
        )}

        <PanduFooter boot={boot} />
      </div>
    </AppShell>
  );
}

function PanduFooter({ boot }: { boot: Bootstrap | null }) {
  const sumber = boot?.sumber_resmi;
  return (
    <footer className="mt-8 rounded-2xl border border-navy-900/5 bg-navy-50/60 p-5 text-xs text-navy-500">
      <p className="text-sm font-extrabold text-navy-800">SI PANDU AI</p>
      <p className="mt-0.5 font-medium text-navy-600">Asisten Pintar Pelaku Usaha</p>
      <p className="mt-1">Informasi edukatif dan persiapan awal terkait Obat dan Makanan.</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <a className="font-semibold text-bpom-700 hover:underline" href={sumber?.jdih ?? "https://jdih.pom.go.id/"} target="_blank" rel="noopener noreferrer">JDIH BPOM</a>
        <a className="font-semibold text-bpom-700 hover:underline" href={sumber?.bpom ?? "https://www.pom.go.id/"} target="_blank" rel="noopener noreferrer">BPOM (pom.go.id)</a>
        <a className="font-semibold text-bpom-700 hover:underline" href={sumber?.balai_jember ?? "https://jember.pom.go.id/"} target="_blank" rel="noopener noreferrer">Balai POM di Jember</a>
      </div>
      {boot?.kontak && (
        <p className="mt-2">
          {boot.kontak.nama} — WhatsApp {boot.kontak.whatsapp} · Telepon {boot.kontak.telepon} · {boot.kontak.email}
        </p>
      )}
      <p className="mt-3 border-t border-navy-900/10 pt-2.5">
        © Si Pandu AI. Aplikasi ini menyediakan informasi edukatif dan bukan situs resmi BPOM.
      </p>
    </footer>
  );
}
