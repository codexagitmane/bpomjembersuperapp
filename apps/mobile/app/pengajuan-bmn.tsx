import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Send, AlertCircle, CheckCircle2 } from "lucide-react-native";
import { api } from "@/lib/api";
import { extractApiErrorMessage } from "@bpom/shared";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, radius } from "@/theme";

interface Pengajuan {
  id: number;
  nama_barang_lain: string | null;
  deskripsi_kerusakan: string;
  prioritas: string;
  status: string;
}

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  diajukan: "warning",
  diproses: "neutral",
  selesai: "success",
  ditolak: "danger",
};
const PRIORITAS_OPTIONS = ["rendah", "sedang", "tinggi"];

export default function PengajuanBmnScreen() {
  const [form, setForm] = useState({
    nama_barang_lain: "",
    jenis_pengajuan: "perbaikan",
    deskripsi_kerusakan: "",
    prioritas: "sedang",
  });
  const [riwayat, setRiwayat] = useState<Pengajuan[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadRiwayat() {
    const { data } = await api.get("/pengajuan-bmn");
    setRiwayat(data.data ?? []);
  }
  useEffect(() => {
    loadRiwayat();
  }, []);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.post("/pengajuan-bmn", form);
      setSuccess("Pengajuan berhasil dikirim ke Tata Usaha.");
      setForm({ nama_barang_lain: "", jenis_pengajuan: "perbaikan", deskripsi_kerusakan: "", prioritas: "sedang" });
      await loadRiwayat();
    } catch (err) {
      setError(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.navy900} />
        </Pressable>
        <Text style={styles.headerTitle}>Pengajuan BMN</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card>
            <Text style={styles.cardTitle}>Ajukan Pemeliharaan / Perbaikan</Text>
            <View style={styles.formGap}>
              <Input label="Nama Barang" placeholder="Contoh: AC Ruang Pemeriksaan" value={form.nama_barang_lain} onChangeText={(v) => setForm((f) => ({ ...f, nama_barang_lain: v }))} />

              <Text style={styles.label}>Prioritas</Text>
              <View style={styles.chipRow}>
                {PRIORITAS_OPTIONS.map((p) => (
                  <Pressable key={p} onPress={() => setForm((f) => ({ ...f, prioritas: p }))} style={[styles.chip, form.prioritas === p && styles.chipActive]}>
                    <Text style={[styles.chipText, form.prioritas === p && styles.chipTextActive]}>{p}</Text>
                  </Pressable>
                ))}
              </View>

              <Input
                label="Deskripsi Kerusakan"
                placeholder="Jelaskan kondisi kerusakan..."
                multiline
                numberOfLines={4}
                style={{ minHeight: 90, textAlignVertical: "top" }}
                value={form.deskripsi_kerusakan}
                onChangeText={(v) => setForm((f) => ({ ...f, deskripsi_kerusakan: v }))}
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#be123c" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {success && (
              <View style={styles.successBox}>
                <CheckCircle2 size={16} color={colors.bpom700} />
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            <View style={{ marginTop: 16 }}>
              <Button title="Kirim Pengajuan" onPress={handleSubmit} loading={submitting} icon={<Send size={16} color="#fff" />} />
            </View>
          </Card>

          <Card>
            <Text style={styles.cardTitle}>Riwayat Pengajuan</Text>
            {riwayat.length === 0 && <Text style={styles.emptyText}>Belum ada riwayat pengajuan.</Text>}
            {riwayat.map((p) => (
              <View key={p.id} style={styles.riwayatRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.riwayatTitle}>{p.nama_barang_lain}</Text>
                  <Text style={styles.riwayatSub} numberOfLines={2}>
                    {p.deskripsi_kerusakan}
                  </Text>
                </View>
                <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
              </View>
            ))}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: colors.navy900 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.navy900, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: colors.navy800 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.navy50 },
  chipActive: { backgroundColor: colors.navy900 },
  chipText: { fontSize: 12.5, fontWeight: "700", color: colors.navy600 },
  chipTextActive: { color: "#fff" },
  formGap: { gap: 14 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.rose50, borderRadius: radius.md, padding: 12, marginTop: 12 },
  errorText: { fontSize: 12.5, fontWeight: "600", color: "#be123c", flex: 1 },
  successBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.bpom50, borderRadius: radius.md, padding: 12, marginTop: 12 },
  successText: { fontSize: 12.5, fontWeight: "600", color: colors.bpom700, flex: 1 },
  emptyText: { fontSize: 13, color: colors.navy400, textAlign: "center", paddingVertical: 20 },
  riwayatRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#eef1f6" },
  riwayatTitle: { fontSize: 13, fontWeight: "700", color: colors.navy900 },
  riwayatSub: { fontSize: 11, color: colors.navy400, marginTop: 2 },
});
