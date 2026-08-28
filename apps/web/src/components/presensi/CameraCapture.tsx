"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, AlertTriangle, SwitchCamera, Timer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface CameraCaptureProps {
  onCapture: (file: File | null) => void;
  /** Izinkan pindah kamera depan/belakang (default: hanya depan). */
  facingToggle?: boolean;
  /** Tampilkan pilihan timer hitung mundur sebelum jepret. */
  timer?: boolean;
}

/**
 * Kamera native (getUserMedia) — tidak memakai library eksternal.
 * Foto diambil langsung dari stream kamera (bukan galeri) agar sesuai tujuan
 * presensi/laporan: bukti real-time. Mendukung kamera depan/belakang & timer.
 */
export function CameraCapture({ onCapture, facingToggle = false, timer = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [delay, setDelay] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isFront = facing === "user";

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    async function startCamera() {
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: 640, height: 640 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setReady(true);
      } catch {
        setError("Tidak bisa mengakses kamera. Pastikan izin kamera diaktifkan.");
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  // Pasang ulang stream ke elemen <video>.
  //
  // Elemen video kini selalu ada di DOM (pratinjau ditumpuk di atasnya), tetapi
  // pemasangan ini tetap dijalankan sebagai pengaman: bila peramban sempat
  // menjeda pemutaran — misalnya saat tab berpindah atau layar terkunci —
  // kamera hidup kembali tanpa perlu memuat ulang halaman. Sebelumnya elemen
  // video dibongkar saat pratinjau tampil, sehingga "Ambil Ulang" hanya
  // memunculkan kotak hitam dan presensi tidak bisa dilanjutkan.
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) video.srcObject = stream;
    void video.play().catch(() => {
      // Pemutaran otomatis ditolak — pengguna cukup mengetuk tombol jepret.
    });
  }, [previewUrl, ready]);

  // Bebaskan URL objek pratinjau lama agar tidak menumpuk di memori.
  useEffect(() => {
    if (!previewUrl) return;

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (isFront) {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, size, size);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
        setPreviewUrl(URL.createObjectURL(blob));
        onCapture(file);
      },
      "image/jpeg",
      0.9
    );
  }, [isFront, onCapture]);

  function handleCapture() {
    if (delay <= 0) {
      takePhoto();
      return;
    }
    let n = delay;
    setCountdown(n);
    const iv = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(iv);
        setCountdown(null);
        takePhoto();
      } else {
        setCountdown(n);
      }
    }, 1000);
  }

  function handleRetake() {
    setPreviewUrl(null);
    onCapture(null);

    // Lanjutkan pemutaran seketika, tanpa menunggu efek berjalan.
    const video = videoRef.current;
    if (video && streamRef.current) {
      if (video.srcObject !== streamRef.current) video.srcObject = streamRef.current;
      void video.play().catch(() => {});
    }
  }

  if (error) {
    return (
      <div className="flex aspect-square w-full max-w-xs flex-col items-center justify-center gap-2 rounded-2xl bg-rose-50 p-6 text-center">
        <AlertTriangle className="size-8 text-rose-400" />
        <p className="text-sm font-medium text-rose-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-navy-950">
        {/* Video SELALU terpasang di DOM. Membongkarnya saat pratinjau tampil
            membuat React membuang elemennya beserta srcObject, sehingga
            "Ambil Ulang" hanya menampilkan layar hitam. Pratinjau ditumpuk
            di atas video, bukan menggantikannya. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn("h-full w-full object-cover", isFront && "scale-x-[-1]")}
        />
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Hasil foto"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {!ready && !previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Memuat kamera...</div>
        )}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy-950/50 text-7xl font-extrabold text-white">
            {countdown}
          </div>
        )}
        <div className="pointer-events-none absolute inset-6 rounded-full border-2 border-dashed border-white/30" />

        {facingToggle && !previewUrl && (
          <button
            type="button"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-navy-950/60 text-white backdrop-blur hover:bg-navy-950/80"
            title="Ganti kamera depan/belakang"
          >
            <SwitchCamera className="size-4.5" />
          </button>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {/* Timer selector */}
      {timer && !previewUrl && (
        <div className="flex items-center gap-1.5 rounded-full bg-navy-50 p-1">
          <Timer className="ml-1.5 size-3.5 text-navy-400" />
          {[0, 3, 5, 10].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDelay(d)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                delay === d ? "bg-navy-900 text-white" : "text-navy-500 hover:text-navy-800"
              )}
            >
              {d === 0 ? "Langsung" : `${d}s`}
            </button>
          ))}
        </div>
      )}

      {previewUrl ? (
        <Button type="button" variant="outline" onClick={handleRetake}>
          <RotateCcw className="size-4" /> Ambil Ulang
        </Button>
      ) : (
        <Button type="button" onClick={handleCapture} disabled={!ready || countdown !== null}>
          <Camera className="size-4" /> {facingToggle ? "Ambil Foto" : "Ambil Foto Selfie"}
        </Button>
      )}
    </div>
  );
}
