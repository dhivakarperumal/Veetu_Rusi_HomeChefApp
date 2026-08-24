import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import api, {
  API_BASE_URL,
  getApiErrorMessage,
  isNewOrderStatus,
} from "../api";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";
import TopHeader from "./componets/topheader";

// ── Mini chart fallback without external SVG dependency ─────────────────────
function Sparkline({
  data,
  width = 120,
  height = 50,
  color = "#2E7A4F",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        width,
        height,
        gap: 2,
      }}
    >
      {data.map((value, index) => {
        const barHeight = ((value - min) / range) * (height - 8) + 6;

        return (
          <View
            key={`${value}-${index}`}
            style={{
              flex: 1,
              height: Math.max(barHeight, 6),
              borderRadius: 3,
              backgroundColor: index === data.length - 1 ? color : color + "88",
              opacity: 0.85,
            }}
          />
        );
      })}
    </View>
  );
}

const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");
const resolveImageUrl = (path: string) => {
  if (!path) return null;
  if (path.includes("localhost:5000"))
    return path.replace(/https?:\/\/localhost:5000/g, IMAGE_BASE_URL);
  if (path.includes("127.0.0.1:5000"))
    return path.replace(/https?:\/\/127.0.0.1:5000/g, IMAGE_BASE_URL);
  if (path.startsWith("http")) return path;
  return path.startsWith("/")
    ? `${IMAGE_BASE_URL}${path}`
    : `${IMAGE_BASE_URL}/${path}`;
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  "New Order": { bg: "#FFF3E0", text: "#E65100" },
  Accepted: { bg: "#E8F5E9", text: "#2E7D32" },
  Preparing: { bg: "#FFF9C4", text: "#F57F17" },
  Ready: { bg: "#E3F2FD", text: "#1565C0" },
  Delivered: { bg: "#F3E5F5", text: "#6A1B9A" },
  Completed: { bg: "#E8F5E9", text: "#2E7D32" },
  Cancelled: { bg: "#FFEBEE", text: "#C62828" },
};

const QUICK_ACTIONS = [
  {
    label: "Dishes",
    icon: "restaurant-outline",
    color: "#2E7A4F",
    tint: "#E8F5E9",
    route: "/dishes",
  },
  {
    label: "Orders",
    icon: "receipt-outline",
    color: "#E65100",
    tint: "#FFF3E0",
    route: "/orders",
  },
  {
    label: "Products",
    icon: "cube-outline",
    color: "#1565C0",
    tint: "#E3F2FD",
    route: "/myproducts",
  },
  {
    label: "Earnings",
    icon: "cash-outline",
    color: "#6A1B9A",
    tint: "#F3E5F5",
    route: "/earnings",
  },
  {
    label: "Profile",
    icon: "person-outline",
    color: "#00838F",
    tint: "#E0F7FA",
    route: "/profile",
  },
  {
    label: "Menu",
    icon: "list-outline",
    color: "#AD1457",
    tint: "#FCE4EC",
    route: "/menu",
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [popupOrder, setPopupOrder] = useState<any | null>(null);
  const [popupActionLoading, setPopupActionLoading] = useState(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);
  const hasLoadedOrdersRef = useRef(false);

  const fetchData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await api.get("/user-food-orders/chef");
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : raw?.orders || raw?.data || [];
      setOrders(list);

      const newOrder = list.find((order: any) => {
        const id = String(order.id || order._id || order.order_id || "");
        return (
          id &&
          isNewOrderStatus(order.status) &&
          !knownOrderIdsRef.current.has(id)
        );
      });
      list.forEach((order: any) => {
        const id = String(order.id || order._id || order.order_id || "");
        if (id) knownOrderIdsRef.current.add(id);
      });

      if (newOrder && hasLoadedOrdersRef.current) {
        setPopupOrder(newOrder);
      }
      hasLoadedOrdersRef.current = true;
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const updatePopupOrder = async (status: "Accepted" | "Cancelled") => {
    if (!popupOrder || popupActionLoading) return;
    setPopupActionLoading(true);
    try {
      const id = popupOrder.id || popupOrder._id;
      await api.patch(`/user-food-orders/status/${id}`, { status });
      setPopupOrder(null);
      await fetchData();
    } catch (error) {
      Alert.alert(
        status === "Accepted"
          ? "Could not accept order"
          : "Could not reject order",
        getApiErrorMessage(error),
      );
    } finally {
      setPopupActionLoading(false);
    }
  };

  // ── Computed stats ──────────────────────────────────────────────────────────
  const today = new Date().toDateString();
  const todayOrders = orders.filter(
    (o) =>
      new Date(o.ordered_at || o.created_at || "").toDateString() === today,
  );
  const newCount = orders.filter((o) => isNewOrderStatus(o.status)).length;
  const preparingCount = orders.filter((o) =>
    ["Accepted", "Preparing"].includes(o.status),
  ).length;
  const readyCount = orders.filter((o) => o.status === "Ready").length;
  const completedCount = orders.filter((o) =>
    ["Completed", "Delivered"].includes(o.status),
  ).length;

  const todayEarnings = todayOrders
    .filter((o) => ["Completed", "Delivered"].includes(o.status))
    .reduce(
      (s, o) => s + Number(o.chef_total_amount ?? o.total_amount ?? 0),
      0,
    );

  const totalEarnings = orders
    .filter((o) => ["Completed", "Delivered"].includes(o.status))
    .reduce(
      (s, o) => s + Number(o.chef_total_amount ?? o.total_amount ?? 0),
      0,
    );

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.ordered_at || b.created_at || "").getTime() -
        new Date(a.ordered_at || a.created_at || "").getTime(),
    )
    .slice(0, 5);

  const STATS = [
    {
      label: "New",
      value: newCount,
      icon: "notifications-outline",
      tint: "#FFF3E0",
      color: "#E65100",
    },
    {
      label: "Preparing",
      value: preparingCount,
      icon: "flame-outline",
      tint: "#FFEBEE",
    },
    {
      label: "Ready",
      value: readyCount,
      icon: "checkmark-circle-outline",
      tint: "#E8F5E9",
      color: "#2E7D32",
    },
    {
      label: "Done",
      value: completedCount,
      icon: "bag-check-outline",
      tint: "#E3F2FD",
      color: "#1565C0",
    },
  ];

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
    <View style={styles.container}>
      {/* TopHeader already has the greeting hero — no duplicate here */}
      <TopHeader />

      <Modal
        visible={Boolean(popupOrder)}
        transparent
        animationType="fade"
        onRequestClose={() => setPopupOrder(null)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.popupAccent} />
            <View style={styles.popupHeader}>
              <View style={styles.popupHeadingRow}>
                <View style={styles.popupOrderIcon}>
                  <Ionicons name="receipt" size={20} color="#E65100" />
                </View>
                <View>
                <Text style={styles.popupEyebrow}>NEW ORDER</Text>
                <Text style={styles.popupTitle}>
                  Order #{popupOrder?.order_id || popupOrder?.id || "Unknown"}
                </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setPopupOrder(null)}
                disabled={popupActionLoading}
                style={styles.popupCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Close new order popup"
              >
                <Ionicons name="close" size={20} color="#52645B" />
              </Pressable>
            </View>
            <View style={styles.popupWaitingRow}>
              <View style={styles.popupLiveDot} />
              <Text style={styles.popupWaitingText}>Ready for your kitchen</Text>
            </View>
            <Text style={styles.popupCustomer}>
              {popupOrder?.customer_name || "Customer"}
            </Text>
            <Text style={styles.popupAddress}>
              {popupOrder?.street_address ||
                popupOrder?.customer_address ||
                popupOrder?.delivery_address ||
                "Delivery address unavailable"}
            </Text>
            <View style={styles.popupSummary}>
              <Text style={styles.popupSummaryText}>
                {popupOrder?.chef_total_quantity ||
                  (Array.isArray(popupOrder?.items)
                    ? popupOrder.items.reduce(
                        (total: number, item: any) =>
                          total + (Number(item.quantity) || 1),
                        0,
                      )
                    : 0)}{" "}
                items
              </Text>
              <Text style={styles.popupAmount}>
                ₹
                {Number(
                  popupOrder?.chef_total_amount ??
                    popupOrder?.total_amount ??
                    0,
                ).toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.popupActions}>
              <Pressable
                onPress={() => updatePopupOrder("Cancelled")}
                disabled={popupActionLoading}
                style={styles.popupRejectButton}
              >
                <Ionicons name="close-circle-outline" size={18} color="#C62828" />
                <Text style={styles.popupRejectText}>Reject</Text>
              </Pressable>
              <Pressable
                onPress={() => updatePopupOrder("Accepted")}
                disabled={popupActionLoading}
                style={styles.popupAcceptButton}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.popupAcceptText}>
                  {popupActionLoading ? "Updating..." : "Accept Order"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Earnings Today Card ── */}
        <Pressable
          style={styles.earningsCard}
          onPress={() => router.push("/earnings" as any)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.earningsLabel}>Earnings Today</Text>
            <Text style={styles.earningsAmount}>
              ₹
              {todayEarnings.toLocaleString("en-IN", {
                minimumFractionDigits: 0,
              })}
            </Text>
            <View style={styles.earningsBadgeRow}>
              <View
                style={[
                  styles.earningsBadge,
                  {
                    backgroundColor: todayEarnings >= 0 ? "#E8F5E9" : "#FFEBEE",
                  },
                ]}
              >
                <Ionicons
                  name={todayEarnings >= 0 ? "trending-up" : "trending-down"}
                  size={13}
                  color={todayEarnings >= 0 ? "#2E7A4F" : "#C62828"}
                />
                <Text
                  style={[
                    styles.earningsBadgeText,
                    { color: todayEarnings >= 0 ? "#2E7A4F" : "#C62828" },
                  ]}
                >
                  {todayOrders.length} order
                  {todayOrders.length !== 1 ? "s" : ""} today
                </Text>
              </View>
              <Text style={styles.earningsMeta}>
                Total: ₹{totalEarnings.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
          <View style={{ justifyContent: "center", paddingLeft: 8 }}>
            <Sparkline
              data={
                orders.length > 0
                  ? orders
                      .slice(-8)
                      .map((o) =>
                        Number(o.chef_total_amount ?? o.total_amount ?? 0),
                      )
                  : [0, 5, 3, 8, 6, 12, 9, todayEarnings || 10]
              }
              width={130}
              height={56}
              color="#2E7A4F"
            />
          </View>
        </Pressable>

        <Pressable
          style={styles.featureBanner}
          onPress={() => router.push("/add-dish" as any)}
          accessibilityRole="button"
          accessibilityLabel="Add a new dish"
        >
          <Image
            source={require("../../assets/images/dish_photos_grid.jpg")}
            style={styles.featureBannerImage}
            contentFit="cover"
            contentPosition="right center"
          />
          <View style={styles.featureBannerShade} />
          <View style={styles.featureBannerContent}>
            <Text style={styles.featureBannerEyebrow}>
              YOUR MENU, YOUR STORY
            </Text>
            <Text style={styles.featureBannerTitle}>
              Share what you cook best.
            </Text>
            <Text style={styles.featureBannerCopy}>
              Add a fresh dish and let more customers discover your kitchen.
            </Text>
            <View style={styles.featureBannerButton}>
              <Text style={styles.featureBannerButtonText}>Add a dish</Text>
              <Ionicons name="arrow-forward" size={14} color="#1A3328" />
            </View>
          </View>
        </Pressable>

        {/* ── Today's Overview Card ── */}
        <Pressable
          style={styles.overviewCard}
          onPress={() => router.push("/orders" as any)}
        >
          <Text style={styles.overviewTitle}>Today&apos;s Overview</Text>
          <View style={styles.overviewRow}>
            {STATS.map((s) => (
              <View key={s.label} style={styles.statBox}>
                <View
                  style={[styles.statIconWrap, { backgroundColor: s.tint }]}
                >
                  <Ionicons name={s.icon as any} size={22} color={s.color} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Pressable>

        {/* ── Quick Actions Card ── */}
        <View style={styles.quickCard}>
          <Text style={styles.overviewTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((a) => (
              <Pressable
                key={a.label}
                style={[styles.quickItem, { backgroundColor: a.tint }]}
                onPress={() => router.push(a.route as any)}
              >
                <View
                  style={[
                    styles.quickIconWrap,
                    { backgroundColor: a.color + "22" },
                  ]}
                >
                  <Ionicons name={a.icon as any} size={22} color={a.color} />
                </View>
                <Text style={[styles.quickText, { color: a.color }]}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Recent Orders ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <Pressable onPress={() => router.push("/orders" as any)}>
            <Text style={styles.seeAll}>See all →</Text>
          </Pressable>
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={40} color={colors.muted} />
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        ) : (
          recentOrders.map((order) => {
            const cfg = STATUS_COLOR[order.status] ?? {
              bg: "#F5F5F5",
              text: "#555",
            };
            const items: any[] = Array.isArray(order.items)
              ? order.items
              : (() => {
                  try {
                    return JSON.parse(order.items || "[]");
                  } catch {
                    return [];
                  }
                })();
            const firstImg = items[0]?.image
              ? resolveImageUrl(items[0].image)
              : null;
            const itemNames = items
              .map((i: any) => i.name)
              .filter(Boolean)
              .join(", ");

            return (
              <Pressable
                key={order.id}
                style={styles.orderRow}
                onPress={() => router.push(`/order/${order.id}` as any)}
              >
                {firstImg ? (
                  <Image
                    source={{ uri: firstImg }}
                    style={styles.orderThumb}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.orderThumb, styles.orderThumbFallback]}>
                    <Ionicons
                      name="fast-food-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderCustomer} numberOfLines={1}>
                    {order.customer_name || "Customer"}
                  </Text>
                  <Text style={styles.orderItems} numberOfLines={1}>
                    {itemNames || `#${order.order_id || order.id}`}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <View
                    style={[styles.statusBadge, { backgroundColor: cfg.bg }]}
                  >
                    <Text style={[styles.statusText, { color: cfg.text }]}>
                      {order.status}
                    </Text>
                  </View>
                  <Text style={styles.orderAmt}>
                    ₹
                    {Number(
                      order.chef_total_amount ?? order.total_amount ?? 0,
                    ).toLocaleString("en-IN")}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBackground },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  popupOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
    backgroundColor: "rgba(10, 25, 18, 0.64)",
  },
  popupCard: {
    width: "100%",
    maxWidth: 430,
    padding: 22,
    borderRadius: 28,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
  },
  popupAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: "#F2A23A",
  },
  popupHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  popupHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  popupOrderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1DF",
  },
  popupCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F2",
  },
  popupEyebrow: {
    color: "#E65100",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  popupTitle: {
    marginTop: 4,
    color: colors.primaryDark,
    fontSize: 21,
    fontWeight: "900",
  },
  popupWaitingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: "#F3F8F4",
  },
  popupLiveDot: {
    width: 8,
    height: 8,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: "#2E9B63",
  },
  popupWaitingText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  popupCustomer: {
    marginTop: 18,
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "800",
  },
  popupAddress: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  popupSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  popupSummaryText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  popupAmount: { color: colors.primaryDark, fontSize: 18, fontWeight: "900" },
  popupActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  popupRejectButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C62828",
  },
  popupRejectText: { color: "#C62828", fontSize: 14, fontWeight: "800" },
  popupAcceptButton: {
    flex: 1.5,
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  popupAcceptText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },

  featureBanner: {
    height: 186,
    marginBottom: 16,
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "#1A3328",
    position: "relative",
  },
  featureBannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
  },
  featureBannerShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13, 38, 27, 0.62)",
  },
  featureBannerContent: {
    width: "67%",
    paddingLeft: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  featureBannerEyebrow: {
    color: "#F6C453",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  featureBannerTitle: {
    marginTop: 5,
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "800",
  },
  featureBannerCopy: {
    marginTop: 5,
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 12,
    lineHeight: 17,
  },
  featureBannerButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F6C453",
  },
  featureBannerButtonText: {
    color: "#1A3328",
    fontSize: 12,
    fontWeight: "800",
  },

  // Earnings card
  earningsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 3,
  },
  earningsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.primaryDark,
    marginBottom: 6,
  },
  earningsBadgeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  earningsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  earningsBadgeText: { fontSize: 12, fontWeight: "700" },
  earningsMeta: { fontSize: 12, color: colors.muted },

  // Section headers
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primaryDark,
    marginBottom: 14,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  seeAll: { fontSize: 13, fontWeight: "700", color: colors.primary },

  // Today's Overview card
  overviewCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  overviewTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primaryDark,
    marginBottom: 14,
  },
  overviewRow: { flexDirection: "row", justifyContent: "space-between" },
  statBox: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  statIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statValue: { fontSize: 22, fontWeight: "900", color: colors.primaryDark },
  statLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
    marginTop: 2,
  },

  // Quick Actions card
  quickCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickItem: {
    width: "47%",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: { fontSize: 14, fontWeight: "700" },

  // Orders
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  orderThumb: { width: 48, height: 48, borderRadius: 12 },
  orderThumbFallback: {
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  orderCustomer: { fontSize: 14, fontWeight: "700", color: colors.primaryDark },
  orderItems: { fontSize: 12, color: colors.muted, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  orderAmt: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },

  // Empty
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    gap: 10,
  },
  emptyText: { fontSize: 14, color: colors.muted, fontWeight: "600" },
});
