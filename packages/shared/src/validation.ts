import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter")
    .max(128, "Kata sandi terlalu panjang"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerEksternalSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Nama minimal 3 karakter")
      .max(100, "Nama maksimal 100 karakter")
      .regex(/^[a-zA-Z\s.'-]+$/, "Nama hanya boleh berisi huruf"),
    email: z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
    phone: z
      .string()
      .trim()
      .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Nomor HP tidak valid"),
    password: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter")
      .max(128)
      .regex(/[A-Z]/, "Kata sandi harus mengandung huruf besar")
      .regex(/[a-z]/, "Kata sandi harus mengandung huruf kecil")
      .regex(/[0-9]/, "Kata sandi harus mengandung angka")
      .regex(/[^A-Za-z0-9]/, "Kata sandi harus mengandung simbol"),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["password_confirmation"],
  });
export type RegisterEksternalInput = z.infer<typeof registerEksternalSchema>;

/**
 * Validasi field non-file untuk check-in/out presensi. Foto selfie dikirim
 * terpisah sebagai File dalam multipart FormData (lihat apps/web & apps/mobile),
 * bukan base64, supaya bisa divalidasi sebagai gambar sungguhan di server
 * dan tidak membengkakkan payload JSON ~33%.
 */
export const presensiCheckSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_meter: z.number().nonnegative().max(500).optional(),
});
export type PresensiCheckInput = z.infer<typeof presensiCheckSchema>;

export const MAX_FOTO_SELFIE_BYTES = 5 * 1024 * 1024; // 5 MB, harus sinkron dgn PresensiCheckRequest.php
export const ALLOWED_FOTO_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export const bookingKonsultasiSchema = z.object({
  jenis_layanan: z.enum(["konsultasi", "pengaduan"]),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid"),
  jam_slot: z.string().regex(/^\d{2}:\d{2}$/, "Format jam tidak valid"),
  subjek: z.string().trim().min(5).max(150),
  deskripsi: z.string().trim().min(10, "Deskripsi minimal 10 karakter").max(2000),
  lampiran_url: z.string().url().optional().nullable(),
});
export type BookingKonsultasiInput = z.infer<typeof bookingKonsultasiSchema>;
