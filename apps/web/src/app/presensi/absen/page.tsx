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
  Building2,
  Home,
  Briefcase,
  Info,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PresensiTabs } from "@/components/presensi/PresensiTabs";
import { CameraCapture } from "@/components/presensi/CameraCapture";
import type { TitikKantor } from "@/components/presensi/GeofenceMap";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { extractApiErrorMessage, haversineDistanceMeter } from "@bpom/shared";
import { formatJam, formatTanggalIndonesia, cn } from "@/lib/utils";

const GeofenceMap = dynamic(
  () => import("@/components/presensi/GeofenceMap").then((m) => m.GeofenceMap),
  { ssr: false, loading: () => <div className="h-56 w-full animate-pulse rounded-2xl bg-navy-100" /> }
);

type ModePresensi = "wfo" | "wfh" | "dinas";

interface KantorInfo {
  titik_kantor: TitikKantor[];
  radius_meter: number;
  batas_absen: string;
  jenis_pegawai: string;
  jadwal_hari_ini: {
    boleh_absen: boolean;
    alasan: string | null;
    jam_masuk: string | null;
    jam_pulang: string | null;
    shift_lintas_hari: boolean;
  };
}

interface PresensiHariIni {
  id: number;
  tanggal: string;
  jam_masuk: string | null;
  jam_keluar: string | null;
  status_masuk: string | null;
  status_keluar: string | null;
  mode_masuk: string | null;
  mode_keluar: string | null;
}

interface WfhLokasi {
  id: number;
  label: string;
  alamat: string | null;
  latitude: number;
  longitude: number;
  status: "diajukan" | "diverifikasi" | "ditolak";
  catatan_verifikasi: string | null;
}

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  tepat_waktu: { label: "Tepat Waktu", tone: "success" },
  terlambat: { label: "Terlambat", tone: "warning" },
  pulang_awal: { label: "Pulang Awal", tone: "warning" },
  di_luar_geofence: { label: "Di Luar Radius", tone: "danger" },
  lewat_batas: { label: "Lewat Batas", tone: "danger" },
};

const MODE_OPTIONS: { value: ModePresensi; label: string; icon: typeof Building2; desc: string }[] = [
  { value: "wfo", label: "WFO", icon: Building2, desc: "Di kantor / gedung lab" },
  { value: "wfh", label: "WFH", icon: Home, desc: "Dari rumah terdaftar" },
  { value: "dinas", label: "Dinas", icon: Briefcase, desc: "Tugas luar kantor" },
];

export default function AbsenPage() {
  const [kantor, setKantor] = useState<KantorInfo | null>(null);
  const [hariIni, setHariIni] = useState<PresensiHariIni | null>(null);
  const [shiftKemarin, setShiftKemarin] = useState<PresensiHariIni | null>(null);
  const [wfhLokasi, setWfhLokasi] = useState<WfhLokasi | null>(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<ModePresensi>("wfo");
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const [selfie, setSelfie] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [showWfhForm, setShowWfhForm] = useState(false);
  const [wfhForm, setWfhForm] = useState({ label: "Rumah", alamat: "" });
  const [wfhSubmitting, setWfhSubmitting] = useState(false);
  const [wfhMsg, setWfhMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [kantorRes, hariIniRes, wfhRes] = await Promise.all([
      api.get("/presensi/kantor-info"),
      api.get("/presensi/hari-ini"),
      api.get("/presensi/wfh-lokasi"),
    ]);
    setKantor(kantorRes.data);
    setHariIni(hariIniRes.data.presensi);
    setShiftKemarin(hariIniRes.data.shift_kemarin_belum_checkout ?? null);
    setWfhLokasi(wfhRes.data.lokasi?.[0] ?? null);
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
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
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
  const aksi: "check-in" | "check-out" | "selesai" = shiftKemarin
    ? "check-out"
    : !sudahCheckIn
      ? "check-in"
      : !sudahCheckOut
        ? "check-out"
        : "selesai";

  const jarakTerdekat =
    coords && kantor
      ? Math.min(
          ...kantor.titik_kantor.map((t) =>
            haversineDistanceMeter(coords.lat, coords.lng, t.latitude, t.longitude)
          )
        )
      : null;
  const jarakWfh =
    coords && wfhLokasi?.status === "diverifikasi"
      ? haversineDistanceMeter(coords.lat, coords.lng, wfhLokasi.latitude, wfhLokasi.longitude)
      : null;
  const jarakAcuan = mode === "wfh" ? jarakWfh : jarakTerdekat;
  const dalamRadius = jarakAcuan !== null && kantor ? jarakAcuan <= kantor.radius_meter : null;

  const jadwal = kantor?.jadwal_hari_ini;
  const bolehAbsen = jadwal?.boleh_absen ?? true;

  async function handleSubmit() {
    if (!coords || !selfie) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const form = new FormData();
    form.append("mode", mode);
    form.append("latitude", String(coords.lat));
    form.append("longitude", String(coords.lng));
    form.append("accuracy_meter", String(Math.round(coords.accuracy)));
    form.append("foto", selfie);

    try {
      await api.post(`/presensi/${aksi}`, form, { headers: { "Content-Type": "multipart/form-data" } });
      setSubmitSuccess(aksi === "check-in" ? "Presensi masuk berhasil dicatat!" : "Presensi pulang berhasil dicatat!");
      setSelfie(null);
      await loadData();
    } catch (err) {
      setSubmitError(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWfhSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!coords) {
      setWfhMsg("Aktifkan GPS dulu — koordinat rumah diambil dari posisi Anda saat ini.");
      return;
    }
    setWfhSubmitting(true);
    setWfhMsg(null);
    try {
      const { data } = await api.post("/presensi/wfh-lokasi", {
        label: wfhForm.label,
        alamat: wfhForm.alamat,
        latitude: coords.lat,
        longitude: coords.lng,
      });
      setWfhMsg(data.message);
      setShowWfhForm(false);
      await loadData();
    } catch (err) {
      setWfhMsg(extractApiErrorMessage(err));
    } finally {
      setWfhSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <PresensiTabs />
        <div className="mx-auto max-w-2xl">

        {loading ? (
          <div className="h-64 animate-pulse rounded-[1.25rem] bg-navy-100/60" />
        ) : (
          <>
            {jadwal && (
              <Card className="!py-4">
                <div className="flex items-center gap-3 text-sm">
                  <Info className="size-4.5 shrink-0 text-navy-400" />
                  {bolehAbsen ? (
                    <p className="text-navy-700">
                      Jadwal hari ini:{" "}
                      <strong>
                        {jadwal.jam_masuk} – {jadwal.jam_pulang}
                        {jadwal.shift_lintas_hari && " (shift lintas hari, checkout besok maks 07:30)"}
                      </strong>{" "}
                      • batas absen {kantor?.batas_absen} WIB
                    </p>
                  ) : (
                    <p className="font-medium text-amber-600">{jadwal.alasan}</p>
                  )}
                </div>
              </Card>
            )}

            <Card className="mt-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-navy-900">Status Hari Ini</h2>
                <span className="text-xs text-navy-400">{formatTanggalIndonesia(new Date().toISOString())}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatusBox label="Masuk" jam={formatJam(hariIni?.jam_masuk)} status={hariIni?.status_masuk} mode={hariIni?.mode_masuk} />
                <StatusBox label="Pulang" jam={formatJam(hariIni?.jam_keluar)} status={hariIni?.status_keluar} mode={hariIni?.mode_keluar} />
              </div>
              {shiftKemarin && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700">
                  <Clock className="size-4.5 shrink-0" />
                  Shift kemarin ({formatTanggalIndonesia(shiftKemarin.tanggal)}) belum check-out — silakan check-out sekarang (maks 07:30).
                </div>
              )}
              {aksi === "selesai" && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-bpom-50 px-4 py-3 text-sm font-semibold text-bpom-700">
                  <CheckCircle2 className="size-4.5" />
                  Presensi hari ini sudah lengkap. Sampai jumpa besok!
                </div>
              )}
            </Card>

            {aksi !== "selesai" && kantor && bolehAbsen && (
              <Card className="mt-4">
                <h2 className="font-bold text-navy-900">{aksi === "check-in" ? "Presensi Masuk" : "Presensi Pulang"}</h2>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {MODE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMode(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition-all",
                        mode === opt.value
                          ? "border-navy-900 bg-navy-900 text-white shadow-md"
                          : "border-navy-100 bg-white text-navy-600 hover:border-navy-300"
                      )}
                    >
                      <opt.icon className="size-5" />
                      <span className="text-sm font-bold">{opt.label}</span>
                      <span className={cn("text-[10px] leading-tight", mode === opt.value ? "text-navy-200" : "text-navy-400")}>
                        {opt.desc}
                      </span>
                    </button>
                  ))}
                </div>

                {mode === "wfh" && (
                  <div className="mt-3 rounded-xl bg-navy-50 px-4 py-3 text-sm">
                    {wfhLokasi?.status === "diverifikasi" && (
                      <p className="text-bpom-700">
                        <CheckCircle2 className="mr-1.5 inline size-4" />
                        Lokasi WFH terverifikasi: <strong>{wfhLokasi.label}</strong>
                        {wfhLokasi.alamat ? ` — ${wfhLokasi.alamat}` : ""}
                      </p>
                    )}
                    {wfhLokasi?.status === "diajukan" && (
                      <p className="text-amber-600">Lokasi WFH Anda masih <strong>menunggu verifikasi</strong> tim IT/admin.</p>
                    )}
                    {wfhLokasi?.status === "ditolak" && (
                      <p className="text-rose-600">
                        Pengajuan lokasi WFH <strong>ditolak</strong>
                        {wfhLokasi.catatan_verifikasi ? `: ${wfhLokasi.catatan_verifikasi}` : "."} Ajukan ulang di bawah.
                      </p>
                    )}
                    {!wfhLokasi && <p className="text-navy-600">Anda belum mendaftarkan lokasi WFH.</p>}
                    {(!wfhLokasi || wfhLokasi.status === "ditolak") && (
                      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setShowWfhForm((v) => !v)}>
                        <Home className="size-4" /> Daftarkan Lokasi Rumah (posisi GPS saat ini)
                      </Button>
                    )}
                    {showWfhForm && (
                      <form onSubmit={handleWfhSubmit} className="mt-3 flex flex-col gap-3">
                        <Input label="Label" value={wfhForm.label} onChange={(e) => setWfhForm((f) => ({ ...f, label: e.target.value }))} />
                        <Textarea
                          label="Alamat Lengkap"
                          placeholder="Tulis alamat rumah Anda..."
                          value={wfhForm.alamat}
                          onChange={(e) => setWfhForm((f) => ({ ...f, alamat: e.target.value }))}
                          required
                        />
                        <p className="text-xs text-navy-400">
                          Koordinat diambil dari posisi GPS Anda sekarang — pastikan Anda sedang berada di rumah saat mendaftar.
                        </p>
                        <Button type="submit" size="sm" loading={wfhSubmitting}>Ajukan Lokasi WFH</Button>
                      </form>
                    )}
                    {wfhMsg && <p className="mt-2 text-xs font-medium text-navy-600">{wfhMsg}</p>}
                  </div>
                )}

                <div className="mt-4">
                  <GeofenceMap
                    titikKantor={kantor.titik_kantor}
                    radiusMeter={kantor.radius_meter}
                    userLat={coords?.lat}
                    userLng={coords?.lng}
                    wfhLat={wfhLokasi?.status === "diverifikasi" ? wfhLokasi.latitude : undefined}
                    wfhLng={wfhLokasi?.status === "diverifikasi" ? wfhLokasi.longitude : undefined}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-navy-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-navy-700">
                    <MapPin className="size-4 shrink-0" />
                    {locating && "Mendeteksi lokasi..."}
                    {!locating && geoError && <span className="text-rose-500">{geoError}</span>}
                    {!locating && !geoError && jarakAcuan !== null && (
                      <span>
                        Jarak dari {mode === "wfh" ? "rumah terdaftar" : "titik kantor terdekat"}:{" "}
                        <strong>{Math.round(jarakAcuan)} m</strong>{" "}
                        {mode === "dinas" ? (
                          <Badge tone="info" className="ml-1">Mode dinas — lokasi dicatat</Badge>
                        ) : dalamRadius ? (
                          <Badge tone="success" className="ml-1">Dalam radius</Badge>
                        ) : (
                          <Badge tone="danger" className="ml-1">Di luar radius</Badge>
                        )}
                      </span>
                    )}
                    {!locating && !geoError && jarakAcuan === null && mode === "wfh" && (
                      <span className="text-amber-600">Lokasi WFH belum terverifikasi.</span>
                    )}
                  </div>
                  <button onClick={locate} disabled={locating} className="text-navy-400 hover:text-navy-700 disabled:opacity-50" aria-label="Perbarui lokasi">
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

                <Button size="lg" className="mt-5 w-full" disabled={!coords || !selfie} loading={submitting} onClick={handleSubmit}>
                  {aksi === "check-in" ? <LogIn className="size-4" /> : <LogOut className="size-4" />}
                  {aksi === "check-in" ? "Presensi Masuk Sekarang" : "Presensi Pulang Sekarang"}
                </Button>
              </Card>
            )}
          </>
        )}
        </div>
      </div>
    </AppShell>
  );
}

function StatusBox({
  label,
  jam,
  status,
  mode,
}: {
  label: string;
  jam: string;
  status?: string | null;
  mode?: string | null;
}) {
  const info = status ? STATUS_LABEL[status] : null;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl bg-navy-50 p-4">
      <p className="text-xs font-medium text-navy-400">
        {label}
        {mode && <span className="ml-1 uppercase">({mode})</span>}
      </p>
      <p className="mt-1 text-xl font-extrabold text-navy-900">{jam}</p>
      {info && <Badge tone={info.tone} className="mt-2">{info.label}</Badge>}
    </motion.div>
  );
}
