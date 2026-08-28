import { api } from "@/lib/api";
import type {
  Apotek, Bootstrap, DetailApotek, FilterSig, GarisDistribusi, Kpi, KualitasData,
  BarisPrioritas, Peringatan, RekapKabupaten, RekapKecamatan, SimpulDistribusi, Temuan,
  JawabanAsisten, RingkasanAsisten,
} from "../types";

/**
 * Lapisan layanan modul SIG.
 *
 * Seluruh akses data dikumpulkan di sini agar komponen UI tidak memuat logika
 * pengambilan data. Saat sumber data berpindah (mis. layanan terpisah atau
 * basis data lain), cukup berkas ini yang menyesuaikan.
 */

/** Ubah filter menjadi parameter kueri, membuang nilai kosong. */
function keParams(f: Partial<FilterSig>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(f).filter(([, v]) => v !== "" && v != null)
  ) as Record<string, string>;
}

// ── Data sarana ────────────────────────────────────────────────────────────

export const apotekService = {
  async bootstrap(kabupaten?: string): Promise<Bootstrap> {
    const { data } = await api.get("/sig-apotek/bootstrap", {
      params: kabupaten ? { kabupaten } : {},
    });
    return data.data;
  },

  async daftar(filter: Partial<FilterSig> = {}): Promise<{ data: Apotek[]; total: number }> {
    const { data } = await api.get("/sig-apotek", { params: keParams(filter) });
    return { data: data.data ?? [], total: data.total ?? 0 };
  },

  async detail(id: number): Promise<DetailApotek> {
    const { data } = await api.get(`/sig-apotek/${id}`);
    return data.data;
  },

  async simpan(payload: Partial<Apotek>): Promise<Apotek> {
    const { data } = await api.post("/sig-apotek", payload);
    return data.data;
  },

  async perbarui(id: number, payload: Partial<Apotek>): Promise<Apotek> {
    const { data } = await api.patch(`/sig-apotek/${id}`, payload);
    return data.data;
  },

  async hapus(id: number): Promise<void> {
    await api.delete(`/sig-apotek/${id}`);
  },

  async simpanPemeriksaan(id: number, payload: Record<string, unknown>): Promise<void> {
    await api.post(`/sig-apotek/${id}/pemeriksaan`, payload);
  },
};

// ── Temuan & tindak lanjut ─────────────────────────────────────────────────

export const temuanService = {
  async daftar(params: { status?: string; kabupaten?: string; q?: string } = {}): Promise<Temuan[]> {
    const { data } = await api.get("/sig-apotek/temuan", { params: keParams(params) });
    return data.data ?? [];
  },

  async ubahStatus(id: number, payload: { status: string; pic?: string; target?: string }): Promise<Temuan> {
    const { data } = await api.patch(`/sig-apotek/temuan/${id}/status`, payload);
    return data.data;
  },

  async tambahTindakLanjut(id: number, payload: Record<string, unknown>): Promise<Temuan> {
    const { data } = await api.post(`/sig-apotek/temuan/${id}/tindak-lanjut`, payload);
    return data.data;
  },
};

// ── Distribusi ─────────────────────────────────────────────────────────────

export const distribusiService = {
  async jaringan(kabupaten?: string): Promise<{
    simpul: SimpulDistribusi[];
    garis: GarisDistribusi[];
    catatan: string;
  }> {
    const { data } = await api.get("/sig-apotek/distribusi", {
      params: kabupaten ? { kabupaten } : {},
    });
    return { simpul: data.simpul ?? [], garis: data.garis ?? [], catatan: data.catatan ?? "" };
  },

  async simpan(payload: Record<string, unknown>): Promise<void> {
    await api.post("/sig-apotek/distribusi", payload);
  },
};

// ── Analitik ───────────────────────────────────────────────────────────────

export const analyticsService = {
  async ringkasan(filter: Partial<FilterSig> = {}): Promise<{ kpi: Kpi; peringatan: Peringatan[] }> {
    const { data } = await api.get("/sig-apotek/ringkasan", { params: keParams(filter) });
    return { kpi: data.kpi, peringatan: data.peringatan ?? [] };
  },

  async analisisSpasial(filter: Partial<FilterSig> = {}): Promise<{
    per_kabupaten: RekapKabupaten[];
    per_kecamatan: RekapKecamatan[];
    cakupan_pemeriksaan: { label: string; periode: string; jumlah: number }[];
    catatan: string;
  }> {
    const { data } = await api.get("/sig-apotek/analisis", { params: keParams(filter) });
    return data;
  },

  async prioritasMonitoring(filter: Partial<FilterSig> = {}): Promise<{
    data: BarisPrioritas[];
    catatan: string;
  }> {
    const { data } = await api.get("/sig-apotek/prioritas", { params: keParams(filter) });
    return data;
  },

  async kualitasData(filter: Partial<FilterSig> = {}): Promise<{ data: KualitasData; catatan: string }> {
    const { data } = await api.get("/sig-apotek/kualitas-data", { params: keParams(filter) });
    return data;
  },
};

// ── Wilayah & batas geografis ──────────────────────────────────────────────

export const geoService = {
  /**
   * Muat batas wilayah. Bila berkas GeoJSON resmi belum tersedia, kembalikan
   * penanda "belum tersedia" — sistem tidak menggambar batas buatan.
   */
  async loadGeoJSON(tingkat: "kabupaten" | "kecamatan" = "kabupaten"): Promise<{
    tersedia: boolean;
    data: unknown | null;
    catatan: string;
  }> {
    const { data } = await api.get("/sig-apotek/geojson", { params: { tingkat } });
    return data;
  },

  /** Validasi koordinat sebelum dikirim ke server. */
  koordinatValid(lat: unknown, lng: unknown): boolean {
    const a = Number(lat);
    const b = Number(lng);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return a >= -90 && a <= 90 && b >= -180 && b <= 180;
  },
};

// ── Impor & ekspor ─────────────────────────────────────────────────────────

export interface BarisImpor {
  baris: number;
  data: Record<string, string>;
  masalah: string[];
  valid: boolean;
}

export const exportService = {
  async pratinjauImpor(file: File): Promise<{
    baris: BarisImpor[];
    valid: number;
    galat: number;
    kolom_terbaca: string[];
    message: string;
  }> {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/sig-apotek/impor/pratinjau", fd);
    return data;
  },

  async simpanImpor(baris: BarisImpor[]): Promise<{ disimpan: number; dilewati: number; message: string }> {
    const { data } = await api.post("/sig-apotek/impor/simpan", { baris });
    return data;
  },

  /** Unduh berkas hasil ekspor sesuai filter yang sedang aktif. */
  async unduh(filter: Partial<FilterSig>, format: "xlsx" | "csv"): Promise<void> {
    const res = await api.get("/sig-apotek/ekspor", {
      params: { ...keParams(filter), format },
      responseType: "blob",
    });
    this.simpanBerkas(res.data as Blob, `Data-Apotek${filter.kabupaten ? `-${filter.kabupaten}` : ""}.${format}`);
  },

  async unduhTemplate(): Promise<void> {
    const res = await api.get("/sig-apotek/template", { responseType: "blob" });
    this.simpanBerkas(res.data as Blob, "Template-Data-Apotek.xlsx");
  },

  simpanBerkas(blob: Blob, nama: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nama;
    a.click();
    URL.revokeObjectURL(url);
  },
};

/**
 * Asisten SIG — ringkasan eksekutif dan tanya jawab.
 *
 * Endpoint yang sama melayani keduanya: tanpa `pertanyaan` ia mengembalikan
 * ringkasan, dengan `pertanyaan` ia mengembalikan jawaban.
 */
export const asistenService = {
  async ringkasan(): Promise<{ ringkasan: RingkasanAsisten; saran: string[] }> {
    const { data } = await api.post("/sig-apotek/asisten", {});
    return data;
  },

  async tanya(pertanyaan: string): Promise<{ jawaban: JawabanAsisten; saran: string[] }> {
    const { data } = await api.post("/sig-apotek/asisten", { pertanyaan });
    return data;
  },
};
