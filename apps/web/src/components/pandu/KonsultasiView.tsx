"use client";

import { useEffect, useRef, useState } from "react";
import { Send, MessageCircle, BookMarked, AlertTriangle, Phone, Mail } from "lucide-react";
import { Card, Badge } from "@/components/ui/Card";
import { Maskot, PanduLoading } from "@/components/pandu/Maskot";
import { Disclaimer } from "@/components/pandu/InfoViews";
import { panduService, type Bootstrap, type SumberJawaban, type KontakPetugas } from "@/lib/pandu-service";
import { extractApiErrorMessage } from "@bpom/shared";
import { cn } from "@/lib/utils";

interface Pesan {
  dari: "pandu" | "pengguna";
  teks: string;
  sumber?: SumberJawaban[];
  perluVerifikasi?: boolean;
  diLuarLingkup?: boolean;
  petugas?: KontakPetugas | null;
}

const SAPAAN =
  "Halo! Saya Si Pandu AI 👋\n\nSaya dapat membantu Anda memahami regulasi, sertifikasi, pemeriksaan, CAPA, dan label produk.\n\nApa yang ingin Anda konsultasikan?";

const PROMPT_CEPAT = [
  "Apakah produk saya wajib BPOM?",
  "Bagaimana mengurus IP CPPOB?",
  "Apa saja dokumen untuk pemeriksaan?",
  "Bagaimana membuat CAPA?",
  "Cek label produk saya",
];

export function KonsultasiView({ boot }: { boot: Bootstrap | null }) {
  const [pesan, setPesan] = useState<Pesan[]>([{ dari: "pandu", teks: SAPAAN }]);
  const [teks, setTeks] = useState("");
  const [kirim, setKirim] = useState(false);
  const [saran, setSaran] = useState<string[]>(PROMPT_CEPAT);
  const akhirRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    akhirRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [pesan, kirim]);

  async function tanya(pertanyaan: string) {
    const t = pertanyaan.trim();
    if (t.length < 3 || kirim) return;

    setPesan((p) => [...p, { dari: "pengguna", teks: t }]);
    setTeks("");
    setKirim(true);
    try {
      const jawab = await panduService.askAssistant(t);
      setPesan((p) => [...p, {
        dari: "pandu",
        teks: jawab.jawaban,
        sumber: jawab.sumber,
        perluVerifikasi: jawab.perlu_verifikasi,
        diLuarLingkup: jawab.di_luar_lingkup,
        petugas: jawab.butuh_petugas ? jawab.petugas ?? null : null,
      }]);
      setSaran(jawab.saran?.length ? jawab.saran : PROMPT_CEPAT);
    } catch (e) {
      setPesan((p) => [...p, {
        dari: "pandu",
        teks: extractApiErrorMessage(e) ||
          "Maaf, Si Pandu AI sedang mengalami kendala. Silakan coba kembali atau hubungi kanal resmi Balai POM di Jember.",
      }]);
    } finally {
      setKirim(false);
    }
  }

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="border-b border-navy-900/10 bg-gradient-to-br from-navy-900 to-navy-800 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <Maskot size={44} />
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold">
              <MessageCircle className="size-4" /> Konsultasi BPOM
            </h3>
            <p className="mt-0.5 text-xs text-white/75">
              Tanyakan hal seputar regulasi, sertifikasi, keamanan dan mutu Obat dan Makanan.
            </p>
          </div>
        </div>
      </div>

      {/* Percakapan */}
      <div className="max-h-[52vh] min-h-[280px] space-y-3 overflow-y-auto bg-navy-50/40 p-4 sm:max-h-[56vh]">
        {pesan.map((m, i) => (
          <Gelembung key={i} pesan={m} />
        ))}
        {kirim && <PanduLoading pesan="Si Pandu sedang membaca regulasi…" />}
        <div ref={akhirRef} />
      </div>

      {/* Saran pertanyaan */}
      <div className="flex flex-wrap gap-1.5 border-t border-navy-900/5 bg-white px-4 pt-3">
        {saran.slice(0, 5).map((s) => (
          <button
            key={s}
            onClick={() => tanya(s)}
            disabled={kirim}
            className="rounded-full border border-navy-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-navy-600 transition-colors hover:border-bpom-400 hover:bg-bpom-50 hover:text-bpom-700 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Masukan */}
      <form
        onSubmit={(e) => { e.preventDefault(); tanya(teks); }}
        className="flex items-end gap-2 bg-white p-4"
      >
        <textarea
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); tanya(teks); }
          }}
          rows={1}
          placeholder="Tulis pertanyaan Anda…"
          className="max-h-32 min-h-[46px] flex-1 resize-y rounded-2xl border border-navy-900/10 bg-white px-4 py-3 text-sm outline-none focus:border-bpom-500"
        />
        <button
          type="submit"
          disabled={kirim || teks.trim().length < 3}
          className="flex size-[46px] shrink-0 items-center justify-center rounded-2xl bg-bpom-600 text-white transition-all hover:bg-bpom-700 disabled:opacity-40"
          aria-label="Kirim pertanyaan"
        >
          <Send className="size-4" />
        </button>
      </form>

      <div className="px-4 pb-4">
        <Disclaimer teks={boot?.disclaimer} />
      </div>
    </Card>
  );
}

function Gelembung({ pesan }: { pesan: Pesan }) {
  const dariPandu = pesan.dari === "pandu";

  return (
    <div className={cn("flex gap-2.5", dariPandu ? "justify-start" : "justify-end")}>
      {dariPandu && <Maskot size={32} className="mt-1" />}
      <div className={cn("max-w-[85%] min-w-0", !dariPandu && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
            dariPandu
              ? "rounded-tl-sm bg-white text-navy-800"
              : "rounded-tr-sm bg-bpom-600 text-white"
          )}
        >
          {pesan.diLuarLingkup && (
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-600">
              <AlertTriangle className="size-3.5" /> Di luar lingkup
            </span>
          )}
          <TeksTerformat teks={pesan.teks} />
        </div>

        {/* Penghubung ke petugas saat jawaban belum memadai */}
        {dariPandu && pesan.petugas && <KartuPetugas petugas={pesan.petugas} />}

        {/* Referensi knowledge */}
        {dariPandu && pesan.sumber && pesan.sumber.length > 0 && (
          <div className="mt-1.5 rounded-xl border border-navy-900/5 bg-white/70 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-navy-400">
              <BookMarked className="size-3" /> Sumber
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {pesan.sumber.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-semibold text-navy-600">
                  {s.judul}
                  {s.perlu_verifikasi && <Badge tone="warning" className="!px-1.5 !py-0 !text-[9px]">verifikasi</Badge>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Ajakan menghubungi petugas ketika asisten belum dapat menjawab pasti. */
function KartuPetugas({ petugas }: { petugas: KontakPetugas }) {
  return (
    <div className="mt-2 rounded-2xl border border-bpom-200 bg-bpom-50/70 p-3.5">
      <p className="text-xs font-bold text-bpom-800">{petugas.ajakan}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-navy-600">
        Petugas {petugas.nama} dapat memberikan penjelasan resmi sesuai kondisi usaha Anda.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {petugas.whatsapp_link && (
          <a
            href={petugas.whatsapp_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-bpom-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-bpom-700"
          >
            <MessageCircle className="size-3.5" /> WhatsApp {petugas.whatsapp}
          </a>
        )}
        {petugas.telepon_link && (
          <a
            href={petugas.telepon_link}
            className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white px-3 py-2 text-xs font-bold text-navy-700 transition-colors hover:bg-navy-50"
          >
            <Phone className="size-3.5" /> {petugas.telepon}
          </a>
        )}
        {petugas.email && (
          <a
            href={`mailto:${petugas.email}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white px-3 py-2 text-xs font-bold text-navy-700 transition-colors hover:bg-navy-50"
          >
            <Mail className="size-3.5" /> Email
          </a>
        )}
      </div>
    </div>
  );
}

/** Render teks sederhana: **tebal**, _miring_, dan baris baru. */
function TeksTerformat({ teks }: { teks: string }) {
  return (
    <>
      {teks.split("\n").map((baris, i) => {
        if (baris.trim() === "") return <span key={i} className="block h-2" />;
        const bagian = baris.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean);
        return (
          <span key={i} className="block">
            {bagian.map((b, j) => {
              if (b.startsWith("**") && b.endsWith("**")) return <strong key={j}>{b.slice(2, -2)}</strong>;
              if (b.startsWith("_") && b.endsWith("_")) return <em key={j} className="opacity-80">{b.slice(1, -1)}</em>;
              return <span key={j}>{b}</span>;
            })}
          </span>
        );
      })}
    </>
  );
}
