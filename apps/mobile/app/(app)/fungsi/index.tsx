import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronRight, LayoutGrid } from "lucide-react-native";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { DynamicIcon } from "@/components/DynamicIcon";
import { APLIKASI_ROUTES } from "@/lib/aplikasi-routes";
import type { AplikasiSlug } from "@bpom/shared";
import { colors } from "@/theme";

interface AplikasiItem {
  slug: string;
  nama: string;
  deskripsi: string;
  icon: string;
}
interface FungsiItem {
  slug: string;
  nama: string;
  deskripsi: string;
  icon: string;
  aplikasi: AplikasiItem[];
}

export default function FungsiScreen() {
  const [fungsi, setFungsi] = useState<FungsiItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/menu")
      .then(({ data }) => setFungsi(data.fungsi ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Fungsi & Layanan</Text>
        <Text style={styles.subtitle}>Semua layanan yang tersedia untuk peran Anda.</Text>

        {!loading && fungsi.length === 0 && (
          <Card style={styles.emptyCard}>
            <LayoutGrid size={32} color={colors.navy200} />
            <Text style={styles.emptyText}>Belum ada layanan yang bisa diakses</Text>
          </Card>
        )}

        {fungsi.map((f) => (
          <View key={f.slug} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <DynamicIcon name={f.icon} size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{f.nama}</Text>
                <Text style={styles.sectionDesc}>{f.deskripsi}</Text>
              </View>
            </View>

            <View style={styles.grid}>
              {f.aplikasi.map((a) => (
                <Pressable
                  key={a.slug}
                  onPress={() => router.push(APLIKASI_ROUTES[a.slug as AplikasiSlug] as never)}
                  style={styles.gridItem}
                >
                  <Card style={styles.appCard}>
                    <View style={styles.appIconRow}>
                      <View style={styles.appIcon}>
                        <DynamicIcon name={a.icon} size={20} color={colors.bpom700} />
                      </View>
                      <ChevronRight size={16} color={colors.navy300} />
                    </View>
                    <Text style={styles.appTitle}>{a.nama}</Text>
                    <Text style={styles.appDesc} numberOfLines={2}>
                      {a.deskripsi}
                    </Text>
                  </Card>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: colors.navy900 },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: -16 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.navy900,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 14.5, fontWeight: "700", color: colors.navy900 },
  sectionDesc: { fontSize: 11.5, color: colors.navy400 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridItem: { width: "47%" },
  appCard: { gap: 8, minHeight: 120 },
  appIconRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  appIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.bpom50,
    alignItems: "center",
    justifyContent: "center",
  },
  appTitle: { fontSize: 13.5, fontWeight: "800", color: colors.navy900, lineHeight: 18 },
  appDesc: { fontSize: 11, color: colors.navy400, lineHeight: 15 },
  emptyCard: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 13, fontWeight: "600", color: colors.navy700 },
});
