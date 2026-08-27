"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Notif {
  id: number;
  judul: string;
  pesan: string;
  url: string | null;
  read_at: string | null;
  created_at: string;
}

/** Lonceng notifikasi in-app: polling ringan tiap 60 detik + dropdown. */
export function NotifikasiBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/notifikasi");
      setItems(data.data ?? []);
      setUnread(data.unread_count ?? 0);
    } catch {
      // Diamkan — polling berikutnya akan mencoba lagi.
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // Tutup dropdown saat klik di luar.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleKlik(n: Notif) {
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
      api.patch(`/notifikasi/${n.id}/baca`).catch(() => {});
    }
    setOpen(false);
    if (n.url) router.push(n.url);
  }

  async function bacaSemua() {
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    setUnread(0);
    api.patch("/notifikasi/baca-semua").catch(() => {});
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifikasi${unread > 0 ? ` (${unread} belum dibaca)` : ""}`}
        className="relative flex size-9 items-center justify-center rounded-full text-navy-500 transition-colors hover:bg-navy-50"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-80">
          <div className="flex items-center justify-between border-b border-navy-900/5 px-4 py-2.5">
            <p className="text-sm font-bold text-navy-900">Notifikasi</p>
            {unread > 0 && (
              <button onClick={bacaSemua} className="flex items-center gap-1 text-xs font-semibold text-bpom-600 hover:underline">
                <CheckCheck className="size-3.5" /> Tandai semua
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="py-10 text-center text-sm text-navy-400">Belum ada notifikasi.</p>}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleKlik(n)}
                className={cn(
                  "block w-full border-b border-navy-900/5 px-4 py-3 text-left transition-colors hover:bg-navy-50",
                  !n.read_at && "bg-bpom-50/50"
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-bpom-500" />}
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-navy-900">{n.judul}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-navy-500">{n.pesan}</p>
                    <p className="mt-1 text-[11px] text-navy-400">
                      {new Date(n.created_at).toLocaleString("id-ID", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
                      })}{" "}
                      WIB
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
