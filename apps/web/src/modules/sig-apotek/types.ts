/**
 * Tipe data modul SIG Monitoring Distribusi Apotek.
 *
 * Seluruh status di sini bersifat administratif — menggambarkan keadaan data
 * pada sistem, bukan keputusan regulator atas sarana yang bersangkutan.
 */

export type StatusSarana = "aktif" | "nonaktif" | "belum_diverifikasi";

/** Status tampilan pada peta (menggambarkan keadaan data monitoring). */
export type StatusPeta = "baik" | "perlu_monitoring" | "ada_temuan" | "belum_lengkap";

export type StatusTemuan = "belum" | "proses" | "selesai";

export type TingkatPrioritas = "tinggi" | "sedang" | "rendah";

export type PeranSig = "admin" | "operator" | "viewer";

export interface Apotek {
  id: number;
  nama_apotek: string;
  alamat: string;
  kabupaten: string | null;
  kecamatan: string | null;
  desa: string | null;
  latitude: number | null;
  longitude: number | null;
  punya_koordinat: boolean;
  nib: string | null;
  nomor_identitas: string | null;
  pemilik: string | null;
  penanggung_jawab: string | null;
  telepon: string | null;
  email: string | null;
  jenis_sarana: string;
  status_sarana: StatusSarana;
  status_peta: StatusPeta;
  keterangan: string | null;
  tanggal_pemeriksaan_terakhir: string | null;
  hasil_pemeriksaan_terakhir: string | null;
  temuan_total: number;
  temuan_aktif: number;
  tindak_lanjut_belum: number;
  is_demo: boolean;
  tanggal_input: string | null;
  tanggal_update: string | null;
}

export interface Kpi {
  total_apotek: number;
  apotek_aktif: number;
  perlu_monitoring: number;
  belum_diperiksa: number;
  temuan_aktif: number;
  tindak_lanjut_belum_selesai: number;
  tindak_lanjut_lewat_target: number;
  tanpa_koordinat: number;
  cakupan_pemeriksaan: number;
}

export interface Peringatan {
  tingkat: "info" | "peringatan" | "bahaya";
  pesan: string;
}

export interface Pemeriksaan {
  id: number;
  tanggal: string | null;
  jenis: string;
  petugas: string | null;
  hasil: string | null;
  jumlah_temuan: number;
  status_tindak_lanjut: string;
  target_penyelesaian: string | null;
  catatan: string | null;
  temuan_selesai: number;
  temuan_proses: number;
}

export interface TindakLanjut {
  id: number;
  tanggal: string | null;
  uraian: string;
  bukti: string | null;
  tahap: "tindakan" | "bukti" | "verifikasi" | "selesai";
  status: string;
  pic: string | null;
}

export interface Temuan {
  id: number;
  pemeriksaan_id: number | null;
  apotek_id: number;
  tanggal: string | null;
  kategori: string | null;
  deskripsi: string;
  status: StatusTemuan;
  target: string | null;
  lewat_target: boolean;
  pic: string | null;
  tindak_lanjut: TindakLanjut[];
  apotek?: { id: number; nama_apotek: string; kabupaten: string | null; kecamatan: string | null };
}

export interface BarisDistribusi {
  id: number;
  arah: "masuk" | "keluar";
  lawan: string | null;
  tanggal: string | null;
  produk: string | null;
  kategori: string | null;
  jumlah: number | null;
  satuan: string | null;
  referensi: string | null;
  status: string;
}

export interface SimpulDistribusi {
  id: string;
  apotek_id: number | null;
  nama: string;
  kabupaten: string | null;
  latitude: number | null;
  longitude: number | null;
  terdata: boolean;
  peran: "sumber" | "penerima";
}

export interface GarisDistribusi {
  id: number;
  dari: string;
  ke: string;
  tanggal: string | null;
  produk: string | null;
  kategori: string | null;
  jumlah: number | null;
  satuan: string | null;
  referensi: string | null;
  status: string;
  lengkap: boolean;
}

export interface RincianSkor {
  parameter: string;
  nilai: number;
  maksimum: number;
  alasan: string;
}

export interface BarisPrioritas {
  id: number;
  nama_apotek: string;
  kabupaten: string | null;
  kecamatan: string | null;
  tanggal_pemeriksaan_terakhir: string | null;
  temuan_aktif: number;
  tindak_lanjut_belum: number;
  skor: number;
  tingkat: TingkatPrioritas;
  rincian: RincianSkor[];
}

export interface JejakAudit {
  id: number;
  aksi: string;
  user: string | null;
  sebelum: Record<string, unknown> | null;
  sesudah: Record<string, unknown> | null;
  waktu: string | null;
}

export interface DetailApotek {
  profil: Apotek;
  prioritas: { skor: number; tingkat: TingkatPrioritas; rincian: RincianSkor[] };
  pemeriksaan: Pemeriksaan[];
  temuan: Temuan[];
  distribusi: BarisDistribusi[];
  audit: JejakAudit[];
  disclaimer: string;
}

export interface RekapKabupaten {
  kabupaten: string;
  jumlah: number;
  belum_diperiksa: number;
  sudah_diperiksa: number;
  temuan_aktif: number;
}

export interface RekapKecamatan {
  kabupaten: string;
  kecamatan: string;
  jumlah: number;
  belum_monitoring: number;
  sudah_monitoring: number;
  temuan: number;
  tindak_lanjut_belum: number;
}

export interface KualitasData {
  total: number;
  lengkap: number;
  perlu_dilengkapi: number;
  persen_lengkap: number;
  masalah: Record<string, { jumlah: number; contoh: Partial<Apotek>[] }>;
  duplikat: { jenis: string; jumlah: number; anggota: Partial<Apotek>[] }[];
}

export interface Bootstrap {
  kabupaten: string[];
  kecamatan: string[];
  pusat_peta: { lat: number; lng: number; zoom: number };
  status_sarana: StatusSarana[];
  jenis_sarana: string[];
  kategori_temuan: string[];
  peran: PeranSig;
  disclaimer: string;
}

/** Nilai penyaring aktif pada dashboard. */
export interface FilterSig {
  kabupaten: string;
  kecamatan: string;
  status_sarana: string;
  monitoring: string;
  temuan: string;
  tindak_lanjut: string;
  jenis_sarana: string;
  tanggal_dari: string;
  tanggal_sampai: string;
  q: string;
}

export const FILTER_KOSONG: FilterSig = {
  kabupaten: "",
  kecamatan: "",
  status_sarana: "",
  monitoring: "",
  temuan: "",
  tindak_lanjut: "",
  jenis_sarana: "",
  tanggal_dari: "",
  tanggal_sampai: "",
  q: "",
};

/** Lapisan peta yang dapat dihidup-matikan pengguna. */
export interface LapisanPeta {
  marker: boolean;
  cluster: boolean;
  heatmap: boolean;
  batasWilayah: boolean;
  distribusi: boolean;
}

export const LAPISAN_AWAL: LapisanPeta = {
  marker: true,
  cluster: true,
  heatmap: false,
  batasWilayah: false,
  distribusi: false,
};

/** Warna status peta — dipilih lembut, tidak mencolok. */
export const WARNA_STATUS: Record<StatusPeta, { warna: string; label: string }> = {
  baik: { warna: "#15915a", label: "Aktif / kondisi baik" },
  perlu_monitoring: { warna: "#d99a1e", label: "Perlu monitoring" },
  ada_temuan: { warna: "#cf4c50", label: "Ada temuan / tindak lanjut" },
  belum_lengkap: { warna: "#9aa7b8", label: "Data belum lengkap" },
};

export const LABEL_STATUS_SARANA: Record<string, string> = {
  aktif: "Aktif",
  nonaktif: "Nonaktif",
  belum_diverifikasi: "Belum Diverifikasi",
};
