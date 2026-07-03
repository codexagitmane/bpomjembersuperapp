"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CameraCaptureProps {
  onCapture: (file: File | null) => void;
}

/**
 * Kamera selfie native (getUserMedia) — tidak memakai library eksternal.
 * Foto diambil langsung dari stream kamera (bukan upload file dari galeri)
 * agar sesuai tujuan presensi: bukti kehadiran real-time.
 */
export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 480, height: 480 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
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
  }, []);

  function handleCapture() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      video,
      (video.videoWidth - size) / 2,
      (video.videoHeight - size) / 2,
      size,
      size,
      0,
      0,
      size,
      size
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
        setPreviewUrl(URL.createObjectURL(blob));
        onCapture(file);
      },
      "image/jpeg",
      0.9
    );
  }

  function handleRetake() {
    setPreviewUrl(null);
    onCapture(null);
  }

  if (error) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl bg-rose-50 p-6 text-center">
        <AlertTriangle className="size-8 text-rose-400" />
        <p className="text-sm font-medium text-rose-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-navy-950">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Selfie presensi" className="h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full scale-x-[-1] object-cover"
          />
        )}
        {!ready && !previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
            Memuat kamera...
          </div>
        )}
        <div className="pointer-events-none absolute inset-6 rounded-full border-2 border-dashed border-white/30" />
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {previewUrl ? (
        <Button type="button" variant="outline" onClick={handleRetake}>
          <RotateCcw className="size-4" /> Ambil Ulang
        </Button>
      ) : (
        <Button type="button" onClick={handleCapture} disabled={!ready}>
          <Camera className="size-4" /> Ambil Foto Selfie
        </Button>
      )}
    </div>
  );
}
