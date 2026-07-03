import { useCallback, useEffect, useState } from "react";
import { FlatList, Image, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Newspaper, Calendar } from "lucide-react-native";
import { api } from "@/lib/api";
import { Card, Badge } from "@/components/ui/Card";
import { colors } from "@/theme";

interface BeritaItem {
  id: number;
  judul: string;
  ringkasan: string | null;
  gambar_path: string | null;
  kategori: string;
  published_at: string | null;
}

const KATEGORI_LABEL: Record<string, string> = {
  obat: "Obat",
  makanan: "Makanan",
  kosmetik: "Kosmetik",
  pengumuman: "Pengumuman",
};
const KATEGORI_TONE: Record<string, "info" | "success" | "warning" | "neutral"> = {
  obat: "info",
  makanan: "success",
  kosmetik: "warning",
  pengumuman: "neutral",
};

export default function BeritaScreen() {
  const [items, setItems] = useState<BeritaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get("/berita");
    setItems(data.data ?? []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Berita & Informasi</Text>
        <Text style={styles.subtitle}>Kabar terkini seputar pengawasan obat dan makanan di Jember.</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy400} />}
        ListEmptyComponent={
          !loading ? (
            <Card style={styles.emptyCard}>
              <Newspaper size={32} color={colors.navy200} />
              <Text style={styles.emptyText}>Belum ada berita yang dipublikasikan</Text>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.newsCard}>
            <View style={styles.imagePlaceholder}>
              {item.gambar_path ? (
                <Image source={{ uri: item.gambar_path }} style={styles.image} />
              ) : (
                <Newspaper size={28} color={colors.navy300} />
              )}
            </View>
            <Badge tone={KATEGORI_TONE[item.kategori] ?? "neutral"}>
              {KATEGORI_LABEL[item.kategori] ?? item.kategori}
            </Badge>
            <Text style={styles.newsTitle}>{item.judul}</Text>
            {item.ringkasan && <Text style={styles.newsSummary}>{item.ringkasan}</Text>}
            {item.published_at && (
              <View style={styles.dateRow}>
                <Calendar size={12} color={colors.navy400} />
                <Text style={styles.dateText}>
                  {new Date(item.published_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>
            )}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: colors.navy900 },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 4 },
  listContent: { padding: 20, paddingTop: 8, gap: 12 },
  newsCard: { gap: 8, padding: 14 },
  imagePlaceholder: {
    height: 130,
    borderRadius: 14,
    backgroundColor: colors.navy50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  newsTitle: { fontSize: 15, fontWeight: "800", color: colors.navy900 },
  newsSummary: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateText: { fontSize: 11, color: colors.navy400 },
  emptyCard: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 13, fontWeight: "600", color: colors.navy700 },
});
