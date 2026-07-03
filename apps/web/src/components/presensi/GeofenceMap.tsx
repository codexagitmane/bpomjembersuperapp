"use client";

import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import L from "leaflet";

// Marker default Leaflet butuh perbaikan path ikon saat dipakai dengan bundler.
const kantorIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#0b1f3a;width:16px;height:16px;border-radius:9999px;border:3px solid white;box-shadow:0 0 0 2px #0b1f3a"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
const userIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#17a361;width:16px;height:16px;border-radius:9999px;border:3px solid white;box-shadow:0 0 0 2px #17a361"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface GeofenceMapProps {
  kantorLat: number;
  kantorLng: number;
  radiusMeter: number;
  userLat?: number;
  userLng?: number;
}

export function GeofenceMap({ kantorLat, kantorLng, radiusMeter, userLat, userLng }: GeofenceMapProps) {
  const center: [number, number] = userLat && userLng ? [userLat, userLng] : [kantorLat, kantorLng];

  return (
    <MapContainer
      center={center}
      zoom={17}
      scrollWheelZoom={false}
      className="h-56 w-full rounded-2xl"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={[kantorLat, kantorLng]}
        radius={radiusMeter}
        pathOptions={{ color: "#17a361", fillColor: "#17a361", fillOpacity: 0.12 }}
      />
      <Marker position={[kantorLat, kantorLng]} icon={kantorIcon}>
        <Popup>Kantor Balai POM di Jember</Popup>
      </Marker>
      {userLat && userLng && (
        <Marker position={[userLat, userLng]} icon={userIcon}>
          <Popup>Lokasi Anda saat ini</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
