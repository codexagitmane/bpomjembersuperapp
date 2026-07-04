"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import "leaflet/dist/leaflet.css";
import { TITIK_KANTOR_BPOM_JEMBER, RADIUS_GEOFENCE_METER } from "@bpom/shared";

export interface WfhMapPoint {
  id: number;
  label: string;
  nama: string;
  latitude: number;
  longitude: number;
}

/**
 * Peta verifikasi WFH real-time — Leaflet murni (tanpa react-leaflet karena
 * belum mendukung React 19). Marker rumah pegawai berdenyut (pulse), kedua
 * kantor BPOM ditandai beserta radius geofence 100 m, dan garis animasi
 * "dash-flow" menghubungkan titik WFH ke kantor terdekat + label jaraknya.
 */
export function WfhMap({ points, focusId }: { points: WfhMapPoint[]; focusId: number | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<{ markers: Record<number, Marker>; lines: Polyline[] }>({ markers: {}, lines: [] });
  // Efek marker harus menunggu init async peta selesai.
  const [ready, setReady] = useState(false);

  // Inisialisasi peta sekali
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [TITIK_KANTOR_BPOM_JEMBER[0].latitude, TITIK_KANTOR_BPOM_JEMBER[0].longitude],
        zoom: 13,
        zoomControl: true,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Marker kantor + radius geofence
      for (const kantor of TITIK_KANTOR_BPOM_JEMBER) {
        const icon = L.divIcon({
          className: "",
          html: `<div class="wfh-office-marker" title="${kantor.nama}">🏢</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        L.marker([kantor.latitude, kantor.longitude], { icon })
          .addTo(map)
          .bindPopup(`<strong>${kantor.nama}</strong><br/>Radius presensi ${RADIUS_GEOFENCE_METER} m`);
        L.circle([kantor.latitude, kantor.longitude], {
          radius: RADIUS_GEOFENCE_METER,
          color: "#0b5cad",
          weight: 1.5,
          fillColor: "#0b5cad",
          fillOpacity: 0.08,
          dashArray: "4 4",
        }).addTo(map);
      }

      mapRef.current = map;
      setReady(true);
      // Trigger render titik pertama kali
      setTimeout(() => map.invalidateSize(), 50);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render / perbarui titik WFH
  useEffect(() => {
    (async () => {
      const map = mapRef.current;
      if (!map || !ready) return;
      const L = (await import("leaflet")).default;

      // Bersihkan layer lama
      Object.values(layersRef.current.markers).forEach((m) => m.remove());
      layersRef.current.lines.forEach((l) => l.remove());
      layersRef.current = { markers: {}, lines: [] };

      for (const p of points) {
        const icon = L.divIcon({
          className: "",
          html: `<div class="wfh-pulse-marker"><span class="wfh-pulse-ring"></span><span class="wfh-pulse-dot">🏠</span></div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        const marker = L.marker([p.latitude, p.longitude], { icon }).addTo(map);

        // Kantor terdekat + jarak (haversine)
        const nearest = TITIK_KANTOR_BPOM_JEMBER.map((k) => ({
          k,
          d: haversine(p.latitude, p.longitude, k.latitude, k.longitude),
        })).sort((a, b) => a.d - b.d)[0];

        marker.bindPopup(
          `<strong>${p.nama}</strong><br/>${p.label}<br/>` +
            `<span style="color:#0f854e;font-weight:600">${formatJarak(nearest.d)} dari ${nearest.k.nama}</span>`
        );

        const line = L.polyline(
          [
            [p.latitude, p.longitude],
            [nearest.k.latitude, nearest.k.longitude],
          ],
          { color: "#0f854e", weight: 2, dashArray: "6 8", className: "wfh-flow-line" }
        ).addTo(map);

        layersRef.current.lines.push(line);
        layersRef.current.markers[p.id] = marker;
      }

      // Fit semua titik
      if (points.length > 0) {
        const bounds = L.latLngBounds([
          ...points.map((p) => [p.latitude, p.longitude] as [number, number]),
          ...TITIK_KANTOR_BPOM_JEMBER.map((k) => [k.latitude, k.longitude] as [number, number]),
        ]);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    })();
  }, [points, ready]);

  // Animasi flyTo saat item dipilih
  useEffect(() => {
    const map = mapRef.current;
    if (!map || focusId == null) return;
    const p = points.find((x) => x.id === focusId);
    if (!p) return;
    map.flyTo([p.latitude, p.longitude], 16, { duration: 1.2 });
    const marker = layersRef.current.markers[p.id];
    if (marker) setTimeout(() => marker.openPopup(), 1300);
  }, [focusId, points]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-navy-900/10 shadow-sm">
      <div ref={containerRef} className="h-80 w-full md:h-96" />
    </div>
  );
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatJarak(meter: number): string {
  return meter >= 1000 ? `${(meter / 1000).toFixed(2)} km` : `${Math.round(meter)} m`;
}
