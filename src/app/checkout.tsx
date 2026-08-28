import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import BottomBar from "./componets/buttombar";
import PageHeader from "./componets/pageheader";
import { CART_KEY, loadMaterialCollection } from "./materials-store";

export default function CheckoutScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    loadMaterialCollection(CART_KEY).then(setItems);
  }, []);
  const total = items.reduce(
    (sum, item) =>
      sum + Number(item.offer_price || item.price || item.mrp || 0),
    0,
  );

  const placeOrder = () =>
    Alert.alert("Order placed", "Your materials order has been submitted.", [
      { text: "Done", onPress: () => router.replace("/buy-materials") },
    ]);
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F6F1" }}>
      <PageHeader title="Checkout" onLeftPress={() => router.back()} />
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#214D38" }}>
          Order summary
        </Text>
        {items.map((item) => (
          <View
            key={String(item.id)}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#E2EDE7",
            }}
          >
            <Text style={{ flex: 1, color: "#214D38" }}>{item.name}</Text>
            <Text style={{ fontWeight: "700", color: "#2E7A4F" }}>
              Rs. {item.offer_price || item.price || item.mrp || 0}
            </Text>
          </View>
        ))}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 20,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "800", color: "#214D38" }}>
            Total
          </Text>
          <Text style={{ fontSize: 19, fontWeight: "800", color: "#2E7A4F" }}>
            Rs. {total}
          </Text>
        </View>
        {items.length > 0 && (
          <Pressable
            onPress={placeOrder}
            style={{
              alignItems: "center",
              marginTop: 24,
              borderRadius: 12,
              padding: 14,
              backgroundColor: "#2E7A4F",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>
              Place Order
            </Text>
          </Pressable>
        )}
      </View>
      <BottomBar />
    </View>
  );
}
