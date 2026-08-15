import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";
import TopHeader from "./componets/topheader";

// ── Period data ───────────────────────────────────────────────────────────────
type Period = "Day" | "Week" | "Month";

const PERIOD_DATA: Record<
  Period,
  {
    amount: string;
    trend: string;
    trendUp: boolean;
    trendLabel: string;
    chartPoints: number[];
    xLabels: string[];
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    avgOrderValue: number;
    transactions: { id: string; time: string; amount: number }[];
  }
> = {
  Day: {
    amount: "2,450",
    trend: "+12%",
    trendUp: true,
    trendLabel: "vs yesterday",
    chartPoints: [10, 18, 14, 28, 22, 40, 35, 55, 48, 70, 62, 85, 78, 100],
    xLabels: ["12 AM", "6 AM", "12 PM", "6 PM", "12 AM Next"],
    totalOrders: 24,
    completedOrders: 20,
    cancelledOrders: 2,
    avgOrderValue: 122,
    transactions: [
      { id: "ORD1233", time: "10:15 AM", amount: 150 },
      { id: "ORD1232", time: "09:45 AM", amount: 90 },
      { id: "ORD1231", time: "09:20 AM", amount: 120 },
      { id: "ORD1230", time: "08:55 AM", amount: 230 },
      { id: "ORD1229", time: "08:30 AM", amount: 180 },
    ],
  },
  Week: {
    amount: "14,280",
    trend: "+8%",
    trendUp: true,
    trendLabel: "vs last week",
    chartPoints: [40, 55, 48, 70, 62, 80, 75, 90, 85, 78, 88, 95, 100, 92],
    xLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    totalOrders: 148,
    completedOrders: 132,
    cancelledOrders: 10,
    avgOrderValue: 108,
    transactions: [
      { id: "ORD1240", time: "Yesterday", amount: 320 },
      { id: "ORD1239", time: "Yesterday", amount: 150 },
      { id: "ORD1238", time: "2 days ago", amount: 280 },
      { id: "ORD1237", time: "2 days ago", amount: 90 },
      { id: "ORD1236", time: "3 days ago", amount: 410 },
    ],
  },
  Month: {
    amount: "58,600",
    trend: "-3%",
    trendUp: false,
    trendLabel: "vs last month",
    chartPoints: [60, 70, 55, 80, 75, 88, 65, 90, 85, 78, 92, 100, 88, 95],
    xLabels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    totalOrders: 512,
    completedOrders: 480,
    cancelledOrders: 18,
    avgOrderValue: 122,
    transactions: [
      { id: "ORD1250", time: "Aug 13", amount: 560 },
      { id: "ORD1249", time: "Aug 12", amount: 410 },
      { id: "ORD1248", time: "Aug 11", amount: 230 },
      { id: "ORD1247", time: "Aug 10", amount: 180 },
      { id: "ORD1246", time: "Aug 09", amount: 320 },
    ],
  },
};

// ── Line Chart ────────────────────────────────────────────────────────────────
function LineChart({ points }: { points: number[] }) {
  const W = 320;
  const H = 100;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const pad = 12;

  // Normalise to canvas coords
  const coords = points.map((v, i) => ({
    x: pad + (i / (points.length - 1)) * (W - pad * 2),
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }));

  // Build a polyline path as sequential View segments
  // We'll use absolute-positioned Views to draw lines + dots
  const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    segments.push({
      x1: coords[i].x,
      y1: coords[i].y,
      x2: coords[i + 1].x,
      y2: coords[i + 1].y,
    });
  }

  return (
    <View style={{ width: "100%", height: H, position: "relative" }}>
      {/* Filled area under the line */}
      {segments.map((seg, i) => {
        const dx = seg.x2 - seg.x1;
        const dy = seg.y2 - seg.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={`seg-${i}`}
            style={{
              position: "absolute",
              left: seg.x1,
              top: seg.y1,
              width: len,
              height: 2.5,
              backgroundColor: colors.primary,
              borderRadius: 2,
              transformOrigin: "0 50%",
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}

      {/* Fill area (gradient illusion using thin columns) */}
      {coords.map((pt, i) => (
        <View
          key={`fill-${i}`}
          style={{
            position: "absolute",
            left: pt.x - 1,
            top: pt.y,
            width: 2,
            height: H - pt.y - pad,
            backgroundColor: `rgba(30,106,75,${0.04 + (i / coords.length) * 0.1})`,
          }}
        />
      ))}

      {/* Dots */}
      {coords.map((pt, i) => (
        <View
          key={`dot-${i}`}
          style={{
            position: "absolute",
            left: pt.x - 4,
            top: pt.y - 4,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#fff",
            borderWidth: 2,
            borderColor: colors.primary,
          }}
        />
      ))}
    </View>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  prefix,
}: {
  label: string;
  value: string | number;
  prefix?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8 }}>
        {label}
      </Text>
      <Text
        style={{ fontSize: 24, fontWeight: "800", color: colors.primaryDark }}
      >
        {prefix}
        {value}
      </Text>
    </View>
  );
}

// ── Transaction Row ───────────────────────────────────────────────────────────
function TransactionRow({
  id,
  time,
  amount,
}: {
  id: string;
  time: string;
  amount: number;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      {/* Icon */}
      <View
        style={{
          height: 42,
          width: 42,
          borderRadius: 14,
          backgroundColor: colors.softCard,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons name="receipt-outline" size={20} color={colors.primary} />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: colors.primaryDark,
          }}
        >
          Order #{id}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
          {time}
        </Text>
      </View>

      {/* Amount */}
      <Text
        style={{ fontSize: 15, fontWeight: "700", color: colors.primary }}
      >
        + ₹{amount}
      </Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function EarningsScreen() {
  const [period, setPeriod] = useState<Period>("Day");
  const data = PERIOD_DATA[period];

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      {/* ── Header ── */}
      <TopHeader showHero={false} title="Earnings" />

      <View style={{ backgroundColor: colors.pageBackground, paddingTop: 4 }}>
        {/* ── Period tabs ── */}
        <View
          style={{
            flexDirection: "row",
            marginHorizontal: 20,
            marginBottom: 16,
            backgroundColor: colors.cardBackground,
            borderRadius: 50,
            padding: 4,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          {(["Day", "Week", "Month"] as Period[]).map((p) => {
            const isActive = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: 50,
                  alignItems: "center",
                  backgroundColor: isActive ? colors.primary : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: isActive ? "#fff" : colors.label,
                  }}
                >
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 100,
          paddingTop: 4,
        }}
      >
        {/* ── Earnings Chart Card ── */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            padding: 18,
            marginBottom: 14,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text
            style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}
          >
            Today's Earnings
          </Text>

          {/* Amount */}
          <Text
            style={{
              fontSize: 36,
              fontWeight: "800",
              color: colors.primaryDark,
              marginBottom: 4,
            }}
          >
            ₹ {data.amount}
          </Text>

          {/* Trend */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
              gap: 4,
            }}
          >
            <Ionicons
              name={data.trendUp ? "trending-up-outline" : "trending-down-outline"}
              size={16}
              color={data.trendUp ? "#2E7D32" : "#C62828"}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: data.trendUp ? "#2E7D32" : "#C62828",
              }}
            >
              {data.trend}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>
              {data.trendLabel}
            </Text>
          </View>

          {/* Line chart */}
          <LineChart points={data.chartPoints} />

          {/* X-axis labels */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 8,
              paddingHorizontal: 4,
            }}
          >
            {data.xLabels.map((lbl, idx) => (
              <Text
                key={idx}
                style={{ fontSize: 11, color: colors.muted }}
              >
                {lbl}
              </Text>
            ))}
          </View>
        </View>

        {/* ── Stats Grid ── */}
        <View style={{ gap: 10, marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard
              label="Total Orders"
              value={data.totalOrders}
            />
            <StatCard
              label="Completed Orders"
              value={data.completedOrders}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard
              label="Cancelled Orders"
              value={data.cancelledOrders}
            />
            <StatCard
              label="Avg Order Value"
              value={data.avgOrderValue}
              prefix="₹"
            />
          </View>
        </View>

        {/* ── Recent Transactions ── */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            padding: 18,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: colors.primaryDark,
              }}
            >
              Recent Transactions
            </Text>
            <Pressable>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                View All
              </Text>
            </Pressable>
          </View>

          {/* List */}
          {data.transactions.map((tx, i) => (
            <TransactionRow
              key={tx.id}
              id={tx.id}
              time={tx.time}
              amount={tx.amount}
            />
          ))}
        </View>
      </ScrollView>

      <BottomBar />
    </View>
  );
}
