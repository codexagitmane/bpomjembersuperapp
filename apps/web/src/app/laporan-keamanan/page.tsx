"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Camera,
  Sun,
  Moon,
  MapPin,
  ShieldAlert,
  ShieldX,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CameraCapture } from "@/components/presensi/CameraCapture";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { extractApiErrorMessage } from "@bpom/shared";
import { formatTanggalIndonesia, cn } from "@/lib/utils";

interface Laporan {
  id: number;
  tanggal: string;
  sesi: string | null;
  kondisi: string;
  catatan: string | null;
  foto_url: string | null;
  waktu: string | null;
}

const KONDISI: { value: string; label: string; icon: typeof ShieldCheck; tone: "success" | "warning" | "danger" }[] = [
  { value: "aman", label: "Aman", icon: ShieldCheck, tone: "success" },
  { value: "perlu_perhatian", label: "Perlu Perhatian", icon: ShieldAlert, tone: "warning" },
  { value: "insiden", label: "Insiden", icon: ShieldX, tone: "danger" },
];

const KONDISI_MAP = Object.fromEntries(KONDISI.map((k) => [k.value, k]));

export default function LaporanKeamananPage() {
  const { user } = useAuth();
  const bukanKeamanan = user && user.jenis_pegawai !== "keamanan" && user.role !== "superadmin";

  const [target, setTarget] = useState(2);
  const [jumlahHariIni, setJumlahHariIni] = useState(0);
  const [hariIni, setHariIni] = useState<Laporan[]>([]);
  const [riwayat, setRiwayat] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);

  const [foto, setFoto] = useState<File | null>(null);
  const [sesi, setSesi] = useState<"siang" | "malam">(new Date().getHours() < 15 ? "siang" : "malam");
  const [kondisi, setKondisi] = useState("aman");
  const [catatan, setCatatan] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/laporan-keamanan");
      setTarget(data.target_harian ?? 2);
      setJumlahHariIni(data.jumlah_hari_ini ?? 0);
      setHariIni(data.hari_ini ?? []);
      setRiwayat(data.riwayat ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!bukanKeamanan) load();
    else setLoading(false);
  }, [load, bukanKeamanan]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  async function submit() {
    if (!foto) {
      setMsg({ type: "err", text: "Ambil foto patroli dulu." });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    const form = new FormData();
    form.append("foto", foto);
    form.append("sesi", sesi);
    form.append("kondisi", kondisi);
    if (catatan) form.append("catatan", catatan);
    if (coords) {
      form.append("latitude", String(coords.lat));
      form.append("longitude", String(coords.lng));
    }
    try {
      await api.post("/laporan-keamanan", form, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg({ type: "ok", text: "Laporan patroli berhasil dikirim!" });
      setFoto(null);
      setCatatan("");
      await load();
    } catch (err) {
      setMsg({ type: "err", text: extractApiErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  if (bukanKeamanan) {
    return (
      <AppShell>
        <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 py-16 text-center">
          <ShieldCheck className="size-10 text-navy-200" />
          <p className="font-semibold text-navy-700">Menu ini khusus Petugas Keamanan</p>
          <p className="text-sm text-navy-400">Laporan patroli hanya dapat diisi oleh petugas keamanan.</p>
        </Card>
      </AppShell>
    );
  }

  const selesai = jumlahHariIni >= target;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 shadow-md">
            <ShieldCheck className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Laporan Patroli Keamanan</h1>
            <p className="text-xs text-navy-500">Wajib lapor {target}× sehari (siang &amp; malam) dengan bukti foto.</p>
          </div>
        </div>

        {/* Progress hari ini */}
        <Card className={cn("mb-6", selesai ? "bg-bpom-50" : "")}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {selesai ? <CheckCircle2 className="size-8 text-bpom-600" /> : <ShieldAlert className="size-8 text-amber-500" />}
              <div>
                <p className="font-bold text-navy-900">
                  {selesai ? "Laporan hari ini lengkap 🎉" : `Laporan hari ini: ${jumlahHariIni} dari ${target}`}
                </p>
                <p className="text-xs text-navy-500">{formatTanggalIndonesia(new Date().toISOString())}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: target }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl text-sm font-bold",
                    i < jumlahHariIni ? "bg-bpom-600 text-white" : "bg-navy-100 text-navy-400"
                  )}
                >
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Form lapor */}
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-bold text-navy-900">
              <Camera className="size-4.5 text-bpom-600" /> Kirim Laporan Patroli
            </h2>

            <CameraCapture onCapture={setFoto} facingToggle timer />

            {/* Sesi */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-navy-600">Sesi Patroli</p>
              <div className="grid grid-cols-2 gap-2">
                {([["siang", "Siang", Sun], ["malam", "Malam", Moon]] as const).map(([val, label, Icon]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSesi(val)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
                      sesi === val ? "border-navy-900 bg-navy-900 text-white" : "border-navy-100 text-navy-600 hover:border-navy-300"
                    )}
                  >
                    <Icon className="size-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kondisi */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-navy-600">Kondisi Lingkungan</p>
              <div className="grid grid-cols-3 gap-2">
                {KONDISI.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKondisi(k.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center text-xs font-semibold transition-all",
                      kondisi === k.value ? "border-navy-900 bg-navy-50" : "border-navy-100 text-navy-500 hover:border-navy-300"
                    )}
                  >
                    <k.icon className={cn("size-4", kondisi === k.value ? "text-navy-900" : "text-navy-400")} />
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <Textarea
                label="Catatan (opsional)"
                placeholder="Situasi pos jaga, kejadian, dsb..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>

            {coords && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-navy-400">
                <MapPin className="size-3.5" /> Lokasi terekam ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})
              </p>
            )}

            {msg && (
              <div
                className={cn(
                  "mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium",
                  msg.type === "ok" ? "bg-bpom-50 text-bpom-700" : "bg-rose-500/10 text-rose-600"
                )}
              >
                {msg.type === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
                {msg.text}
              </div>
            )}

            <Button size="lg" className="mt-5 w-full" loading={submitting} disabled={!foto} onClick={submit}>
              <ShieldCheck className="size-4" /> Kirim Laporan
            </Button>
          </Card>

          {/* Riwayat laporan */}
          <div>
            <h2 className="mb-3 font-bold text-navy-900">Laporan Hari Ini</h2>
            <div className="space-y-3">
              {loading && <div className="h-20 animate-pulse rounded-2xl bg-navy-100/50" />}
              {!loading && hariIni.length === 0 && (
                <Card className="py-8 text-center text-sm text-navy-400">Belum ada laporan hari ini.</Card>
              )}
              {hariIni.map((l) => (
                <LaporanItem key={l.id} l={l} />
              ))}
            </div>

            {riwayat.filter((r) => r.tanggal !== new Date().toISOString().slice(0, 10)).length > 0 && (
              <>
                <h2 className="mb-3 mt-6 font-bold text-navy-900">Riwayat Sebelumnya</h2>
                <div className="space-y-3">
                  {riwayat
                    .filter((r) => r.tanggal !== new Date().toISOString().slice(0, 10))
                    .slice(0, 10)
                    .map((l) => (
                      <LaporanItem key={l.id} l={l} showDate />
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function LaporanItem({ l, showDate }: { l: Laporan; showDate?: boolean }) {
  const k = KONDISI_MAP[l.kondisi];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="flex items-center gap-3 !p-3">
        {l.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.foto_url} alt="Foto patroli" className="size-16 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-navy-300">
            <Camera className="size-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-navy-900 capitalize">{l.sesi ?? "-"}</span>
            <span className="text-xs text-navy-400">{l.waktu} WIB</span>
          </div>
          {showDate && <p className="text-xs text-navy-400">{formatTanggalIndonesia(l.tanggal)}</p>}
          {l.catatan && <p className="truncate text-xs text-navy-500">{l.catatan}</p>}
          {k && (
            <Badge tone={k.tone} className="mt-1">
              <k.icon className="mr-1 size-3" /> {k.label}
            </Badge>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
