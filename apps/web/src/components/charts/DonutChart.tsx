"use client";

import { useState } from "react";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * Donut chart — warna status (reserved, bukan kategorikal generik), legend
 * selalu tampil dengan nilai + persentase langsung di teks (bukan hanya warna).
 */
export function DonutChart({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel?: string }) {
  const total = Math.max(1, slices.reduce((a, s) => a + s.value, 0));
  const radius = 60;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;
  const [hover, setHover] = useState<number | null>(null);

  // Panjang busur tiap potongan beserta titik mulainya dihitung lebih dulu.
  // Sebelumnya penggeseran diakumulasi di dalam map() saat render berlangsung —
  // pola yang menghasilkan sudut tidak konsisten pada render berikutnya.
  const busur = slices.map((s) => (s.value / total) * circumference);
  const mulai = busur.reduce<number[]>(
    (acc, panjang, i) => [...acc, (acc[i] ?? 0) + panjang],
    [0]
  );

  return (
    // Di layar ponsel cincin + legenda berdampingan melebihi lebar layar,
    // sehingga ditumpuk ke bawah dan cincinnya diperkecil.
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <svg viewBox="0 0 160 160" className="size-32 shrink-0 -rotate-90 sm:size-40">
        <circle cx={80} cy={80} r={radius} fill="none" stroke="#eef1f6" strokeWidth={stroke} />
        {slices.map((s, i) => (
          <circle
            key={s.label}
            cx={80}
            cy={80}
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={hover === i ? stroke + 4 : stroke}
            strokeDasharray={`${busur[i]} ${circumference - busur[i]}`}
            strokeDashoffset={-mulai[i]}
            className="transition-all"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            strokeLinecap={slices.length === 1 ? "round" : "butt"}
          />
        ))}
      </svg>

      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto">
        {centerLabel && <p className="text-xs font-semibold text-navy-400">{centerLabel}</p>}
        {slices.map((s, i) => (
          <div
            key={s.label}
            className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            <span className="font-medium text-navy-700">{s.label}</span>
            <span className="font-bold tabular-nums text-navy-900">{s.value}</span>
            <span className="text-xs text-navy-400">({Math.round((s.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
