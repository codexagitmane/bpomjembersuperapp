"use client";

interface HBarItem {
  label: string;
  value: number;
  sublabel?: string;
}

/**
 * Horizontal bar chart — satu hue (magnitude), label langsung di ujung bar,
 * bar tipis dengan ujung membulat sesuai panduan dataviz.
 */
export function HBarChart({ items, color = "#0f854e" }: { items: HBarItem[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-32 shrink-0 text-right text-xs font-semibold text-navy-700" title={item.label}>
            <span className="line-clamp-1">{item.label}</span>
          </div>
          <div className="relative h-6 flex-1 rounded-full bg-navy-50">
            <div
              className="flex h-6 items-center rounded-full pl-2 transition-all"
              style={{ width: `${Math.max(8, (item.value / max) * 100)}%`, background: color }}
            >
              <span className="text-[11px] font-bold text-white">{item.value}</span>
            </div>
          </div>
          {item.sublabel && <span className="w-10 shrink-0 text-[11px] text-navy-400">{item.sublabel}</span>}
        </div>
      ))}
    </div>
  );
}
