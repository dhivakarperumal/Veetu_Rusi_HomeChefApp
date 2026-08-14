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

// ── Types ─────────────────────────────────────────────────────────────────────
type OrderStatus = "New" | "Preparing" | "Ready" | "Completed";

interface Order {
  id: string;
  status: OrderStatus;
  customer: string;
  items: number;
  amount: number;
  location: string;
  time: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const ORDERS: Order[] = [
  {
    id: "ORD1234",
    status: "New",
    customer: "Ramesh Kumar",
    items: 2,
    amount: 280,
    location: "Anna Nagar, Chennai",
    time: "10:30 AM",
  },
  {
    id: "ORD1235",
    status: "New",
    customer: "Priya S",
    items: 1,
    amount: 150,
    location: "Kilpauk, Chennai",
    time: "10:28 AM",
  },
  {
    id: "ORD1232",
    status: "Preparing",
    customer: "Sangeetha",
    items: 3,
    amount: 410,
    location: "T.Nagar, Chennai",
    time: "10:15 AM",
  },
  {
    id: "ORD1230",
    status: "Ready",
    customer: "Karthik",
    items: 2,
    amount: 230,
    location: "Vadapalani, Chennai",
    time: "09:50 AM",
  },
  {
    id: "ORD1228",
    status: "Completed",
    customer: "Deepa M",
    items: 4,
    amount: 560,
    location: "Mylapore, Chennai",
    time: "09:20 AM",
  },
  {
    id: "ORD1227",
    status: "Completed",
    customer: "Arjun R",
    items: 2,
    amount: 320,
    location: "Adyar, Chennai",
    time: "09:00 AM",
  },
];

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  OrderStatus,
  { color: string; bg: string; label: string }
> = {
  New:       { color: "#E65100", bg: "#FFF3E0", label: "New" },
  Preparing: { color: "#1565C0", bg: "#E3F2FD", label: "Preparing" },
  Ready:     { color: "#2E7D32", bg: "#E8F5E9", label: "Ready" },
  Completed: { color: "#4A675F", bg: "#ECEFF1", label: "Completed" },
};

// ── Tab counts ────────────────────────────────────────────────────────────────
function countByStatus(status: OrderStatus) {
  return ORDERS.filter((o) => o.status === status).length;
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onAccept,
}: {
  order: Order;
  onAccept?: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[order.status];
  const showAccept = order.status === "New";
  const showStart  = order.status === "Preparing";

  return (
    <View
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
            style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "700" }}
          >
            #{order.id}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{order.time}</Text>
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
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
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
            {order.items} {order.items === 1 ? "item" : "items"} · ₹{order.amount}
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
        <Text
          style={{ color: colors.muted, fontSize: 12, marginLeft: 4 }}
        >
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
          <Text
            style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}
          >
            Accept
          </Text>
        </Pressable>
      )}

      {showStart && (
        <Pressable
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
    </View>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS: OrderStatus[] = ["New", "Preparing", "Ready", "Completed"];

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<OrderStatus>("New");
  const [orders, setOrders] = useState<Order[]>(ORDERS);

  const filtered = orders.filter((o) => o.status === activeTab);

  const handleAccept = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "Preparing" as OrderStatus } : o))
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      {/* ── Page Header ── */}
      <SafeAreaView
        edges={["top"]}
        style={{ backgroundColor: colors.pageBackground }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 14,
          }}
        >
          <Text
            style={{
              fontSize: 26,
              fontWeight: "800",
              color: colors.primaryDark,
            }}
          >
            Orders
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* Search */}
            <Pressable
              style={{
                height: 40,
                width: 40,
                borderRadius: 20,
                backgroundColor: colors.cardBackground,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Ionicons name="search-outline" size={20} color={colors.primaryDark} />
            </Pressable>

            {/* Filter */}
            <Pressable
              style={{
                height: 40,
                width: 40,
                borderRadius: 20,
                backgroundColor: colors.cardBackground,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Ionicons name="options-outline" size={20} color={colors.primaryDark} />
            </Pressable>
          </View>
        </View>

        {/* ── Tab bar ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 14,
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
                  backgroundColor: isActive ? colors.primary : colors.cardBackground,
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
      </SafeAreaView>

      {/* ── Order list ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
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
            />
          ))
        )}
      </ScrollView>

      <BottomBar />
    </View>
  );
}
