import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Tabs, router } from "expo-router";
import { Newspaper, LayoutGrid, UserRound } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/theme";

export default function AppTabsLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user]);

  if (isLoading || !user) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.navy400} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy900,
        tabBarInactiveTintColor: colors.navy300,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarStyle: { borderTopColor: "#eef1f6", height: 60, paddingTop: 6, paddingBottom: 8 },
      }}
    >
      <Tabs.Screen
        name="berita"
        options={{ title: "Berita", tabBarIcon: ({ color, size }) => <Newspaper color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="fungsi"
        options={{ title: "Fungsi", tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: "Profil", tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }}
      />
    </Tabs>
  );
}
