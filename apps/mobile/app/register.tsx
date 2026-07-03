import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { registerEksternalSchema, extractApiErrorMessage } from "@bpom/shared";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme";

export default function RegisterScreen() {
  const { registerEksternal } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setServerError(null);
    setFieldErrors({});

    const parsed = registerEksternalSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await registerEksternal(form);
      router.replace("/(app)/berita");
    } catch (err) {
      setServerError(extractApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <ArrowLeft size={16} color={colors.textMuted} />
          <Text style={styles.backText}>Kembali ke Masuk</Text>
        </Pressable>

        <Text style={styles.title}>Daftar Akun Masyarakat</Text>
        <Text style={styles.subtitle}>Untuk layanan konsultasi & pengaduan publik</Text>

        <View style={styles.form}>
          <Input label="Nama Lengkap" value={form.name} onChangeText={(v) => update("name", v)} error={fieldErrors.name} />
          <Input label="Email" keyboardType="email-address" value={form.email} onChangeText={(v) => update("email", v)} error={fieldErrors.email} />
          <Input label="Nomor HP" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => update("phone", v)} error={fieldErrors.phone} />
          <Input label="Kata Sandi" isPassword value={form.password} onChangeText={(v) => update("password", v)} error={fieldErrors.password} />
          <Input
            label="Konfirmasi Kata Sandi"
            isPassword
            value={form.password_confirmation}
            onChangeText={(v) => update("password_confirmation", v)}
            error={fieldErrors.password_confirmation}
          />

          {serverError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          )}

          <Button title="Daftar Sekarang" onPress={handleSubmit} loading={loading} icon={<ArrowRight size={16} color="#fff" />} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 24, paddingTop: 56 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 24 },
  backText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  title: { fontSize: 22, fontWeight: "800", color: colors.navy900 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 24 },
  form: { gap: 16 },
  errorBox: { backgroundColor: colors.rose50, borderRadius: 12, padding: 12 },
  errorText: { color: "#be123c", fontSize: 13, fontWeight: "600" },
});
