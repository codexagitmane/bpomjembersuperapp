import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, Link } from "expo-router";
import { ShieldCheck, ArrowRight } from "lucide-react-native";
import { loginSchema, extractApiErrorMessage } from "@bpom/shared";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setServerError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
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
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <ShieldCheck size={26} color="#fff" />
          </View>
          <Text style={styles.logoText}>LENTERA BPOM Jember</Text>
        </View>

        <Text style={styles.title}>Masuk ke Akun Anda</Text>
        <Text style={styles.subtitle}>Gunakan akun kepegawaian atau akun masyarakat Anda.</Text>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="nama@bpomjember.go.id"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            error={fieldErrors.email}
          />
          <Input
            label="Kata Sandi"
            placeholder="••••••••"
            isPassword
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password}
          />

          {serverError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          )}

          <Button
            title="Masuk"
            onPress={handleSubmit}
            loading={loading}
            icon={<ArrowRight size={16} color="#fff" />}
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Masyarakat umum belum punya akun? </Text>
          <Link href="/register" style={styles.footerLink}>
            Daftar di sini
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 24, justifyContent: "center", gap: 4 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28, alignSelf: "center" },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.bpom500,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 17, fontWeight: "800", color: colors.navy900 },
  title: { fontSize: 24, fontWeight: "800", color: colors.navy900 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 24 },
  form: { gap: 16 },
  errorBox: { backgroundColor: colors.rose50, borderRadius: 12, padding: 12 },
  errorText: { color: "#be123c", fontSize: 13, fontWeight: "600" },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: 13, color: colors.textMuted },
  footerLink: { fontSize: 13, fontWeight: "700", color: colors.bpom600 },
});
