"use client";

import { useState } from "react";
import { X, Save, MapPin, Crosshair, Map as MapIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Apotek, Bootstrap } from "../types";
import { geoService } from "../services/sigService";
import { LABEL_STATUS_SARANA } from "../types";

const KELAS =
  "w-full rounded-xl border border-navy-900/10 bg-white px-3 py-2 text-sm outline-none focus:border-bpom-500";

/**
 * Formulir tambah/ubah sarana.
 *
 * Koordinat dapat diisi dengan tiga cara: mengetik langsung, memilih titik
 * pada peta, atau memakai lokasi perangkat. Izin lokasi TIDAK pernah dipaksa
 * — pengguna harus menekan tombolnya sendiri.
 */
export function FormApotek({
  awal, boot, onTutup, onSimpan, onMintaPilihPeta, koordinatDariPeta,
}: {
  awal: Apotek | null;
  boot: Bootstrap | null;
  onTutup: () => void;
  onSimpan: (payload: Partial<Apotek>, lihatPeta: boolean) => Promise<void>;
  onMintaPilihPeta: () => void;
  koordinatDariPeta?: { lat: number; lng: number } | null;
}) {
  const [f, setF] = useState({
    nama_apotek: awal?.nama_apotek ?? "",
    alamat: awal?.alamat ?? "",
    kabupaten: awal?.kabupaten ?? "",
    kecamatan: awal?.kecamatan ?? "",
    desa: awal?.desa ?? "",
    // Titik hasil klik peta (bila ada) menjadi nilai awal; induk memberi
    // key baru saat titiknya berubah sehingga formulir tersusun ulang.
    latitude: koordinatDariPeta ? koordinatDariPeta.lat.toFixed(6) : (awal?.latitude != null ? String(awal.latitude) : ""),
    longitude: koordinatDariPeta ? koordinatDariPeta.lng.toFixed(6) : (awal?.longitude != null ? String(awal.longitude) : ""),
    nib: awal?.nib ?? "",
    nomor_identitas: awal?.nomor_identitas ?? "",
    pemilik: awal?.pemilik ?? "",
    penanggung_jawab: awal?.penanggung_jawab ?? "",
    telepon: awal?.telepon ?? "",
    email: awal?.email ?? "",
    jenis_sarana: awal?.jenis_sarana ?? "apotek",
    status_sarana: awal?.status_sarana ?? "aktif",
    keterangan: awal?.keterangan ?? "",
  });
  const [simpan, setSimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [ambilLokasi, setAmbilLokasi] = useState(false);

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const adaKoordinat = f.latitude.trim() !== "" || f.longitude.trim() !== "";
  const koordinatSah = !adaKoordinat || geoService.koordinatValid(f.latitude, f.longitude);
  const valid = f.nama_apotek.trim().length >= 3 && f.alamat.trim().length >= 3 && koordinatSah;

  /** Ambil lokasi perangkat — hanya saat pengguna menekan tombol. */
  function gunakanLokasiPerangkat() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGalat("Perangkat atau peramban ini tidak menyediakan layanan lokasi.");
      return;
    }
    setAmbilLokasi(true);
    setGalat(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setF((s) => ({
          ...s,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setAmbilLokasi(false);
      },
      () => {
        setGalat("Lokasi perangkat tidak dapat diambil. Anda tetap dapat mengisi koordinat secara manual atau memilih titik pada peta.");
        setAmbilLokasi(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function kirim(lihatPeta: boolean) {
    setSimpan(true);
    setGalat(null);
    try {
      const payload: Record<string, unknown> = { ...f };
      if (adaKoordinat) {
        payload.latitude = Number(f.latitude);
        payload.longitude = Number(f.longitude);
      } else {
        payload.latitude = null;
        payload.longitude = null;
      }
      // Medan kosong dikirim sebagai null agar tidak menimpa dengan string kosong.
      for (const k of Object.keys(payload)) {
        if (payload[k] === "") payload[k] = null;
      }
      await onSimpan(payload as Partial<Apotek>, lihatPeta);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Data gagal disimpan.");
    } finally {
      setSimpan(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onTutup} />
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-navy-900/10 bg-gradient-to-br from-navy-900 to-navy-800 px-5 py-3.5 text-white">
          <h3 className="flex items-center gap-2 text-base font-extrabold">
            <MapPin className="size-5" /> {awal ? "Ubah Data Sarana" : "Tambah Apotek"}
          </h3>
          <button onClick={onTutup} className="rounded-lg p-1 hover:bg-white/10"><X className="size-5" /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <Medan label="Nama Apotek *">
            <input className={KELAS} value={f.nama_apotek} onChange={(e) => set("nama_apotek", e.target.value)} />
          </Medan>

          <Medan label="Alamat *">
            <textarea className={KELAS} rows={2} value={f.alamat} onChange={(e) => set("alamat", e.target.value)} />
          </Medan>

          <div className="grid gap-3 sm:grid-cols-3">
            <Medan label="Kabupaten">
              <select className={KELAS} value={f.kabupaten} onChange={(e) => set("kabupaten", e.target.value)}>
                <option value="">— Pilih —</option>
                {(boot?.kabupaten ?? []).map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </Medan>
            <Medan label="Kecamatan">
              <input className={KELAS} value={f.kecamatan} onChange={(e) => set("kecamatan", e.target.value)} />
            </Medan>
            <Medan label="Desa/Kelurahan">
              <input className={KELAS} value={f.desa} onChange={(e) => set("desa", e.target.value)} />
            </Medan>
          </div>

          {/* Koordinat — tiga metode pengisian */}
          <div className="rounded-2xl border border-navy-900/10 bg-navy-50/40 p-3.5">
            <p className="text-xs font-bold text-navy-700">Koordinat Lokasi</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-navy-500">
              Isi manual, pilih titik pada peta, atau gunakan lokasi perangkat. Sarana tanpa koordinat
              tetap dapat disimpan namun belum akan tampil pada peta.
            </p>

            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              <Medan label="Latitude">
                <input className={KELAS} inputMode="decimal" placeholder="-8.1724"
                  value={f.latitude} onChange={(e) => set("latitude", e.target.value)} />
              </Medan>
              <Medan label="Longitude">
                <input className={KELAS} inputMode="decimal" placeholder="113.7002"
                  value={f.longitude} onChange={(e) => set("longitude", e.target.value)} />
              </Medan>
            </div>

            {!koordinatSah && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-rose-600">
                <AlertCircle className="size-3.5" /> Koordinat tidak valid.
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                onClick={onMintaPilihPeta}
                className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white px-3 py-1.5 text-[11px] font-bold text-navy-700 hover:bg-navy-50"
              >
                <MapIcon className="size-3.5" /> Pilih di Peta
              </button>
              <button
                onClick={gunakanLokasiPerangkat}
                disabled={ambilLokasi}
                className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white px-3 py-1.5 text-[11px] font-bold text-navy-700 hover:bg-navy-50 disabled:opacity-50"
              >
                <Crosshair className="size-3.5" /> {ambilLokasi ? "Mengambil lokasi…" : "Gunakan Lokasi Perangkat"}
              </button>
              {adaKoordinat && (
                <button
                  onClick={() => setF((s) => ({ ...s, latitude: "", longitude: "" }))}
                  className="rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Kosongkan
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Medan label="NIB">
              <input className={KELAS} value={f.nib} onChange={(e) => set("nib", e.target.value)} />
            </Medan>
            <Medan label="Nomor Izin / Identitas Sarana">
              <input className={KELAS} value={f.nomor_identitas} onChange={(e) => set("nomor_identitas", e.target.value)} />
            </Medan>
            <Medan label="Nama Pemilik">
              <input className={KELAS} value={f.pemilik} onChange={(e) => set("pemilik", e.target.value)} />
            </Medan>
            <Medan label="Penanggung Jawab">
              <input className={KELAS} value={f.penanggung_jawab} onChange={(e) => set("penanggung_jawab", e.target.value)} />
            </Medan>
            <Medan label="Nomor Telepon">
              <input className={KELAS} value={f.telepon} onChange={(e) => set("telepon", e.target.value)} />
            </Medan>
            <Medan label="Email">
              <input className={KELAS} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
            </Medan>
            <Medan label="Jenis Sarana">
              <select className={KELAS} value={f.jenis_sarana} onChange={(e) => set("jenis_sarana", e.target.value)}>
                {(boot?.jenis_sarana ?? ["apotek"]).map((j) => (
                  <option key={j} value={j}>{j.replace("_", " ")}</option>
                ))}
              </select>
            </Medan>
            <Medan label="Status Sarana">
              <select className={KELAS} value={f.status_sarana} onChange={(e) => set("status_sarana", e.target.value)}>
                {(boot?.status_sarana ?? []).map((s) => (
                  <option key={s} value={s}>{LABEL_STATUS_SARANA[s] ?? s}</option>
                ))}
              </select>
            </Medan>
          </div>

          <Medan label="Keterangan">
            <textarea className={KELAS} rows={2} value={f.keterangan} onChange={(e) => set("keterangan", e.target.value)} />
          </Medan>

          <p className="rounded-xl bg-navy-50 px-3 py-2 text-[10px] leading-relaxed text-navy-500">
            Data penanggung jawab dan kontak bersifat internal. Gunakan seperlunya dan jangan disebarkan
            ke kanal publik.
          </p>

          {galat && <p className="rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-700">{galat}</p>}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-navy-900/10 bg-white px-5 py-3.5">
          <Button variant="danger" onClick={onTutup}>Batal</Button>
          <Button variant="outline" disabled={!valid} loading={simpan} onClick={() => kirim(true)}>
            <MapIcon className="size-4" /> Simpan &amp; Lihat Peta
          </Button>
          <Button variant="secondary" disabled={!valid} loading={simpan} onClick={() => kirim(false)}>
            <Save className="size-4" /> Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}

function Medan({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={cn("text-[11px] font-semibold text-navy-500")}>{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
