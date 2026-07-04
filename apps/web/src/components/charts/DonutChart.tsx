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

  let offsetAcc = 0;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="size-40 shrink-0 -rotate-90">
        <circle cx={80} cy={80} r={radius} fill="none" stroke="#eef1f6" strokeWidth={stroke} />
        {slices.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * circumference;
          const el = (
            <circle
              key={s.label}
              cx={80}
              cy={80}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === i ? stroke + 4 : stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offsetAcc}
              className="transition-all"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              strokeLinecap={slices.length === 1 ? "round" : "butt"}
            />
          );
          offsetAcc += dash;
          return el;
        })}
      </svg>

      <div className="flex flex-col gap-2">
        {centerLabel && <p className="text-xs font-semibold text-navy-400">{centerLabel}</p>}
        {slices.map((s, i) => (
          <div
            key={s.label}
            className="flex items-center gap-2 text-sm"
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
