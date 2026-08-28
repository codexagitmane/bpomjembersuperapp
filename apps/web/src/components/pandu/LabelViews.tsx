"use client";

import { useCallback, useRef, useState } from "react";
import {
  Upload, Tag, Palette, ScanLine, ClipboardList, Sparkles, RotateCcw,
  CheckCircle2, AlertCircle, HelpCircle, ShieldAlert, X, Image as ImageIcon,
} from "lucide-react";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Maskot, PanduLoading } from "@/components/pandu/Maskot";
import { Disclaimer, JudulBagian } from "@/components/pandu/InfoViews";
import {
  panduService, type BlokDenah, type Bootstrap, type HasilLabel, type HasilEditLabel, type ItemLabel,
} from "@/lib/pandu-service";
import { extractApiErrorMessage } from "@bpom/shared";
import { cn } from "@/lib/utils";

const TIPE_DIIZINKAN = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAKS_BYTE = 5 * 1024 * 1024;

/** Area unggah dengan drag & drop, dipakai bersama oleh Cek Label & Edit Label. */
function AreaUnggah({
  berkas, setBerkas, pratinjau, setPratinjau, onError,
}: {
  berkas: File | null;
  setBerkas: (f: File | null) => void;
  pratinjau: string | null;
  setPratinjau: (s: string | null) => void;
  onError: (m: string | null) => void;
}) {
  const [seret, setSeret] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const terima = useCallback((f: File | undefined) => {
    onError(null);
    if (!f) return;
    if (!TIPE_DIIZINKAN.includes(f.type)) {
      onError("Format tidak didukung. Gunakan JPG, JPEG, PNG, atau WEBP.");
      return;
    }
    if (f.size > MAKS_BYTE) {
      onError("Ukuran berkas melebihi 5 MB. Silakan unggah gambar yang lebih kecil.");
      return;
    }
    setBerkas(f);
    setPratinjau(URL.createObjectURL(f));
  }, [onError, setBerkas, setPratinjau]);

  if (pratinjau) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-navy-900/10 bg-navy-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pratinjau} alt="Pratinjau label" className="max-h-80 w-full object-contain" />
        <button
          onClick={() => { setBerkas(null); setPratinjau(null); onError(null); }}
          className="absolute right-2 top-2 rounded-lg bg-navy-900/70 p-1.5 text-white backdrop-blur transition-colors hover:bg-navy-900"
          aria-label="Hapus gambar"
        >
          <X className="size-4" />
        </button>
        <p className="truncate bg-white px-3 py-2 text-xs text-navy-500">
          <ImageIcon className="mr-1 inline size-3.5" />
          {berkas?.name} — {((berkas?.size ?? 0) / 1024).toFixed(0)} KB
        </p>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setSeret(true); }}
      onDragLeave={() => setSeret(false)}
      onDrop={(e) => { e.preventDefault(); setSeret(false); terima(e.dataTransfer.files?.[0]); }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
        seret ? "border-bpom-500 bg-bpom-50" : "border-navy-200 bg-navy-50/40 hover:border-bpom-400 hover:bg-bpom-50/50"
      )}
    >
      <Maskot size={64} />
      <p className="text-sm font-bold text-navy-800">Upload desain label Anda</p>
      <p className="text-xs text-navy-500">Seret & lepas berkas ke sini, atau klik untuk memilih.</p>
      <p className="text-[11px] text-navy-400">Format JPG, JPEG, PNG, WEBP — maksimal 5 MB.</p>
      <span className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-bpom-600 px-3.5 py-2 text-xs font-bold text-white">
        <Upload className="size-3.5" /> Pilih Berkas
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => terima(e.target.files?.[0])}
      />
    </div>
  );
}

// ─────────────────────────────── CEK LABEL ───────────────────────────────

const STATUS_PILIHAN: { nilai: "ada" | "tidak_yakin" | "belum"; label: string; kelas: string }[] = [
  { nilai: "ada", label: "Ada", kelas: "bg-bpom-600 text-white" },
  { nilai: "tidak_yakin", label: "Tidak yakin", kelas: "bg-amber-500 text-white" },
  { nilai: "belum", label: "Belum", kelas: "bg-rose-500 text-white" },
];

export function CekLabelView({ boot }: { boot: Bootstrap | null }) {
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [namaProduk, setNamaProduk] = useState("");
  const [kategori, setKategori] = useState("");
  const [checklist, setChecklist] = useState<Record<string, string>>({});
  const [hasil, setHasil] = useState<HasilLabel | null>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [tab, setTab] = useState<"regulasi" | "desain">("regulasi");

  const elemen = (boot?.elemen_label ?? []).filter(
    (e) => e.kategori !== "pangan" || kategori.toLowerCase().includes("pangan")
  );

  async function analisis() {
    if (!berkas) return;
    setProses(true); setGalat(null); setHasil(null);
    try {
      const r = await panduService.reviewLabel(berkas, checklist, { kategori, nama_produk: namaProduk });
      setHasil(r);
      setTab("regulasi");
    } catch (e) {
      setGalat(extractApiErrorMessage(e) || "Label belum dapat dianalisis. Silakan coba upload gambar dengan kualitas lebih jelas.");
    } finally {
      setProses(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <JudulBagian
          ikon={<Tag className="size-4 text-bpom-600" />}
          judul="🏷️ Cek Label"
          anak="Tinjau kelengkapan informasi pada desain label sebelum mengajukan layanan resmi."
        />

        <AreaUnggah
          berkas={berkas} setBerkas={setBerkas}
          pratinjau={pratinjau} setPratinjau={setPratinjau}
          onError={setGalat}
        />

        {berkas && (
          <>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-navy-500">Nama produk</label>
                <input
                  value={namaProduk} onChange={(e) => setNamaProduk(e.target.value)}
                  placeholder="Contoh: Keripik Pisang Manis"
                  className="mt-1 w-full rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-bpom-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-navy-500">Kategori produk</label>
                <select
                  value={kategori} onChange={(e) => setKategori(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-bpom-500"
                >
                  <option value="">— Pilih kategori —</option>
                  <option value="pangan olahan">Pangan olahan</option>
                  <option value="kosmetika">Kosmetika</option>
                  <option value="obat tradisional">Obat tradisional</option>
                  <option value="suplemen kesehatan">Suplemen kesehatan</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-navy-900/10 bg-navy-50/40 p-4">
              <p className="text-sm font-bold text-navy-800">Tandai informasi yang ada pada label Anda</p>
              <p className="mt-0.5 text-xs leading-relaxed text-navy-500">
                Si Pandu AI belum membaca tulisan pada gambar secara otomatis, sehingga hasil disusun dari
                pernyataan Anda. Isi sejujurnya agar hasil tinjauan bermanfaat.
              </p>

              <div className="mt-3 space-y-1.5">
                {elemen.map((el) => (
                  <div key={el.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
                    <span className="text-xs font-semibold text-navy-700">{el.nama}</span>
                    <div className="flex gap-1">
                      {STATUS_PILIHAN.map((s) => (
                        <button
                          key={s.nilai}
                          onClick={() => setChecklist((c) => ({ ...c, [el.id]: s.nilai }))}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                            checklist[el.id] === s.nilai ? s.kelas : "bg-navy-50 text-navy-500 hover:bg-navy-100"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {elemen.length === 0 && <p className="text-xs text-navy-400">Memuat daftar elemen label…</p>}
              </div>
            </div>

            <div className="mt-4">
              <Button variant="secondary" size="lg" className="w-full" loading={proses} onClick={analisis}>
                <ScanLine className="size-4" /> Analisis Label
              </Button>
            </div>
          </>
        )}

        {galat && (
          <p className="mt-3 rounded-xl bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-700">{galat}</p>
        )}
        {proses && <div className="mt-3"><PanduLoading pesan="Si Pandu sedang memeriksa label…" /></div>}
        {!berkas && !proses && (
          <p className="mt-4 text-center text-xs text-navy-400">Upload label Anda untuk memulai review.</p>
        )}
      </Card>

      {hasil && <HasilReviewLabel hasil={hasil} tab={tab} setTab={setTab} />}
    </div>
  );
}

function HasilReviewLabel({
  hasil, tab, setTab,
}: { hasil: HasilLabel; tab: "regulasi" | "desain"; setTab: (t: "regulasi" | "desain") => void }) {
  const warnaSkor = hasil.skor >= 90 ? "text-bpom-600" : hasil.skor >= 70 ? "text-amber-500" : "text-rose-500";
  const lingkar = 2 * Math.PI * 42;

  return (
    <Card>
      <JudulBagian ikon={<ClipboardList className="size-4 text-bpom-600" />} judul="Hasil Review Label" />

      {/* Skor */}
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-navy-50/60 p-5 sm:flex-row">
        <div className="relative size-28 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" className="stroke-navy-200" />
            <circle
              cx="50" cy="50" r="42" fill="none" strokeWidth="10" strokeLinecap="round"
              className={cn("transition-all duration-700", warnaSkor)}
              stroke="currentColor"
              strokeDasharray={lingkar}
              strokeDashoffset={lingkar - (lingkar * hasil.skor) / 100}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-2xl font-extrabold", warnaSkor)}>{hasil.skor}</span>
            <span className="text-[10px] font-semibold text-navy-400">/ 100</span>
          </div>
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-base font-extrabold text-navy-900">{hasil.skor_label}</p>
          <p className="mt-1 text-xs leading-relaxed text-navy-500">
            Skor ini adalah indikator kelengkapan hasil self-check Anda — bukan skor atau penilaian resmi BPOM.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            <Badge tone="success">{hasil.visible_elements.length} sudah ada</Badge>
            <Badge tone="warning">{hasil.verification_items.length} perlu verifikasi</Badge>
            <Badge tone="danger">{hasil.missing_elements.length} perlu diperbaiki</Badge>
          </div>
        </div>
      </div>

      {/* Tab pemisah regulasi & desain */}
      <div className="mt-4 inline-flex w-full rounded-2xl border border-navy-900/5 bg-white p-1 shadow-sm sm:w-auto">
        <button
          onClick={() => setTab("regulasi")}
          className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all sm:flex-none",
            tab === "regulasi" ? "bg-navy-900 text-white" : "text-navy-500 hover:bg-navy-50")}
        >
          📋 Review Regulasi
        </button>
        <button
          onClick={() => setTab("desain")}
          className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all sm:flex-none",
            tab === "desain" ? "bg-navy-900 text-white" : "text-navy-500 hover:bg-navy-50")}
        >
          🎨 Review Desain
        </button>
      </div>

      {tab === "regulasi" ? (
        <div className="mt-4 space-y-4">
          <KelompokElemen judul="Terlihat sudah ada" nada="sukses" item={hasil.visible_elements} />
          <KelompokElemen judul="Perlu verifikasi" nada="ragu" item={hasil.verification_items} />
          <KelompokElemen judul="Berpotensi perlu diperbaiki" nada="bahaya" item={hasil.missing_elements} />

          <div className="rounded-2xl bg-navy-50/60 p-4">
            <p className="text-xs font-bold text-navy-700">Catatan regulasi</p>
            <ul className="mt-2 space-y-1.5">
              {hasil.regulatory_notes.map((n, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-navy-600">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-navy-400" />{n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2 rounded-2xl bg-navy-50/60 p-4">
          <p className="text-xs font-bold text-navy-700">Catatan desain &amp; keterbacaan</p>
          <ul className="space-y-1.5">
            {hasil.design_notes.map((n, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-navy-600">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-sky-400" />{n}
              </li>
            ))}
          </ul>
          <p className="mt-2 rounded-xl bg-white px-3 py-2 text-[11px] text-navy-500">
            Desain yang rapi tidak dengan sendirinya berarti label telah memenuhi ketentuan — keduanya dinilai terpisah.
          </p>
        </div>
      )}

      <p className="mt-4 rounded-xl bg-navy-50 px-4 py-3 text-[11px] leading-relaxed text-navy-600">{hasil.catatan}</p>
      <Disclaimer />
    </Card>
  );
}

function KelompokElemen({
  judul, nada, item,
}: { judul: string; nada: "sukses" | "ragu" | "bahaya"; item: ItemLabel[] }) {
  if (item.length === 0) return null;
  const gaya = {
    sukses: { ikon: <CheckCircle2 className="size-4 text-bpom-600" />, titik: "🟢", batas: "border-bpom-200 bg-bpom-50/40" },
    ragu: { ikon: <HelpCircle className="size-4 text-amber-500" />, titik: "🟡", batas: "border-amber-200 bg-amber-50/40" },
    bahaya: { ikon: <AlertCircle className="size-4 text-rose-500" />, titik: "🔴", batas: "border-rose-200 bg-rose-50/40" },
  }[nada];

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-navy-700">{gaya.ikon} {gaya.titik} {judul}</p>
      <div className="space-y-1.5">
        {item.map((i) => (
          <div key={i.id} className={cn("rounded-xl border p-3", gaya.batas)}>
            <p className="text-xs font-bold text-navy-800">{i.nama}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-navy-600">{i.penjelasan}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-navy-500"><b>Saran:</b> {i.saran}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────── EDIT LABEL ───────────────────────────────

const CHIP_EDIT = [
  "Tambahkan logo", "Rapikan layout", "Perbesar logo", "Perjelas teks",
  "Atur spacing", "Ganti warna", "Buat lebih modern", "Buat lebih minimalis", "Buat mockup kemasan",
];

export function EditLabelView() {
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [instruksi, setInstruksi] = useState("");
  const [asetResmi, setAsetResmi] = useState(false);
  const [hasil, setHasil] = useState<HasilEditLabel | null>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function edit() {
    if (!berkas || instruksi.trim().length < 5) return;
    setProses(true); setGalat(null); setHasil(null);
    try {
      setHasil(await panduService.editLabel(berkas, instruksi, asetResmi));
    } catch (e) {
      setGalat(extractApiErrorMessage(e) || "Maaf, Si Pandu AI sedang mengalami kendala. Silakan coba kembali.");
    } finally {
      setProses(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <JudulBagian
          ikon={<Palette className="size-4 text-bpom-600" />}
          judul="🎨 Edit Label"
          anak="Susun rencana perbaikan tampilan label tanpa mengubah informasi produk."
        />

        <AreaUnggah
          berkas={berkas} setBerkas={setBerkas}
          pratinjau={pratinjau} setPratinjau={setPratinjau}
          onError={setGalat}
        />

        {berkas && (
          <>
            <div className="mt-4">
              <p className="text-sm font-bold text-navy-800">Perintah Edit</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CHIP_EDIT.map((c) => (
                  <button
                    key={c}
                    onClick={() => setInstruksi((s) => (s ? `${s}, ${c.toLowerCase()}` : c))}
                    className="rounded-full border border-navy-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-navy-600 transition-colors hover:border-bpom-400 hover:bg-bpom-50 hover:text-bpom-700"
                  >
                    + {c}
                  </button>
                ))}
              </div>

              <textarea
                value={instruksi}
                onChange={(e) => setInstruksi(e.target.value)}
                rows={3}
                placeholder="Jelaskan perubahan yang Anda inginkan…&#10;Contoh: Tambahkan logo usaha saya di kiri atas, rapikan komposisi, dan jangan mengubah informasi produk."
                className="mt-3 w-full resize-y rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-bpom-500"
              />

              <label className="mt-2.5 flex cursor-pointer items-start gap-2.5 rounded-xl bg-navy-50/60 px-3.5 py-2.5">
                <input
                  type="checkbox" checked={asetResmi}
                  onChange={(e) => setAsetResmi(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-bpom-600"
                />
                <span className="text-[11px] leading-relaxed text-navy-600">
                  Saya menyertakan aset/logo resmi yang memang saya miliki.
                  <span className="mt-0.5 block text-navy-400">
                    Si Pandu AI tidak membuat logo sertifikasi maupun nomor sertifikat.
                  </span>
                </span>
              </label>

              <Button
                variant="secondary" size="lg" className="mt-3 w-full"
                loading={proses}
                disabled={instruksi.trim().length < 5}
                onClick={edit}
              >
                <Sparkles className="size-4" /> Edit Desain
              </Button>
            </div>
          </>
        )}

        {galat && <p className="mt-3 rounded-xl bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-700">{galat}</p>}
        {proses && <div className="mt-3"><PanduLoading pesan="Si Pandu sedang menyusun rencana desain…" /></div>}
        {!berkas && !proses && (
          <p className="mt-4 text-center text-xs text-navy-400">Upload label Anda untuk mulai menyusun rencana perubahan.</p>
        )}
      </Card>

      {hasil && (
        <Card>
          <JudulBagian ikon={<Sparkles className="size-4 text-bpom-600" />} judul="Rencana Perubahan Desain" />

          {hasil.ditolak.length > 0 && hasil.ditolak.map((d, i) => (
            <p key={i} className="mb-2 flex items-start gap-2 rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-[11px] leading-relaxed text-rose-700">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />{d}
            </p>
          ))}
          {hasil.peringatan.map((p, i) => (
            <p key={i} className="mb-2 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-[11px] leading-relaxed text-amber-700">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />{p}
            </p>
          ))}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-navy-900/10 p-3">
              <p className="mb-2 text-xs font-bold text-navy-700">Label Anda sekarang</p>
              {pratinjau && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pratinjau} alt="Label yang diunggah" className="max-h-56 w-full rounded-xl object-contain" />
              )}
            </div>
            <div className="min-w-0 rounded-2xl border border-navy-900/10 bg-navy-50/40 p-3">
              <p className="mb-2 text-xs font-bold text-navy-700">Denah tata letak usulan</p>
              <DenahLabel denah={hasil.denah} />
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-navy-50/60 p-4">
            <p className="text-xs font-bold text-navy-700">Yang akan diubah</p>
            <ul className="mt-2 space-y-1.5">
              {hasil.rencana_perubahan.map((r, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-navy-600">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-violet-400" />{r}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 rounded-2xl bg-bpom-50/60 p-4">
            <p className="text-xs font-bold text-bpom-800">Yang tetap dipertahankan</p>
            <ul className="mt-2 space-y-1.5">
              {hasil.dipertahankan.map((r, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-navy-600">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-bpom-600" />{r}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { setHasil(null); setInstruksi(""); }}>
              <RotateCcw className="size-4" /> Kembalikan
            </Button>
            <Button size="sm" variant="secondary" onClick={edit} loading={proses}>
              <Sparkles className="size-4" /> Edit Lagi
            </Button>
          </div>

          <p className="mt-3 rounded-xl bg-navy-50 px-4 py-3 text-[11px] leading-relaxed text-navy-600">{hasil.catatan}</p>
          <Disclaimer />
        </Card>
      )}
    </div>
  );
}

/** Warna blok denah menurut tingkat penekanannya. */
const NADA_BLOK: Record<string, string> = {
  kuat: "bg-navy-800 text-white border-navy-800",
  sedang: "bg-white text-navy-800 border-navy-300",
  lemah: "bg-navy-50 text-navy-500 border-navy-200",
};

/**
 * Kerangka tata letak label yang diusulkan.
 *
 * Digambar dari denah yang dikirim server: tiap blok memakai porsi tinggi
 * sesuai persentasenya, sehingga proporsi ruang langsung terlihat. Ini
 * kerangka desain — bukan hasil suntingan atas karya pengguna, dan disebut
 * demikian secara terbuka agar tidak disalahartikan sebagai gambar jadi.
 */
function DenahLabel({ denah }: { denah?: { catatan: string; blok: BlokDenah[] } }) {
  if (!denah || denah.blok.length === 0) {
    return (
      <p className="py-6 text-center text-[11px] leading-relaxed text-navy-400">
        Denah tata letak belum tersedia untuk permintaan ini.
      </p>
    );
  }

  return (
    <div>
      <div className="flex h-56 flex-col gap-1 rounded-xl border border-navy-200 bg-white p-1.5">
        {denah.blok.map((b, i) => (
          <div
            key={b.peran}
            style={{ flexGrow: b.porsi }}
            title={b.catatan}
            className={cn(
              "flex min-h-0 items-center gap-1.5 overflow-hidden rounded-lg border px-2",
              NADA_BLOK[b.penekanan] ?? NADA_BLOK.sedang
            )}
          >
            <span className="shrink-0 text-[9px] font-bold tabular-nums opacity-60">{i + 1}</span>
            <span className="truncate text-[10px] font-bold leading-tight">{b.judul}</span>
            <span className="ml-auto shrink-0 text-[9px] tabular-nums opacity-60">{b.porsi}%</span>
          </div>
        ))}
      </div>

      <ol className="mt-2.5 space-y-1">
        {denah.blok.map((b, i) => (
          <li key={b.peran} className="flex gap-1.5 text-[10px] leading-relaxed text-navy-500">
            <span className="shrink-0 font-bold text-navy-700">{i + 1}.</span>
            <span className="min-w-0">
              <span className="font-semibold text-navy-700">{b.judul}</span> — {b.catatan}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-2.5 border-t border-navy-900/5 pt-2 text-[10px] leading-relaxed text-navy-400">
        {denah.catatan}
      </p>
    </div>
  );
}
