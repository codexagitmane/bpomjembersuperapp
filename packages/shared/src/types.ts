import type { RoleSlug } from "./constants";

export type AccountType = "internal" | "eksternal";

export interface User {
  id: number;
  name: string;
  email: string;
  nip_nik?: string | null;
  phone?: string | null;
  account_type: AccountType;
  role: RoleSlug;
  jenis_pegawai?: string | null;
  is_pengelola_gudang?: boolean;
  is_pengelola_bmn?: boolean;
  is_ketua_tim?: boolean;
  fungsi_ketua_tim?: string | null;
  is_pengelola_arsip?: boolean;
  is_arsiparis?: boolean;
  status_kepegawaian?: "asn" | "pppk" | "outsourcing" | "magang" | null;
  jabatan?: string | null;
  kelompok_substansi?: string | null;
  avatar_url?: string | null;
  two_factor_enabled?: boolean;
  is_active: boolean;
  created_at: string;
}

/** Label ramah untuk status kepegawaian pegawai internal. */
export const STATUS_KEPEGAWAIAN_LABEL: Record<string, string> = {
  asn: "ASN",
  pppk: "P3K",
  outsourcing: "Outsourcing",
  magang: "Magang",
};

export interface AuthSession {
  user: User;
  token: string;
}

export type PresensiStatus =
  | "tepat_waktu"
  | "terlambat"
  | "pulang_awal"
  | "di_luar_geofence";

export interface Presensi {
  id: number;
  user_id: number;
  tanggal: string; // YYYY-MM-DD
  jam_masuk?: string | null;
  jam_keluar?: string | null;
  lokasi_masuk_lat?: number | null;
  lokasi_masuk_lng?: number | null;
  lokasi_keluar_lat?: number | null;
  lokasi_keluar_lng?: number | null;
  jarak_masuk_meter?: number | null;
  jarak_keluar_meter?: number | null;
  foto_masuk_url?: string | null;
  foto_keluar_url?: string | null;
  status_masuk?: PresensiStatus | null;
  status_keluar?: PresensiStatus | null;
  catatan?: string | null;
}

export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
