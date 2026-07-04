"use client";

import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import L from "leaflet";

// Marker default Leaflet butuh perbaikan path ikon saat dipakai dengan bundler,
// jadi kita pakai DivIcon berwarna sesuai tema.
const kantorIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#0b1f3a;width:16px;height:16px;border-radius:9999px;border:3px solid white;box-shadow:0 0 0 2px #0b1f3a"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
const wfhIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#f5a524;width:16px;height:16px;border-radius:9999px;border:3px solid white;box-shadow:0 0 0 2px #f5a524"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
const userIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#17a361;width:16px;height:16px;border-radius:9999px;border:3px solid white;box-shadow:0 0 0 2px #17a361"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export interface TitikKantor {
  slug: string;
  nama: string;
  latitude: number;
  longitude: number;
}

interface GeofenceMapProps {
  titikKantor: TitikKantor[];
  radiusMeter: number;
  userLat?: number;
  userLng?: number;
  wfhLat?: number;
  wfhLng?: number;
}

export function GeofenceMap({
  titikKantor,
  radiusMeter,
  userLat,
  userLng,
  wfhLat,
  wfhLng,
}: GeofenceMapProps) {
  const center: [number, number] =
    userLat && userLng
      ? [userLat, userLng]
      : titikKantor.length
        ? [titikKantor[0].latitude, titikKantor[0].longitude]
        : [-8.1787, 113.7065];

  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom={false}
      className="h-56 w-full rounded-2xl"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {titikKantor.map((t) => (
        <span key={t.slug}>
          <Circle
            center={[t.latitude, t.longitude]}
            radius={radiusMeter}
            pathOptions={{ color: "#17a361", fillColor: "#17a361", fillOpacity: 0.12 }}
          />
          <Marker position={[t.latitude, t.longitude]} icon={kantorIcon}>
            <Popup>{t.nama}</Popup>
          </Marker>
        </span>
      ))}
      {wfhLat != null && wfhLng != null && (
        <>
          <Circle
            center={[wfhLat, wfhLng]}
            radius={radiusMeter}
            pathOptions={{ color: "#f5a524", fillColor: "#f5a524", fillOpacity: 0.12 }}
          />
          <Marker position={[wfhLat, wfhLng]} icon={wfhIcon}>
            <Popup>Lokasi WFH terdaftar</Popup>
          </Marker>
        </>
      )}
      {userLat != null && userLng != null && (
        <Marker position={[userLat, userLng]} icon={userIcon}>
          <Popup>Lokasi Anda saat ini</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
