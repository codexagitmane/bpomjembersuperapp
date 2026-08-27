"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, GeoJSON, useMap, useMapEvents, Circle } from "react-leaflet";
import L from "leaflet";
import { MapPin, Eye, Layers, AlertCircle } from "lucide-react";
import type { Apotek, GarisDistribusi, LapisanPeta, SimpulDistribusi } from "../types";
import { WARNA_STATUS, LABEL_STATUS_SARANA } from "../types";

/**
 * Peta monitoring sarana apotek.
 *
 * Pengelompokan marker (clustering) dan heatmap dihitung sendiri berbasis
 * proyeksi piksel Leaflet — tanpa pustaka tambahan — agar tidak menambah
 * ketergantungan build dan performa tetap terkendali pada ratusan titik.
 */

interface Props {
  apotek: Apotek[];
  lapisan: LapisanPeta;
  pusat: { lat: number; lng: number; zoom: number };
  // Objek GeoJSON dari berkas resmi; tipe longgar agar tidak butuh @types/geojson.
  batasWilayah?: object | null;
  distribusi?: { simpul: SimpulDistribusi[]; garis: GarisDistribusi[] };
  fokus?: { lat: number; lng: number } | null;
  /** Mode pemilihan koordinat pada formulir. */
  modePilihTitik?: boolean;
  onPilihTitik?: (lat: number, lng: number) => void;
  titikPratinjau?: { lat: number; lng: number } | null;
  onLihatDetail?: (id: number) => void;
}

/** Ikon titik tunggal. */
function ikonTitik(warna: string, ukuran = 16) {
  return new L.DivIcon({
    className: "",
    html: `<div style="background:${warna};width:${ukuran}px;height:${ukuran}px;border-radius:9999px;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(11,31,58,.35)"></div>`,
    iconSize: [ukuran, ukuran],
    iconAnchor: [ukuran / 2, ukuran / 2],
  });
}

/** Ikon kelompok (cluster) dengan jumlah anggota. */
function ikonKelompok(jumlah: number, warna: string) {
  const d = jumlah >= 100 ? 46 : jumlah >= 25 ? 40 : 34;
  return new L.DivIcon({
    className: "",
    html: `<div style="background:${warna};width:${d}px;height:${d}px;border-radius:9999px;border:3px solid #fff;
      box-shadow:0 2px 8px rgba(11,31,58,.3);display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:800;font-size:${jumlah >= 100 ? 12 : 13}px;font-family:inherit">${jumlah}</div>`,
    iconSize: [d, d],
    iconAnchor: [d / 2, d / 2],
  });
}

const ikonPratinjau = new L.DivIcon({
  className: "",
  html: `<div style="width:20px;height:20px;border-radius:9999px;border:3px solid #1e4278;background:#fff;
    box-shadow:0 0 0 6px rgba(30,66,120,.18)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface Kelompok {
  kunci: string;
  lat: number;
  lng: number;
  anggota: Apotek[];
}

/** Kelompokkan titik berdasarkan petak piksel pada tingkat zoom saat ini. */
function kelompokkan(map: L.Map, titik: Apotek[], zoom: number, petak = 64): Kelompok[] {
  const peta = new Map<string, Kelompok>();

  for (const a of titik) {
    if (a.latitude == null || a.longitude == null) continue;
    const p = map.project([a.latitude, a.longitude], zoom);
    const kunci = `${Math.floor(p.x / petak)}:${Math.floor(p.y / petak)}`;
    const ada = peta.get(kunci);
    if (ada) {
      ada.anggota.push(a);
    } else {
      peta.set(kunci, { kunci, lat: a.latitude, lng: a.longitude, anggota: [a] });
    }
  }

  // Titik kelompok diletakkan pada rata-rata anggotanya agar tidak melompat.
  return [...peta.values()].map((k) => {
    const n = k.anggota.length;
    const lat = k.anggota.reduce((s, a) => s + (a.latitude ?? 0), 0) / n;
    const lng = k.anggota.reduce((s, a) => s + (a.longitude ?? 0), 0) / n;
    return { ...k, lat, lng };
  });
}

/** Lapisan marker: individual atau dikelompokkan sesuai zoom. */
function LapisanMarker({
  apotek, cluster, onLihatDetail,
}: { apotek: Apotek[]; cluster: boolean; onLihatDetail?: (id: number) => void }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  const kelompok = useMemo(
    () => (cluster ? kelompokkan(map, apotek, zoom) : []),
    [apotek, cluster, zoom, map]
  );

  // Pada zoom rapat, tampilkan marker individual meski cluster aktif.
  const tampilIndividual = !cluster || zoom >= 14;

  if (tampilIndividual) {
    return (
      <>
        {apotek.map((a) =>
          a.latitude != null && a.longitude != null ? (
            <Marker
              key={a.id}
              position={[a.latitude, a.longitude]}
              icon={ikonTitik(WARNA_STATUS[a.status_peta].warna)}
            >
              <Popup>
                <IsiPopup apotek={a} onLihatDetail={onLihatDetail} />
              </Popup>
            </Marker>
          ) : null
        )}
      </>
    );
  }

  return (
    <>
      {kelompok.map((k) =>
        k.anggota.length === 1 ? (
          <Marker
            key={k.anggota[0].id}
            position={[k.lat, k.lng]}
            icon={ikonTitik(WARNA_STATUS[k.anggota[0].status_peta].warna)}
          >
            <Popup>
              <IsiPopup apotek={k.anggota[0]} onLihatDetail={onLihatDetail} />
            </Popup>
          </Marker>
        ) : (
          <Marker
            key={k.kunci}
            position={[k.lat, k.lng]}
            icon={ikonKelompok(k.anggota.length, warnaKelompok(k.anggota))}
            eventHandlers={{
              click: () => map.flyTo([k.lat, k.lng], Math.min(16, map.getZoom() + 3), { duration: 0.6 }),
            }}
          >
            <Popup>
              <p className="text-sm font-bold text-navy-900">{k.anggota.length} sarana di area ini</p>
              <p className="mt-0.5 text-xs text-navy-500">Perbesar peta untuk melihat masing-masing sarana.</p>
            </Popup>
          </Marker>
        )
      )}
    </>
  );
}

/** Warna kelompok mengikuti status paling perlu perhatian di dalamnya. */
function warnaKelompok(anggota: Apotek[]): string {
  if (anggota.some((a) => a.status_peta === "ada_temuan")) return WARNA_STATUS.ada_temuan.warna;
  if (anggota.some((a) => a.status_peta === "perlu_monitoring")) return WARNA_STATUS.perlu_monitoring.warna;
  if (anggota.every((a) => a.status_peta === "belum_lengkap")) return WARNA_STATUS.belum_lengkap.warna;
  return WARNA_STATUS.baik.warna;
}

/** Heatmap sederhana: lingkaran transparan bertumpuk menandai konsentrasi. */
function LapisanHeatmap({ apotek }: { apotek: Apotek[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  // Radius menyesuaikan zoom agar tampilan tetap proporsional.
  const radius = useMemo(() => Math.max(600, 90000 / Math.pow(1.7, zoom - 8)), [zoom]);

  return (
    <>
      {apotek.map((a) =>
        a.latitude != null && a.longitude != null ? (
          <Circle
            key={`h-${a.id}`}
            center={[a.latitude, a.longitude]}
            radius={radius}
            pathOptions={{ color: "transparent", fillColor: "#d9822b", fillOpacity: 0.16 }}
          />
        ) : null
      )}
    </>
  );
}

/** Garis hubungan distribusi antar sarana yang datanya tercatat. */
function LapisanDistribusi({
  simpul, garis,
}: { simpul: SimpulDistribusi[]; garis: GarisDistribusi[] }) {
  const posisi = useMemo(() => {
    const m = new Map<string, [number, number]>();
    for (const s of simpul) {
      if (s.latitude != null && s.longitude != null) m.set(s.id, [s.latitude, s.longitude]);
    }
    return m;
  }, [simpul]);

  return (
    <>
      {garis.map((g) => {
        const a = posisi.get(g.dari);
        const b = posisi.get(g.ke);
        // Hanya digambar bila KEDUA ujungnya benar-benar punya koordinat.
        if (!a || !b) return null;
        return (
          <Polyline
            key={`d-${g.id}`}
            positions={[a, b]}
            pathOptions={{
              color: g.lengkap ? "#2c5596" : "#9aa7b8",
              weight: 2,
              opacity: 0.75,
              dashArray: g.lengkap ? undefined : "5 6",
            }}
          >
            <Popup>
              <p className="text-sm font-bold text-navy-900">{g.produk ?? "Produk tidak dicantumkan"}</p>
              <p className="mt-0.5 text-xs text-navy-600">
                {g.jumlah ?? "—"} {g.satuan ?? ""} • {g.tanggal ?? "tanggal tidak tercatat"}
              </p>
              {g.referensi && <p className="text-xs text-navy-500">Referensi: {g.referensi}</p>}
              {!g.lengkap && (
                <p className="mt-1 text-xs font-medium text-amber-600">
                  Data hubungan distribusi belum lengkap.
                </p>
              )}
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
}

/** Isi popup marker sarana. */
function IsiPopup({ apotek: a, onLihatDetail }: { apotek: Apotek; onLihatDetail?: (id: number) => void }) {
  return (
    <div className="min-w-[210px]">
      <p className="text-sm font-bold text-navy-900">{a.nama_apotek}</p>
      <p className="mt-0.5 text-xs text-navy-600">{a.alamat}</p>
      <dl className="mt-1.5 space-y-0.5 text-xs text-navy-500">
        <div>{[a.kecamatan, a.kabupaten].filter(Boolean).join(", ") || "Wilayah belum lengkap"}</div>
        <div>
          Status:{" "}
          <span style={{ color: WARNA_STATUS[a.status_peta].warna }} className="font-semibold">
            {WARNA_STATUS[a.status_peta].label}
          </span>
          <span className="text-navy-400"> • {LABEL_STATUS_SARANA[a.status_sarana] ?? a.status_sarana}</span>
        </div>
        <div>Pemeriksaan terakhir: {a.tanggal_pemeriksaan_terakhir ?? "belum ada catatan"}</div>
        <div>
          Tindak lanjut:{" "}
          {a.tindak_lanjut_belum > 0 ? `${a.tindak_lanjut_belum} belum selesai` : "tidak ada yang tertunda"}
        </div>
      </dl>
      {onLihatDetail && (
        <button
          onClick={() => onLihatDetail(a.id)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-bpom-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-bpom-700"
        >
          <Eye className="size-3.5" /> Lihat Detail
        </button>
      )}
    </div>
  );
}

/** Menangkap klik peta saat mode pemilihan titik aktif. */
function PenangkapKlik({ aktif, onPilih }: { aktif: boolean; onPilih?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (aktif && onPilih) onPilih(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Terbangkan peta ke titik yang dipilih dari daftar/pencarian. */
function Fokus({ titik }: { titik?: { lat: number; lng: number } | null }) {
  const map = useMap();
  const terakhir = useRef<string>("");

  useEffect(() => {
    if (!titik) return;
    const kunci = `${titik.lat},${titik.lng}`;
    if (kunci === terakhir.current) return;
    terakhir.current = kunci;
    map.flyTo([titik.lat, titik.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [titik, map]);

  return null;
}

export function PetaApotek({
  apotek, lapisan, pusat, batasWilayah, distribusi, fokus,
  modePilihTitik = false, onPilihTitik, titikPratinjau, onLihatDetail,
}: Props) {
  const berkoordinat = useMemo(
    () => apotek.filter((a) => a.latitude != null && a.longitude != null),
    [apotek]
  );
  const tanpaKoordinat = apotek.length - berkoordinat.length;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <MapContainer
        center={[pusat.lat, pusat.lng]}
        zoom={pusat.zoom}
        scrollWheelZoom
        className="h-full w-full"
        style={{ cursor: modePilihTitik ? "crosshair" : undefined }}
      >
        <TileLayer
          attribution='&copy; Kontributor <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {lapisan.batasWilayah && batasWilayah && (
          <GeoJSON
            data={batasWilayah as never}
            style={{ color: "#2c5596", weight: 1.2, fillColor: "#2c5596", fillOpacity: 0.05 }}
            onEachFeature={(fitur, lapisan) => {
              const p = (fitur as { properties?: Record<string, unknown> }).properties;
              const nama = typeof p?.nama === "string" ? p.nama : null;
              if (nama) lapisan.bindTooltip(nama, { sticky: true });
            }}
          />
        )}

        {lapisan.heatmap && <LapisanHeatmap apotek={berkoordinat} />}

        {lapisan.distribusi && distribusi && (
          <LapisanDistribusi simpul={distribusi.simpul} garis={distribusi.garis} />
        )}

        {lapisan.marker && (
          <LapisanMarker apotek={berkoordinat} cluster={lapisan.cluster} onLihatDetail={onLihatDetail} />
        )}

        {titikPratinjau && <Marker position={[titikPratinjau.lat, titikPratinjau.lng]} icon={ikonPratinjau} />}

        <PenangkapKlik aktif={modePilihTitik} onPilih={onPilihTitik} />
        <Fokus titik={fokus} />
      </MapContainer>

      {/* Keterangan warna */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-xl bg-white/95 px-3 py-2.5 shadow-md backdrop-blur">
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-navy-400">
          <Layers className="size-3" /> Keterangan
        </p>
        <div className="space-y-1">
          {Object.entries(WARNA_STATUS).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-[11px] text-navy-600">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: v.warna }} />
              {v.label}
            </div>
          ))}
        </div>
      </div>

      {modePilihTitik && (
        <div className="absolute left-1/2 top-3 z-[400] -translate-x-1/2 rounded-xl bg-navy-900/90 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur">
          <MapPin className="mr-1.5 inline size-3.5" /> Klik pada peta untuk menentukan titik lokasi
        </div>
      )}

      {tanpaKoordinat > 0 && !modePilihTitik && (
        <div className="absolute right-3 top-3 z-[400] flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-[11px] font-semibold text-navy-600 shadow-md backdrop-blur">
          <AlertCircle className="size-3.5 text-amber-500" />
          {tanpaKoordinat} sarana belum berkoordinat
        </div>
      )}
    </div>
  );
}
