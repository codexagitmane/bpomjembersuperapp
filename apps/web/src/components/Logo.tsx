import { cn } from "@/lib/utils";

/**
 * Emblem LENTERA — lentera bercahaya hijau dengan perisai-centang BPOM.
 * SVG murni agar tajam di semua ukuran (splash, login, sidebar, favicon).
 */
export function LenteraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="lentera-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#66d69a" />
          <stop offset="70%" stopColor="#17a361" />
          <stop offset="100%" stopColor="#0d6a41" />
        </radialGradient>
      </defs>
      {/* gantungan */}
      <path d="M20.5 7.5a3.5 3.5 0 0 1 7 0" stroke="#122649" strokeWidth="2.4" strokeLinecap="round" />
      {/* tutup atas */}
      <path d="M15 11h18l-2.4 4.2H17.4z" fill="#122649" />
      <rect x="13.5" y="9" width="21" height="2.6" rx="1.3" fill="#0b1f3a" />
      {/* rangka badan */}
      <rect x="15.5" y="15" width="17" height="20" rx="3" fill="#122649" />
      {/* kaca bercahaya */}
      <rect x="18.2" y="17.6" width="11.6" height="14.8" rx="2.4" fill="url(#lentera-glow)" />
      {/* perisai centang */}
      <path
        d="M20.6 24.6l2.7 3.1 4.6-5.6"
        stroke="#fff"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* alas */}
      <path d="M16.5 35h15l-2 4.2h-11z" fill="#122649" />
      <circle cx="24" cy="37.1" r="1.15" fill="#35bd79" />
    </svg>
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
