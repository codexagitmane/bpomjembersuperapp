"use client";

/**
 * Grafik batang mini tren 7 hari (kehadiran vs terlambat).
 * Dua seri dibedakan warna DAN diberi legenda + label langsung (identitas tidak
 * hanya lewat warna). Navy = hadir, hijau BPOM = terlambat. Marks tipis dengan
 * ujung membulat, gap 2px antar batang, sesuai panduan dataviz.
 */
interface TrenItem {
  label: string;
  tanggal: string;
  hadir: number;
  terlambat: number;
}

export function MiniBarChart({ data }: { data: TrenItem[] }) {
  const max = Math.max(1, ...data.map((d) => d.hadir));
  const chartH = 120;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs font-semibold">
        <span className="inline-flex items-center gap-1.5 text-navy-700">
          <span className="size-2.5 rounded-full bg-navy-800" /> Hadir
        </span>
        <span className="inline-flex items-center gap-1.5 text-navy-700">
          <span className="size-2.5 rounded-full bg-bpom-500" /> Terlambat
        </span>
      </div>
      <div className="flex items-end justify-between gap-2" style={{ height: chartH }}>
        {data.map((d) => {
          const hadirH = (d.hadir / max) * (chartH - 20);
          const telatH = (d.terlambat / max) * (chartH - 20);
          return (
            <div key={d.tanggal} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-bold tabular-nums text-navy-700">{d.hadir}</span>
              <div className="flex w-full items-end justify-center gap-0.5">
                <div
                  className="w-2.5 rounded-t bg-navy-800 transition-all"
                  style={{ height: Math.max(3, hadirH) }}
                  title={`${d.label}: ${d.hadir} hadir`}
                />
                <div
                  className="w-2.5 rounded-t bg-bpom-500 transition-all"
                  style={{ height: Math.max(2, telatH) }}
                  title={`${d.label}: ${d.terlambat} terlambat`}
                />
              </div>
              <span className="text-[10px] font-medium text-navy-400">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
