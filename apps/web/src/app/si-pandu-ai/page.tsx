"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, MessageCircle, Search, Tag, Palette, ClipboardList,
  BookOpen, HelpCircle, Phone, History, Building2, Sparkles, X, Menu,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Maskot } from "@/components/pandu/Maskot";
import { DashboardView, RegulasiView, FaqView, KontakView } from "@/components/pandu/InfoViews";
import { KonsultasiView } from "@/components/pandu/KonsultasiView";
import { CekLabelView, EditLabelView } from "@/components/pandu/LabelViews";
import { CekProdukView, CapaView } from "@/components/pandu/AsesmenViews";
import { RiwayatView, ProfilUsahaView } from "@/components/pandu/RiwayatViews";
import { panduService, type Bootstrap } from "@/lib/pandu-service";
import { cn } from "@/lib/utils";

export type MenuPandu =
  | "dashboard" | "konsultasi" | "cek_produk" | "cek_label" | "edit_label"
  | "capa" | "regulasi" | "faq" | "kontak" | "riwayat" | "profil";

const MENU: { id: MenuPandu; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
  { id: "konsultasi", label: "Konsultasi BPOM", icon: <MessageCircle className="size-4" /> },
  { id: "cek_produk", label: "Cek Produk", icon: <Search className="size-4" /> },
  { id: "cek_label", label: "Cek Label", icon: <Tag className="size-4" /> },
  { id: "edit_label", label: "Edit Label", icon: <Palette className="size-4" /> },
  { id: "capa", label: "Bantuan CAPA", icon: <ClipboardList className="size-4" /> },
  { id: "regulasi", label: "Regulasi", icon: <BookOpen className="size-4" /> },
  { id: "faq", label: "FAQ", icon: <HelpCircle className="size-4" /> },
  { id: "kontak", label: "Hubungi BPOM Jember", icon: <Phone className="size-4" /> },
  { id: "riwayat", label: "Riwayat", icon: <History className="size-4" /> },
  { id: "profil", label: "Profil Usaha", icon: <Building2 className="size-4" /> },
];

/** Menu yang ditampilkan pada navigasi bawah (mobile). */
const MENU_UTAMA: MenuPandu[] = ["dashboard", "konsultasi", "cek_label", "capa"];

export default function SiPanduAiPage() {
  const [menu, setMenu] = useState<MenuPandu>("dashboard");
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [gagalMuat, setGagalMuat] = useState(false);
  const [navTerbuka, setNavTerbuka] = useState(false);

  useEffect(() => {
    panduService.bootstrap().then(setBoot).catch(() => setGagalMuat(true));
  }, []);

  const pindah = useCallback((m: MenuPandu) => {
    setMenu(m);
    setNavTerbuka(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const judul = MENU.find((m) => m.id === menu)?.label ?? "";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl pb-20 lg:pb-0">
        {/* Kepala brand */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Maskot size={52} />
            <div>
              <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-navy-900 sm:text-2xl">
                SI PANDU AI
                <Sparkles className="size-5 text-bpom-600" />
              </h1>
              <p className="text-sm text-navy-500">Asisten Pintar Pelaku Usaha</p>
            </div>
          </div>
          <button
            onClick={() => setNavTerbuka(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-700 lg:hidden"
          >
            <Menu className="size-4" /> Menu
          </button>
        </div>

        {gagalMuat && (
          <div className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700">
            Maaf, Si Pandu AI sedang mengalami kendala. Silakan coba kembali atau hubungi kanal resmi Balai POM di Jember.
          </div>
        )}

        <div className="mt-5 flex gap-6">
          {/* Sidebar (desktop & tablet) */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <nav className="sticky top-24 space-y-1">
              {MENU.map((m) => (
                <NavItem key={m.id} aktif={menu === m.id} onClick={() => pindah(m.id)} icon={m.icon}>
                  {m.label}
                </NavItem>
              ))}
            </nav>
          </aside>

          {/* Konten */}
          <div className="min-w-0 flex-1">
            <h2 className="mb-3 text-lg font-bold text-navy-900 lg:hidden">{judul}</h2>
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

            <PanduFooter boot={boot} />
          </div>
        </div>
      </div>

      {/* Laci navigasi (mobile) */}
      {navTerbuka && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={() => setNavTerbuka(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-navy-900/10 bg-gradient-to-br from-navy-900 to-navy-800 px-4 py-3.5 text-white">
              <span className="flex items-center gap-2 font-extrabold"><Sparkles className="size-4" /> SI PANDU AI</span>
              <button onClick={() => setNavTerbuka(false)} className="rounded-lg p-1 hover:bg-white/10">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {MENU.map((m) => (
                <NavItem key={m.id} aktif={menu === m.id} onClick={() => pindah(m.id)} icon={m.icon}>
                  {m.label}
                </NavItem>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Navigasi bawah (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-navy-900/10 bg-white/95 backdrop-blur lg:hidden">
        {MENU_UTAMA.map((id) => {
          const m = MENU.find((x) => x.id === id)!;
          return (
            <button
              key={id}
              onClick={() => pindah(id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors",
                menu === id ? "text-bpom-700" : "text-navy-400"
              )}
            >
              {m.icon}
              <span className="truncate px-1">{m.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </nav>
    </AppShell>
  );
}

function NavItem({
  aktif, onClick, icon, children,
}: { aktif: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all",
        aktif
          ? "bg-gradient-to-r from-bpom-600 to-bpom-500 text-white shadow-sm"
          : "text-navy-600 hover:bg-navy-50"
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
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
