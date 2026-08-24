import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import api, { getApiErrorMessage, isNewOrderStatus } from "../api";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";
import TopHeader from "./componets/topheader";

// ── Types ─────────────────────────────────────────────────────────────────────
type OrderStatus = "New" | "Preparing" | "Ready" | "Completed" | "Cancelled";
type OrderTab =
  | OrderStatus
  | "All Status"
  | "Packing"
  | "Searching Delivery Partner"
  | "Delivery Partner Assigned"
  | "Cancelled";

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
  cancellationReason?: string;
  cancellationNotes?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  deliveryPartnerVehicle?: string;
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
  Cancelled: { color: "#C62828", bg: "#FFEBEE", label: "Cancelled" },
};

const mapStatus = (status: string): OrderStatus => {
  const s = (status || "").toLowerCase();
  if (["cancelled", "canceled"].includes(s)) return "Cancelled";
  if (isNewOrderStatus(s)) return "New";
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
  onReject,
  onMarkReady,
  onStatusUpdate,
  onPress,
  busy = false,
}: {
  order: Order;
  onAccept?: (id: string) => void;
  onReject?: (order: Order) => void;
  onMarkReady?: (id: string) => void;
  onStatusUpdate?: (id: string, status: string) => void;
  onPress?: () => void;
  busy?: boolean;
}) {
  const cfg = STATUS_CONFIG[order.status];
  const rawStatus = (order.rawStatus || "").toLowerCase();
  const showAccept = order.status === "New";
  const showStart = order.status === "Preparing";
  const nextStatus =
    rawStatus === "food ready" || rawStatus === "ready"
      ? { label: "Start Packing", status: "Packing" }
      : rawStatus === "packing"
        ? {
            label: "Find Delivery Partner",
            status: "Searching Delivery Partner",
          }
        : rawStatus === "searching delivery partner"
          ? { label: "Partner Accepted", status: "Delivery Partner Assigned" }
          : null;

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
          marginBottom: showAccept || showStart || nextStatus ? 14 : 0,
        }}
      >
        <Ionicons name="location-outline" size={14} color={colors.muted} />
        <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 4 }}>
          {order.location}
        </Text>
      </View>

      {order.status === "Cancelled" &&
        (order.cancellationReason || order.cancellationNotes) && (
          <View
            style={{
              marginTop: 12,
              marginBottom: 2,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#FFD7D7",
              backgroundColor: "#FFF7F7",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="information-circle-outline" size={16} color="#C62828" />
              <Text style={{ color: "#A52A2A", fontSize: 12, fontWeight: "800" }}>
                Cancellation reason
              </Text>
            </View>
            {order.cancellationReason && (
              <Text style={{ marginTop: 5, color: "#4A3535", fontSize: 13, fontWeight: "700" }}>
                {order.cancellationReason}
              </Text>
            )}
            {order.cancellationNotes && (
              <Text style={{ marginTop: 3, color: "#765F5F", fontSize: 12, lineHeight: 18 }}>
                {order.cancellationNotes}
              </Text>
            )}
          </View>
        )}

      {/* Action button */}
      {showAccept && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => onReject?.(order)}
            disabled={busy}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#C62828",
              borderRadius: 14,
              paddingVertical: 13,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#C62828", fontSize: 15, fontWeight: "700" }}>
              Reject
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onAccept?.(order.id)}
            disabled={busy}
            style={{
              flex: 1.5,
              backgroundColor: colors.primary,
              borderRadius: 14,
              paddingVertical: 13,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
              {busy ? "Accepting..." : "Accept Order"}
            </Text>
          </Pressable>
        </View>
      )}

      {showStart && (
        <Pressable
          onPress={() => onMarkReady?.(order.id)}
          disabled={busy}
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

      {nextStatus && (
        <Pressable
          onPress={() => onStatusUpdate?.(order.id, nextStatus.status)}
          disabled={busy}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 14,
            paddingVertical: 13,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
            {nextStatus.label}
          </Text>
        </Pressable>
      )}

      {rawStatus === "delivery partner assigned" &&
        (order.deliveryPartnerName ||
          order.deliveryPartnerPhone ||
          order.deliveryPartnerVehicle) && (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: colors.softCard,
            }}
          >
            <Text
              style={{
                color: colors.primaryDark,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              Delivery Partner
            </Text>
            {order.deliveryPartnerName && (
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                {order.deliveryPartnerName}
              </Text>
            )}
            {order.deliveryPartnerPhone && (
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                {order.deliveryPartnerPhone}
              </Text>
            )}
            {order.deliveryPartnerVehicle && (
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                {order.deliveryPartnerVehicle}
              </Text>
            )}
          </View>
        )}
    </Pressable>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS: OrderTab[] = [
  "All Status",
  "New",
  "Preparing",
  "Ready",
  "Packing",
  "Searching Delivery Partner",
  "Delivery Partner Assigned",
  "Cancelled",
  "Completed",
];

const matchesTab = (order: Order, tab: OrderTab) => {
  if (tab === "All Status") return true;
  if (
    tab === "Packing" ||
    tab === "Searching Delivery Partner" ||
    tab === "Delivery Partner Assigned"
  ) {
    return (order.rawStatus || "").toLowerCase() === tab.toLowerCase();
  }
  if (tab === "Cancelled") return order.status === "Cancelled";
  return order.status === tab;
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<OrderTab>("All Status");
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  // Optional: you can add a filterSort state here if needed, e.g. "Newest", "Oldest", "Highest Amount"
  const [filterSort, setFilterSort] = useState<
    "Newest" | "Oldest" | "Highest Amount"
  >("Newest");
  const [actionId, setActionId] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNotes, setCancelNotes] = useState("");
  const [showReasons, setShowReasons] = useState(false);
  const router = useRouter();

  const cancellationReasons = [
    "Item unavailable",
    "Too busy to prepare",
    "Delivery issue",
    "Customer request",
    "Other",
  ];

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
        location: o.street_address
          ? `${o.street_address}, ${o.city || ""}`.replace(/,\s*$/, "")
          : o.customer_address || o.delivery_address || "Unknown Location",
        cancellationReason:
          o.cancellation_reason || o.cancel_reason || o.cancellationReason || "",
        cancellationNotes:
          o.cancellation_notes || o.cancel_notes || o.cancellationNotes || "",
        deliveryPartnerName:
          o.delivery_partner_name ||
          o.deliveryPartner?.name ||
          o.delivery_partner?.name,
        deliveryPartnerPhone:
          o.delivery_partner_phone ||
          o.deliveryPartner?.phone ||
          o.delivery_partner?.phone,
        deliveryPartnerVehicle:
          o.delivery_partner_vehicle ||
          o.deliveryPartner?.vehicle ||
          o.delivery_partner?.vehicle,
        time:
          o.ordered_at || o.created_at
            ? new Date(o.ordered_at || o.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
      }));
      setOrders(mappedOrders);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  let filtered = orders.filter((o) => matchesTab(o, activeTab));

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.customer.toLowerCase().includes(s) ||
        o.order_id.toLowerCase().includes(s) ||
        o.location.toLowerCase().includes(s),
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
    if (actionId) return;
    setActionId(id);
    try {
      await api.patch(`/user-food-orders/status/${id}`, { status: "Accepted" });
      await fetchOrders();
    } catch (error) {
      Alert.alert("Could not accept order", getApiErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const openCancelModal = (order: Order) => {
    setCancelOrder(order);
    setCancelReason("");
    setCancelNotes("");
    setShowReasons(false);
  };

  const closeCancelModal = () => {
    if (actionId) return;
    setCancelOrder(null);
    setShowReasons(false);
  };

  const handleCancelOrder = async () => {
    if (!cancelOrder || !cancelReason || actionId) return;
    setActionId(cancelOrder.id);
    try {
      await api.patch(`/user-food-orders/status/${cancelOrder.id}`, {
        status: "Cancelled",
        cancellation_reason: cancelReason,
        cancellation_notes: cancelNotes.trim() || undefined,
      });
      closeCancelModal();
      await fetchOrders();
    } catch (error) {
      Alert.alert("Could not cancel order", getApiErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const handleMarkReady = async (id: string) => {
    if (actionId) return;
    setActionId(id);
    try {
      await api.patch(`/user-food-orders/status/${id}`, {
        status: "Food Ready",
      });
      await fetchOrders();
    } catch (error) {
      Alert.alert("Could not update order", getApiErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (actionId) return;
    setActionId(id);
    try {
      await api.patch(`/user-food-orders/status/${id}`, { status });
      await fetchOrders();
    } catch (error) {
      Alert.alert("Could not update order", getApiErrorMessage(error));
    } finally {
      setActionId(null);
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

        <View
          style={{
            width: 1,
            height: 24,
            backgroundColor: colors.border,
            marginHorizontal: 4,
          }}
        />

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
            const count = orders.filter((o) => matchesTab(o, tab)).length;
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
              onReject={openCancelModal}
              onMarkReady={handleMarkReady}
              onStatusUpdate={handleStatusUpdate}
              busy={actionId === order.id}
              onPress={() => router.push(`/order/${order.id}`)}
            />
          ))
        )}
      </ScrollView>

      <BottomBar />

      <Modal
        visible={Boolean(cancelOrder)}
        transparent
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <Pressable style={styles.cancelOverlay} onPress={closeCancelModal}>
          <Pressable style={styles.cancelCard} onPress={() => undefined}>
            <View style={styles.cancelHeader}>
              <View style={styles.cancelTitleRow}>
                <View style={styles.cancelIcon}>
                  <Ionicons name="close-circle" size={28} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.cancelTitle}>Cancel Order</Text>
                  <Text style={styles.cancelOrderId}>
                    #{cancelOrder?.order_id}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={closeCancelModal}
                disabled={Boolean(actionId)}
                style={styles.cancelClose}
              >
                <Ionicons name="close" size={21} color="#52645B" />
              </Pressable>
            </View>

            <View style={styles.cancelWarning}>
              <Ionicons name="warning-outline" size={22} color="#B26A00" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelWarningTitle}>
                  Are you sure you want to cancel this order?
                </Text>
                <Text style={styles.cancelWarningText}>
                  This action cannot be undone. Select a cancellation reason
                  before continuing.
                </Text>
              </View>
            </View>

            <Text style={styles.cancelLabel}>
              Cancellation Reason <Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              onPress={() => setShowReasons((visible) => !visible)}
              disabled={Boolean(actionId)}
              style={styles.reasonSelect}
            >
              <Text
                style={[
                  styles.reasonText,
                  !cancelReason && styles.reasonPlaceholder,
                ]}
              >
                {cancelReason || "Select a reason..."}
              </Text>
              <Ionicons
                name={showReasons ? "chevron-up" : "chevron-down"}
                size={19}
                color="#283A33"
              />
            </Pressable>
            {showReasons && (
              <View style={styles.reasonMenu}>
                {cancellationReasons.map((reason) => (
                  <Pressable
                    key={reason}
                    onPress={() => {
                      setCancelReason(reason);
                      setShowReasons(false);
                    }}
                    style={styles.reasonOption}
                  >
                    <Text style={styles.reasonOptionText}>{reason}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.cancelLabel}>
              Additional Notes <Text style={styles.optional}>(Optional)</Text>
            </Text>
            <TextInput
              value={cancelNotes}
              onChangeText={setCancelNotes}
              editable={!actionId}
              multiline
              numberOfLines={3}
              placeholder="Provide any extra details about this cancellation..."
              placeholderTextColor="#8A9691"
              style={styles.notesInput}
              textAlignVertical="top"
            />

            <View style={styles.cancelActions}>
              <Pressable
                onPress={closeCancelModal}
                disabled={Boolean(actionId)}
                style={styles.keepButton}
              >
                <Text style={styles.keepButtonText}>No, Keep Order</Text>
              </Pressable>
              <Pressable
                onPress={handleCancelOrder}
                disabled={!cancelReason || Boolean(actionId)}
                style={[
                  styles.confirmCancelButton,
                  (!cancelReason || actionId) && styles.confirmCancelDisabled,
                ]}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.confirmCancelText}>
                  {actionId ? "Cancelling..." : "Yes, Cancel Order"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Filter Bottom Sheet Modal ── */}
      <Modal
        visible={showFilter}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilter(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: colors.primaryDark,
                }}
              >
                Sort Orders
              </Text>
              <Pressable onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={24} color={colors.primaryDark} />
              </Pressable>
            </View>

            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: colors.primaryDark,
                marginBottom: 12,
              }}
            >
              Sort By
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 24,
              }}
            >
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
                      backgroundColor: isActive
                        ? colors.primary
                        : colors.softCard,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: isActive ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: isActive ? "#fff" : colors.primaryDark,
                      }}
                    >
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
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                Apply
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = {
  cancelOverlay: {
    flex: 1,
    justifyContent: "center" as const,
    padding: 18,
    backgroundColor: "rgba(7, 13, 10, 0.72)",
  },
  cancelCard: {
    width: "100%" as const,
    maxWidth: 440,
    alignSelf: "center" as const,
    overflow: "hidden" as const,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 12,
  },
  cancelHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: 20,
    backgroundColor: "#FFF6F6",
    borderBottomWidth: 1,
    borderBottomColor: "#F3E5E5",
  },
  cancelTitleRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
  cancelIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#F32632",
    shadowColor: "#F32632",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
  cancelTitle: { color: "#202522", fontSize: 21, fontWeight: "800" as const },
  cancelOrderId: { marginTop: 3, color: "#8A8F8C", fontSize: 13 },
  cancelClose: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#F3F4F3",
  },
  cancelWarning: {
    flexDirection: "row" as const,
    gap: 12,
    margin: 20,
    marginBottom: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: "#FFD273",
    borderRadius: 15,
    backgroundColor: "#FFF9E8",
  },
  cancelWarningTitle: { color: "#A76100", fontSize: 15, fontWeight: "800" as const, lineHeight: 21 },
  cancelWarningText: { marginTop: 5, color: "#A84F1C", fontSize: 13, lineHeight: 20 },
  cancelLabel: { marginHorizontal: 20, marginBottom: 8, color: "#37434C", fontSize: 15, fontWeight: "800" as const },
  required: { color: "#E53935" },
  optional: { color: "#9AA29E", fontWeight: "500" as const },
  reasonSelect: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginHorizontal: 20,
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#DDE3E0",
    borderRadius: 13,
    backgroundColor: "#FBFCFB",
  },
  reasonText: { color: "#283A33", fontSize: 15 },
  reasonPlaceholder: { color: "#697570" },
  reasonMenu: { marginHorizontal: 20, marginTop: 5, borderWidth: 1, borderColor: "#DDE3E0", borderRadius: 12, backgroundColor: "#FFFFFF" },
  reasonOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EEF2EF" },
  reasonOptionText: { color: "#283A33", fontSize: 14 },
  notesInput: { marginHorizontal: 20, minHeight: 88, padding: 14, borderWidth: 1, borderColor: "#DDE3E0", borderRadius: 13, color: "#283A33", fontSize: 14, backgroundColor: "#FBFCFB" },
  cancelActions: { flexDirection: "row" as const, gap: 12, marginTop: 24, padding: 20, borderTopWidth: 1, borderTopColor: "#EEF1EF" },
  keepButton: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, minHeight: 56, paddingHorizontal: 10, borderWidth: 1, borderColor: "#DDE3E0", borderRadius: 14 },
  keepButtonText: { color: "#1D3D30", fontSize: 14, fontWeight: "800" as const },
  confirmCancelButton: { flex: 1.35, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 6, minHeight: 56, borderRadius: 14, backgroundColor: "#F2767B" },
  confirmCancelDisabled: { opacity: 0.5 },
  confirmCancelText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" as const },
};
