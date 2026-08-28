import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import BottomBar from "./componets/buttombar";
import PageHeader from "./componets/pageheader";
import {
    CART_KEY,
    FAVORITES_KEY,
    getMaterialImage,
    loadMaterialCollection,
    saveMaterialCollection,
    setMaterialInCollection,
    showMaterialToast,
} from "./materials-store";

export default function FavoritesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [cartIds, setCartIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      loadMaterialCollection(FAVORITES_KEY),
      loadMaterialCollection(CART_KEY),
    ]).then(([favorites, cart]) => {
      setItems(favorites);
      setCartIds(new Set(cart.map((item: any) => String(item.id))));
    });
  }, []);

  const addToCart = async (item: any) => {
    await setMaterialInCollection(CART_KEY, item, true);
    setCartIds((previous) => new Set(previous).add(String(item.id)));
    showMaterialToast("Added to cart");
  };

  const addAllToCart = async () => {
    const currentCart = await loadMaterialCollection(CART_KEY);
    const merged = [
      ...currentCart.filter(
        (cartItem: any) =>
          !items.some((item) => String(item.id) === String(cartItem.id)),
      ),
      ...items,
    ];
    await saveMaterialCollection(CART_KEY, merged);
    setCartIds(new Set(merged.map((item: any) => String(item.id))));
    showMaterialToast("All favorites added to cart");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F6F1" }}>
      <PageHeader
        title="Favorites"
        onLeftPress={() => router.back()}
        rightActions={
          [
            {
              icon: "cart-outline",
              onPress: () => router.push("/cart"),
              badge: cartIds.size > 0,
            },
          ] as any
        }
      />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={
          <Text
            style={{ marginTop: 80, textAlign: "center", color: "#5A7A6E" }}
          >
            No favorite materials yet
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
                await setMaterialInCollection(FAVORITES_KEY, item, false);
                setItems((previous) =>
                  previous.filter(
                    (saved) => String(saved.id) !== String(item.id),
                  ),
                );
                showMaterialToast("Removed from favorites");
              }}
              hitSlop={8}
            >
              <Ionicons name="heart" size={24} color="#E65100" />
            </Pressable>
            <Pressable
              onPress={() => addToCart(item)}
              hitSlop={8}
              style={{ marginLeft: 16 }}
            >
              <Ionicons
                name={cartIds.has(String(item.id)) ? "cart" : "cart-outline"}
                size={24}
                color={cartIds.has(String(item.id)) ? "#2E7A4F" : "#5A7A6E"}
              />
            </Pressable>
          </View>
        )}
      />
      {items.length > 0 && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: "#F8F6F1",
          }}
        >
          <Pressable
            onPress={addAllToCart}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 12,
              padding: 13,
              backgroundColor: "#2E7A4F",
            }}
          >
            <Ionicons name="cart-outline" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800" }}>
              Add all to cart
            </Text>
          </Pressable>
        </View>
      )}
      <BottomBar />
    </View>
  );
}
