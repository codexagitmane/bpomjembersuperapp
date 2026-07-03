import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="presensi" options={{ presentation: "card" }} />
          <Stack.Screen name="booking-konsultasi" options={{ presentation: "card" }} />
          <Stack.Screen name="izin-keluar-masuk" options={{ presentation: "card" }} />
          <Stack.Screen name="pengajuan-bmn" options={{ presentation: "card" }} />
          <Stack.Screen name="barang-bukti" options={{ presentation: "card" }} />
          <Stack.Screen name="sig-apotek" options={{ presentation: "card" }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
