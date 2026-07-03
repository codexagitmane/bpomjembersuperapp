import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Boxes, ShieldOff } from "lucide-react-native";
import { api } from "@/lib/api";
import { Card, Badge } from "@/components/ui/Card";
import { colors } from "@/theme";

interface BarangBukti {
  id: number;
  nomor_bb: string;
  nama_barang: string;
  jumlah: number;
  satuan: string;
  status: string;
  tanggal_penyitaan: string;
}

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  disimpan: "success",
  dalam_proses: "warning",
  dimusnahkan: "danger",
  dikembalikan: "neutral",
  dilimpahkan: "neutral",
};

export default function BarangBuktiScreen() {
  const [items, setItems] = useState<BarangBukti[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    api
      .get("/barang-bukti")
      .then(({ data }) => setItems(data.data ?? []))
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
        <Text style={styles.headerTitle}>Barang Bukti</Text>
        <View style={{ width: 32 }} />
      </View>

      {forbidden ? (
        <View style={styles.center}>
          <ShieldOff size={32} color={colors.navy200} />
          <Text style={styles.forbiddenText}>Anda tidak memiliki akses ke modul ini</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Boxes size={32} color={colors.navy200} />
                <Text style={styles.forbiddenText}>Belum ada barang bukti tercatat</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Card style={styles.itemCard}>
              <Text style={styles.itemCode}>{item.nomor_bb}</Text>
              <Text style={styles.itemTitle}>{item.nama_barang}</Text>
              <View style={styles.itemFooter}>
                <Text style={styles.itemMeta}>
                  {item.jumlah} {item.satuan} • {item.tanggal_penyitaan}
                </Text>
                <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>{item.status.replace(/_/g, " ")}</Badge>
              </View>
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
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  itemCard: { gap: 6 },
  itemCode: { fontSize: 11, color: colors.navy400, fontFamily: "monospace" },
  itemTitle: { fontSize: 14, fontWeight: "800", color: colors.navy900 },
  itemFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  itemMeta: { fontSize: 11.5, color: colors.navy400 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 60 },
  forbiddenText: { fontSize: 13, fontWeight: "600", color: colors.navy700, textAlign: "center", paddingHorizontal: 40 },
});
