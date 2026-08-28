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
  const [quantity, setQuantity] = useState(1);
  const [selectedWeight, setSelectedWeight] = useState("");

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
      const savedCartItem = cart.find(
        (item: any) => String(item.id) === String(product.id),
      );
      if (savedCartItem) {
        setQuantity(Number(savedCartItem.quantity) || 1);
        setSelectedWeight(savedCartItem.weight || "");
      }
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
  const weightOptions = Array.from(
    new Set(
      [
        ...(Array.isArray(product.weights) ? product.weights : []),
        ...(Array.isArray(product.weight_options)
          ? product.weight_options
          : []),
        product.weight,
        product.net_weight,
        "250 g",
        "500 g",
        "1 kg",
      ].filter(Boolean),
    ),
  ) as string[];
  const activeWeight = selectedWeight || weightOptions[0];
  const toggleFavorite = async () => {
    const next = !favorite;
    await setMaterialInCollection(FAVORITES_KEY, product, next);
    setFavorite(next);
    showMaterialToast(next ? "Added to favorites" : "Removed from favorites");
  };
  const toggleCart = async () => {
    const next = !inCart;
    await setMaterialInCollection(
      CART_KEY,
      { ...product, quantity, weight: activeWeight },
      next,
    );
    setInCart(next);
    showMaterialToast(next ? "Added to cart" : "Removed from cart");
  };
  const buyNow = () =>
    router.push({
      pathname: "/checkout",
      params: {
        product: JSON.stringify({ ...product, quantity, weight: activeWeight }),
      },
    } as any);

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F6F1" }}>
      <PageHeader title="Product Details" onLeftPress={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
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
          <Text
            style={{
              marginTop: 20,
              fontSize: 17,
              fontWeight: "800",
              color: "#214D38",
            }}
          >
            Select weight
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 10,
            }}
          >
            {weightOptions.map((weight) => (
              <Pressable
                key={weight}
                onPress={() => setSelectedWeight(weight)}
                style={{
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: activeWeight === weight ? "#2E7A4F" : "#D5E3DA",
                  backgroundColor: activeWeight === weight ? "#EAF7F0" : "#fff",
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                }}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    color: activeWeight === weight ? "#2E7A4F" : "#5A7A6E",
                  }}
                >
                  {weight}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text
            style={{
              marginTop: 20,
              fontSize: 17,
              fontWeight: "800",
              color: "#214D38",
            }}
          >
            Quantity
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              marginTop: 10,
            }}
          >
            <Pressable
              onPress={() => setQuantity((current) => Math.max(1, current - 1))}
              style={{
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 9,
                backgroundColor: "#E2EDE7",
              }}
            >
              <Ionicons name="remove" size={20} color="#2E7A4F" />
            </Pressable>
            <Text
              style={{
                minWidth: 24,
                textAlign: "center",
                fontSize: 18,
                fontWeight: "800",
                color: "#214D38",
              }}
            >
              {quantity}
            </Text>
            <Pressable
              onPress={() => setQuantity((current) => current + 1)}
              style={{
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 9,
                backgroundColor: "#E2EDE7",
              }}
            >
              <Ionicons name="add" size={20} color="#2E7A4F" />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 24, marginBottom: 24 }}>
            <Pressable
              onPress={toggleCart}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                borderRadius: 12,
                paddingVertical: 15,
                backgroundColor: inCart ? "#D7EBDD" : "#1F6B45",
              }}
            >
              <Ionicons
                name={inCart ? "checkmark-circle-outline" : "cart-outline"}
                size={18}
                color={inCart ? "#1F6B45" : "#fff"}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "800",
                  color: inCart ? "#1F6B45" : "#fff",
                }}
              >
                {inCart ? "Added" : "Add to Cart"}
              </Text>
            </Pressable>
            <Pressable
              onPress={buyNow}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                borderRadius: 12,
                paddingVertical: 15,
                backgroundColor: "#E8A23A",
              }}
            >
              <Ionicons name="flash-outline" size={18} color="#fff" />
              <Text style={{ fontSize: 12, fontWeight: "800", color: "#fff" }}>
                Buy Now
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
