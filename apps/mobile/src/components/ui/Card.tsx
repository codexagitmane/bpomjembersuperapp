import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radius, shadow } from "@/theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const TONE_COLORS: Record<string, { bg: string; text: string }> = {
  neutral: { bg: colors.navy50, text: colors.navy700 },
  success: { bg: colors.bpom50, text: colors.bpom700 },
  warning: { bg: "#fef3e2", text: "#b45309" },
  danger: { bg: colors.rose50, text: "#be123c" },
  info: { bg: colors.navy100, text: colors.navy600 },
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const t = TONE_COLORS[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 18,
    ...shadow.card,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
