"use client";

import { useState } from "react";
import {
  Search, ClipboardList, CheckCircle2, AlertCircle, Route, FileText,
  ArrowRight, Copy, Check, Target, UserCog,
} from "lucide-react";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PanduLoading } from "@/components/pandu/Maskot";
import { Disclaimer, JudulBagian } from "@/components/pandu/InfoViews";
import { panduService, type HasilProduk, type HasilCapa } from "@/lib/pandu-service";
import { extractApiErrorMessage } from "@bpom/shared";

const KELAS_INPUT =
  "w-full rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-bpom-500";

function Medan({
  label, anak, children,
}: { label: string; anak?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-navy-500">{label}</label>
      {anak && <p className="text-[11px] text-navy-400">{anak}</p>}
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ─────────────────────────────── CEK PRODUK ───────────────────────────────

export function CekProdukView() {
  const [f, setF] = useState({
    nama_produk: "", jenis_produk: "", kategori: "", komposisi: "",
    cara_produksi: "", lokasi_produksi: "", produksi_sendiri: "",
    nib: "", punya_izin: "", sudah_beredar: "",
  });
  const [hasil, setHasil] = useState<HasilProduk | null>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function kirim() {
    if (!f.nama_produk.trim()) return;
    setProses(true); setGalat(null); setHasil(null);
    try {
      const bersih = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ""));
      setHasil(await panduService.analyzeProduct(bersih));
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
          ikon={<Search className="size-4 text-bpom-600" />}
          judul="🔎 Cek Produk"
          anak="Penilaian awal kesiapan produk Anda sebelum mengajukan layanan resmi."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Medan label="Nama Produk *">
            <input className={KELAS_INPUT} value={f.nama_produk} onChange={(e) => set("nama_produk", e.target.value)} placeholder="Contoh: Keripik Pisang Manis" />
          </Medan>
          <Medan label="Jenis Produk">
            <input className={KELAS_INPUT} value={f.jenis_produk} onChange={(e) => set("jenis_produk", e.target.value)} placeholder="Contoh: makanan ringan" />
          </Medan>
          <Medan label="Kategori">
            <select className={KELAS_INPUT} value={f.kategori} onChange={(e) => set("kategori", e.target.value)}>
              <option value="">— Pilih kategori —</option>
              <option value="pangan olahan">Pangan olahan</option>
              <option value="kosmetika">Kosmetika</option>
              <option value="obat tradisional">Obat tradisional</option>
              <option value="suplemen kesehatan">Suplemen kesehatan</option>
              <option value="distribusi">Distribusi / peredaran</option>
            </select>
          </Medan>
          <Medan label="Lokasi Produksi">
            <input className={KELAS_INPUT} value={f.lokasi_produksi} onChange={(e) => set("lokasi_produksi", e.target.value)} placeholder="Contoh: Jember" />
          </Medan>
          <Medan label="Produksi Sendiri / Maklon">
            <select className={KELAS_INPUT} value={f.produksi_sendiri} onChange={(e) => set("produksi_sendiri", e.target.value)}>
              <option value="">— Pilih —</option>
              <option value="sendiri">Produksi sendiri</option>
              <option value="maklon">Maklon (diproduksi pihak lain)</option>
              <option value="tidak_tahu">Belum tahu</option>
            </select>
          </Medan>
          <Medan label="NIB">
            <input className={KELAS_INPUT} value={f.nib} onChange={(e) => set("nib", e.target.value)} placeholder="Nomor Induk Berusaha" />
          </Medan>
          <Medan label="Sudah memiliki izin/sertifikat?">
            <select className={KELAS_INPUT} value={f.punya_izin} onChange={(e) => set("punya_izin", e.target.value)}>
              <option value="">— Pilih —</option>
              <option value="sudah">Sudah</option>
              <option value="belum">Belum</option>
              <option value="tidak_tahu">Belum tahu</option>
            </select>
          </Medan>
          <Medan label="Produk sudah beredar?">
            <select className={KELAS_INPUT} value={f.sudah_beredar} onChange={(e) => set("sudah_beredar", e.target.value)}>
              <option value="">— Pilih —</option>
              <option value="ya">Sudah beredar</option>
              <option value="belum">Belum beredar</option>
            </select>
          </Medan>
          <div className="sm:col-span-2">
            <Medan label="Komposisi">
              <textarea className={KELAS_INPUT} rows={2} value={f.komposisi} onChange={(e) => set("komposisi", e.target.value)} placeholder="Tuliskan bahan-bahan yang digunakan…" />
            </Medan>
          </div>
          <div className="sm:col-span-2">
            <Medan label="Cara Produksi">
              <textarea className={KELAS_INPUT} rows={2} value={f.cara_produksi} onChange={(e) => set("cara_produksi", e.target.value)} placeholder="Gambarkan singkat proses produksi Anda…" />
            </Medan>
          </div>
        </div>

        <Button variant="secondary" size="lg" className="mt-4 w-full" loading={proses} disabled={!f.nama_produk.trim()} onClick={kirim}>
          <Search className="size-4" /> Analisis Produk
        </Button>

        {galat && <p className="mt-3 rounded-xl bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-700">{galat}</p>}
        {proses && <div className="mt-3"><PanduLoading pesan="Si Pandu sedang menelaah produk Anda…" /></div>}
      </Card>

      {hasil && (
        <>
          <KartuKesiapan hasil={hasil} />

        <Card>
          <JudulBagian ikon={<ClipboardList className="size-4 text-bpom-600" />} judul="Rincian Penilaian Awal" />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-bpom-200 bg-bpom-50/40 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-bpom-800">
                <CheckCircle2 className="size-4" /> 🟢 Informasi yang sudah tersedia
              </p>
              <ul className="mt-2 space-y-1">
                {hasil.tersedia.map((t) => (
                  <li key={t} className="text-xs text-navy-600">• {t}</li>
                ))}
                {hasil.tersedia.length === 0 && <li className="text-xs text-navy-400">Belum ada.</li>}
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                <AlertCircle className="size-4" /> 🟡 Informasi yang perlu dilengkapi
              </p>
              <ul className="mt-2 space-y-1">
                {hasil.perlu_dilengkapi.map((t) => (
                  <li key={t} className="text-xs text-navy-600">• {t}</li>
                ))}
                {hasil.perlu_dilengkapi.length === 0 && <li className="text-xs text-navy-400">Semua sudah terisi.</li>}
              </ul>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50/40 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
              <Route className="size-4" /> 🔵 Jalur layanan yang kemungkinan relevan
            </p>
            <div className="mt-2 space-y-2">
              {hasil.jalur_layanan.map((j) => (
                <div key={j.id} className="rounded-xl bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-navy-900">{j.nama}</p>
                    {j.kepanjangan && <span className="text-[11px] text-navy-500">{j.kepanjangan}</span>}
                    {j.perlu_verifikasi && <Badge tone="warning">Perlu verifikasi</Badge>}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-navy-600">{j.ringkasan}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-navy-50/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-navy-700">
              <FileText className="size-4" /> 📋 Dokumen yang perlu disiapkan
            </p>
            <ul className="mt-2 space-y-1">
              {hasil.dokumen.map((d) => <li key={d} className="text-xs text-navy-600">• {d}</li>)}
            </ul>
          </div>

          <div className="mt-3 rounded-2xl bg-navy-50/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-navy-700">
              <ArrowRight className="size-4" /> ➡️ Langkah berikutnya
            </p>
            <ol className="mt-2 space-y-1.5">
              {hasil.langkah.map((l, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-navy-600">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-bpom-600 text-[9px] font-bold text-white">{i + 1}</span>
                  {l}
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-3 rounded-xl bg-navy-50 px-4 py-3 text-[11px] leading-relaxed text-navy-600">{hasil.catatan}</p>
          <Disclaimer />
        </Card>
        </>
      )}
    </div>
  );
}

const NADA_KESIAPAN: Record<string, { cincin: string; teks: string; pil: string }> = {
  siap: { cincin: "#15915a", teks: "text-bpom-700", pil: "bg-bpom-50 text-bpom-700" },
  sebagian: { cincin: "#d99a1e", teks: "text-amber-700", pil: "bg-amber-500/10 text-amber-700" },
  awal: { cincin: "#8291ab", teks: "text-navy-600", pil: "bg-navy-100 text-navy-600" },
};

/**
 * Kartu utama hasil Cek Produk: satu angka, satu kalimat kesimpulan, dan satu
 * tindakan berikutnya. Sebelumnya hasil hanya berupa deretan daftar sehingga
 * pengguna sulit menangkap "sudah sampai mana saya".
 *
 * Angka yang ditampilkan adalah kelengkapan isian formulir — disebutkan
 * demikian di kartunya sendiri supaya tidak disalahartikan sebagai penilaian
 * kelayakan produk atau keputusan resmi.
 */
function KartuKesiapan({ hasil }: { hasil: HasilProduk }) {
  const nada = NADA_KESIAPAN[hasil.tingkat] ?? NADA_KESIAPAN.awal;
  const keliling = 2 * Math.PI * 42;
  const terisi = (hasil.skor_kesiapan / 100) * keliling;

  return (
    <Card className="overflow-hidden !p-0">
      <div className="flex flex-col gap-4 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 p-5 text-white sm:flex-row sm:items-center sm:gap-6">
        <div className="relative mx-auto size-28 shrink-0 sm:mx-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="9" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={nada.cincin} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${terisi} ${keliling - terisi}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold tabular-nums">{hasil.skor_kesiapan}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-white/60">dari 100</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/55">Skor Kesiapan</p>
          <h3 className="mt-0.5 text-lg font-extrabold sm:text-xl">{hasil.judul_tingkat}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-white/75">{hasil.arti_tingkat}</p>
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold backdrop-blur">
            <ClipboardList className="size-3" />
            {hasil.terisi} dari {hasil.total_medan} informasi sudah diisi
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 border-t border-navy-900/5 p-4 sm:p-5">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${nada.pil}`}>
          <Target className="size-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-navy-400">Kerjakan ini lebih dulu</p>
          <p className={`mt-0.5 text-sm font-semibold leading-relaxed ${nada.teks}`}>{hasil.prioritas}</p>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────── CAPA ───────────────────────────────

export function CapaView() {
  const [f, setF] = useState({ temuan: "", kondisi_aktual: "", bukti: "", pic: "", target: "" });
  const [hasil, setHasil] = useState<HasilCapa | null>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [disalin, setDisalin] = useState(false);

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function kirim() {
    if (f.temuan.trim().length < 5) return;
    setProses(true); setGalat(null); setHasil(null);
    try {
      setHasil(await panduService.generateCAPA(f));
    } catch (e) {
      setGalat(extractApiErrorMessage(e) || "Maaf, Si Pandu AI sedang mengalami kendala. Silakan coba kembali.");
    } finally {
      setProses(false);
    }
  }

  async function salin() {
    if (!hasil) return;
    const t = [
      `TEMUAN\n${hasil.temuan}`,
      `KONDISI AKTUAL\n${hasil.kondisi_aktual}`,
      `ROOT CAUSE\n${hasil.root_cause.map((x) => `- ${x}`).join("\n")}`,
      `CORRECTIVE ACTION\n${hasil.corrective_action.map((x) => `- ${x}`).join("\n")}`,
      `PREVENTIVE ACTION\n${hasil.preventive_action.map((x) => `- ${x}`).join("\n")}`,
      `BUKTI OBJEKTIF\n${hasil.bukti_objektif}`,
      `PIC\n${hasil.pic}`,
      `TARGET\n${hasil.target}`,
      `VERIFIKASI EFEKTIVITAS\n${hasil.verifikasi_efektivitas.map((x) => `- ${x}`).join("\n")}`,
      `\nCatatan: ${hasil.catatan}`,
    ].join("\n\n");
    try {
      await navigator.clipboard.writeText(t);
      setDisalin(true);
      setTimeout(() => setDisalin(false), 2000);
    } catch {
      setGalat("Draft tidak dapat disalin otomatis. Silakan salin manual dari tampilan di bawah.");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <JudulBagian
          ikon={<ClipboardList className="size-4 text-bpom-600" />}
          judul="📋 Bantuan CAPA"
          anak="Masukkan temuan pemeriksaan dan saya akan membantu Anda menyusun draft CAPA berdasarkan kondisi sebenarnya."
        />

        <div className="space-y-3">
          <Medan label="Temuan *" anak="Tuliskan temuan apa adanya sesuai hasil pemeriksaan.">
            <textarea className={KELAS_INPUT} rows={3} value={f.temuan} onChange={(e) => set("temuan", e.target.value)} placeholder="Contoh: Catatan pembersihan ruang produksi tidak lengkap." />
          </Medan>
          <Medan label="Kondisi aktual" anak="Bagaimana keadaan sebenarnya di sarana Anda saat ini.">
            <textarea className={KELAS_INPUT} rows={3} value={f.kondisi_aktual} onChange={(e) => set("kondisi_aktual", e.target.value)} placeholder="Contoh: Pembersihan rutin dilakukan namun belum dicatat pada formulir." />
          </Medan>
          <Medan label="Bukti yang tersedia" anak="Kosongkan bila memang belum ada bukti — jangan mengarang.">
            <textarea className={KELAS_INPUT} rows={2} value={f.bukti} onChange={(e) => set("bukti", e.target.value)} placeholder="Contoh: Formulir catatan pembersihan, foto ruang produksi." />
          </Medan>
          <div className="grid gap-3 sm:grid-cols-2">
            <Medan label="PIC">
              <input className={KELAS_INPUT} value={f.pic} onChange={(e) => set("pic", e.target.value)} placeholder="Penanggung jawab" />
            </Medan>
            <Medan label="Target">
              <input className={KELAS_INPUT} value={f.target} onChange={(e) => set("target", e.target.value)} placeholder="Contoh: 30 hari sejak temuan" />
            </Medan>
          </div>
        </div>

        <Button variant="secondary" size="lg" className="mt-4 w-full" loading={proses} disabled={f.temuan.trim().length < 5} onClick={kirim}>
          <ClipboardList className="size-4" /> Analisis Temuan
        </Button>

        {galat && <p className="mt-3 rounded-xl bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-700">{galat}</p>}
        {proses && <div className="mt-3"><PanduLoading pesan="Si Pandu sedang menyusun CAPA…" /></div>}
      </Card>

      {hasil && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <JudulBagian ikon={<ClipboardList className="size-4 text-bpom-600" />} judul="Draft CAPA" />
            <Button size="sm" variant="outline" onClick={salin}>
              {disalin ? <><Check className="size-4" /> Tersalin</> : <><Copy className="size-4" /> Salin CAPA</>}
            </Button>
          </div>

          <div className="space-y-2.5">
            <BlokCapa judul="Temuan" isi={hasil.temuan} />
            <BlokCapa judul="Kondisi Aktual" isi={hasil.kondisi_aktual} />
            <BlokCapaDaftar judul="Root Cause" anak="Kemungkinan akar masalah untuk ditelaah bersama pelaksana." isi={hasil.root_cause} warna="bg-amber-400" />
            <BlokCapaDaftar judul="Corrective Action" isi={hasil.corrective_action} warna="bg-bpom-500" />
            <BlokCapaDaftar judul="Preventive Action" isi={hasil.preventive_action} warna="bg-sky-500" />
            <BlokCapa judul="Bukti Objektif" isi={hasil.bukti_objektif} />

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl bg-navy-50/60 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-navy-500"><UserCog className="size-3.5" /> PIC</p>
                <p className="mt-1 text-sm font-semibold text-navy-800">{hasil.pic}</p>
              </div>
              <div className="rounded-xl bg-navy-50/60 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-navy-500"><Target className="size-3.5" /> Target</p>
                <p className="mt-1 text-sm font-semibold text-navy-800">{hasil.target}</p>
              </div>
            </div>

            <BlokCapaDaftar judul="Verifikasi Efektivitas" isi={hasil.verifikasi_efektivitas} warna="bg-violet-500" />
          </div>

          <p className="mt-3 rounded-xl bg-navy-50 px-4 py-3 text-[11px] leading-relaxed text-navy-600">{hasil.catatan}</p>
          <Disclaimer />
        </Card>
      )}
    </div>
  );
}

function BlokCapa({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div className="rounded-xl border border-navy-900/10 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-navy-500">{judul}</p>
      <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-navy-700">{isi}</p>
    </div>
  );
}

function BlokCapaDaftar({
  judul, anak, isi, warna,
}: { judul: string; anak?: string; isi: string[]; warna: string }) {
  return (
    <div className="rounded-xl border border-navy-900/10 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-navy-500">{judul}</p>
      {anak && <p className="mt-0.5 text-[11px] text-navy-400">{anak}</p>}
      <ul className="mt-1.5 space-y-1.5">
        {isi.map((x, i) => (
          <li key={i} className="flex gap-2 text-xs leading-relaxed text-navy-700">
            <span className={`mt-1.5 size-1 shrink-0 rounded-full ${warna}`} />{x}
          </li>
        ))}
      </ul>
    </div>
  );
}
