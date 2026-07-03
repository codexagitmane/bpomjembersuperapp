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

interface Izin {
  id: number;
  tanggal: string;
  jam_mulai: string;
  jenis: string;
  keperluan: string;
  status: string;
}

const JENIS_LABEL: Record<string, string> = {
  keluar_sementara: "Keluar Sementara",
  dinas_luar: "Dinas Luar",
  izin_pribadi: "Izin Pribadi",
};
const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  diajukan: "warning",
  disetujui: "success",
  ditolak: "danger",
  selesai: "neutral",
};
const JENIS_OPTIONS = ["keluar_sementara", "dinas_luar", "izin_pribadi"];

export default function IzinKeluarMasukScreen() {
  const [form, setForm] = useState({ tanggal: "", jam_mulai: "", jenis: "keluar_sementara", keperluan: "" });
  const [riwayat, setRiwayat] = useState<Izin[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadRiwayat() {
    const { data } = await api.get("/izin-keluar-masuk");
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
      await api.post("/izin-keluar-masuk", form);
      setSuccess("Pengajuan izin berhasil dikirim.");
      setForm({ tanggal: "", jam_mulai: "", jenis: "keluar_sementara", keperluan: "" });
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
        <Text style={styles.headerTitle}>Izin Keluar Masuk</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card>
            <Text style={styles.cardTitle}>Ajukan Izin</Text>
            <View style={styles.chipRow}>
              {JENIS_OPTIONS.map((j) => (
                <Pressable key={j} onPress={() => setForm((f) => ({ ...f, jenis: j }))} style={[styles.chip, form.jenis === j && styles.chipActive]}>
                  <Text style={[styles.chipText, form.jenis === j && styles.chipTextActive]}>{JENIS_LABEL[j]}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.formGap}>
              <Input label="Tanggal (YYYY-MM-DD)" placeholder="2026-07-10" value={form.tanggal} onChangeText={(v) => setForm((f) => ({ ...f, tanggal: v }))} />
              <Input label="Jam Mulai (HH:MM)" placeholder="13:00" value={form.jam_mulai} onChangeText={(v) => setForm((f) => ({ ...f, jam_mulai: v }))} />
              <Input
                label="Keperluan"
                placeholder="Jelaskan keperluan izin..."
                multiline
                numberOfLines={4}
                style={{ minHeight: 90, textAlignVertical: "top" }}
                value={form.keperluan}
                onChangeText={(v) => setForm((f) => ({ ...f, keperluan: v }))}
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
              <Button title="Ajukan Izin" onPress={handleSubmit} loading={submitting} icon={<Send size={16} color="#fff" />} />
            </View>
          </Card>

          <Card>
            <Text style={styles.cardTitle}>Riwayat Pengajuan</Text>
            {riwayat.length === 0 && <Text style={styles.emptyText}>Belum ada riwayat izin.</Text>}
            {riwayat.map((izin) => (
              <View key={izin.id} style={styles.riwayatRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.riwayatTitle}>{JENIS_LABEL[izin.jenis] ?? izin.jenis}</Text>
                  <Text style={styles.riwayatSub}>
                    {izin.tanggal} • {izin.jam_mulai?.slice(0, 5)}
                  </Text>
                </View>
                <Badge tone={STATUS_TONE[izin.status] ?? "neutral"}>{izin.status}</Badge>
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
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
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
