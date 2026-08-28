import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import BottomBar from "./componets/buttombar";
import PageHeader from "./componets/pageheader";
import {
    CART_KEY,
    getMaterialImage,
    loadMaterialCollection,
    setMaterialInCollection,
} from "./materials-store";

export default function CartScreen() {
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

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F6F1" }}>
      <PageHeader title="Cart" onLeftPress={() => router.back()} />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={
          <Text
            style={{ marginTop: 80, textAlign: "center", color: "#5A7A6E" }}
          >
            Your cart is empty
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <Image
              source={{ uri: getMaterialImage(item) }}
              style={{ width: 68, height: 68, borderRadius: 10 }}
              contentFit="cover"
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "800", color: "#214D38" }}
              >
                {item.name}
              </Text>
              <Text
                style={{ marginTop: 5, fontWeight: "700", color: "#2E7A4F" }}
              >
                Rs. {item.offer_price || item.price || item.mrp || 0}
              </Text>
            </View>
            <Pressable
              onPress={async () => {
                await setMaterialInCollection(CART_KEY, item, false);
                setItems((previous) =>
                  previous.filter(
                    (saved) => String(saved.id) !== String(item.id),
                  ),
                );
              }}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={22} color="#C62828" />
            </Pressable>
          </View>
        )}
      />
      {items.length > 0 && (
        <View style={{ padding: 16, backgroundColor: "#fff" }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#214D38" }}>
              Total
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#2E7A4F" }}>
              Rs. {total}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/checkout")}
            style={{
              alignItems: "center",
              borderRadius: 12,
              padding: 14,
              backgroundColor: "#2E7A4F",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Checkout</Text>
          </Pressable>
        </View>
      )}
      <BottomBar />
    </View>
  );
}
