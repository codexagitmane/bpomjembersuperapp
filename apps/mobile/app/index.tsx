import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/theme";

export default function SplashScreen() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      router.replace(user ? "/(app)/berita" : "/landing");
    }, 1300);
    return () => clearTimeout(timer);
  }, [isLoading, user]);

  return (
    <View style={styles.container}>
      <View style={styles.logoOuter}>
        <View style={styles.logoInner}>
          <ShieldCheck size={36} color="#fff" strokeWidth={2.25} />
        </View>
      </View>
      <Text style={styles.title}>LENTERA BPOM Jember</Text>
      <Text style={styles.subtitle}>Sistem Informasi Terintegrasi{"\n"}Pengawasan Obat & Makanan</Text>
      <Text style={styles.footer}>Balai Pengawas Obat dan Makanan di Jember</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy950,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  logoOuter: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.bpom500,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: colors.navy200,
    textAlign: "center",
    lineHeight: 19,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    fontSize: 11,
    color: colors.navy300,
  },
});
