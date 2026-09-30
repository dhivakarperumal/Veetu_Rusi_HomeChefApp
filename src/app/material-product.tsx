import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import PageHeader from "../components/pageheader";
import { formatCurrencyAmount } from "../lib/format-currency";
import {
  CART_KEY,
  FAVORITES_KEY,
  getMaterialImage,
  loadMaterialCollection,
  setMaterialInCollection,
  showMaterialToast,
} from "../lib/materials-store";

type MaterialReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
};

function MaterialReviewSection({ productId }: { productId: string | number }) {
  const [reviews, setReviews] = useState<MaterialReview[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const storageKey = `material-reviews:${productId}`;

  useEffect(() => {
    let cancelled = false;
    const loadReviews = async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        const parsed = saved ? JSON.parse(saved) : [];
        if (!cancelled) setReviews(Array.isArray(parsed) ? parsed : []);
      } catch {
        if (!cancelled) setReviews([]);
      }
    };

    void loadReviews();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const submitReview = async () => {
    if (rating < 1) {
      showMaterialToast("Select a star rating first");
      return;
    }

    setSaving(true);
    const nextReviews: MaterialReview[] = [
      {
        id: `${Date.now()}`,
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      },
      ...reviews,
    ];

    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(nextReviews));
      setReviews(nextReviews);
      setRating(0);
      setComment("");
      setIsOpen(false);
      showMaterialToast("Review saved");
    } catch {
      showMaterialToast("Could not save review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={{
        marginTop: 24,
        paddingTop: 18,
        borderTopWidth: 1,
        borderTopColor: "#DCE7DF",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#214D38" }}>
          Reviews
        </Text>
        <Text style={{ fontSize: 12, color: "#5A7A6E" }}>
          {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
        </Text>
      </View>

      {reviews.length === 0 ? (
        <Text style={{ marginTop: 9, color: "#6B7D74", fontSize: 13 }}>
          No reviews yet
        </Text>
      ) : (
        reviews.map((review) => (
          <View
            key={review.id}
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#E5ECE7",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= review.rating ? "star" : "star-outline"}
                    size={14}
                    color="#E2A52E"
                  />
                ))}
              </View>
              <Text style={{ color: "#87958E", fontSize: 11 }}>
                {new Date(review.createdAt).toLocaleDateString([], {
                  day: "numeric",
                  month: "short",
                })}
              </Text>
            </View>
            {review.comment ? (
              <Text style={{ marginTop: 6, color: "#52665B", lineHeight: 20 }}>
                {review.comment}
              </Text>
            ) : null}
          </View>
        ))
      )}

      <Pressable
        onPress={() => setIsOpen((visible) => !visible)}
        accessibilityRole="button"
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          minHeight: 42,
          marginTop: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#2E7A4F",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Ionicons name="create-outline" size={17} color="#2E7A4F" />
        <Text style={{ color: "#2E7A4F", fontSize: 13, fontWeight: "800" }}>
          {isOpen ? "Close review form" : "Write a review"}
        </Text>
      </Pressable>

      {isOpen && (
        <View style={{ marginTop: 14 }}>
          <Text style={{ color: "#214D38", fontSize: 13, fontWeight: "700" }}>
            Your rating
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setRating(star)}
                accessibilityRole="button"
                accessibilityLabel={`${star} star${star === 1 ? "" : "s"}`}
                accessibilityState={{ selected: rating === star }}
                hitSlop={4}
              >
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={27}
                  color="#E2A52E"
                />
              </Pressable>
            ))}
          </View>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Share your experience (optional)"
            placeholderTextColor="#87958E"
            multiline
            textAlignVertical="top"
            style={{
              minHeight: 88,
              marginTop: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: "#D5E3DA",
              borderRadius: 10,
              backgroundColor: "#FFFFFF",
              color: "#214D38",
              fontSize: 13,
              lineHeight: 19,
            }}
          />
          <Pressable
            onPress={submitReview}
            disabled={saving}
            accessibilityRole="button"
            style={{
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 10,
              borderRadius: 10,
              backgroundColor: saving ? "#91B5A0" : "#2E7A4F",
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "800" }}>
              {saving ? "Saving..." : "Submit review"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

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

  const syncCollections = useCallback(async () => {
    if (!product) return;
    const [favorites, cart] = await Promise.all([
      loadMaterialCollection(FAVORITES_KEY),
      loadMaterialCollection(CART_KEY),
    ]);
    const isFavorite = favorites.some(
      (item: any) => String(item.id) === String(product.id),
    );
    const savedCartItem = cart.find(
      (item: any) => String(item.id) === String(product.id),
    );
    setFavorite(isFavorite);
    setInCart(Boolean(savedCartItem));
    setQuantity(Number(savedCartItem?.quantity) || 1);
    setSelectedWeight(savedCartItem?.weight || "");
  }, [product]);

  useFocusEffect(
    useCallback(() => {
      void syncCollections();
    }, [syncCollections]),
  );

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
    await syncCollections();
    showMaterialToast(next ? "Added to favorites" : "Removed from favorites");
  };
  const toggleCart = async () => {
    await setMaterialInCollection(
      CART_KEY,
      { ...product, quantity, weight: activeWeight },
      true,
    );
    await syncCollections();
    showMaterialToast(inCart ? "Cart updated" : "Added to cart");
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
      <PageHeader
        title="Product Details"
        onLeftPress={() => router.back()}
        headerBackgroundColor="#2E7A4F"
        headerForegroundColor="#FFFFFF"
        safeAreaBackgroundColor="#2E7A4F"
        statusBarStyle="light-content"
        backButtonBackgroundColor="#2E7A4F"
        backButtonIconColor="#FFFFFF"
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: getMaterialImage(product) }}
            style={{ width: "100%", aspectRatio: 1, borderRadius: 16 }}
            contentFit="cover"
          />
          <Pressable
            onPress={toggleFavorite}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              favorite ? "Remove from favorites" : "Add to favorites"
            }
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 22,
              backgroundColor: "#FFFFFF",
              elevation: 3,
            }}
          >
            <Ionicons
              name={favorite ? "heart" : "heart-outline"}
              size={25}
              color={favorite ? "#C2415D" : "#A75D6C"}
            />
          </Pressable>
        </View>
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
          </View>
          <Text
            style={{
              marginTop: 8,
              fontSize: 21,
              fontWeight: "800",
              color: "#2E7A4F",
            }}
          >
            ₹ {formatCurrencyAmount(price)}
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
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 24,
              marginBottom: 24,
            }}
          >
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
                {inCart ? "Update Cart" : "Add to Cart"}
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
          <MaterialReviewSection productId={product.id} />
        </View>
      </ScrollView>
    </View>
  );
}
