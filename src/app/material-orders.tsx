import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import api from "../api";
import PageHeader from "../components/pageheader";
import { formatCurrencyAmount } from "../lib/format-currency";
import { getMaterialImage } from "../lib/materials-store";
import { hasCachedPageData, usePageCacheState } from "../lib/page-cache";

const GREEN = "#2E7A4F";
const DARK = "#214D38";
const MUTED = "#5A7A6E";

const getOrderItemImage = (item: any) =>
  getMaterialImage({
    ...item,
    images:
      item?.images ??
      item?.image ??
      item?.image_url ??
      item?.product?.images ??
      item?.product?.image,
  });

export default function MaterialOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = usePageCacheState<any[]>(
    "material-orders.list",
    [],
  );
  const [loading, setLoading] = useState(
    () => !hasCachedPageData("material-orders.list"),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await api.get("/orders/myorders");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setOrders(data);
    } catch (error) {
      console.error("Could not load material orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hasCachedPageData("material-orders.list")) {
      const timer = setTimeout(() => void fetchOrders(), 0);
      return () => clearTimeout(timer);
    }
  }, [fetchOrders]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F6F1" }}>
      <PageHeader
        title="My Material Orders"
        onLeftPress={() => router.back()}
        headerBackgroundColor={GREEN}
        headerForegroundColor="#FFFFFF"
        titleFontSize={18}
      />
      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchOrders(true)}
            />
          }
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        >
          {orders.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 90 }}>
              <Ionicons name="receipt-outline" size={52} color={GREEN} />
              <Text style={{ marginTop: 12, color: MUTED }}>
                No material orders yet
              </Text>
            </View>
          ) : (
            orders.map((order, index) => (
              <Pressable
                key={order.id || order.order_id || index}
                onPress={() => setSelectedOrder(order)}
                accessibilityRole="button"
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{ fontSize: 16, fontWeight: "800", color: DARK }}
                  >
                    Order #
                    {String(order.order_id || order.id || "-")
                      .replace(/\D/g, "")
                      .slice(-3) || "-"}
                  </Text>
                  <Text style={{ color: GREEN, fontWeight: "800" }}>
                    ₹ {formatCurrencyAmount(order.total_amount || 0)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 8,
                      backgroundColor: "#F1F5F2",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {order.items?.[0] ? (
                      <Image
                        source={{ uri: getOrderItemImage(order.items[0]) }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    ) : (
                      <Ionicons name="image-outline" size={22} color={MUTED} />
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: MUTED, fontSize: 12 }}>
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString()
                        : "Recent order"}
                    </Text>
                    <Text style={{ marginTop: 5, color: DARK }}>
                      {order.items?.length || 0} material item(s)
                    </Text>
                    <Text
                      style={{
                        marginTop: 5,
                        color: MUTED,
                        textTransform: "capitalize",
                      }}
                    >
                      Status: {order.status || "pending"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
      <Modal
        visible={Boolean(selectedOrder)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedOrder(null)}>
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  maxHeight: "85%",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  padding: 20,
                  backgroundColor: "#F8F6F1",
                }}
              >
                <View style={{ alignItems: "center", marginBottom: 14 }}>
                  <View
                    style={{
                      width: 42,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: "#C5D4CB",
                    }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{ fontSize: 21, fontWeight: "800", color: DARK }}
                  >
                    Order #
                    {String(selectedOrder?.order_id || selectedOrder?.id || "-")
                      .replace(/\D/g, "")
                      .slice(-3) || "-"}
                  </Text>
                  <Pressable onPress={() => setSelectedOrder(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={26} color={MUTED} />
                  </Pressable>
                </View>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <Text style={{ marginTop: 6, color: MUTED }}>
                    {selectedOrder?.created_at
                      ? new Date(selectedOrder.created_at).toLocaleString()
                      : "Recent order"}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 16,
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: "#fff",
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 11, color: MUTED }}>STATUS</Text>
                      <Text
                        style={{
                          marginTop: 4,
                          fontWeight: "800",
                          color: GREEN,
                          textTransform: "capitalize",
                        }}
                      >
                        {selectedOrder?.status || "pending"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 11, color: MUTED }}>
                        PAYMENT
                      </Text>
                      <Text
                        style={{ marginTop: 4, fontWeight: "800", color: DARK }}
                      >
                        {selectedOrder?.payment_method || "Online Payment"}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      marginTop: 18,
                      fontSize: 16,
                      fontWeight: "800",
                      color: DARK,
                    }}
                  >
                    Delivery address
                  </Text>
                  <Text style={{ marginTop: 8, lineHeight: 21, color: MUTED }}>
                    {[
                      selectedOrder?.customer_name,
                      selectedOrder?.street_address,
                      selectedOrder?.city,
                      selectedOrder?.district,
                      selectedOrder?.state,
                      selectedOrder?.zip_code,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Address unavailable"}
                  </Text>
                  <Text
                    style={{
                      marginTop: 18,
                      fontSize: 16,
                      fontWeight: "800",
                      color: DARK,
                    }}
                  >
                    Items
                  </Text>
                  {(selectedOrder?.items || []).map(
                    (item: any, itemIndex: number) => (
                      <View
                        key={item.id || item.product_id || itemIndex}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 11,
                          borderBottomWidth: 1,
                          borderBottomColor: "#E2EDE7",
                        }}
                      >
                        <Image
                          source={{ uri: getOrderItemImage(item) }}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 7,
                            backgroundColor: "#F1F5F2",
                          }}
                          contentFit="cover"
                        />
                        <Text
                          style={{ flex: 1, marginHorizontal: 10, color: DARK }}
                        >
                          {item.name ||
                            item.product_name ||
                            `Material ${itemIndex + 1}`}{" "}
                          x{item.quantity || 1}
                        </Text>
                        <Text style={{ fontWeight: "700", color: GREEN }}>
                          ₹ {formatCurrencyAmount(item.price || 0)}
                        </Text>
                      </View>
                    ),
                  )}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 18,
                    }}
                  >
                    <Text
                      style={{ fontSize: 17, fontWeight: "800", color: DARK }}
                    >
                      Total
                    </Text>
                    <Text
                      style={{ fontSize: 18, fontWeight: "800", color: GREEN }}
                    >
                      ₹ {formatCurrencyAmount(selectedOrder?.total_amount || 0)}
                    </Text>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
