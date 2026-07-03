"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  History,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CameraCapture } from "@/components/presensi/CameraCapture";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { extractApiErrorMessage, haversineDistanceMeter } from "@bpom/shared";
import { formatJam, formatTanggalIndonesia } from "@/lib/utils";

const GeofenceMap = dynamic(
  () => import("@/components/presensi/GeofenceMap").then((m) => m.GeofenceMap),
  { ssr: false, loading: () => <div className="h-56 w-full animate-pulse rounded-2xl bg-navy-100" /> }
);

interface KantorInfo {
  nama: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
  jam_masuk: string;
  jam_pulang: string;
  toleransi_menit: number;
}

interface PresensiHariIni {
  id: number;
  tanggal: string;
  jam_masuk: string | null;
  jam_keluar: string | null;
  status_masuk: string | null;
  status_keluar: string | null;
  foto_masuk_url: string | null;
  foto_keluar_url: string | null;
}

interface RiwayatItem extends PresensiHariIni {
  jarak_masuk_meter: number | null;
  jarak_keluar_meter: number | null;
}

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  tepat_waktu: { label: "Tepat Waktu", tone: "success" },
  terlambat: { label: "Terlambat", tone: "warning" },
  pulang_awal: { label: "Pulang Awal", tone: "warning" },
  di_luar_geofence: { label: "Di Luar Radius", tone: "danger" },
};

export default function PresensiPage() {
  const [kantor, setKantor] = useState<KantorInfo | null>(null);
  const [hariIni, setHariIni] = useState<PresensiHariIni | null>(null);
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const [selfie, setSelfie] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [kantorRes, hariIniRes, riwayatRes] = await Promise.all([
      api.get("/presensi/kantor-info"),
      api.get("/presensi/hari-ini"),
      api.get("/presensi/riwayat"),
    ]);
    setKantor(kantorRes.data);
    setHariIni(hariIniRes.data.presensi);
    setRiwayat(riwayatRes.data.data ?? []);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Perangkat/browser Anda tidak mendukung GPS.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
      },
      () => {
        setGeoError("Gagal mendapatkan lokasi. Aktifkan izin GPS di browser Anda.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  const sudahCheckIn = !!hariIni?.jam_masuk;
  const sudahCheckOut = !!hariIni?.jam_keluar;
  const aksi: "check-in" | "check-out" | "selesai" = !sudahCheckIn
    ? "check-in"
    : !sudahCheckOut
      ? "check-out"
      : "selesai";

  const distance =
    coords && kantor ? haversineDistanceMeter(coords.lat, coords.lng, kantor.latitude, kantor.longitude) : null;
  const diDalamRadius = distance !== null && kantor ? distance <= kantor.radius_meter : null;

  async function handleSubmit() {
    if (!coords || !selfie) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const form = new FormData();
    form.append("latitude", String(coords.lat));
    form.append("longitude", String(coords.lng));
    form.append("accuracy_meter", String(Math.round(coords.accuracy)));
    form.append("foto", selfie);

    try {
      await api.post(`/presensi/${aksi}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSubmitSuccess(aksi === "check-in" ? "Presensi masuk berhasil dicatat!" : "Presensi pulang berhasil dicatat!");
      setSelfie(null);
      await loadData();
    } catch (err) {
      setSubmitError(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-extrabold text-navy-900">Presensi Berbasis Lokasi & Selfie</h1>
        <p className="mt-1 text-sm text-navy-500">
          Sistem akan memvalidasi lokasi GPS Anda terhadap radius kantor sebelum presensi diterima.
        </p>

        {loading ? (
          <div className="mt-6 h-64 animate-pulse rounded-[1.25rem] bg-navy-100/60" />
        ) : (
          <>
            {/* Status hari ini */}
            <Card className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-navy-900">Status Hari Ini</h2>
                <span className="text-xs text-navy-400">{formatTanggalIndonesia(new Date().toISOString())}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatusBox
                  label="Masuk"
                  jam={formatJam(hariIni?.jam_masuk)}
                  status={hariIni?.status_masuk}
                />
                <StatusBox
                  label="Pulang"
                  jam={formatJam(hariIni?.jam_keluar)}
                  status={hariIni?.status_keluar}
                />
              </div>

              {aksi === "selesai" && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-bpom-50 px-4 py-3 text-sm font-semibold text-bpom-700">
                  <CheckCircle2 className="size-4.5" />
                  Presensi hari ini sudah lengkap. Sampai jumpa besok!
                </div>
              )}
            </Card>

            {aksi !== "selesai" && kantor && (
              <Card className="mt-4">
                <h2 className="font-bold text-navy-900">
                  {aksi === "check-in" ? "Presensi Masuk" : "Presensi Pulang"}
                </h2>

                <div className="mt-4">
                  <GeofenceMap
                    kantorLat={kantor.latitude}
                    kantorLng={kantor.longitude}
                    radiusMeter={kantor.radius_meter}
                    userLat={coords?.lat}
                    userLng={coords?.lng}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-navy-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-navy-700">
                    <MapPin className="size-4 shrink-0" />
                    {locating && "Mendeteksi lokasi..."}
                    {!locating && geoError && <span className="text-rose-500">{geoError}</span>}
                    {!locating && !geoError && distance !== null && (
                      <span>
                        Jarak dari kantor: <strong>{Math.round(distance)} m</strong>{" "}
                        {diDalamRadius ? (
                          <Badge tone="success" className="ml-1">Dalam radius</Badge>
                        ) : (
                          <Badge tone="danger" className="ml-1">Di luar radius</Badge>
                        )}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={locate}
                    disabled={locating}
                    className="text-navy-400 hover:text-navy-700 disabled:opacity-50"
                    aria-label="Perbarui lokasi"
                  >
                    <RefreshCw className={`size-4 ${locating ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <div className="mt-5">
                  <CameraCapture onCapture={setSelfie} />
                </div>

                {submitError && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {submitError}
                  </div>
                )}
                {submitSuccess && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-bpom-50 px-4 py-3 text-sm font-medium text-bpom-700">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    {submitSuccess}
                  </div>
                )}

                <Button
                  size="lg"
                  className="mt-5 w-full"
                  disabled={!coords || !selfie}
                  loading={submitting}
                  onClick={handleSubmit}
                >
                  {aksi === "check-in" ? <LogIn className="size-4" /> : <LogOut className="size-4" />}
                  {aksi === "check-in" ? "Presensi Masuk Sekarang" : "Presensi Pulang Sekarang"}
                </Button>
              </Card>
            )}

            {/* Riwayat */}
            <Card className="mt-4">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-navy-900">
                <History className="size-4.5" /> Riwayat Presensi
              </h2>
              {riwayat.length === 0 && (
                <p className="py-6 text-center text-sm text-navy-400">Belum ada riwayat presensi.</p>
              )}
              <div className="divide-y divide-navy-900/5">
                {riwayat.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-semibold text-navy-900">
                        {formatTanggalIndonesia(r.tanggal)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-navy-400">
                        <Clock className="size-3.5" />
                        {formatJam(r.jam_masuk)} – {formatJam(r.jam_keluar)}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      {r.status_masuk && (
                        <Badge tone={STATUS_LABEL[r.status_masuk]?.tone ?? "neutral"}>
                          {STATUS_LABEL[r.status_masuk]?.label ?? r.status_masuk}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

function StatusBox({ label, jam, status }: { label: string; jam: string; status?: string | null }) {
  const info = status ? STATUS_LABEL[status] : null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl bg-navy-50 p-4"
    >
      <p className="text-xs font-medium text-navy-400">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-navy-900">{jam}</p>
      {info && (
        <Badge tone={info.tone} className="mt-2">
          {info.label}
        </Badge>
      )}
    </motion.div>
  );
}
