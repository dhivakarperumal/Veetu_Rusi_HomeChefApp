import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";
import TopHeader from "./componets/topheader";

// ── Stat data ────────────────────────────────────────────────────────────────
const stats = [
  {
    label: "Orders",
    value: "12",
    icon: "receipt-outline" as const,
    bg: "#FFF3E0",
    iconColor: "#F57C00",
  },
  {
    label: "Preparing",
    value: "5",
    icon: "flame-outline" as const,
    bg: "#FDE8E8",
    iconColor: "#E53E3E",
  },
  {
    label: "Ready",
    value: "3",
    icon: "checkmark-circle-outline" as const,
    bg: "#E8F5E9",
    iconColor: "#2E7D32",
  },
  {
    label: "Completed",
    value: "24",
    icon: "bag-check-outline" as const,
    bg: "#E3F2FD",
    iconColor: "#1565C0",
  },
];

// ── Quick-action data ─────────────────────────────────────────────────────────
const quickActions = [
  {
    key: "dishes",
    label: "My Dishes",
    icon: "restaurant-outline" as const,
    bg: "#E8F5E9",
    iconColor: "#2E7D32",
    route: "/dishes",
  },
  {
    key: "orders",
    label: "Orders",
    icon: "receipt-outline" as const,
    bg: "#FFF3E0",
    iconColor: "#F57C00",
    route: "/orders",
  },
  {
    key: "earnings",
    label: "Earnings",
    icon: "cash-outline" as const,
    bg: "#E3F2FD",
    iconColor: "#1565C0",
    route: "/earnings",
  },
  {
    key: "menu",
    label: "Menu",
    icon: "grid-outline" as const,
    bg: "#F3E5F5",
    iconColor: "#6A1B9A",
    route: "/dishes",
  },
];

// ── Sparkline ─────────────────────────────────────────────────────────────────
const sparkData = [30, 48, 38, 62, 54, 75, 68, 85, 80, 100];

function Sparkline() {
  const max = Math.max(...sparkData);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        height: 52,
        gap: 4,
      }}
    >
      {sparkData.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: (v / max) * 52,
            backgroundColor:
              i === sparkData.length - 1
                ? colors.primary
                : `rgba(30,106,75,${0.15 + (i / (sparkData.length - 1)) * 0.5})`,
            borderRadius: 4,
          }}
        />
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function Index() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      <TopHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
      >
        {/* ── Today's Overview ── */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            borderRadius: 24,
            backgroundColor: colors.cardBackground,
            padding: 18,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.primaryDark,
              marginBottom: 16,
            }}
          >
            Today's Overview
          </Text>

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            {stats.map((item) => (
              <View key={item.label} style={{ flex: 1, alignItems: "center" }}>
                {/* Icon badge */}
                <View
                  style={{
                    height: 46,
                    width: 46,
                    borderRadius: 14,
                    backgroundColor: item.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>
                {/* Value */}
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "800",
                    color: colors.primaryDark,
                    marginTop: 8,
                  }}
                >
                  {item.value}
                </Text>
                {/* Label */}
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.muted,
                    marginTop: 2,
                    textAlign: "center",
                  }}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Earnings Today ── */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 14,
            borderRadius: 24,
            backgroundColor: colors.softCard,
            padding: 18,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.primaryDark,
              }}
            >
              Earnings Today
            </Text>

            {/* Trend badge */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#C8E6C9",
                borderRadius: 50,
                paddingHorizontal: 9,
                paddingVertical: 4,
              }}
            >
              <Ionicons name="trending-up-outline" size={13} color="#2E7D32" />
              <Text
                style={{
                  color: "#2E7D32",
                  fontSize: 12,
                  fontWeight: "700",
                  marginLeft: 3,
                }}
              >
                +12%
              </Text>
            </View>
          </View>

          {/* Amount */}
          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              color: colors.primaryDark,
              marginTop: 10,
            }}
          >
            ₹ 2,450
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
            vs yesterday
          </Text>

          {/* Sparkline */}
          <View style={{ marginTop: 14 }}>
            <Sparkline />
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.primaryDark,
              marginBottom: 12,
            }}
          >
            Quick Actions
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {quickActions.map((action) => (
              <Pressable
                key={action.key}
                onPress={() => router.push(action.route as any)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  borderRadius: 20,
                  paddingVertical: 16,
                  backgroundColor: colors.cardBackground,
                  shadowColor: "#000",
                  shadowOpacity: 0.04,
                  shadowOffset: { width: 0, height: 1 },
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    height: 46,
                    width: 46,
                    borderRadius: 14,
                    backgroundColor: action.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={action.icon}
                    size={23}
                    color={action.iconColor}
                  />
                </View>
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    fontWeight: "600",
                    color: colors.primaryDark,
                    textAlign: "center",
                  }}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <BottomBar />
    </View>
  );
}
