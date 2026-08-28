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
    saveMaterialCollection,
    setMaterialInCollection,
} from "./materials-store";

export default function CartScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    loadMaterialCollection(CART_KEY).then((savedItems) =>
      setItems(
        savedItems.map((item: any) => ({
          ...item,
          quantity: Number(item.quantity) || 1,
        })),
      ),
    );
  }, []);
  const total = items.reduce(
    (sum, item) =>
      sum +
      Number(item.offer_price || item.price || item.mrp || 0) *
        (Number(item.quantity) || 1),
    0,
  );

  const updateQuantity = async (item: any, change: number) => {
    const nextQuantity = Math.max(1, (Number(item.quantity) || 1) + change);
    const updatedItems = items.map((saved) =>
      String(saved.id) === String(item.id)
        ? { ...saved, quantity: nextQuantity }
        : saved,
    );
    setItems(updatedItems);
    await saveMaterialCollection(CART_KEY, updatedItems);
  };

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
                Rs.{" "}
                {Number(item.offer_price || item.price || item.mrp || 0) *
                  (Number(item.quantity) || 1)}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 10,
                  gap: 12,
                }}
              >
                <Pressable
                  onPress={() => updateQuantity(item, -1)}
                  disabled={(Number(item.quantity) || 1) <= 1}
                  style={{
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    backgroundColor:
                      (Number(item.quantity) || 1) <= 1 ? "#EEF2EF" : "#E2EDE7",
                  }}
                >
                  <Ionicons name="remove" size={17} color="#2E7A4F" />
                </Pressable>
                <Text
                  style={{
                    minWidth: 18,
                    textAlign: "center",
                    fontSize: 15,
                    fontWeight: "800",
                    color: "#214D38",
                  }}
                >
                  {item.quantity || 1}
                </Text>
                <Pressable
                  onPress={() => updateQuantity(item, 1)}
                  style={{
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    backgroundColor: "#E2EDE7",
                  }}
                >
                  <Ionicons name="add" size={17} color="#2E7A4F" />
                </Pressable>
              </View>
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
