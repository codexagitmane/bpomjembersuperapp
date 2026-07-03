import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, MapPinned, ShieldOff } from "lucide-react-native";
import { api } from "@/lib/api";
import { Card, Badge } from "@/components/ui/Card";
import { colors } from "@/theme";

interface Apotek {
  id: number;
  nama_apotek: string;
  alamat: string;
  status_izin: string;
  latitude: number;
  longitude: number;
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  aktif: "success",
  kadaluarsa: "warning",
  dicabut: "danger",
};

export default function SigApotekScreen() {
  const [apotek, setApotek] = useState<Apotek[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    api
      .get("/sig-apotek")
      .then(({ data }) => setApotek(data.apotek ?? []))
      .catch((err) => {
        if (err?.response?.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.navy900} />
        </Pressable>
        <Text style={styles.headerTitle}>SIG Apotek</Text>
        <View style={{ width: 32 }} />
      </View>

      {!forbidden && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            Tampilan peta interaktif tersedia di versi web. Berikut daftar titik apotek terdaftar.
          </Text>
        </View>
      )}

      {forbidden ? (
        <View style={styles.center}>
          <ShieldOff size={32} color={colors.navy200} />
          <Text style={styles.forbiddenText}>Anda tidak memiliki akses ke modul ini</Text>
        </View>
      ) : (
        <FlatList
          data={apotek}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <MapPinned size={32} color={colors.navy200} />
                <Text style={styles.forbiddenText}>Belum ada data apotek</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Card style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.nama_apotek}</Text>
                <Badge tone={STATUS_TONE[item.status_izin] ?? "neutral"}>{item.status_izin}</Badge>
              </View>
              <Text style={styles.itemMeta} numberOfLines={2}>
                {item.alamat}
              </Text>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: colors.navy900 },
  noticeBox: { marginHorizontal: 16, backgroundColor: colors.navy50, borderRadius: 12, padding: 12, marginBottom: 4 },
  noticeText: { fontSize: 11.5, color: colors.navy600 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  itemCard: { gap: 6 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  itemTitle: { fontSize: 14, fontWeight: "800", color: colors.navy900, flex: 1 },
  itemMeta: { fontSize: 11.5, color: colors.navy400 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 60 },
  forbiddenText: { fontSize: 13, fontWeight: "600", color: colors.navy700, textAlign: "center", paddingHorizontal: 40 },
});
