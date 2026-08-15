import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../api";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";
import TopHeader from "./componets/topheader";

// ── Types ─────────────────────────────────────────────────────────────────────
type OrderStatus = "New" | "Preparing" | "Ready" | "Completed";

interface Order {
  id: string;
  order_id: string;
  status: OrderStatus;
  rawStatus: string;
  customer: string;
  items: number;
  amount: number;
  location: string;
  time: string;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  OrderStatus,
  { color: string; bg: string; label: string }
> = {
  New: { color: "#E65100", bg: "#FFF3E0", label: "New" },
  Preparing: { color: "#1565C0", bg: "#E3F2FD", label: "Preparing" },
  Ready: { color: "#2E7D32", bg: "#E8F5E9", label: "Ready" },
  Completed: { color: "#4A675F", bg: "#ECEFF1", label: "Completed" },
};

const mapStatus = (status: string): OrderStatus => {
  const s = (status || "").toLowerCase();
  if (["pending", "new", "new order", "order placed"].includes(s)) return "New";
  if (["accepted", "preparing"].includes(s)) return "Preparing";
  if (
    [
      "food ready",
      "packing",
      "searching delivery partner",
      "delivery partner assigned",
    ].includes(s)
  )
    return "Ready";
  if (["out for delivery", "delivered", "completed"].includes(s))
    return "Completed";
  return "New";
};

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onAccept,
  onMarkReady,
  onPress,
}: {
  order: Order;
  onAccept?: (id: string) => void;
  onMarkReady?: (id: string) => void;
  onPress?: () => void;
}) {
  const cfg = STATUS_CONFIG[order.status];
  const showAccept = order.status === "New";
  const showStart = order.status === "Preparing";

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        marginBottom: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Top row: status badge + order id + time */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <View
          style={{
            backgroundColor: cfg.bg,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: cfg.color, fontSize: 12, fontWeight: "700" }}>
            {cfg.label}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text
            style={{
              color: colors.primaryDark,
              fontSize: 13,
              fontWeight: "700",
            }}
          >
            #{order.order_id}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {order.time}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View
        style={{
          height: 1,
          backgroundColor: colors.border,
          marginBottom: 12,
        }}
      />

      {/* Customer row */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <View
          style={{
            height: 42,
            width: 42,
            borderRadius: 21,
            backgroundColor: colors.softCard,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name="person" size={20} color={colors.primarySoft} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.primaryDark,
              fontSize: 15,
              fontWeight: "700",
            }}
          >
            {order.customer}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>
            {order.items} {order.items === 1 ? "item" : "items"} · ₹
            {order.amount % 1 === 0 ? order.amount : order.amount.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Location */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: showAccept || showStart ? 14 : 0,
        }}
      >
        <Ionicons name="location-outline" size={14} color={colors.muted} />
        <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 4 }}>
          {order.location}
        </Text>
      </View>

      {/* Action button */}
      {showAccept && (
        <Pressable
          onPress={() => onAccept?.(order.id)}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 14,
            paddingVertical: 13,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
            Accept
          </Text>
        </Pressable>
      )}

      {showStart && (
        <Pressable
          onPress={() => onMarkReady?.(order.id)}
          style={{
            backgroundColor: "#1565C0",
            borderRadius: 14,
            paddingVertical: 13,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
            Mark Ready
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS: OrderStatus[] = ["New", "Preparing", "Ready", "Completed"];

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<OrderStatus>("New");
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  // Optional: you can add a filterSort state here if needed, e.g. "Newest", "Oldest", "Highest Amount"
  const [filterSort, setFilterSort] = useState<"Newest" | "Oldest" | "Highest Amount">("Newest");
  const router = useRouter();

  const fetchOrders = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/user-food-orders/chef");
      const mappedOrders = res.data.map((o: any) => ({
        id: o.id || o._id,
        order_id: o.order_id || o.id || "Unknown",
        status: mapStatus(o.status),
        rawStatus: o.status,
        customer: o.customer_name || "Unknown",
        items:
          o.chef_total_quantity ??
          (o.items?.reduce(
            (sum: number, item: any) => sum + (Number(item.quantity) || 1),
            0,
          ) ||
            0),
        amount: parseFloat((o.chef_total_amount ?? o.total_amount) || 0),
        location:
          o.street_address
            ? `${o.street_address}, ${o.city || ""}`.replace(/,\s*$/, "")
            : o.customer_address || o.delivery_address || "Unknown Location",
        time:
          o.ordered_at || o.created_at
            ? new Date(o.ordered_at || o.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
      }));
      // Optional: Filter out cancelled
      setOrders(
        mappedOrders.filter(
          (o: any) => (o.rawStatus || "").toLowerCase() !== "cancelled",
        ),
      );
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  let filtered = orders.filter((o) => o.status === activeTab);
  
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.customer.toLowerCase().includes(s) ||
        o.order_id.toLowerCase().includes(s) ||
        o.location.toLowerCase().includes(s)
    );
  }

  // Apply sorting
  if (filterSort === "Newest") {
    // Assuming higher ID or time means newer if we don't have exact timestamps to parse reliably
    // In a real app we'd parse o.time or keep a raw date.
    // We'll leave the default order from API for "Newest"
  } else if (filterSort === "Highest Amount") {
    filtered.sort((a, b) => b.amount - a.amount);
  }

  const handleAccept = async (id: string) => {
    try {
      await api.patch(`/user-food-orders/status/${id}`, { status: "Accepted" });
      fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkReady = async (id: string) => {
    try {
      await api.patch(`/user-food-orders/status/${id}`, {
        status: "Food Ready",
      });
      fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      <TopHeader showHero={false} title="Orders" />
      
      {/* Search bar with filter icon */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginHorizontal: 20,
          marginTop: 16,
          backgroundColor: colors.cardBackground,
          borderRadius: 50,
          paddingHorizontal: 14,
          paddingVertical: 10,
          gap: 8,
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search customer, ID, location..."
          placeholderTextColor={colors.muted}
          style={{
            flex: 1,
            fontSize: 14,
            color: colors.primaryDark,
            padding: 0,
          }}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} style={{ marginRight: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
        
        <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 4 }} />
        
        <Pressable onPress={() => setShowFilter(true)} style={{ padding: 4 }}>
          <Ionicons name="options-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>
      {/* ── Tab bar ── */}
      <View style={{ height: 60, marginTop: 12, marginBottom: 10 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            alignItems: "center",
            gap: 8,
          }}
        >
          {TABS.map((tab) => {
            const count = orders.filter((o) => o.status === tab).length;
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 50,
                  backgroundColor: isActive
                    ? colors.primary
                    : colors.cardBackground,
                  shadowColor: "#000",
                  shadowOpacity: isActive ? 0 : 0.05,
                  shadowOffset: { width: 0, height: 1 },
                  shadowRadius: 3,
                  elevation: isActive ? 0 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: isActive ? "#fff" : colors.label,
                  }}
                >
                  {tab}
                </Text>
                {count > 0 && (
                  <View
                    style={{
                      marginLeft: 6,
                      height: 20,
                      minWidth: 20,
                      borderRadius: 10,
                      backgroundColor: isActive
                        ? "rgba(255,255,255,0.28)"
                        : colors.softCard,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 5,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "800",
                        color: isActive ? "#fff" : colors.primary,
                      }}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Order list ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchOrders}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 100,
        }}
      >
        {filtered.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 60,
            }}
          >
            <View
              style={{
                height: 72,
                width: 72,
                borderRadius: 36,
                backgroundColor: colors.softCard,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="receipt-outline" size={32} color={colors.muted} />
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.primaryDark,
              }}
            >
              No {activeTab} Orders
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.muted,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              You have no {activeTab.toLowerCase()} orders right now.
            </Text>
          </View>
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAccept={handleAccept}
              onMarkReady={handleMarkReady}
              onPress={() => router.push(`/order/${order.id}`)}
            />
          ))
        )}
      </ScrollView>

      <BottomBar />

      {/* ── Filter Bottom Sheet Modal ── */}
      <Modal
        visible={showFilter}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilter(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setShowFilter(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.primaryDark }}>
                Sort Orders
              </Text>
              <Pressable onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={24} color={colors.primaryDark} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primaryDark, marginBottom: 12 }}>
              Sort By
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
              {(["Newest", "Oldest", "Highest Amount"] as const).map((sort) => {
                const isActive = filterSort === sort;
                return (
                  <Pressable
                    key={sort}
                    onPress={() => setFilterSort(sort)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: isActive ? colors.primary : colors.softCard,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: isActive ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: isActive ? "#fff" : colors.primaryDark }}>
                      {sort}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setShowFilter(false)}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Apply</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
