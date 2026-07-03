/**
 * Definisi peran, fungsi, dan aplikasi di Sistem Super Terintegrasi
 * Balai Pengawas Obat dan Makanan (BPOM) di Jember.
 */

export const ROLES = {
  SUPERADMIN: "superadmin",
  KEPALA_BALAI: "kepala_balai",
  KEPALA_SUBAG_TU: "kepala_subag_tu",
  PEGAWAI_ASN_PPPK: "pegawai_asn_pppk",
  PEGAWAI_OUTSOURCING_MAGANG: "pegawai_outsourcing_magang",
  MASYARAKAT: "masyarakat", // akun eksternal (publik)
} as const;

export type RoleSlug = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<RoleSlug, string> = {
  [ROLES.SUPERADMIN]: "Superadmin",
  [ROLES.KEPALA_BALAI]: "Kepala Balai POM di Jember",
  [ROLES.KEPALA_SUBAG_TU]: "Kepala Subag Tata Usaha",
  [ROLES.PEGAWAI_ASN_PPPK]: "Pegawai ASN dan PPPK",
  [ROLES.PEGAWAI_OUTSOURCING_MAGANG]: "Pegawai Outsourcing dan Magang",
  [ROLES.MASYARAKAT]: "Masyarakat",
};

export const INTERNAL_ROLES: RoleSlug[] = [
  ROLES.SUPERADMIN,
  ROLES.KEPALA_BALAI,
  ROLES.KEPALA_SUBAG_TU,
  ROLES.PEGAWAI_ASN_PPPK,
  ROLES.PEGAWAI_OUTSOURCING_MAGANG,
];

export const FUNGSI = {
  PEMERIKSAAN: "pemeriksaan",
  INFOKOM: "infokom",
  PENINDAKAN: "penindakan",
  TATA_USAHA: "tata_usaha",
} as const;

export type FungsiSlug = (typeof FUNGSI)[keyof typeof FUNGSI];

export const FUNGSI_LABELS: Record<FungsiSlug, string> = {
  [FUNGSI.PEMERIKSAAN]: "Fungsi Pemeriksaan",
  [FUNGSI.INFOKOM]: "Fungsi Informasi dan Komunikasi",
  [FUNGSI.PENINDAKAN]: "Fungsi Penindakan",
  [FUNGSI.TATA_USAHA]: "Fungsi Tata Usaha",
};

export const APLIKASI = {
  BOOKING_KONSULTASI: "booking_konsultasi",
  SIG_APOTEK: "sig_apotek",
  PRESENSI: "presensi",
  IZIN_KELUAR_MASUK: "izin_keluar_masuk",
  PENGAJUAN_BMN: "pengajuan_bmn",
  BARANG_BUKTI: "barang_bukti",
} as const;

export type AplikasiSlug = (typeof APLIKASI)[keyof typeof APLIKASI];

export interface AplikasiDef {
  slug: AplikasiSlug;
  nama: string;
  deskripsi: string;
  fungsi: FungsiSlug;
  icon: string; // nama icon (lucide-react / @expo/vector-icons Ionicons)
  externalAccess: boolean;
}

export const APLIKASI_LIST: AplikasiDef[] = [
  {
    slug: APLIKASI.BOOKING_KONSULTASI,
    nama: "Booking Layanan Konsultasi & Pengaduan",
    deskripsi:
      "Reservasi jadwal konsultasi dan pengaduan masyarakat terkait obat dan makanan.",
    fungsi: FUNGSI.INFOKOM,
    icon: "CalendarCheck",
    externalAccess: true,
  },
  {
    slug: APLIKASI.SIG_APOTEK,
    nama: "SIG Monitoring & Pemetaan Distribusi Apotek",
    deskripsi:
      "Pemetaan geografis sebaran dan status pengawasan apotek se-Kabupaten Jember.",
    fungsi: FUNGSI.PEMERIKSAAN,
    icon: "MapPinned",
    externalAccess: false,
  },
  {
    slug: APLIKASI.PRESENSI,
    nama: "Presensi Berbasis Lokasi & Selfie",
    deskripsi: "Absensi pegawai dengan validasi titik lokasi (geofence) dan foto selfie.",
    fungsi: FUNGSI.TATA_USAHA,
    icon: "ScanFace",
    externalAccess: false,
  },
  {
    slug: APLIKASI.IZIN_KELUAR_MASUK,
    nama: "Izin Keluar Masuk Kantor",
    deskripsi: "Pengajuan dan persetujuan izin keluar/masuk kantor pegawai.",
    fungsi: FUNGSI.TATA_USAHA,
    icon: "DoorOpen",
    externalAccess: false,
  },
  {
    slug: APLIKASI.PENGAJUAN_BMN,
    nama: "Pengajuan Pemeliharaan & Perbaikan BMN",
    deskripsi: "Pengajuan tiket pemeliharaan dan perbaikan Barang Milik Negara.",
    fungsi: FUNGSI.TATA_USAHA,
    icon: "Wrench",
    externalAccess: false,
  },
  {
    slug: APLIKASI.BARANG_BUKTI,
    nama: "Monitoring Barang Bukti",
    deskripsi: "Pelacakan status dan rantai pengelolaan barang bukti penindakan.",
    fungsi: FUNGSI.PENINDAKAN,
    icon: "Boxes",
    externalAccess: false,
  },
];

/** Matriks akses aplikasi per-role. Superadmin selalu punya akses penuh. */
export const ROLE_APLIKASI_ACCESS: Record<RoleSlug, AplikasiSlug[] | "all"> = {
  [ROLES.SUPERADMIN]: "all",
  [ROLES.KEPALA_BALAI]: "all",
  [ROLES.KEPALA_SUBAG_TU]: [
    APLIKASI.PRESENSI,
    APLIKASI.IZIN_KELUAR_MASUK,
    APLIKASI.PENGAJUAN_BMN,
  ],
  [ROLES.PEGAWAI_ASN_PPPK]: [
    APLIKASI.PRESENSI,
    APLIKASI.IZIN_KELUAR_MASUK,
    APLIKASI.PENGAJUAN_BMN,
    APLIKASI.SIG_APOTEK,
    APLIKASI.BARANG_BUKTI,
    APLIKASI.BOOKING_KONSULTASI,
  ],
  [ROLES.PEGAWAI_OUTSOURCING_MAGANG]: [APLIKASI.PRESENSI, APLIKASI.IZIN_KELUAR_MASUK],
  [ROLES.MASYARAKAT]: [APLIKASI.BOOKING_KONSULTASI],
};

/**
 * Koordinat kantor Balai POM di Jember untuk validasi geofence presensi.
 * ⚠️ PLACEHOLDER — ganti dengan koordinat GPS hasil survei lapangan yang akurat
 * sebelum dipakai di produksi. Ambil titik dari Google Maps di depan kantor.
 */
export const KANTOR_BPOM_JEMBER = {
  nama: "Kantor Balai POM di Jember",
  latitude: -8.1723,
  longitude: 113.7002,
  radiusMeter: 150,
};
