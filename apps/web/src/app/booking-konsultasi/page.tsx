"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Send, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { extractApiErrorMessage } from "@bpom/shared";
import { formatTanggalIndonesia, formatJam, cn } from "@/lib/utils";

interface Slot {
  jam: string;
  sisa: number;
  penuh: boolean;
}

interface Booking {
  id: number;
  jenis_layanan: string;
  tanggal: string;
  jam_slot: string;
  subjek: string;
  status: string;
}

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  menunggu: "warning",
  dikonfirmasi: "info",
  selesai: "success",
  dibatalkan: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  menunggu: "Menunggu Konfirmasi",
  dikonfirmasi: "Dikonfirmasi",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export default function BookingKonsultasiPage() {
  const [form, setForm] = useState({
    jenis_layanan: "konsultasi",
    tanggal: "",
    jam_slot: "",
    subjek: "",
    deskripsi: "",
  });
  const [riwayat, setRiwayat] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotInfo, setSlotInfo] = useState<{ libur: boolean; alasan: string | null } | null>(null);
  const [loadingSlot, setLoadingSlot] = useState(false);

  async function loadRiwayat() {
    const { data } = await api.get("/booking-konsultasi");
    setRiwayat(data.data ?? []);
  }

  useEffect(() => {
    loadRiwayat().finally(() => setLoading(false));
  }, []);

  // Muat slot yang tersedia saat tanggal berubah.
  useEffect(() => {
    if (!form.tanggal) {
      setSlots([]);
      setSlotInfo(null);
      return;
    }
    setLoadingSlot(true);
    setForm((f) => ({ ...f, jam_slot: "" }));
    api
      .get("/booking-konsultasi/slot", { params: { tanggal: form.tanggal } })
      .then(({ data }) => {
        setSlots(data.slots ?? []);
        setSlotInfo({ libur: data.libur, alasan: data.alasan });
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlot(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tanggal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.post("/booking-konsultasi", form);
      setSuccess("Booking berhasil diajukan. Petugas kami akan segera menghubungi Anda.");
      setForm({ jenis_layanan: "konsultasi", tanggal: "", jam_slot: "", subjek: "", deskripsi: "" });
      await loadRiwayat();
    } catch (err) {
      setError(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <AppShell>
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h1 className="text-2xl font-extrabold text-navy-900">Booking Konsultasi & Pengaduan</h1>
          <p className="mt-1 text-sm text-navy-500">
            Ajukan jadwal konsultasi atau sampaikan pengaduan terkait obat dan makanan.
          </p>

          <Card className="mt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Select
                label="Jenis Layanan"
                value={form.jenis_layanan}
                onChange={(e) => setForm((f) => ({ ...f, jenis_layanan: e.target.value }))}
              >
                <option value="konsultasi">Konsultasi</option>
                <option value="pengaduan">Pengaduan</option>
              </Select>

              <Input
                label="Tanggal"
                type="date"
                min={minDate}
                value={form.tanggal}
                onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                required
              />

              {/* Slot jam dinamis sesuai konfigurasi petugas */}
              {form.tanggal && (
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-navy-800">
                    <Clock className="size-3.5" /> Pilih Jam
                  </label>
                  {loadingSlot && <p className="text-xs text-navy-400">Memuat slot tersedia...</p>}
                  {!loadingSlot && slotInfo?.libur && (
                    <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600">
                      {slotInfo.alasan}
                    </p>
                  )}
                  {!loadingSlot && !slotInfo?.libur && slots.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s.jam}
                          type="button"
                          disabled={s.penuh}
                          onClick={() => setForm((f) => ({ ...f, jam_slot: s.jam }))}
                          className={cn(
                            "rounded-xl border px-2 py-2.5 text-sm font-bold transition-all",
                            s.penuh
                              ? "cursor-not-allowed border-navy-100 bg-navy-50 text-navy-300 line-through"
                              : form.jam_slot === s.jam
                                ? "border-navy-900 bg-navy-900 text-white shadow-md"
                                : "border-navy-100 bg-white text-navy-700 hover:border-navy-300"
                          )}
                        >
                          {s.jam}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Input
                label="Subjek"
                placeholder="Ringkasan singkat topik"
                value={form.subjek}
                onChange={(e) => setForm((f) => ({ ...f, subjek: e.target.value }))}
                required
              />

              <Textarea
                label="Deskripsi"
                placeholder="Jelaskan kebutuhan konsultasi atau detail pengaduan Anda..."
                value={form.deskripsi}
                onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
                required
              />

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 rounded-xl bg-bpom-50 px-4 py-3 text-sm font-medium text-bpom-700">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {success}
                </div>
              )}

              <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
                <Send className="size-4" /> Ajukan Booking
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <CalendarCheck className="size-4.5" /> Riwayat Booking
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {loading && [...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-navy-100/60" />)}
            {!loading && riwayat.length === 0 && (
              <Card className="py-10 text-center text-sm text-navy-400">Belum ada riwayat booking.</Card>
            )}
            {riwayat.map((b) => (
              <Card key={b.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-navy-900">{b.subjek}</p>
                    <p className="mt-0.5 text-xs text-navy-400">
                      {formatTanggalIndonesia(b.tanggal)} • {formatJam(b.jam_slot)}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[b.status] ?? "neutral"}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
