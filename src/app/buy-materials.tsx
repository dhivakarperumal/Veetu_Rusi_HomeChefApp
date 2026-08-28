import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    View,
} from "react-native";
import api, { getStoredUser } from "../api";
import BottomBar from "./componets/buttombar";
import PageHeader from "./componets/pageheader";
import {
    CART_KEY,
    FAVORITES_KEY,
    getMaterialImage,
    loadMaterialCollection,
    setMaterialInCollection,
    showMaterialToast,
} from "./materials-store";

type Product = {
  id: string | number;
  name: string;
  category?: string;
  description?: string;
  price?: number | string;
  mrp?: number | string;
  offer_price?: number | string;
  images?: string[] | string;
};

const getImage = (product: Product) => {
  return getMaterialImage(product);
};

export default function BuyMaterialsScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [homeChef, setHomeChef] = useState<any>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [cartIds, setCartIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      loadMaterialCollection(FAVORITES_KEY),
      loadMaterialCollection(CART_KEY),
    ]).then(([favorites, cart]) => {
      setFavoriteIds(
        new Set(favorites.map((item: Product) => String(item.id))),
      );
      setCartIds(new Set(cart.map((item: Product) => String(item.id))));
    });
  }, []);

  useEffect(() => {
    const loadUserAndProfile = async () => {
      const storedUser = await getStoredUser();
      setCurrentUser(storedUser);

      try {
        const profileRes = await api.get("/auth/profile");
        setHomeChef(profileRes.data?.homeChef || null);
      } catch (error) {
        console.error("Profile load error:", error);
      } finally {
        setProfileLoaded(true);
      }
    };

    loadUserAndProfile();
  }, []);

  const fetchProducts = async (isRefresh = false) => {
    const role = currentUser?.role?.toLowerCase() || "";
    const isChefRole = role === "chef" || role === "homechef";
    if (isChefRole && !profileLoaded) return;

    let userToMatch = null;
    let homeChefIdToMatch = null;
    if (role === "admin" || role === "franchise") {
      userToMatch = currentUser?.user_id || currentUser?.id;
    } else if (isChefRole) {
      userToMatch =
        homeChef?.created_by ||
        homeChef?.franchise_user_id ||
        homeChef?.created_by_user_id;
      homeChefIdToMatch = homeChef?.id;
    }

    if (isChefRole && !userToMatch) {
      setProducts([]);
      setCategories(["All"]);
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await api.get("/franchise-products", {
        params: userToMatch ? { franchise_user_id: userToMatch } : {},
      });
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      let matchingProducts = data as Product[];
      if (userToMatch) {
        matchingProducts = matchingProducts.filter((product: any) =>
          [
            product.created_by,
            product.created_by_user_id,
            product.franchise_user_id,
          ].some((ownerId) => String(ownerId) === String(userToMatch)),
        );
      }
      if (homeChefIdToMatch) {
        matchingProducts = matchingProducts.filter(
          (product: any) =>
            !product.home_chef_id ||
            String(product.home_chef_id) === String(homeChefIdToMatch),
        );
      }

      setProducts(matchingProducts);
      setCategories([
        "All",
        ...new Set(
          matchingProducts
            .map((product) => product.category)
            .filter(Boolean) as string[],
        ),
      ]);
    } catch (error) {
      console.error("Error fetching materials:", error);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUser || profileLoaded) fetchProducts();
    // Fetch again when the profile scope becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, homeChef, profileLoaded]);

  const toggleFavorite = (product: Product) => {
    const productId = String(product.id);
    setFavoriteIds((previous) => {
      const next = new Set(previous);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      const included = next.has(productId);
      void setMaterialInCollection(FAVORITES_KEY, product, included).then(() =>
        showMaterialToast(
          included ? "Added to favorites" : "Removed from favorites",
        ),
      );
      return next;
    });
  };

  const toggleCart = (product: Product) => {
    const productId = String(product.id);
    setCartIds((previous) => {
      const next = new Set(previous);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      const included = next.has(productId);
      void setMaterialInCollection(CART_KEY, product, included).then(() =>
        showMaterialToast(included ? "Added to cart" : "Removed from cart"),
      );
      return next;
    });
  };

  const visibleProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    return matchesCategory;
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F6F1" }}>
      <PageHeader
        title="Buy Materials"
        onLeftPress={() => router.back()}
        rightActions={[
          {
            icon: "heart-outline",
            onPress: () => router.push("/favorites"),
            badge: favoriteIds.size > 0,
          },
          {
            icon: "bag-outline",
            onPress: () => router.push("/cart"),
            badge: cartIds.size > 0,
          },
        ]}
      />

      <FlatList
        data={visibleProducts}
        keyExtractor={(product) => String(product.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 24, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProducts(true)}
          />
        }
        ListHeaderComponent={
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(category) => category}
            contentContainerStyle={{ paddingBottom: 16, gap: 8 }}
            renderItem={({ item: category }) => (
              <Pressable
                onPress={() => setSelectedCategory(category)}
                style={{
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  backgroundColor:
                    selectedCategory === category ? "#2E7A4F" : "#E2EDE7",
                }}
              >
                <Text
                  style={{
                    color: selectedCategory === category ? "#fff" : "#2E7A4F",
                    fontWeight: "700",
                  }}
                >
                  {category}
                </Text>
              </Pressable>
            )}
          />
        }
        renderItem={({ item: product }) => {
          const productId = String(product.id);
          const isFavorite = favoriteIds.has(productId);
          const inCart = cartIds.has(productId);
          return (
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
                source={{ uri: getImage(product) }}
                style={{ width: 76, height: 76, borderRadius: 10 }}
                contentFit="cover"
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{ fontSize: 16, fontWeight: "800", color: "#214D38" }}
                  numberOfLines={1}
                >
                  {product.name}
                </Text>
                <Text
                  style={{ marginTop: 4, color: "#5A7A6E" }}
                  numberOfLines={2}
                >
                  {product.description ||
                    product.category ||
                    "Quality cooking material"}
                </Text>
                <Text
                  style={{
                    marginTop: 6,
                    fontSize: 15,
                    fontWeight: "800",
                    color: "#2E7A4F",
                  }}
                >
                  Rs. {product.offer_price || product.price || product.mrp || 0}
                </Text>
                <Pressable
                  onPress={() => toggleCart(product)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    marginTop: 9,
                    borderRadius: 9,
                    paddingVertical: 8,
                    backgroundColor: inCart ? "#E2EDE7" : "#2E7A4F",
                  }}
                >
                  <Ionicons
                    name={inCart ? "checkmark-circle-outline" : "cart-outline"}
                    size={16}
                    color={inCart ? "#2E7A4F" : "#fff"}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: inCart ? "#2E7A4F" : "#fff",
                    }}
                  >
                    {inCart ? "Added to Cart" : "Add to Cart"}
                  </Text>
                </Pressable>
              </View>
              <View style={{ marginLeft: 8, gap: 12 }}>
                <Pressable onPress={() => toggleFavorite(product)} hitSlop={8}>
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={23}
                    color={isFavorite ? "#E65100" : "#5A7A6E"}
                  />
                </Pressable>
                <Pressable onPress={() => toggleCart(product)} hitSlop={8}>
                  <Ionicons
                    name={inCart ? "bag" : "bag-outline"}
                    size={23}
                    color={inCart ? "#2E7A4F" : "#5A7A6E"}
                  />
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color="#2E7A4F"
              style={{ marginTop: 80 }}
            />
          ) : (
            <View style={{ alignItems: "center", marginTop: 80 }}>
              <Ionicons name="bag-outline" size={48} color="#2E7A4F" />
              <Text style={{ marginTop: 12, color: "#5A7A6E" }}>
                No materials available
              </Text>
            </View>
          )
        }
      />

      <BottomBar />
    </View>
  );
}
