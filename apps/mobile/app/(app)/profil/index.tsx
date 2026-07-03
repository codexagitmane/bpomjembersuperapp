import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Mail, Phone, IdCard, BadgeCheck, LogOut } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ROLE_LABELS, type RoleSlug } from "@bpom/shared";
import { colors } from "@/theme";

export default function ProfilScreen() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profil Saya</Text>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Badge tone="info">{ROLE_LABELS[user.role as RoleSlug] ?? user.role}</Badge>
        </Card>

        <Card style={styles.infoCard}>
          <InfoRow icon={<Mail size={16} color={colors.navy500} />} label="Email" value={user.email} />
          {user.nip_nik && (
            <InfoRow icon={<IdCard size={16} color={colors.navy500} />} label="NIP / NIK" value={user.nip_nik} />
          )}
          {user.phone && (
            <InfoRow icon={<Phone size={16} color={colors.navy500} />} label="Nomor HP" value={user.phone} />
          )}
          <InfoRow
            icon={<BadgeCheck size={16} color={colors.navy500} />}
            label="Status Akun"
            value={user.is_active ? "Aktif" : "Nonaktif"}
            last
          />
        </Card>

        <Button
          title="Keluar dari Akun"
          variant="danger"
          onPress={handleLogout}
          loading={loggingOut}
          icon={<LogOut size={16} color="#fff" />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoIcon}>{icon}</View>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: colors.navy900 },
  profileCard: { alignItems: "center", gap: 8, paddingVertical: 28 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.navy900,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 26, fontWeight: "800" },
  name: { fontSize: 16, fontWeight: "800", color: colors.navy900 },
  infoCard: { padding: 0, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: "#eef1f6" },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.navy50,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontSize: 11, color: colors.navy400 },
  infoValue: { fontSize: 13.5, fontWeight: "700", color: colors.navy900 },
});
