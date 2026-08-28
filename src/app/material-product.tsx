import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import PageHeader from "./componets/pageheader";
import {
    CART_KEY,
    FAVORITES_KEY,
    getMaterialImage,
    loadMaterialCollection,
    setMaterialInCollection,
    showMaterialToast,
} from "./materials-store";

export default function MaterialProductScreen() {
  const router = useRouter();
  const { product: productParam } = useLocalSearchParams<{
    product?: string;
  }>();
  const [product, setProduct] = useState<any>(null);
  const [favorite, setFavorite] = useState(false);
  const [inCart, setInCart] = useState(false);

  useEffect(() => {
    if (!productParam) return;
    try {
      setProduct(JSON.parse(productParam));
    } catch {
      setProduct(null);
    }
  }, [productParam]);

  useEffect(() => {
    if (!product) return;
    Promise.all([
      loadMaterialCollection(FAVORITES_KEY),
      loadMaterialCollection(CART_KEY),
    ]).then(([favorites, cart]) => {
      setFavorite(
        favorites.some((item: any) => String(item.id) === String(product.id)),
      );
      setInCart(
        cart.some((item: any) => String(item.id) === String(product.id)),
      );
    });
  }, [product]);

  if (!product) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F8F6F1" }}>
        <PageHeader title="Product Details" onLeftPress={() => router.back()} />
        <Text style={{ marginTop: 80, textAlign: "center", color: "#5A7A6E" }}>
          Product details unavailable
        </Text>
      </View>
    );
  }

  const price = product.offer_price || product.price || product.mrp || 0;
  const toggleFavorite = async () => {
    const next = !favorite;
    await setMaterialInCollection(FAVORITES_KEY, product, next);
    setFavorite(next);
    showMaterialToast(next ? "Added to favorites" : "Removed from favorites");
  };
  const toggleCart = async () => {
    const next = !inCart;
    await setMaterialInCollection(CART_KEY, product, next);
    setInCart(next);
    showMaterialToast(next ? "Added to cart" : "Removed from cart");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F6F1" }}>
      <PageHeader title="Product Details" onLeftPress={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Image
          source={{ uri: getMaterialImage(product) }}
          style={{ width: "100%", aspectRatio: 1, borderRadius: 16 }}
          contentFit="cover"
        />
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Text
              style={{
                flex: 1,
                fontSize: 24,
                fontWeight: "800",
                color: "#214D38",
              }}
            >
              {product.name}
            </Text>
            <Pressable
              onPress={toggleFavorite}
              hitSlop={8}
              style={{ marginLeft: 12 }}
            >
              <Ionicons
                name={favorite ? "heart" : "heart-outline"}
                size={29}
                color={favorite ? "#C2415D" : "#A75D6C"}
              />
            </Pressable>
          </View>
          <Text
            style={{
              marginTop: 8,
              fontSize: 21,
              fontWeight: "800",
              color: "#2E7A4F",
            }}
          >
            Rs. {price}
          </Text>
          {product.category && (
            <Text style={{ marginTop: 12, color: "#5A7A6E" }}>
              Category: {product.category}
            </Text>
          )}
          <Text
            style={{
              marginTop: 18,
              fontSize: 17,
              fontWeight: "800",
              color: "#214D38",
            }}
          >
            Description
          </Text>
          <Text style={{ marginTop: 8, lineHeight: 22, color: "#5A7A6E" }}>
            {product.description ||
              "Quality cooking material for your kitchen."}
          </Text>
          <Pressable
            onPress={toggleCart}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 24,
              borderRadius: 12,
              padding: 15,
              backgroundColor: inCart ? "#D7EBDD" : "#1F6B45",
            }}
          >
            <Ionicons
              name={inCart ? "checkmark-circle-outline" : "cart-outline"}
              size={20}
              color={inCart ? "#1F6B45" : "#fff"}
            />
            <Text
              style={{ fontWeight: "800", color: inCart ? "#1F6B45" : "#fff" }}
            >
              {inCart ? "Added to Cart" : "Add to Cart"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
