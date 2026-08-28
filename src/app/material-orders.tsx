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
    TouchableWithoutFeedback,
    View,
} from "react-native";
import api from "../api";
import BottomBar from "./componets/buttombar";
import PageHeader from "./componets/pageheader";

const GREEN = "#2E7A4F";
const DARK = "#214D38";
const MUTED = "#5A7A6E";

export default function MaterialOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    fetchOrders();
  }, [fetchOrders]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F6F1" }}>
      <PageHeader
        title="My Material Orders"
        onLeftPress={() => router.back()}
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
                    Order #{order.order_id || order.id || "-"}
                  </Text>
                  <Text style={{ color: GREEN, fontWeight: "800" }}>
                    Rs. {Number(order.total_amount || 0).toFixed(2)}
                  </Text>
                </View>
                <Text style={{ marginTop: 8, color: MUTED }}>
                  {order.created_at
                    ? new Date(order.created_at).toLocaleDateString()
                    : "Recent order"}
                </Text>
                <Text style={{ marginTop: 5, color: DARK }}>
                  {order.items?.length || 0} material item(s)
                </Text>
                <Text
                  style={{
                    marginTop: 8,
                    color: MUTED,
                    textTransform: "capitalize",
                  }}
                >
                  Status: {order.status || "pending"}
                </Text>
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
                    Order #{selectedOrder?.order_id || selectedOrder?.id || "-"}
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
                          justifyContent: "space-between",
                          paddingVertical: 11,
                          borderBottomWidth: 1,
                          borderBottomColor: "#E2EDE7",
                        }}
                      >
                        <Text style={{ flex: 1, color: DARK }}>
                          {item.name ||
                            item.product_name ||
                            `Material ${itemIndex + 1}`}{" "}
                          x{item.quantity || 1}
                        </Text>
                        <Text style={{ fontWeight: "700", color: GREEN }}>
                          Rs. {item.price || 0}
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
                      Rs. {Number(selectedOrder?.total_amount || 0).toFixed(2)}
                    </Text>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <BottomBar />
    </View>
  );
}
