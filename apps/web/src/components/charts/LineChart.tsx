"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface LineSeries {
  name: string;
  color: string; // warna solid, mis. "#0b1f3a"
  data: number[];
}

interface LineChartProps {
  labels: string[];
  series: LineSeries[];
  height?: number;
}

/**
 * Line chart SVG ringan tanpa dependency eksternal — garis 2px, titik data
 * membulat (muncul saat hover), legend selalu tampil untuk >=2 seri, tooltip
 * crosshair sesuai panduan dataviz (satu hue per seri, grid resesif).
 */
export function LineChart({ labels, series, height = 220 }: LineChartProps) {
  const gid = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Lebar viewBox mengikuti lebar wadah. Dengan viewBox tetap 640, di layar
  // ponsel gambar diperkecil ±2x sehingga teks sumbu ikut menyusut jadi ~5 px
  // dan menyisakan ruang kosong di atas-bawah. Mengukur wadah membuat skala
  // gambar selalu 1:1 — teks tetap terbaca pada ukuran layar mana pun.
  const wadah = useRef<HTMLDivElement>(null);
  const [lebar, setLebar] = useState(640);

  useEffect(() => {
    const el = wadah.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const pengamat = new ResizeObserver(([entri]) => {
      const w = Math.round(entri.contentRect.width);
      if (w > 0) setLebar(w);
    });
    pengamat.observe(el);

    return () => pengamat.disconnect();
  }, []);

  const width = lebar;
  const padding = { top: 16, right: 16, bottom: 28, left: 32 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.data);
  const max = Math.max(1, ...allValues);
  const stepX = labels.length > 1 ? innerW / (labels.length - 1) : 0;

  function xAt(i: number) {
    return padding.left + i * stepX;
  }
  function yAt(v: number) {
    return padding.top + innerH - (v / max) * innerH;
  }

  function pathFor(data: number[]) {
    return data.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");
  }

  const gridLines = 4;

  return (
    <div className="relative" ref={wadah}>
      {series.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs font-semibold">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5 text-navy-700">
              <span className="size-2.5 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* grid resesif */}
        {[...Array(gridLines + 1)].map((_, i) => {
          const y = padding.top + (innerH / gridLines) * i;
          return (
            <line
              key={i}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#e5e9f0"
              strokeWidth={1}
            />
          );
        })}

        {/* label sumbu-x (selektif agar tidak padat) */}
        {labels.map((l, i) => {
          // Jumlah label menyesuaikan lebar: satu label per ±72 px agar tidak
          // saling tindih di layar sempit.
          const muat = Math.max(2, Math.floor(innerW / 72));
          const showEvery = Math.max(1, Math.ceil(labels.length / muat));
          if (i % showEvery !== 0 && i !== labels.length - 1) return null;
          return (
            <text
              key={i}
              x={xAt(i)}
              y={height - 6}
              fontSize={10}
              textAnchor="middle"
              fill="#8291ab"
            >
              {l}
            </text>
          );
        })}

        {/* garis seri */}
        {series.map((s) => (
          <path
            key={s.name}
            d={pathFor(s.data)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* titik data + hit area hover */}
        {labels.map((_, i) => (
          <g key={i}>
            <rect
              x={xAt(i) - stepX / 2}
              y={padding.top}
              width={stepX || innerW}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
            {hoverIdx === i && (
              <line
                x1={xAt(i)}
                x2={xAt(i)}
                y1={padding.top}
                y2={height - padding.bottom}
                stroke="#c3cad9"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}
            {series.map((s) => (
              <circle
                key={s.name}
                cx={xAt(i)}
                cy={yAt(s.data[i])}
                r={hoverIdx === i ? 4.5 : 0}
                fill={s.color}
                stroke="#fff"
                strokeWidth={1.5}
                className="transition-all"
              />
            ))}
          </g>
        ))}
      </svg>

      {hoverIdx !== null && (
        <div className="pointer-events-none absolute top-0 rounded-lg bg-navy-900 px-3 py-2 text-xs text-white shadow-lg" style={{ left: `${(xAt(hoverIdx) / width) * 100}%`, transform: "translateX(-50%)" }}>
          <p className="font-bold">{labels[hoverIdx]}</p>
          {series.map((s) => (
            <p key={s.name} className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: s.color }} />
              {s.name}: <span className="font-bold tabular-nums">{s.data[hoverIdx]}</span>
            </p>
          ))}
        </div>
      )}
      <span className="sr-only" id={gid} />
    </div>
  );
}
