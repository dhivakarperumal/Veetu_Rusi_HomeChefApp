import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { logoutUser } from "../api";
import { colors } from "../theme/colors";

const stats = [
  {
    label: "Orders",
    value: "12",
    icon: "receipt-outline",
    tint: "#FFF3E0",
    color: "#F57C00",
  },
  {
    label: "Preparing",
    value: "5",
    icon: "flame-outline",
    tint: "#FDE8E8",
    color: "#E53E3E",
  },
  {
    label: "Ready",
    value: "3",
    icon: "checkmark-circle-outline",
    tint: "#E8F5E9",
    color: "#2E7D32",
  },
  {
    label: "Completed",
    value: "24",
    icon: "bag-check-outline",
    tint: "#E3F2FD",
    color: "#1565C0",
  },
];

export default function DashboardScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Welcome back</Text>
          <Text style={styles.title}>HomeChef Dashboard</Text>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Today’s Overview</Text>
        <View style={styles.statsRow}>
          {stats.map((item) => (
            <View key={item.label} style={styles.statBox}>
              <View style={[styles.statIcon, { backgroundColor: item.tint }]}>
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color={item.color}
                />
              </View>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Earnings Today</Text>
        <Text style={styles.amount}>₹ 2,450</Text>
        <Text style={styles.muted}>vs yesterday</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <Pressable
            style={styles.quickItem}
            onPress={() => router.push("/dishes")}
          >
            <Ionicons
              name="restaurant-outline"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.quickText}>Dishes</Text>
          </Pressable>
          <Pressable
            style={styles.quickItem}
            onPress={() => router.push("/orders")}
          >
            <Ionicons name="receipt-outline" size={24} color="#F57C00" />
            <Text style={styles.quickText}>Orders</Text>
          </Pressable>
          <Pressable
            style={styles.quickItem}
            onPress={() => router.push("/earnings")}
          >
            <Ionicons name="cash-outline" size={24} color="#1565C0" />
            <Text style={styles.quickText}>Earnings</Text>
          </Pressable>
          <Pressable
            style={styles.quickItem}
            onPress={() => router.push("/profile")}
          >
            <Ionicons name="person-outline" size={24} color="#6A1B9A" />
            <Text style={styles.quickText}>Profile</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBackground,
  },
  content: {
    padding: 18,
    paddingBottom: 80,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  title: {
    color: colors.primaryDark,
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: "#1E6A4B",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logoutText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
  amount: {
    color: colors.primaryDark,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  muted: {
    color: colors.muted,
    fontSize: 12,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  quickItem: {
    width: "48%",
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.softCard,
    alignItems: "center",
    marginBottom: 10,
  },
  quickText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
});
