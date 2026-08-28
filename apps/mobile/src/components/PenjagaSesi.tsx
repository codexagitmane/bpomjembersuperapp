import { useCallback, useEffect, useRef } from "react";
import { AppState, View, type AppStateStatus } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";

/** Batas diam sebelum sesi diakhiri otomatis. */
const BATAS_DIAM_MS = 3 * 60 * 1000;

/** Seberapa sering sisa waktu diperiksa saat aplikasi terbuka. */
const JEDA_PERIKSA_MS = 15 * 1000;

/**
 * Mengakhiri sesi bila aplikasi dibiarkan menganggur.
 *
 * Membungkus seluruh isi aplikasi supaya setiap sentuhan yang naik ke atas
 * menyegarkan penanda aktivitas — pembungkus ini tidak pernah menahan
 * sentuhan, hanya menumpang mendengarkannya.
 *
 * Waktu terakhir aktif disimpan sebagai angka biasa dan diperiksa ulang setiap
 * kali aplikasi kembali ke depan; pencacah JavaScript berhenti saat aplikasi
 * berada di latar belakang, jadi mengandalkan pencacah saja akan membuat sesi
 * tetap hidup walau ponsel ditinggal berjam-jam.
 *
 * Setelah keluar, navigasi diganti (`replace`) ke halaman masuk sehingga
 * membuka aplikasi lagi tidak mengembalikan pengguna ke layar terakhir.
 */
export function PenjagaSesi({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const terakhir = useRef(Date.now());
  const sedangKeluar = useRef(false);

  const catat = useCallback(() => {
    terakhir.current = Date.now();
  }, []);

  useEffect(() => {
    if (!user) {
      catat();
      sedangKeluar.current = false;

      return;
    }

    const keluar = async () => {
      if (sedangKeluar.current) return;
      sedangKeluar.current = true;
      try {
        await logout();
      } finally {
        router.replace("/login");
      }
    };

    const periksa = () => {
      if (Date.now() - terakhir.current >= BATAS_DIAM_MS) void keluar();
    };

    const saatBerubah = (status: AppStateStatus) => {
      if (status === "active") {
        periksa();
      } else {
        // Waktu mulai menganggur dihitung sejak aplikasi ditinggalkan.
        catat();
      }
    };

    const langganan = AppState.addEventListener("change", saatBerubah);
    const pencacah = setInterval(periksa, JEDA_PERIKSA_MS);

    return () => {
      langganan.remove();
      clearInterval(pencacah);
    };
  }, [user, logout, catat]);

  return (
    <View style={{ flex: 1 }} onTouchStart={catat} onTouchMove={catat}>
      {children}
    </View>
  );
}
