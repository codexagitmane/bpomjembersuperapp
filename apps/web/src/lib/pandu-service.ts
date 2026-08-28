import { api } from "@/lib/api";

/**
 * Lapisan layanan SI PANDU AI.
 *
 * Seluruh pemanggilan AI/analisis dikumpulkan di sini agar UI tidak memuat
 * logika asisten. Saat backend beralih ke penyedia lain (misalnya Gemini API
 * melalui server), cukup ubah berkas ini — komponen tidak perlu diubah.
 *
 * Catatan keamanan: API key TIDAK PERNAH berada di frontend. Seluruh
 * permintaan menuju backend LENTERA yang menyimpan kredensial di server.
 */

export interface SumberJawaban {
  tipe: "faq" | "topik";
  id: string | null;
  judul: string;
  kategori: string | null;
  perlu_verifikasi: boolean;
}

export interface KontakPetugas {
  nama: string;
  whatsapp: string | null;
  whatsapp_link: string | null;
  telepon: string | null;
  telepon_link: string | null;
  email: string | null;
  ajakan: string;
}

export interface JawabanAsisten {
  jawaban: string;
  sumber: SumberJawaban[];
  di_luar_lingkup: boolean;
  perlu_verifikasi: boolean;
  /** Jawaban belum memadai — tawarkan penghubung ke petugas. */
  butuh_petugas?: boolean;
  petugas?: KontakPetugas | null;
  saran: string[];
}

export interface TopikKnowledge {
  id: string;
  nama: string;
  kepanjangan: string | null;
  kategori?: string | null;
  ringkasan: string;
  perlu_verifikasi?: boolean;
}

export interface ElemenLabel {
  id: string;
  nama: string;
  kategori: string;
}

export interface KontakBpom {
  nama: string;
  whatsapp: string;
  whatsapp_link: string;
  telepon: string;
  telepon_link: string;
  email: string;
  website: string;
  catatan: string;
}

export interface Bootstrap {
  kontak: KontakBpom;
  wilayah_kerja: string[];
  sumber_resmi: { jdih: string; bpom: string; balai_jember: string };
  topik_populer: { id: string; nama: string; kategori: string | null }[];
  elemen_label: ElemenLabel[];
  disclaimer: string;
}

export interface HasilProduk {
  /** Kelengkapan isian formulir, 0–100. Bukan penilaian kelayakan produk. */
  skor_kesiapan: number;
  tingkat: "siap" | "sebagian" | "awal";
  judul_tingkat: string;
  arti_tingkat: string;
  /** Satu tindakan yang paling layak dikerjakan lebih dulu. */
  prioritas: string;
  terisi: number;
  total_medan: number;
  tersedia: string[];
  perlu_dilengkapi: string[];
  jalur_layanan: TopikKnowledge[];
  dokumen: string[];
  langkah: string[];
  catatan: string;
}

export interface ItemLabel {
  id: string;
  nama: string;
  status: "ada" | "tidak_yakin" | "belum";
  penjelasan: string;
  saran: string;
}

export interface HasilLabel {
  skor: number;
  skor_label: string;
  overall_status: "lengkap" | "perlu_verifikasi" | "perlu_perbaikan";
  visible_elements: ItemLabel[];
  verification_items: ItemLabel[];
  missing_elements: ItemLabel[];
  regulatory_notes: string[];
  design_notes: string[];
  catatan: string;
  label_url?: string;
}

export interface HasilCapa {
  temuan: string;
  kondisi_aktual: string;
  root_cause: string[];
  corrective_action: string[];
  preventive_action: string[];
  bukti_objektif: string;
  pic: string;
  target: string;
  verifikasi_efektivitas: string[];
  catatan: string;
}

/** Satu blok pada denah tata letak label. */
export interface BlokDenah {
  peran: string;
  judul: string;
  /** Porsi ruang yang disarankan, dalam persen tinggi label. */
  porsi: number;
  penekanan: "kuat" | "sedang" | "lemah";
  catatan: string;
}

export interface HasilEditLabel {
  status: string;
  instruksi: string;
  rencana_perubahan: string[];
  dipertahankan: string[];
  peringatan: string[];
  ditolak: string[];
  sumber_url?: string;
  hasil_path: string | null;
  denah?: { catatan: string; blok: BlokDenah[] };
  catatan: string;
}

export interface EntriRiwayat {
  id: number;
  jenis: "konsultasi" | "cek_produk" | "cek_label" | "capa" | "edit_label";
  judul: string;
  masukan: Record<string, unknown> | null;
  hasil: Record<string, unknown> | null;
  berkas_url: string | null;
  created_at: string;
}

export interface ProfilUsaha {
  nama_usaha?: string | null;
  nama_pemilik?: string | null;
  jenis_usaha?: string | null;
  lokasi?: string | null;
  kabupaten?: string | null;
  komoditas?: string | null;
  nib?: string | null;
  status_sertifikasi?: string | null;
  produk?: string | null;
}

export const panduService = {
  async bootstrap(): Promise<Bootstrap> {
    const { data } = await api.get("/pandu/bootstrap");
    return data.data;
  },

  /** Tanya jawab regulasi berbasis knowledge resmi. */
  async askAssistant(pertanyaan: string): Promise<JawabanAsisten> {
    const { data } = await api.post("/pandu/chat", { pertanyaan });
    return data.data;
  },

  /** Analisis awal kesiapan produk (self-assessment). */
  async analyzeProduct(payload: Record<string, unknown>): Promise<HasilProduk> {
    const { data } = await api.post("/pandu/cek-produk", payload);
    return data.data;
  },

  /** Review label: kelengkapan informasi + catatan desain. */
  async reviewLabel(
    file: File,
    checklist: Record<string, string>,
    info: { kategori?: string; nama_produk?: string }
  ): Promise<HasilLabel> {
    const fd = new FormData();
    fd.append("label", file);
    if (info.kategori) fd.append("kategori", info.kategori);
    if (info.nama_produk) fd.append("nama_produk", info.nama_produk);
    Object.entries(checklist).forEach(([k, v]) => fd.append(`checklist[${k}]`, v));
    const { data } = await api.post("/pandu/cek-label", fd);
    return data.data;
  },

  /** Susun rencana perubahan desain label. */
  async editLabel(file: File, instruksi: string, asetResmi: boolean): Promise<HasilEditLabel> {
    const fd = new FormData();
    fd.append("label", file);
    fd.append("instruksi", instruksi);
    fd.append("aset_resmi", asetResmi ? "1" : "0");
    const { data } = await api.post("/pandu/edit-label", fd);
    return data.data;
  },

  /** Susun draft CAPA dari temuan pemeriksaan. */
  async generateCAPA(payload: Record<string, unknown>): Promise<HasilCapa> {
    const { data } = await api.post("/pandu/capa", payload);
    return data.data;
  },

  async regulasi(kategori?: string) {
    const { data } = await api.get("/pandu/regulasi", { params: kategori ? { kategori } : {} });
    return data;
  },

  async faq(q?: string, kategori?: string) {
    const { data } = await api.get("/pandu/faq", { params: { q: q ?? "", kategori: kategori ?? "" } });
    return data;
  },

  async riwayat(jenis?: string): Promise<EntriRiwayat[]> {
    const { data } = await api.get("/pandu/riwayat", { params: jenis ? { jenis } : {} });
    return data.data;
  },

  async hapusRiwayat(id?: number) {
    await api.delete(id ? `/pandu/riwayat/${id}` : "/pandu/riwayat");
  },

  async profil(): Promise<ProfilUsaha | null> {
    const { data } = await api.get("/pandu/profil-usaha");
    return data.data;
  },

  async simpanProfil(payload: ProfilUsaha): Promise<ProfilUsaha> {
    const { data } = await api.put("/pandu/profil-usaha", payload);
    return data.data;
  },
};
