import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
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
              <View
                key={order.id || order.order_id || index}
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
              </View>
            ))
          )}
        </ScrollView>
      )}
      <BottomBar />
    </View>
  );
}
