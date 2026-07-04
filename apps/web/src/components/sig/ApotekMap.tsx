"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const STATUS_COLOR: Record<string, string> = {
  aktif: "#17a361",
  kadaluarsa: "#f5a524",
  dicabut: "#e5484d",
};

function makeIcon(color: string, adaPelanggaran: boolean) {
  // Titik dengan cincin peringatan jika ada catatan pelanggaran.
  const ring = adaPelanggaran ? `box-shadow:0 0 0 3px ${color}55, 0 2px 6px rgba(0,0,0,0.3)` : "box-shadow:0 2px 6px rgba(0,0,0,0.3)";
  return new L.DivIcon({
    className: "",
    html: `<div style="background:${color};width:18px;height:18px;border-radius:9999px;border:3px solid white;${ring}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export interface ApotekPoint {
  id: number;
  nama_apotek: string;
  alamat: string;
  kecamatan: string | null;
  latitude: number;
  longitude: number;
  nomor_izin: string | null;
  status_izin: string;
  penanggung_jawab: string | null;
  tanggal_pemeriksaan_terakhir: string | null;
  hasil_pemeriksaan_terakhir: string | null;
  jumlah_pelanggaran: number;
  keterangan_pelanggaran: string | null;
}

export function ApotekMap({ apotek }: { apotek: ApotekPoint[] }) {
  const center: [number, number] = apotek.length
    ? [apotek[0].latitude, apotek[0].longitude]
    : [-8.1787, 113.7065];

  return (
    <MapContainer center={center} zoom={11} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {apotek.map((a) => (
        <Marker
          key={a.id}
          position={[a.latitude, a.longitude]}
          icon={makeIcon(STATUS_COLOR[a.status_izin] ?? "#2c5596", a.jumlah_pelanggaran > 0)}
        >
          <Popup maxWidth={280}>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <strong style={{ fontSize: 14 }}>{a.nama_apotek}</strong>
              <br />
              {a.alamat}
              {a.kecamatan ? ` — Kec. ${a.kecamatan}` : ""}
              <hr style={{ margin: "6px 0", border: 0, borderTop: "1px solid #e5e9f0" }} />
              <table style={{ fontSize: 12, width: "100%" }}>
                <tbody>
                  <tr><td style={{ color: "#5b6b85", paddingRight: 8 }}>Status izin</td><td><strong style={{ textTransform: "capitalize" }}>{a.status_izin}</strong></td></tr>
                  {a.nomor_izin && <tr><td style={{ color: "#5b6b85" }}>No. izin</td><td>{a.nomor_izin}</td></tr>}
                  {a.penanggung_jawab && <tr><td style={{ color: "#5b6b85" }}>PJ</td><td>{a.penanggung_jawab}</td></tr>}
                  <tr>
                    <td style={{ color: "#5b6b85" }}>Pemeriksaan</td>
                    <td>{a.tanggal_pemeriksaan_terakhir ?? "Belum pernah"}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#5b6b85" }}>Pelanggaran</td>
                    <td style={{ color: a.jumlah_pelanggaran > 0 ? "#e5484d" : "#17a361", fontWeight: 700 }}>
                      {a.jumlah_pelanggaran > 0 ? `${a.jumlah_pelanggaran} temuan` : "Tidak ada"}
                    </td>
                  </tr>
                </tbody>
              </table>
              {a.hasil_pemeriksaan_terakhir && (
                <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "#5b6b85" }}>{a.hasil_pemeriksaan_terakhir}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
