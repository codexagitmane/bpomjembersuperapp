import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ShieldCheck, CalendarCheck, Newspaper, MessageSquareWarning, LogIn, UserPlus } from "lucide-react-native";
import { api } from "@/lib/api";
import { Card, Badge } from "@/components/ui/Card";
import { colors } from "@/theme";

interface BeritaItem {
  id: number;
  judul: string;
  ringkasan: string | null;
  kategori: string | null;
  published_at: string | null;
}

/**
 * Landing publik untuk masyarakat/stakeholder — tampil sebelum login.
 * Menampilkan layanan yang tersedia + berita terbit terbaru (endpoint publik).
 */
export default function LandingScreen() {
  const [berita, setBerita] = useState<BeritaItem[]>([]);

  useEffect(() => {
    api
      .get("/publik/berita")
      .then(({ data }) => setBerita((data.data ?? []).slice(0, 5)))
      .catch(() => {
        // Diamkan — landing tetap tampil tanpa berita.
      });
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={berita}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.logoBox}>
                <ShieldCheck size={30} color="#fff" strokeWidth={2.25} />
              </View>
              <Text style={styles.heroTitle}>LENTERA BPOM Jember</Text>
              <Text style={styles.heroSub}>
                Layanan publik Balai Pengawas Obat dan Makanan di Jember — konsultasi, pengaduan, dan informasi
                pengawasan obat & makanan.
              </Text>
              <View style={styles.ctaRow}>
                <Pressable style={styles.ctaPrimary} onPress={() => router.push("/login")}>
                  <LogIn size={16} color="#fff" />
                  <Text style={styles.ctaPrimaryText}>Masuk</Text>
                </Pressable>
                <Pressable style={styles.ctaSecondary} onPress={() => router.push("/register")}>
                  <UserPlus size={16} color={colors.bpom600} />
                  <Text style={styles.ctaSecondaryText}>Daftar Akun</Text>
                </Pressable>
              </View>
            </View>

            {/* Layanan */}
            <Text style={styles.sectionTitle}>Layanan untuk Masyarakat</Text>
            <View style={styles.layananRow}>
              <LayananCard
                icon={<CalendarCheck size={20} color={colors.bpom600} />}
                judul="Booking Konsultasi"
                deskripsi="Jadwalkan konsultasi izin edar, sertifikasi, dan lainnya."
              />
              <LayananCard
                icon={<MessageSquareWarning size={20} color={colors.amber500} />}
                judul="Pengaduan"
                deskripsi="Laporkan produk obat/makanan yang mencurigakan."
              />
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Registrasi akun diverifikasi oleh tim BPOM Jember sebelum aktif. Notifikasi aktivasi dikirim via email.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>
              <Newspaper size={14} color={colors.navy400} /> Berita Terbaru
            </Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Belum ada berita dipublikasikan.</Text>}
        renderItem={({ item }) => (
          <Card style={styles.beritaCard}>
            <View style={styles.beritaHeader}>
              <Text style={styles.beritaJudul} numberOfLines={2}>
                {item.judul}
              </Text>
              {item.kategori && <Badge tone="neutral">{item.kategori}</Badge>}
            </View>
            {item.ringkasan && (
              <Text style={styles.beritaRingkasan} numberOfLines={3}>
                {item.ringkasan}
              </Text>
            )}
          </Card>
        )}
        ListFooterComponent={
          <Text style={styles.footer}>© {new Date().getFullYear()} Balai POM di Jember</Text>
        }
      />
    </SafeAreaView>
  );
}

function LayananCard({ icon, judul, deskripsi }: { icon: React.ReactNode; judul: string; deskripsi: string }) {
  return (
    <Card style={styles.layananCard}>
      <View style={styles.layananIcon}>{icon}</View>
      <Text style={styles.layananJudul}>{judul}</Text>
      <Text style={styles.layananDesc}>{deskripsi}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  hero: {
    backgroundColor: colors.navy950,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: "center",
    gap: 10,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.bpom500,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 20, fontWeight: "800", color: "#fff", textAlign: "center" },
  heroSub: { fontSize: 12.5, color: colors.navy200, textAlign: "center", lineHeight: 18 },
  ctaRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  ctaPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bpom500,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 14,
  },
  ctaPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 13.5 },
  ctaSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
  },
  ctaSecondaryText: { color: colors.bpom600, fontWeight: "800", fontSize: 13.5 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.navy400,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 22,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  layananRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16 },
  layananCard: { flex: 1, gap: 6 },
  layananIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.navy50,
    alignItems: "center",
    justifyContent: "center",
  },
  layananJudul: { fontSize: 13, fontWeight: "800", color: colors.navy900 },
  layananDesc: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  infoBox: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.bpom50,
    borderRadius: 12,
    padding: 12,
  },
  infoText: { fontSize: 11.5, color: colors.bpom700, lineHeight: 16 },
  beritaCard: { marginHorizontal: 16, marginBottom: 12, gap: 6 },
  beritaHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "flex-start" },
  beritaJudul: { flex: 1, fontSize: 13.5, fontWeight: "800", color: colors.navy900 },
  beritaRingkasan: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },
  empty: { textAlign: "center", color: colors.navy400, fontSize: 12, paddingVertical: 24 },
  footer: { textAlign: "center", fontSize: 10.5, color: colors.navy300, marginTop: 16 },
});
