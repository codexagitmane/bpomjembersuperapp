"use client";

/**
 * Grafik batang mini tren kehadiran (hadir vs terlambat).
 *
 * Dua seri dibedakan warna DAN diberi legenda + label langsung (identitas tidak
 * hanya lewat warna). Navy = hadir, hijau BPOM = terlambat.
 *
 * Tata letak dibuat tahan terhadap jumlah titik data: bila datanya banyak,
 * label sumbu ditipiskan dan angka di atas batang disembunyikan agar tidak
 * saling bertumpuk, sedangkan isi grafik tidak pernah melebar keluar kartu.
 */
interface TrenItem {
  label: string;
  tanggal: string;
  hadir: number;
  terlambat: number;
}

export function MiniBarChart({ data }: { data: TrenItem[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.hadir, d.terlambat)));
  const chartH = 120;
  const jumlah = data.length;

  // Banyak titik → tampilkan sebagian label saja supaya terbaca.
  const langkahLabel = jumlah <= 8 ? 1 : jumlah <= 16 ? 2 : Math.ceil(jumlah / 8);
  const tampilkanAngka = jumlah <= 10;
  const lebarBatang = jumlah <= 10 ? "w-2.5" : jumlah <= 20 ? "w-1.5" : "w-1";

  if (jumlah === 0) {
    return <p className="py-8 text-center text-xs text-navy-400">Belum ada data kehadiran.</p>;
  }

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs font-semibold">
        <span className="inline-flex items-center gap-1.5 text-navy-700">
          <span className="size-2.5 rounded-full bg-navy-800" /> Hadir
        </span>
        <span className="inline-flex items-center gap-1.5 text-navy-700">
          <span className="size-2.5 rounded-full bg-bpom-500" /> Terlambat
        </span>
      </div>

      <div className="flex w-full min-w-0 items-end justify-between gap-1" style={{ height: chartH }}>
        {data.map((d, i) => {
          const hadirH = (d.hadir / max) * (chartH - 26);
          const telatH = (d.terlambat / max) * (chartH - 26);
          const tampilLabel = i % langkahLabel === 0 || i === jumlah - 1;

          return (
            <div key={d.tanggal} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              {tampilkanAngka && (
                <span className="text-[10px] font-bold tabular-nums text-navy-700">{d.hadir}</span>
              )}
              <div className="flex w-full items-end justify-center gap-0.5">
                <div
                  className={`${lebarBatang} rounded-t bg-navy-800 transition-all`}
                  style={{ height: Math.max(3, hadirH) }}
                  title={`${d.label}: ${d.hadir} hadir`}
                />
                <div
                  className={`${lebarBatang} rounded-t bg-bpom-500 transition-all`}
                  style={{ height: Math.max(2, telatH) }}
                  title={`${d.label}: ${d.terlambat} terlambat`}
                />
              </div>
              <span className="h-3.5 w-full truncate text-center text-[10px] font-medium leading-3.5 text-navy-400">
                {tampilLabel ? d.label : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
