import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { logoutUser } from "../api";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";
import TopHeader from "./componets/topheader";

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
    <View style={styles.container}>
      {/* ── Top Header ── */}
      <TopHeader />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        
        {/* ── Today's Overview ── */}
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

        {/* ── Earnings ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Earnings Today</Text>
          <Text style={styles.amount}>₹ 2,450</Text>
          <Text style={styles.muted}>vs yesterday</Text>
        </View>

        {/* ── Quick Actions ── */}
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
                color="#2E7A4F"
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

      {/* ── Bottom Bar ── */}
      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F6F1", // match bottom bar
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    color: "#1A3328",
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
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: "#1A3328",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 8,
  },
  statLabel: {
    color: "#7A8E87",
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
    fontWeight: "500",
  },
  amount: {
    color: "#1A3328",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 4,
  },
  muted: {
    color: "#7A8E87",
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
    borderRadius: 16,
    backgroundColor: "#F9F3E8",
    alignItems: "center",
    marginBottom: 6,
  },
  quickText: {
    color: "#1A3328",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
});
