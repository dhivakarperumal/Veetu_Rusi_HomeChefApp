import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import api, { API_BASE_URL, getStoredUser } from "../api";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";
import TopHeader from "./componets/topheader";

// Strip /api suffix to get the bare server origin e.g. http://192.168.1.2:5000
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const resolveImageUrl = (path: string): string => {
  if (!path || typeof path !== "string") return "";
  const trimmed = path.trim();
  if (!trimmed) return "";

  // Replace any localhost / 127.0.0.1 origin with the real server IP
  if (
    trimmed.includes("localhost:5000") ||
    trimmed.includes("127.0.0.1:5000")
  ) {
    const fixed = trimmed
      .replace(/https?:\/\/localhost:5000/g, IMAGE_BASE_URL)
      .replace(/https?:\/\/127\.0\.0\.1:5000/g, IMAGE_BASE_URL);
    console.log("[dishes] resolved:", fixed);
    return fixed;
  }

  if (trimmed.startsWith("http")) return trimmed;
  // relative path
  return trimmed.startsWith("/")
    ? `${IMAGE_BASE_URL}${trimmed}`
    : `${IMAGE_BASE_URL}/${trimmed}`;
};

// ── Types ─────────────────────────────────────────────────────────────────────
type Category = "All" | "Veg" | "Non-Veg" | "Combo";
type DishStatus = "Active" | "Inactive" | string;

interface Dish {
  id: string;
  name: string;
  price: number;
  mrp?: number;
  category: string;
  status: DishStatus;
  rating: number;
  reviews: number;
  orders: number;
  image: string;
  fallbackName: string;
}

const CATEGORIES = ["All", "Veg", "Non-Veg", "Combo"];

// ── Helper ────────────────────────────────────────────────────────────────────
const FALLBACK_AVATAR = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "Chef Food",
  )}&background=2E7A4F&color=fff&size=400`;

const getFoodImage = (item: any): string => {
  try {
    let imgs: any = item.images;

    // Debug: log the raw value coming from API
    console.log("[dishes] raw images field:", JSON.stringify(imgs));

    // Case 1: already parsed into an array by axios
    if (Array.isArray(imgs)) {
      const first = imgs.find((u: any) => typeof u === "string" && u.trim());
      if (first) {
        const url = resolveImageUrl(first.trim());
        console.log("[dishes] Case1 url:", url);
        return url;
      }
    }

    // Case 2: string – JSON array, JSON string, or bare URL
    if (typeof imgs === "string" && imgs.trim()) {
      let parsed: any = imgs.trim();

      // Up to 2 parse passes (handles double-stringified JSON)
      for (let i = 0; i < 2; i++) {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          break;
        }
        if (Array.isArray(parsed)) {
          const first = parsed.find(
            (u: any) => typeof u === "string" && u.trim(),
          );
          if (first) {
            const url = resolveImageUrl(first.trim());
            console.log("[dishes] Case2-array url:", url);
            return url;
          }
        }
        if (
          typeof parsed === "string" &&
          (parsed.startsWith("http") || parsed.startsWith("/"))
        ) {
          const url = resolveImageUrl(parsed.trim());
          console.log("[dishes] Case2-str url:", url);
          return url;
        }
      }

      // Raw URL string — not JSON at all
      const raw = imgs.trim();
      if (raw.startsWith("http") || raw.startsWith("/")) {
        const url = resolveImageUrl(raw);
        console.log("[dishes] Case2-raw url:", url);
        return url;
      }
    }

    // Case 3: packaging_image fallback
    if (item.packaging_image) {
      const url = resolveImageUrl(String(item.packaging_image));
      console.log("[dishes] Case3 packaging url:", url);
      return url;
    }
  } catch (e) {
    console.warn("[dishes] getFoodImage error:", e);
  }

  const avatar = FALLBACK_AVATAR(item.name);
  console.log("[dishes] fallback avatar for:", item.name);
  return avatar;
};

// ── Dish Card ─────────────────────────────────────────────────────────────────
function DishCard({
  dish,
  onToggle,
}: {
  dish: Dish;
  onToggle: (id: string) => void;
}) {
  const isActive = (dish.status || "").toLowerCase() === "active";
  // useState fallback: if the resolved URL fails to load, swap to avatar
  const [imgSrc, setImgSrc] = useState<string>(dish.image);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        marginBottom: 12,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Thumbnail */}
      <View
        style={{
          height: 76,
          width: 76,
          borderRadius: 16,
          backgroundColor: colors.softCard,
          marginRight: 14,
          overflow: "hidden",
        }}
      >
        <Image
          source={{ uri: imgSrc }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
          onError={(e) => {
            console.warn("[dishes] Image load error:", imgSrc, e);
            // Swap to avatar fallback so the box is never blank
            setImgSrc(FALLBACK_AVATAR(dish.fallbackName));
          }}
        />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        {/* Name + menu button */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: colors.primaryDark,
              flex: 1,
              marginRight: 6,
            }}
            numberOfLines={1}
          >
            {dish.name}
          </Text>
          <Pressable hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={16} color={colors.muted} />
          </Pressable>
        </View>

        {/* Price + status */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
            gap: 8,
          }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: colors.primaryDark,
              }}
            >
              ₹{Number(dish.price).toFixed(2).replace(/\.00$/, "")}
            </Text>
            {dish.mrp && dish.mrp > dish.price && (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: colors.muted,
                  textDecorationLine: "line-through",
                }}
              >
                ₹{Number(dish.mrp).toFixed(2).replace(/\.00$/, "")}
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => onToggle(dish.id)}
            style={{
              backgroundColor: isActive ? "#E8F5E9" : "#FFEBEE",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: isActive ? "#2E7D32" : "#C62828",
                textTransform: "capitalize",
              }}
            >
              {dish.status || "Inactive"}
            </Text>
          </Pressable>
        </View>

        {/* Rating + orders */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.primaryDark,
              }}
            >
              {dish.rating}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              ({dish.reviews})
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View
              style={{
                height: 7,
                width: 7,
                borderRadius: 4,
                backgroundColor: isActive ? "#2E7D32" : colors.muted,
              }}
            />
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {dish.orders} orders
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DishesScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFoods();
  }, []);

  const fetchFoods = async () => {
    setLoading(true);
    try {
      const profile = await getStoredUser();
      const params: any = {};
      if (profile?.user_id || profile?.id) {
        params.chef_user_id = profile.user_id || profile.id;
      }
      const res = await api.get("/chef-foods", { params });
      const allFoods = Array.isArray(res.data) ? res.data : [];

      const foodsOnly = allFoods.filter((item: any) => {
        if (!item.product_type) {
          if (!item.category) return true;
          return !String(item.category).toLowerCase().includes("product");
        }
        return item.product_type === "Food";
      });

      const mappedDishes: Dish[] = foodsOnly.map((item: any) => ({
        id: String(item.id),
        name: item.name || "Unknown Dish",
        price: Number(item.final_price || item.mrp || item.price || 0),
        mrp: Number(item.mrp || 0),
        category: item.category || "All",
        status: item.status || "Active",
        rating: item.rating || 4.5,
        reviews: item.reviews || Math.floor(Math.random() * 100),
        orders: item.orders || Math.floor(Math.random() * 30),
        image: getFoodImage(item),
        fallbackName: item.name || "Chef Food",
      }));

      setDishes(mappedDishes);
    } catch (err) {
      console.error("Failed to load chef foods", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = dishes.filter((d) => {
    const matchCat =
      activeCategory === "All" ||
      (d.category && d.category.toLowerCase() === activeCategory.toLowerCase());
    const matchSearch = d.name
      .toLowerCase()
      .includes(search.toLowerCase().trim());
    return matchCat && matchSearch;
  });

  const toggleStatus = async (id: string) => {
    // Optimistic UI update
    setDishes((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status:
                (d.status || "").toLowerCase() === "active"
                  ? "Inactive"
                  : "Active",
            }
          : d,
      ),
    );
    // Note: To fully persist, you should add an API call here to update the dish status.
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      {/* ── Header ── */}
      <TopHeader showHero={false} title="My Products" />

      <View style={{ backgroundColor: colors.pageBackground, paddingTop: 4 }}>
        {/* Search bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: 20,
            marginBottom: 14,
            backgroundColor: colors.cardBackground,
            borderRadius: 50,
            paddingHorizontal: 14,
            paddingVertical: 10,
            gap: 8,
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your products..."
            placeholderTextColor={colors.muted}
            style={{
              flex: 1,
              fontSize: 14,
              color: colors.primaryDark,
              padding: 0,
            }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {/* Category filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 14,
            gap: 8,
          }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 8,
                  borderRadius: 50,
                  backgroundColor: isActive
                    ? colors.primary
                    : colors.cardBackground,
                  shadowColor: "#000",
                  shadowOpacity: isActive ? 0 : 0.05,
                  shadowOffset: { width: 0, height: 1 },
                  shadowRadius: 3,
                  elevation: isActive ? 0 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: isActive ? "#fff" : colors.label,
                  }}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Dish list ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 100,
        }}
      >
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, color: colors.muted }}>
              Loading dishes...
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 60,
            }}
          >
            <Text style={{ fontSize: 48, marginBottom: 14 }}>🍽️</Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.primaryDark,
              }}
            >
              No products found
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.muted,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              Try a different category or search term.
            </Text>
          </View>
        ) : (
          filtered.map((dish) => (
            <DishCard key={dish.id} dish={dish} onToggle={toggleStatus} />
          ))
        )}
      </ScrollView>

      {/* Floating Add Dish Button */}
      <Pressable
        onPress={() => router.push("/add-dish")}
        style={{
          position: "absolute",
          right: 20,
          bottom: 130,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: "#E65100",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      <BottomBar />
    </View>
  );
}
