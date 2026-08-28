"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  MapPinned, Plus, Upload, Download, SlidersHorizontal, BarChart3, Table2,
  Gauge, ShieldCheck, Share2, Loader2, ChevronRight, Home, MapPin, Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { extractApiErrorMessage } from "@bpom/shared";
import { cn } from "@/lib/utils";
import {
  apotekService, analyticsService, distribusiService, exportService, geoService,
} from "@/modules/sig-apotek/services/sigService";
import {
  FILTER_KOSONG, LAPISAN_AWAL,
  type Apotek, type BarisPrioritas, type Bootstrap, type FilterSig, type GarisDistribusi,
  type Kpi, type KualitasData, type LapisanPeta, type Peringatan, type RekapKabupaten,
  type RekapKecamatan, type SimpulDistribusi,
} from "@/modules/sig-apotek/types";
import {
  KartuKpi, PanelPeringatan, PanelFilter, KotakCari, KontrolLapisan, DisclaimerSig,
} from "@/modules/sig-apotek/components/Panels";
import { TabelApotek } from "@/modules/sig-apotek/components/TabelApotek";
import { FormApotek } from "@/modules/sig-apotek/components/FormApotek";
import { DetailApotekPanel } from "@/modules/sig-apotek/components/DetailApotek";
import { AnalisisSpasial, PanelPrioritas, PanelKualitasData } from "@/modules/sig-apotek/components/AnalisisPanels";
import { PanelDistribusi } from "@/modules/sig-apotek/components/DistribusiPanel";
import { ImporDialog } from "@/modules/sig-apotek/components/ImporDialog";
import { AsistenPanel } from "@/modules/sig-apotek/components/AsistenPanel";

// Leaflet memerlukan objek window sehingga peta dimuat hanya di sisi klien.
const PetaApotek = dynamic(
  () => import("@/modules/sig-apotek/components/PetaApotek").then((m) => m.PetaApotek),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-2xl bg-navy-100/60">
        <span className="flex items-center gap-2 text-sm font-medium text-navy-500">
          <Loader2 className="size-4 animate-spin" /> Memuat peta…
        </span>
      </div>
    ),
  }
);

type Tab = "peta" | "tabel" | "prioritas" | "analisis" | "distribusi" | "kualitas" | "asisten";

const TAB: { id: Tab; label: string; ikon: React.ReactNode }[] = [
  { id: "peta", label: "Peta", ikon: <MapPinned className="size-4" /> },
  { id: "tabel", label: "Data Apotek", ikon: <Table2 className="size-4" /> },
  { id: "prioritas", label: "Prioritas", ikon: <Gauge className="size-4" /> },
  { id: "analisis", label: "Analisis Spasial", ikon: <BarChart3 className="size-4" /> },
  { id: "distribusi", label: "Distribusi", ikon: <Share2 className="size-4" /> },
  { id: "kualitas", label: "Kualitas Data", ikon: <ShieldCheck className="size-4" /> },
  { id: "asisten", label: "Asisten", ikon: <Sparkles className="size-4" /> },
];

export default function SigApotekPage() {
  // ── Keadaan utama ────────────────────────────────────────────────────────
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [filter, setFilter] = useState<FilterSig>({ ...FILTER_KOSONG });
  const [apotek, setApotek] = useState<Apotek[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [peringatan, setPeringatan] = useState<Peringatan[]>([]);
  const [muat, setMuat] = useState(true);
  const [tik, setTik] = useState(0);
  const [pesan, setPesan] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("peta");
  const [lapisan, setLapisan] = useState<LapisanPeta>({ ...LAPISAN_AWAL });
  const [batas, setBatas] = useState<{ tersedia: boolean; data: object | null; catatan: string }>({
    tersedia: false, data: null, catatan: "",
  });

  const [fokus, setFokus] = useState<{ lat: number; lng: number } | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState<{ buka: boolean; awal: Apotek | null }>({ buka: false, awal: null });
  const [pilihTitik, setPilihTitik] = useState(false);
  const [titikBaru, setTitikBaru] = useState<{ lat: number; lng: number } | null>(null);
  const [impor, setImpor] = useState(false);
  const [filterMobile, setFilterMobile] = useState(false);

  // Data khusus tiap tab (diambil saat tabnya dibuka).
  const [prioritas, setPrioritas] = useState<{ data: BarisPrioritas[]; catatan: string } | null>(null);
  const [analisis, setAnalisis] = useState<{
    per_kabupaten: RekapKabupaten[]; per_kecamatan: RekapKecamatan[];
    cakupan_pemeriksaan: { label: string; jumlah: number }[]; catatan: string;
  } | null>(null);
  const [kualitas, setKualitas] = useState<{ data: KualitasData; catatan: string } | null>(null);
  const [distribusi, setDistribusi] = useState<{
    simpul: SimpulDistribusi[]; garis: GarisDistribusi[]; catatan: string;
  } | null>(null);

  const bolehUbah = boot?.peran !== "viewer";

  // ── Pengambilan data ─────────────────────────────────────────────────────

  useEffect(() => {
    geoService.loadGeoJSON("kabupaten").then((g) =>
      setBatas({ tersedia: g.tersedia, data: (g.data as object) ?? null, catatan: g.catatan })
    ).catch(() => undefined);
  }, []);

  useEffect(() => {
    let batal = false;
    apotekService
      .bootstrap(filter.kabupaten || undefined)
      .then((b) => { if (!batal) setBoot(b); })
      .catch(() => undefined);
    return () => { batal = true; };
  }, [filter.kabupaten]);

  useEffect(() => {
    let batal = false;
    // Pencarian tidak ikut memanggil ulang server: penyaringannya dilakukan
    // di sisi klien agar hasilnya terasa seketika.
    const saring = { ...filter, q: "" };

    Promise.all([
      apotekService.daftar(saring),
      analyticsService.ringkasan(saring),
    ])
      .then(([daftar, ringkasan]) => {
        if (batal) return;
        setApotek(daftar.data);
        setKpi(ringkasan.kpi);
        setPeringatan(ringkasan.peringatan);
      })
      .catch((e) => { if (!batal) setPesan(extractApiErrorMessage(e) || "Gagal memuat data. Silakan coba kembali."); })
      .finally(() => { if (!batal) setMuat(false); });

    return () => { batal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filter.kabupaten, filter.kecamatan, filter.status_sarana, filter.monitoring,
    filter.temuan, filter.tindak_lanjut, filter.jenis_sarana,
    filter.tanggal_dari, filter.tanggal_sampai, tik,
  ]);

  // Muat data tab saat pertama kali dibuka atau data berubah.
  useEffect(() => {
    const saring = { ...filter, q: "" };
    if (tab === "prioritas" && !prioritas) analyticsService.prioritasMonitoring(saring).then(setPrioritas).catch(() => undefined);
    if (tab === "analisis" && !analisis) analyticsService.analisisSpasial(saring).then(setAnalisis).catch(() => undefined);
    if (tab === "kualitas" && !kualitas) analyticsService.kualitasData(saring).then(setKualitas).catch(() => undefined);
    if (tab === "distribusi" && !distribusi) distribusiService.jaringan(filter.kabupaten || undefined).then(setDistribusi).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const segarkan = useCallback(() => {
    setMuat(true);
    setPrioritas(null); setAnalisis(null); setKualitas(null); setDistribusi(null);
    setTik((t) => t + 1);
  }, []);

  const gantiFilter = useCallback((f: FilterSig) => {
    setMuat(true);
    setPrioritas(null); setAnalisis(null); setKualitas(null); setDistribusi(null);
    setFilter(f);
  }, []);

  // ── Turunan ──────────────────────────────────────────────────────────────

  const hasilCari = useMemo(() => {
    const t = filter.q.trim().toLowerCase();
    if (t.length < 2) return [];
    return apotek.filter((a) =>
      [a.nama_apotek, a.alamat, a.nib, a.nomor_identitas, a.kecamatan]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [apotek, filter.q]);

  // Daftar yang ditampilkan mengikuti pencarian bila sedang aktif.
  const ditampilkan = filter.q.trim().length >= 2 ? hasilCari : apotek;

  // ── Aksi ─────────────────────────────────────────────────────────────────

  function lihatDiPeta(a: Apotek) {
    if (a.latitude == null || a.longitude == null) {
      setPesan("Sarana ini belum memiliki koordinat sehingga belum dapat ditampilkan di peta.");
      return;
    }
    setTab("peta");
    setDetailId(null);
    setFokus({ lat: a.latitude, lng: a.longitude });
  }

  function bukaDetailDariPencarian(id: number) {
    const a = apotek.find((x) => x.id === id);
    if (a?.latitude != null && a.longitude != null) {
      setTab("peta");
      setFokus({ lat: a.latitude, lng: a.longitude });
    }
    setDetailId(id);
    setFilter((f) => ({ ...f, q: "" }));
  }

  async function simpanSarana(payload: Partial<Apotek>, lihatPeta: boolean) {
    const hasil = form.awal
      ? await apotekService.perbarui(form.awal.id, payload)
      : await apotekService.simpan(payload);

    setForm({ buka: false, awal: null });
    setTitikBaru(null);
    setPesan(form.awal ? "Data sarana diperbarui." : "Data sarana disimpan.");
    segarkan();

    if (lihatPeta && hasil.latitude != null && hasil.longitude != null) {
      setTab("peta");
      setFokus({ lat: hasil.latitude, lng: hasil.longitude });
    }
  }

  async function unduh(format: "xlsx" | "csv") {
    try {
      await exportService.unduh({ ...filter, q: "" }, format);
    } catch {
      setPesan("Gagal mengunduh berkas. Silakan coba kembali.");
    }
  }

  // ── Tampilan ─────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl">
        {/* Remah roti + kepala */}
        <nav className="flex items-center gap-1.5 text-[11px] font-medium text-navy-400">
          <Home className="size-3" /> Dashboard <ChevronRight className="size-3" />
          <span className="text-navy-600">SIG Apotek</span>
        </nav>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-start gap-2 text-lg font-extrabold leading-tight text-navy-900 sm:text-2xl">
              <MapPinned className="mt-0.5 size-5 shrink-0 text-bpom-600 sm:size-6" />
              <span className="min-w-0">SIG Monitoring Distribusi Apotek</span>
            </h1>
            <p className="mt-1 text-sm font-semibold text-navy-600">Monitoring Apotek Berbasis Geospasial</p>
            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-navy-500">
              Visualisasi persebaran dan monitoring sarana apotek pada wilayah kerja Balai POM di Jember.
            </p>
          </div>

          {/* Aksi cepat — di layar sempit dibuat rata agar tidak meluber. */}
          <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
            {bolehUbah && (
              <>
                <Button size="sm" onClick={() => { setForm({ buka: true, awal: null }); setTitikBaru(null); }}>
                  <Plus className="size-4" /> Tambah Apotek
                </Button>
                <Button size="sm" variant="outline" onClick={() => setImpor(true)}>
                  <Upload className="size-4" /> Import
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => unduh("xlsx")}>
              <Download className="size-4" /> Export
            </Button>
            <Button size="sm" variant="outline" className="lg:hidden" onClick={() => setFilterMobile(true)}>
              <SlidersHorizontal className="size-4" /> Filter
            </Button>
          </div>
        </div>

        {pesan && (
          <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-navy-50 px-4 py-2.5 text-sm font-medium text-navy-700">
            <span>{pesan}</span>
            <button onClick={() => setPesan(null)} className="text-xs font-bold text-navy-400 hover:text-navy-700">Tutup</button>
          </div>
        )}

        {/* KPI */}
        <div className="mt-4">
          <KartuKpi kpi={kpi} muat={muat && !kpi} />
        </div>

        {/* Pencarian */}
        <div className="mt-4">
          <KotakCari
            nilai={filter.q}
            onChange={(v) => setFilter((f) => ({ ...f, q: v }))}
            hasil={hasilCari}
            onPilih={bukaDetailDariPencarian}
          />
        </div>

        {/* Tab */}
        <div className="mt-4 flex gap-1 overflow-x-auto rounded-2xl border border-navy-900/5 bg-white p-1 shadow-sm scrollbar-none">
          {TAB.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors",
                tab === t.id ? "bg-navy-900 text-white" : "text-navy-500 hover:bg-navy-50"
              )}
            >
              {t.ikon} {t.label}
            </button>
          ))}
        </div>

        {/* Isi */}
        <div className="mt-4 flex gap-4">
          {/* Panel kiri (desktop) */}
          <aside className="hidden w-72 shrink-0 space-y-3 lg:block">
            <PanelFilter filter={filter} setFilter={gantiFilter} boot={boot} jumlahHasil={ditampilkan.length} />
            {tab === "peta" && (
              <KontrolLapisan
                lapisan={lapisan} setLapisan={setLapisan}
                batasTersedia={batas.tersedia} catatanBatas={batas.catatan}
              />
            )}
            <PanelPeringatan daftar={peringatan} />
          </aside>

          <div className="min-w-0 flex-1">
            {tab === "peta" && (
              <>
                <Card className="!p-2">
                  <div className="h-[62vh] min-h-[420px] w-full">
                    <PetaApotek
                      apotek={ditampilkan}
                      lapisan={lapisan}
                      pusat={boot?.pusat_peta ?? { lat: -8.07, lng: 113.85, zoom: 9 }}
                      batasWilayah={batas.data}
                      distribusi={distribusi ?? undefined}
                      fokus={fokus}
                      modePilihTitik={pilihTitik}
                      titikPratinjau={titikBaru}
                      onPilihTitik={(lat, lng) => {
                        setTitikBaru({ lat, lng });
                        setPilihTitik(false);
                        setForm((f) => ({ ...f, buka: true }));
                      }}
                      onLihatDetail={(id) => setDetailId(id)}
                    />
                  </div>
                </Card>
                <p className="mt-2 text-[11px] text-navy-400">
                  Sumber peta dasar: OpenStreetMap. Titik menggambarkan keadaan data monitoring, bukan penilaian sarana.
                </p>
              </>
            )}

            {tab === "tabel" && (
              <TabelApotek
                data={ditampilkan}
                muat={muat}
                bolehUbah={!!bolehUbah}
                onDetail={(id) => setDetailId(id)}
                onPeta={lihatDiPeta}
                onEdit={(a) => { setTitikBaru(null); setForm({ buka: true, awal: a }); }}
              />
            )}

            {tab === "prioritas" && (
              prioritas
                ? <PanelPrioritas data={prioritas.data} catatan={prioritas.catatan} onDetail={(id) => setDetailId(id)} />
                : <Muat pesan="Menganalisis data…" />
            )}

            {tab === "analisis" && (
              analisis
                ? (
                  <AnalisisSpasial
                    perKabupaten={analisis.per_kabupaten}
                    perKecamatan={analisis.per_kecamatan}
                    cakupan={analisis.cakupan_pemeriksaan}
                    catatan={analisis.catatan}
                    onPilihKabupaten={(k) => gantiFilter({ ...filter, kabupaten: k, kecamatan: "" })}
                  />
                )
                : <Muat pesan="Menganalisis data…" />
            )}

            {tab === "distribusi" && (
              distribusi
                ? (
                  <PanelDistribusi
                    simpul={distribusi.simpul}
                    garis={distribusi.garis}
                    catatan={distribusi.catatan}
                    onDetailApotek={(id) => setDetailId(id)}
                    onLihatPeta={() => { setLapisan((l) => ({ ...l, distribusi: true })); setTab("peta"); }}
                  />
                )
                : <Muat pesan="Memuat data distribusi…" />
            )}

            {tab === "kualitas" && (
              kualitas
                ? <PanelKualitasData data={kualitas.data} catatan={kualitas.catatan} onDetail={(id) => setDetailId(id)} />
                : <Muat pesan="Memeriksa kualitas data…" />
            )}

            {tab === "asisten" && <AsistenPanel />}

            <div className="mt-4">
              <DisclaimerSig teks={boot?.disclaimer} />
            </div>
          </div>
        </div>

        {/* Tombol peta cepat (mobile) */}
        {tab !== "peta" && (
          <button
            onClick={() => setTab("peta")}
            className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-1.5 rounded-2xl bg-navy-900 px-4 py-3 text-xs font-bold text-white shadow-lg lg:hidden"
          >
            <MapPin className="size-4" /> Lihat Peta
          </button>
        )}
      </div>

      {/* Panel filter (mobile) */}
      {filterMobile && (
        <div className="fixed inset-0 z-[560] flex items-end lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={() => setFilterMobile(false)} />
          <div className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-background p-4">
            <PanelFilter
              filter={filter} setFilter={gantiFilter} boot={boot}
              jumlahHasil={ditampilkan.length} onTutup={() => setFilterMobile(false)}
            />
            {tab === "peta" && (
              <div className="mt-3">
                <KontrolLapisan
                  lapisan={lapisan} setLapisan={setLapisan}
                  batasTersedia={batas.tersedia} catatanBatas={batas.catatan}
                />
              </div>
            )}
            <div className="mt-3"><PanelPeringatan daftar={peringatan} /></div>
          </div>
        </div>
      )}

      {form.buka && (
        <FormApotek
          key={titikBaru ? `${titikBaru.lat},${titikBaru.lng}` : `f${form.awal?.id ?? "baru"}`}
          awal={form.awal}
          boot={boot}
          koordinatDariPeta={titikBaru}
          onTutup={() => { setForm({ buka: false, awal: null }); setTitikBaru(null); }}
          onSimpan={simpanSarana}
          onMintaPilihPeta={() => { setForm((f) => ({ ...f, buka: false })); setPilihTitik(true); setTab("peta"); }}
        />
      )}

      {detailId != null && (
        <DetailApotekPanel
          id={detailId}
          bolehUbah={!!bolehUbah}
          onTutup={() => setDetailId(null)}
          onLihatPeta={lihatDiPeta}
          onPerubahan={segarkan}
        />
      )}

      {impor && <ImporDialog onTutup={() => setImpor(false)} onSelesai={segarkan} />}
    </AppShell>
  );
}

function Muat({ pesan }: { pesan: string }) {
  return (
    <Card className="flex items-center justify-center gap-2 py-16">
      <Loader2 className="size-4 animate-spin text-navy-400" />
      <span className="text-sm font-medium text-navy-500">{pesan}</span>
    </Card>
  );
}
