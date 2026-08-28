import { cn } from "@/lib/utils";

/**
 * Emblem LENTERA — memakai berkas logo resmi (PNG), bukan gambar tiruan.
 *
 * Berkas sumber `public/logo.png` berukuran 1254×1254 (±1,1 MB) sehingga tidak
 * pernah dipakai langsung: yang dikirim ke peramban adalah turunannya pada
 * ukuran wajar (64/128/192 px) lewat `srcSet`, agar layar biasa memuat berkas
 * kecil dan layar beresolusi tinggi tetap tajam.
 *
 * Ukuran tampilan tetap diatur lewat `className` (mis. `size-8`) persis seperti
 * sebelumnya, jadi seluruh pemakaian yang sudah ada tidak perlu diubah.
 */
export function LenteraMark({ className }: { className?: string }) {
  return (
    // Sengaja memakai <img> biasa, bukan next/image: keluaran `standalone`
    // menjalankan pengoptimal gambar di server, sedangkan turunan logo sudah
    // dibuat pada ukuran pas lewat srcSet — jadi tidak ada yang perlu
    // dioptimalkan saat permintaan datang.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-mark-128.png"
      srcSet="/logo-mark-64.png 64w, /logo-mark-128.png 128w, /logo-mark-192.png 192w"
      sizes="96px"
      alt="Logo LENTERA BPOM Jember"
      width={128}
      height={128}
      className={cn("object-contain", className)}
    />
  );
}

/**
 * Logo penuh: emblem + wordmark "LENTE RA" (RA hijau seperti identitas resmi).
 */
export function LenteraLogo({
  className,
  markClassName,
  textClassName,
  subtitle,
  invert = false,
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  subtitle?: string;
  invert?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LenteraMark className={cn("size-9", markClassName)} />
      <div className="leading-none">
        <p className={cn("text-lg font-extrabold tracking-tight", invert ? "text-white" : "text-navy-900", textClassName)}>
          LENTE<span className="text-bpom-500">RA</span>
        </p>
        {subtitle && (
          <p className={cn("mt-0.5 text-[10px] font-medium", invert ? "text-navy-200" : "text-navy-400")}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}
