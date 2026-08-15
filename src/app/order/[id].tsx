import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import api, { API_BASE_URL } from "../../api";

const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const resolveImageUrl = (path: string) => {
  if (!path) return path;
  let resolvedPath = path;
  if (path.includes("localhost:5000")) {
    resolvedPath = path.replace(/https?:\/\/localhost:5000/g, IMAGE_BASE_URL);
  } else if (path.includes("127.0.0.1:5000")) {
    resolvedPath = path.replace(/https?:\/\/127.0.0.1:5000/g, IMAGE_BASE_URL);
  }
  if (resolvedPath.startsWith("http")) return resolvedPath;
  return resolvedPath.startsWith("/")
    ? `${IMAGE_BASE_URL}${resolvedPath}`
    : `${IMAGE_BASE_URL}/${resolvedPath}`;
};

const getProductImage = (item: any) => {
  try {
    if (item.image) {
      let imgs = item.image;
      if (typeof imgs === 'string') {
        try {
          const parsed = JSON.parse(imgs);
          if (typeof parsed === 'string') {
            imgs = JSON.parse(parsed); // Handle double stringified
          } else {
            imgs = parsed;
          }
        } catch {
          if (imgs.includes('/') || imgs.includes('.')) {
             return resolveImageUrl(imgs);
          }
        }
      }
      if (Array.isArray(imgs) && imgs.length > 0 && imgs[0]) {
        return resolveImageUrl(imgs[0]);
      }
    }
  } catch (e) {
    console.error('Error parsing images:', e);
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'P')}&background=10b981&color=fff&size=400`;
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  New:       { color: "#E65100", bg: "#FFF3E0" },
  Preparing: { color: "#1565C0", bg: "#E3F2FD" },
  Ready:     { color: "#2E7D32", bg: "#E8F5E9" },
  Completed: { color: "#4A675F", bg: "#ECEFF1" },
};

const mapStatus = (status: string) => {
  const s = (status || "").toLowerCase();
  if (["pending", "new", "new order", "order placed"].includes(s)) return "New";
  if (["accepted", "preparing"].includes(s)) return "Preparing";
  if (["food ready", "packing", "searching delivery partner", "delivery partner assigned"].includes(s)) return "Ready";
  if (["out for delivery", "delivered", "completed"].includes(s)) return "Completed";
  return "New";
};

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
  );
}

// ── Section Title ─────────────────────────────────────────────────────────────
function SectionTitle({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 14,
        fontWeight: "700",
        color: colors.primaryDark,
        marginBottom: 12,
      }}
    >
      {title}
    </Text>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function OrderDetailScreen() {
  const router  = useRouter();
  const { id }  = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      // Try to fetch specific order if endpoint exists, otherwise fallback to finding from chef orders list
      let foundOrder = null;
      try {
         const res = await api.get(`/user-food-orders/${id}`);
         if (res.data && res.data.id) foundOrder = res.data;
      } catch (e) {
         // fallback if single order endpoint requires different auth or path
      }

      if (!foundOrder) {
         const res = await api.get("/user-food-orders/chef");
         foundOrder = res.data.find((o: any) => String(o.id) === String(id) || String(o._id) === String(id));
      }

      setOrder(foundOrder);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.pageBackground }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.pageBackground }}>
        <Text style={{ color: colors.muted, fontSize: 16 }}>Order not found.</Text>
      </View>
    );
  }

  const uiStatus   = mapStatus(order.status);
  const cfg        = STATUS_CONFIG[uiStatus] ?? STATUS_CONFIG["New"];
  
  // Calculate totals gracefully
  const parsedItems = Array.isArray(order.items) ? order.items : [];
  const itemTotal  = parsedItems.reduce((s: number, i: any) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
  // We use chef_total_amount if available, otherwise total_amount
  const grandTotal = Number(order.chef_total_amount ?? order.total_amount ?? itemTotal);
  
  // Platform fees / Delivery are typically handled by franchise, but we display if backend provided them
  const deliveryCharge = Number(order.delivery_charge || 0);
  const platformFee = Number(order.platform_fee || 0);

  const isNew      = uiStatus === "New";
  const addressString = order.street_address ? `${order.street_address}\n${order.city}, ${order.state}` : (order.customer_address || "Unknown Address");
  
  const displayTime = order.delivery_time ? order.delivery_time : (order.ordered_at ? new Date(order.ordered_at).toLocaleTimeString() : "");
  const displayDate = order.delivery_date ? order.delivery_date : (order.ordered_at ? new Date(order.ordered_at).toLocaleDateString() : "");

  const handleAccept = async () => {
    try {
      await api.patch(`/user-food-orders/status/${id}`, { status: "Accepted" });
      Alert.alert("Order Accepted", `#${order.order_id || id} has been accepted!`);
      router.back();
    } catch (err) {
      Alert.alert("Error", "Could not accept order.");
    }
  };

  const handleReject = () => {
    Alert.alert(
      "Reject Order",
      "Are you sure you want to reject this order?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reject", style: "destructive", onPress: async () => {
            try {
              await api.patch(`/user-food-orders/status/${id}`, { status: "Cancelled" });
              router.back();
            } catch (err) {
              Alert.alert("Error", "Could not reject order.");
            }
        }},
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      {/* ── Header ── */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.pageBackground }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{ marginRight: 12, padding: 4 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primaryDark} />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.primaryDark, flex: 1, textAlign: "center", marginRight: 36 }}>
            Order Details
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 4 }}
      >
        {/* ── Order ID row ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.primaryDark }}>
              #{order.order_id || order.id}
            </Text>
            <View style={{ backgroundColor: cfg.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: cfg.color, fontSize: 12, fontWeight: "700" }}>
                {uiStatus}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primaryDark }}>
              {displayTime}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>{displayDate}</Text>
          </View>
        </View>

        {/* ── Customer card ── */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View
              style={{
                height: 46,
                width: 46,
                borderRadius: 23,
                backgroundColor: colors.softCard,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person" size={22} color={colors.primarySoft} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primaryDark }} numberOfLines={1}>
                {order.customer_name || "Unknown Customer"}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                {order.customer_phone || ""}
              </Text>
            </View>
          </View>

          {/* Call button */}
          {(order.customer_phone || order.phone) && (
            <Pressable
              onPress={() => Linking.openURL(`tel:${(order.customer_phone || order.phone).replace(/\s/g, "")}`)}
              style={{
                height: 42,
                width: 42,
                borderRadius: 21,
                backgroundColor: "#E8F5E9",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 10
              }}
            >
              <Ionicons name="call" size={20} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {/* ── Delivery address card ── */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <SectionTitle title="Delivery Address" />
          <Text style={{ fontSize: 14, color: colors.primaryDark, lineHeight: 22 }}>
            {addressString}
          </Text>
          <Pressable
            onPress={() => Linking.openURL("https://maps.google.com")}
            style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Ionicons name="map-outline" size={16} color={colors.primary} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
              View on Map
            </Text>
          </Pressable>
        </View>

        {/* ── Order items card ── */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <SectionTitle title="Order Items" />
          {parsedItems.length === 0 ? (
             <Text style={{ fontSize: 14, color: colors.muted }}>No items found.</Text>
          ) : parsedItems.map((item: any, idx: number) => (
            <View key={idx}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                }}
              >
                <Image
                  source={{ uri: getProductImage(item) }}
                  style={{ width: 40, height: 40, borderRadius: 8, marginRight: 12 }}
                  contentFit="cover"
                />
                <Text style={{ fontSize: 14, color: colors.primaryDark, flex: 1 }}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginRight: 24, fontWeight: "500" }}>
                  x {item.quantity || 1}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primaryDark }}>
                  ₹{Number(item.price || item.total_price || 0).toFixed(2).replace(/\.00$/, "")}
                </Text>
              </View>
              {idx < parsedItems.length - 1 && (
                <View style={{ height: 1, backgroundColor: colors.border }} />
              )}
            </View>
          ))}
        </View>

        {/* ── Order summary card ── */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <SectionTitle title="Order Summary" />

          {/* Item Total */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ fontSize: 14, color: colors.muted }}>Item Total</Text>
            <Text style={{ fontSize: 14, color: colors.primaryDark, fontWeight: "500" }}>
              ₹{itemTotal.toFixed(2).replace(/\.00$/, "")}
            </Text>
          </View>

          {/* Delivery charge */}
          {deliveryCharge > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 14, color: colors.muted }}>Delivery Charge</Text>
              <Text style={{ fontSize: 14, color: colors.primaryDark, fontWeight: "500" }}>
                ₹{deliveryCharge.toFixed(2).replace(/\.00$/, "")}
              </Text>
            </View>
          )}

          {/* Platform fee */}
          {platformFee > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
              <Text style={{ fontSize: 14, color: colors.muted }}>Platform Fee</Text>
              <Text style={{ fontSize: 14, color: colors.primaryDark, fontWeight: "500" }}>
                ₹{platformFee.toFixed(2).replace(/\.00$/, "")}
              </Text>
            </View>
          )}

          <Divider />

          {/* Grand total */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.primaryDark }}>
              Total
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.primary }}>
              ₹{grandTotal.toFixed(2).replace(/\.00$/, "")}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Action buttons (fixed at bottom) ── */}
      {isNew && (
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: colors.pageBackground, position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 16,
              gap: 12,
              backgroundColor: colors.pageBackground,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: -3 },
              shadowRadius: 6,
              elevation: 10,
            }}
          >
            {/* Reject */}
            <Pressable
              onPress={handleReject}
              style={{
                flex: 1,
                borderWidth: 2,
                borderColor: "#C62828",
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: "center",
                backgroundColor: "#fff",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#C62828" }}>
                Reject
              </Text>
            </Pressable>

            {/* Accept */}
            <Pressable
              onPress={handleAccept}
              style={{
                flex: 2,
                backgroundColor: colors.primary,
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
                Accept Order
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}
