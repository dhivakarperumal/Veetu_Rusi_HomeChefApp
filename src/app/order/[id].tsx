import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";

// ── Mock order database (shared shape with orders.tsx) ─────────────────────
const ORDER_DB: Record<string, {
  id: string;
  status: string;
  customer: string;
  phone: string;
  address: string;
  time: string;
  date: string;
  items: { name: string; qty: number; price: number }[];
  deliveryCharge: number;
  platformFee: number;
}> = {
  ORD1234: {
    id: "ORD1234",
    status: "New",
    customer: "Ramesh Kumar",
    phone: "+91 98765 43210",
    address: "No.12, 3rd Street, Anna Nagar,\nChennai - 600040",
    time: "10:30 AM",
    date: "Today",
    items: [
      { name: "Chicken Biryani", qty: 1, price: 150 },
      { name: "Curd Rice",       qty: 1, price: 80  },
      { name: "Sambar Rice",     qty: 1, price: 90  },
    ],
    deliveryCharge: 30,
    platformFee: 10,
  },
  ORD1235: {
    id: "ORD1235",
    status: "New",
    customer: "Priya S",
    phone: "+91 97654 32109",
    address: "No.5, Kilpauk Garden Road,\nChennai - 600010",
    time: "10:28 AM",
    date: "Today",
    items: [
      { name: "Veg Pulao", qty: 1, price: 150 },
    ],
    deliveryCharge: 30,
    platformFee: 10,
  },
  ORD1232: {
    id: "ORD1232",
    status: "Preparing",
    customer: "Sangeetha",
    phone: "+91 96543 21098",
    address: "T.Nagar, Chennai - 600017",
    time: "10:15 AM",
    date: "Today",
    items: [
      { name: "Chicken Biryani", qty: 2, price: 300 },
      { name: "Curd Rice",       qty: 1, price: 80  },
      { name: "Sambar Rice",     qty: 1, price: 30  },
    ],
    deliveryCharge: 30,
    platformFee: 10,
  },
  ORD1230: {
    id: "ORD1230",
    status: "Ready",
    customer: "Karthik",
    phone: "+91 95432 10987",
    address: "Vadapalani, Chennai - 600026",
    time: "09:50 AM",
    date: "Today",
    items: [
      { name: "Chicken Curry",   qty: 1, price: 140 },
      { name: "Sambar Rice",     qty: 1, price: 90  },
    ],
    deliveryCharge: 30,
    platformFee: 10,
  },
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  New:       { color: "#E65100", bg: "#FFF3E0" },
  Preparing: { color: "#1565C0", bg: "#E3F2FD" },
  Ready:     { color: "#2E7D32", bg: "#E8F5E9" },
  Completed: { color: "#4A675F", bg: "#ECEFF1" },
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
  const order   = ORDER_DB[id ?? ""] ?? null;

  if (!order) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.pageBackground }}>
        <Text style={{ color: colors.muted, fontSize: 16 }}>Order not found.</Text>
      </View>
    );
  }

  const cfg        = STATUS_CONFIG[order.status] ?? STATUS_CONFIG["New"];
  const itemTotal  = order.items.reduce((s, i) => s + i.price, 0);
  const grandTotal = itemTotal + order.deliveryCharge + order.platformFee;
  const isNew      = order.status === "New";

  const handleAccept = () => {
    Alert.alert("Order Accepted", `#${order.id} has been accepted!`);
    router.back();
  };

  const handleReject = () => {
    Alert.alert(
      "Reject Order",
      "Are you sure you want to reject this order?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reject", style: "destructive", onPress: () => router.back() },
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
              #{order.id}
            </Text>
            <View style={{ backgroundColor: cfg.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: cfg.color, fontSize: 12, fontWeight: "700" }}>
                {order.status}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primaryDark }}>
              {order.time}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>{order.date}</Text>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
            <View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primaryDark }}>
                {order.customer}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                {order.phone}
              </Text>
            </View>
          </View>

          {/* Call button */}
          <Pressable
            onPress={() => Linking.openURL(`tel:${order.phone.replace(/\s/g, "")}`)}
            style={{
              height: 42,
              width: 42,
              borderRadius: 21,
              backgroundColor: "#E8F5E9",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="call" size={20} color={colors.primary} />
          </Pressable>
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
            {order.address}
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
          {order.items.map((item, idx) => (
            <View key={idx}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontSize: 14, color: colors.primaryDark, flex: 1 }}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginRight: 24, fontWeight: "500" }}>
                  x {item.qty}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primaryDark }}>
                  ₹{item.price}
                </Text>
              </View>
              {idx < order.items.length - 1 && (
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
              ₹{itemTotal}
            </Text>
          </View>

          {/* Delivery charge */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ fontSize: 14, color: colors.muted }}>Delivery Charge</Text>
            <Text style={{ fontSize: 14, color: colors.primaryDark, fontWeight: "500" }}>
              ₹{order.deliveryCharge}
            </Text>
          </View>

          {/* Platform fee */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
            <Text style={{ fontSize: 14, color: colors.muted }}>Platform Fee</Text>
            <Text style={{ fontSize: 14, color: colors.primaryDark, fontWeight: "500" }}>
              ₹{order.platformFee}
            </Text>
          </View>

          <Divider />

          {/* Grand total */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.primaryDark }}>
              Total
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.primary }}>
              ₹{grandTotal}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Action buttons (fixed at bottom) ── */}
      {isNew && (
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: colors.pageBackground }}>
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 8,
              gap: 12,
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
