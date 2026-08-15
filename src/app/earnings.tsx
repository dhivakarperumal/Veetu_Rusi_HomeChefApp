import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import api from "../api";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";
import TopHeader from "./componets/topheader";

// ── Types ─────────────────────────────────────────────────────────────────────
type Period = "Day" | "Week" | "Month";

interface Transaction {
  id: string;
  order_id: string;
  time: string;
  amount: number;
}

interface PeriodStats {
  amount: number;
  trend: string;
  trendUp: boolean;
  trendLabel: string;
  chartPoints: number[];
  xLabels: string[];
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  avgOrderValue: number;
  transactions: Transaction[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const isCompleted = (status: string) =>
  ["completed", "delivered", "out for delivery"].includes(
    (status || "").toLowerCase()
  );

const isCancelled = (status: string) =>
  (status || "").toLowerCase() === "cancelled";

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - r.getDay()); // Sunday
  return r;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatAmount(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function trendPercent(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${Math.round(pct)}%`;
}

// Build chart points (bucketed totals) for a given period
function buildChartPoints(
  orders: any[],
  period: Period,
  now: Date
): { points: number[]; xLabels: string[] } {
  if (period === "Day") {
    const buckets = new Array(24).fill(0);
    const todayStart = startOfDay(now);
    for (const o of orders) {
      const d = new Date(o.ordered_at || o.created_at || "");
      if (d >= todayStart && isCompleted(o.status)) {
        buckets[d.getHours()] += Number(
          o.chef_total_amount ?? o.total_amount ?? 0
        );
      }
    }
    // Collapse to 8 visible points (every 3 hours)
    const step = 3;
    const points: number[] = [];
    const xLabels: string[] = [];
    for (let h = 0; h < 24; h += step) {
      const sum = buckets
        .slice(h, h + step)
        .reduce((a: number, b: number) => a + b, 0);
      points.push(sum);
      const suffix = h < 12 ? "AM" : "PM";
      const disp = h === 0 ? 12 : h > 12 ? h - 12 : h;
      xLabels.push(`${disp}${suffix}`);
    }
    return { points, xLabels };
  }

  if (period === "Week") {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets = new Array(7).fill(0);
    const weekStart = startOfWeek(now);
    for (const o of orders) {
      const d = new Date(o.ordered_at || o.created_at || "");
      if (d >= weekStart && isCompleted(o.status)) {
        buckets[d.getDay()] += Number(
          o.chef_total_amount ?? o.total_amount ?? 0
        );
      }
    }
    return { points: buckets, xLabels: dayNames };
  }

  // Month — 4 week buckets
  const buckets = new Array(4).fill(0);
  const monthStart = startOfMonth(now);
  for (const o of orders) {
    const d = new Date(o.ordered_at || o.created_at || "");
    if (d >= monthStart && isCompleted(o.status)) {
      const weekIndex = Math.min(3, Math.floor((d.getDate() - 1) / 7));
      buckets[weekIndex] += Number(
        o.chef_total_amount ?? o.total_amount ?? 0
      );
    }
  }
  return {
    points: buckets,
    xLabels: ["Week 1", "Week 2", "Week 3", "Week 4"],
  };
}

function computeStats(orders: any[], period: Period, now: Date): PeriodStats {
  let rangeStart: Date;
  let prevStart: Date;
  let prevEnd: Date;
  let trendLabel: string;

  if (period === "Day") {
    rangeStart = startOfDay(now);
    prevEnd = rangeStart;
    prevStart = new Date(rangeStart.getTime() - 86400000);
    trendLabel = "vs yesterday";
  } else if (period === "Week") {
    rangeStart = startOfWeek(now);
    prevEnd = rangeStart;
    prevStart = new Date(rangeStart.getTime() - 7 * 86400000);
    trendLabel = "vs last week";
  } else {
    rangeStart = startOfMonth(now);
    prevEnd = rangeStart;
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    trendLabel = "vs last month";
  }

  const inRange = (o: any) => {
    const d = new Date(o.ordered_at || o.created_at || "");
    return d >= rangeStart && d <= now;
  };
  const inPrev = (o: any) => {
    const d = new Date(o.ordered_at || o.created_at || "");
    return d >= prevStart && d < prevEnd;
  };

  const current = orders.filter(inRange);
  const previous = orders.filter(inPrev);

  const completedCurrent = current.filter((o) => isCompleted(o.status));
  const completedPrevious = previous.filter((o) => isCompleted(o.status));

  const currentEarnings = completedCurrent.reduce(
    (s, o) => s + Number(o.chef_total_amount ?? o.total_amount ?? 0),
    0
  );
  const prevEarnings = completedPrevious.reduce(
    (s, o) => s + Number(o.chef_total_amount ?? o.total_amount ?? 0),
    0
  );

  const cancelledCount = current.filter((o) => isCancelled(o.status)).length;
  const avgOrderValue =
    completedCurrent.length > 0
      ? Math.round(currentEarnings / completedCurrent.length)
      : 0;

  const { points, xLabels } = buildChartPoints(orders, period, now);

  const transactions: Transaction[] = completedCurrent
    .sort(
      (a: any, b: any) =>
        new Date(b.ordered_at || b.created_at || "").getTime() -
        new Date(a.ordered_at || a.created_at || "").getTime()
    )
    .slice(0, 8)
    .map((o: any) => ({
      id: String(o.id || o._id || ""),
      order_id: o.order_id || o.id || "—",
      time:
        o.ordered_at || o.created_at
          ? new Date(o.ordered_at || o.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
      amount: Number(o.chef_total_amount ?? o.total_amount ?? 0),
    }));

  const trend = trendPercent(currentEarnings, prevEarnings);
  const trendUp = currentEarnings >= prevEarnings;

  return {
    amount: currentEarnings,
    trend,
    trendUp,
    trendLabel,
    chartPoints: points,
    xLabels,
    totalOrders: current.length,
    completedOrders: completedCurrent.length,
    cancelledOrders: cancelledCount,
    avgOrderValue,
    transactions,
  };
}

// ── Line Chart ────────────────────────────────────────────────────────────────
function LineChart({ points }: { points: number[] }) {
  const W = 320;
  const H = 100;
  if (!points || points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const pad = 12;

  const coords = points.map((v, i) => ({
    x: pad + (i / (points.length - 1)) * (W - pad * 2),
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }));

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
  order_id,
  time,
  amount,
}: {
  order_id: string;
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

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: colors.primaryDark,
          }}
        >
          Order #{order_id}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
          {time}
        </Text>
      </View>

      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary }}>
        + ₹{amount % 1 === 0 ? amount : amount.toFixed(2)}
      </Text>
    </View>
  );
}

function periodLabel(period: Period) {
  if (period === "Day") return "Today's Earnings";
  if (period === "Week") return "This Week's Earnings";
  return "This Month's Earnings";
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function EarningsScreen() {
  const [period, setPeriod] = useState<Period>("Day");
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get("/user-food-orders/chef");
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : raw?.orders || raw?.data || [];
      setAllOrders(list);
    } catch (e) {
      console.error("Earnings fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const now = new Date();
  const data: PeriodStats = computeStats(allOrders, period, now);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.pageBackground,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
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
          <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>
            {periodLabel(period)}
          </Text>

          <Text
            style={{
              fontSize: 36,
              fontWeight: "800",
              color: colors.primaryDark,
              marginBottom: 4,
            }}
          >
            ₹ {formatAmount(data.amount)}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
              gap: 4,
            }}
          >
            <Ionicons
              name={
                data.trendUp
                  ? "trending-up-outline"
                  : "trending-down-outline"
              }
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

          <LineChart points={data.chartPoints} />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 8,
              paddingHorizontal: 4,
            }}
          >
            {data.xLabels.map((lbl, idx) => (
              <Text key={idx} style={{ fontSize: 11, color: colors.muted }}>
                {lbl}
              </Text>
            ))}
          </View>
        </View>

        {/* ── Stats Grid ── */}
        <View style={{ gap: 10, marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard label="Total Orders" value={data.totalOrders} />
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
          </View>

          {data.transactions.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Ionicons
                name="receipt-outline"
                size={32}
                color={colors.muted}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: colors.muted,
                  marginTop: 10,
                  textAlign: "center",
                }}
              >
                No completed transactions yet for this period.
              </Text>
            </View>
          ) : (
            data.transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                order_id={tx.order_id}
                time={tx.time}
                amount={tx.amount}
              />
            ))
          )}
        </View>
      </ScrollView>

      <BottomBar />
    </View>
  );
}
