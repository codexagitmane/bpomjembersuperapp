import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, FlaskConical, ShieldOff } from "lucide-react-native";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { colors } from "@/theme";

interface SimbaData {
  total_penggunaan_bahan: number;
  jumlah_bahan_aktif: number;
  jumlah_bahan_kedaluwarsa: number;
  top5_bahan: { nama_bahan: string; satuan: string; total_diambil: number }[];
  bahan_perlu_pengadaan: { nama: string; sisa_stok: number; satuan: string }[];
  list_tanggal_ed: { data: { id: number; nama_bahan: string; tanggal_kedaluwarsa: string }[] };
}

/** Dashboard SIMBA versi mobile — read-only (input & filter lengkap di web). */
export default function DashboardSimbaScreen() {
  const [data, setData] = useState<SimbaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    api
      .get("/dashboard/simba")
      .then(({ data }) => setData(data))
      .catch((err) => {
        if (err?.response?.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const maxTop5 = Math.max(1, ...(data?.top5_bahan.map((t) => t.total_diambil) ?? [1]));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.navy900} />
        </Pressable>
        <Text style={styles.headerTitle}>Dashboard SIMBA</Text>
        <View style={{ width: 32 }} />
      </View>

      {forbidden ? (
        <View style={styles.center}>
          <ShieldOff size={32} color={colors.navy200} />
          <Text style={styles.mutedText}>Halaman ini khusus Fungsi Pengujian</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <FlaskConical size={22} color={colors.bpom600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>DASHBOARD &quot;SIMBA&quot;</Text>
              <Text style={styles.heroSub}>Laboratorium Balai POM di Jember</Text>
            </View>
          </View>
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              Mode baca — pencatatan pemakaian bahan & filter lengkap tersedia di versi web.
            </Text>
          </View>

          {loading && <Text style={styles.mutedText}>Memuat data…</Text>}

          {data && (
            <>
              {/* Stat pills */}
              <View style={styles.statRow}>
                <StatPill label="Penggunaan" value={data.total_penggunaan_bahan} />
                <StatPill label="Bahan Aktif" value={data.jumlah_bahan_aktif} />
                <StatPill label="Kedaluwarsa" value={data.jumlah_bahan_kedaluwarsa} danger={data.jumlah_bahan_kedaluwarsa > 0} />
              </View>

              {/* Top 5 */}
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Top 5 Bahan Paling Banyak Digunakan</Text>
                {data.top5_bahan.length === 0 && <Text style={styles.mutedText}>Belum ada data pemakaian.</Text>}
                {data.top5_bahan.map((t) => (
                  <View key={t.nama_bahan} style={styles.barRow}>
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {t.nama_bahan}
                    </Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${(t.total_diambil / maxTop5) * 100}%` }]} />
                    </View>
                    <Text style={styles.barValue}>
                      {t.total_diambil} {t.satuan}
                    </Text>
                  </View>
                ))}
              </Card>

              {/* Perlu pengadaan */}
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Bahan Perlu Pengadaan</Text>
                {data.bahan_perlu_pengadaan.length === 0 && (
                  <Text style={styles.mutedText}>Tidak ada bahan di bawah stok minimum. 🎉</Text>
                )}
                {data.bahan_perlu_pengadaan.map((b, i) => (
                  <View key={i} style={styles.listRow}>
                    <Text style={styles.listNama} numberOfLines={1}>
                      {b.nama}
                    </Text>
                    <Text style={styles.listStokRendah}>
                      {b.sisa_stok} {b.satuan}
                    </Text>
                  </View>
                ))}
              </Card>

              {/* Tanggal ED */}
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Tanggal ED Bahan Terdekat</Text>
                {data.list_tanggal_ed.data.map((e, i) => (
                  <View key={e.id} style={styles.listRow}>
                    <Text style={styles.listNama} numberOfLines={1}>
                      {i + 1}. {e.nama_bahan}
                    </Text>
                    <Text style={styles.listEd}>{e.tanggal_kedaluwarsa}</Text>
                  </View>
                ))}
              </Card>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatPill({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <Card style={styles.statPill}>
      <Text style={[styles.statValue, danger && { color: colors.rose500 }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: colors.navy900 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.navy950,
    borderRadius: 18,
    padding: 16,
  },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  heroSub: { color: colors.navy200, fontSize: 11.5, fontStyle: "italic" },
  noticeBox: { backgroundColor: colors.navy50, borderRadius: 12, padding: 12 },
  noticeText: { fontSize: 11.5, color: colors.navy600 },
  statRow: { flexDirection: "row", gap: 10 },
  statPill: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 14 },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.bpom600 },
  statLabel: { fontSize: 10, fontWeight: "700", color: colors.navy700, textTransform: "uppercase" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 12.5, fontWeight: "800", color: colors.navy700, textTransform: "uppercase" },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 110, fontSize: 11, color: colors.navy700, fontWeight: "600" },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.navy50, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 5, backgroundColor: colors.bpom500 },
  barValue: { width: 66, fontSize: 10.5, color: colors.navy500, textAlign: "right" },
  listRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  listNama: { flex: 1, fontSize: 12.5, color: colors.navy900, fontWeight: "600" },
  listStokRendah: { fontSize: 12, fontWeight: "800", color: colors.rose500 },
  listEd: { fontSize: 11.5, color: colors.textMuted },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  mutedText: { fontSize: 12.5, color: colors.navy400, textAlign: "center" },
});
