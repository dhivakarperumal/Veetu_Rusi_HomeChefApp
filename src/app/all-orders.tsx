import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import api, { getApiErrorMessage } from "../api";
import { hasCachedPageData, usePageCacheState } from "../lib/page-cache";
import { colors } from "../theme/colors";
import PageHeader from "./componets/pageheader";

type AllOrder = {
  id: string;
  orderId: string;
  customer: string;
  status: string;
  quantity: number;
  amount: number;
  location: string;
  orderedAt?: string;
};

const CACHE_KEY = "all-orders.list";

const getStatusColor = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes("cancel")) return "#C62828";
  if (normalized.includes("deliver") || normalized.includes("complete")) {
    return "#2E7D32";
  }
  if (normalized.includes("pending") || normalized.includes("new")) {
    return "#E65100";
  }
  return colors.primary;
};

export default function AllOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = usePageCacheState<AllOrder[]>(CACHE_KEY, []);
  const [loading, setLoading] = useState(() => !hasCachedPageData(CACHE_KEY));
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);
      const response = await api.get("/user-food-orders/chef");
      const data =
        [
          response.data,
          response.data?.orders,
          response.data?.data,
          response.data?.data?.orders,
        ].find(Array.isArray) || [];

      setOrders(
        data.map((order: any, index: number) => {
          const orderedAt = order.ordered_at || order.created_at;
          const quantity =
            order.chef_total_quantity ??
            (order.items?.reduce(
              (sum: number, item: any) => sum + (Number(item.quantity) || 1),
              0,
            ) ||
              0);

          return {
            id: String(
              order.id || order._id || order.order_id || `order-${index}`,
            ),
            orderId: String(order.order_id || order.id || order._id || "—"),
            customer: order.customer_name || "Unknown customer",
            status: String(order.status || "Unknown"),
            quantity,
            amount:
              Number(order.chef_total_amount ?? order.total_amount ?? 0) || 0,
            location: order.street_address
              ? `${order.street_address}, ${order.city || ""}`.replace(
                  /,\s*$/,
                  "",
                )
              : order.customer_address ||
                order.delivery_address ||
                "Location unavailable",
            orderedAt: orderedAt ? String(orderedAt) : undefined,
          };
        }),
      );
    } catch (error) {
      console.error("Could not load all orders:", error);
      setError(
        getApiErrorMessage(error, "Could not load orders. Please retry."),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setOrders]);

  useEffect(() => {
    if (!hasCachedPageData(CACHE_KEY)) {
      const timer = setTimeout(() => void fetchOrders(), 0);
      return () => clearTimeout(timer);
    }
  }, [fetchOrders]);

  const normalizedSearch = search.trim().toLowerCase();
  const availableStatuses = Array.from(
    new Map(
      orders.map((order) => [order.status.toLowerCase(), order.status]),
    ).values(),
  );
  const statusOptions = ["All Status", ...availableStatuses];
  const visibleOrders = orders.filter((order) => {
    const matchesSearch = [
      order.orderId,
      order.customer,
      order.status,
      order.location,
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesStatus =
      statusFilter === "All Status" ||
      order.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      <PageHeader
        title="All Orders"
        onLeftPress={() => router.back()}
        headerBackgroundColor="#2E7A4F"
        headerForegroundColor="#FFFFFF"
        titleFontSize={20}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginHorizontal: 16,
          marginTop: 8,
          marginBottom: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 12,
          backgroundColor: colors.cardBackground,
        }}
      >
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search orders"
          placeholderTextColor={colors.muted}
          style={{ flex: 1, padding: 0, color: colors.primaryDark }}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
        <View
          style={{ width: 1, height: 24, backgroundColor: colors.border }}
        />
        <Pressable
          onPress={() => setShowStatusFilter(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Filter all orders by status. Current filter: ${statusFilter}`}
          style={{ padding: 3, position: "relative" }}
        >
          <Ionicons name="options-outline" size={20} color={colors.primary} />
          {statusFilter !== "All Status" ? (
            <View
              style={{
                position: "absolute",
                top: 1,
                right: 1,
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: colors.primary,
              }}
            />
          ) : null}
        </Pressable>
      </View>

      <Modal
        visible={showStatusFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusFilter(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            onPress={() => setShowStatusFilter(false)}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: "rgba(0,0,0,0.45)",
            }}
          />
          <View
            style={{
              maxHeight: "75%",
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 30,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: colors.pageBackground,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: colors.primaryDark,
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                Filter Orders
              </Text>
              <Pressable
                onPress={() => setShowStatusFilter(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close status filter"
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {statusOptions.map((status) => {
                const isSelected = statusFilter === status;
                const count =
                  status === "All Status"
                    ? orders.length
                    : orders.filter(
                        (order) =>
                          order.status.toLowerCase() === status.toLowerCase(),
                      ).length;
                return (
                  <Pressable
                    key={status}
                    onPress={() => {
                      setStatusFilter(status);
                      setShowStatusFilter(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={{
                      minHeight: 48,
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        color: isSelected ? colors.primary : colors.primaryDark,
                        fontSize: 14,
                        fontWeight: isSelected ? "800" : "600",
                      }}
                    >
                      {status}
                    </Text>
                    <Text
                      style={{
                        minWidth: 30,
                        marginRight: 10,
                        color: colors.muted,
                        fontSize: 12,
                        textAlign: "right",
                      }}
                    >
                      {count}
                    </Text>
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={19}
                      color={isSelected ? colors.primary : colors.muted}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {error && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginHorizontal: 16,
            marginBottom: 12,
            padding: 12,
            borderRadius: 10,
            backgroundColor: "#FFF3E0",
          }}
        >
          <Ionicons name="warning-outline" size={18} color="#E65100" />
          <Text style={{ flex: 1, color: "#A63F00", fontSize: 13 }}>
            {error}
          </Text>
          <Pressable onPress={() => void fetchOrders()} hitSlop={8}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              Retry
            </Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void fetchOrders()}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        >
          <Text
            style={{
              marginBottom: 10,
              color: colors.muted,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {visibleOrders.length}{" "}
            {visibleOrders.length === 1 ? "order" : "orders"}
          </Text>

          {visibleOrders.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 56 }}>
              <Ionicons name="receipt-outline" size={42} color={colors.muted} />
              <Text
                style={{
                  marginTop: 12,
                  color: colors.primaryDark,
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                {error
                  ? "Orders are unavailable"
                  : normalizedSearch || statusFilter !== "All Status"
                    ? "No matching orders"
                    : "No orders yet"}
              </Text>
            </View>
          ) : (
            visibleOrders.map((order) => {
              const statusColor = getStatusColor(order.status);
              const orderDate = order.orderedAt
                ? new Date(order.orderedAt)
                : null;
              const dateLabel =
                orderDate && !Number.isNaN(orderDate.getTime())
                  ? orderDate.toLocaleString([], {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Date unavailable";

              return (
                <Pressable
                  key={order.id}
                  onPress={() => router.push(`/order/${order.id}`)}
                  style={{
                    marginBottom: 10,
                    padding: 14,
                    borderRadius: 10,
                    backgroundColor: colors.cardBackground,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        color: colors.primaryDark,
                        fontSize: 14,
                        fontWeight: "700",
                      }}
                    >
                      #{order.orderId}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: `${statusColor}18`,
                      }}
                    >
                      <Text
                        style={{
                          color: statusColor,
                          fontSize: 11,
                          fontWeight: "700",
                        }}
                      >
                        {order.status}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      marginTop: 8,
                      color: colors.primaryDark,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {order.customer}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <Text
                      style={{ flex: 1, color: colors.muted, fontSize: 12 }}
                    >
                      {order.quantity} {order.quantity === 1 ? "item" : "items"}
                      {" · "}
                      {dateLabel}
                    </Text>
                    <Text
                      style={{
                        color: colors.primaryDark,
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      ₹{order.amount.toFixed(2)}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 8,
                    }}
                  >
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={colors.muted}
                    />
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        marginLeft: 5,
                        color: colors.muted,
                        fontSize: 12,
                      }}
                    >
                      {order.location}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.muted}
                    />
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}
