"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const STATUS_COLOR: Record<string, string> = {
  aktif: "#17a361",
  kadaluarsa: "#f5a524",
  dicabut: "#e5484d",
};

function makeIcon(color: string) {
  return new L.DivIcon({
    className: "",
    html: `<div style="background:${color};width:18px;height:18px;border-radius:9999px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export interface ApotekPoint {
  id: number;
  nama_apotek: string;
  alamat: string;
  latitude: number;
  longitude: number;
  status_izin: string;
}

export function ApotekMap({ apotek }: { apotek: ApotekPoint[] }) {
  const center: [number, number] = apotek.length
    ? [apotek[0].latitude, apotek[0].longitude]
    : [-8.1723, 113.7002];

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {apotek.map((a) => (
        <Marker key={a.id} position={[a.latitude, a.longitude]} icon={makeIcon(STATUS_COLOR[a.status_izin] ?? "#2c5596")}>
          <Popup>
            <strong>{a.nama_apotek}</strong>
            <br />
            {a.alamat}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
