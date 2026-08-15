import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import api, { API_BASE_URL, getStoredUser } from "../api";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";
import PageHeader from "./componets/pageheader";

// ── Image Helper ──────────────────────────────────────────────────────────────
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");
const resolveImageUrl = (path: string | null | undefined): string | null => {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed; // <-- Fix for base64 images
  if (trimmed.includes("localhost:5000") || trimmed.includes("127.0.0.1:5000")) {
    return trimmed
      .replace(/https?:\/\/localhost:5000/g, IMAGE_BASE_URL)
      .replace(/https?:\/\/127\.0\.0\.1:5000/g, IMAGE_BASE_URL);
  }
  if (trimmed.startsWith("http")) return trimmed;
  return trimmed.startsWith("/") ? `${IMAGE_BASE_URL}${trimmed}` : `${IMAGE_BASE_URL}/${trimmed}`;
};

const getFirstImage = (imagesField: any): string | null => {
  if (Array.isArray(imagesField)) {
    const first = imagesField.find((u) => typeof u === "string" && u.trim());
    if (first) return resolveImageUrl(first);
  }
  if (typeof imagesField === "string" && imagesField.trim()) {
    try {
      const parsed = JSON.parse(imagesField);
      if (Array.isArray(parsed)) {
        const first = parsed.find((u) => typeof u === "string" && u.trim());
        if (first) return resolveImageUrl(first);
      }
    } catch {
      // not json, maybe direct string
    }
    return resolveImageUrl(imagesField);
  }
  return null;
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface MenuItem {
  id: string;
  type: "food" | "product";
  name: string;
  price: number;
  category: string;
  status: string; // 'Active' or 'Inactive'
  image: string | null;
  rawItem: any;
}

interface Category {
  id: string;
  name: string;
  emoji?: string;
  icon?: string;
  image?: string | null;
}

// ── Components ────────────────────────────────────────────────────────────────
function SectionHeader({ title, showAdd = false, onAdd }: { title: string; showAdd?: boolean; onAdd?: () => void }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        marginTop: 24,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.primaryDark }}>
        {title}
      </Text>
      {showAdd && (
        <Pressable onPress={onAdd} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>
            Add
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MenuScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCatId, setActiveCatId] = useState<string>("All");
  
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const user = await getStoredUser();
      const chefUserId = user?.user_id || user?.id;

      // 1. Fetch categories
      let cats: Category[] = [];
      try {
        const catRes = await api.get("/home-chef-categories");
        const allCats = Array.isArray(catRes.data) ? catRes.data : (catRes.data?.data || []);
        cats = allCats.map((c: any) => ({
          id: String(c.CatId || c.id),
          name: c.c_name || c.name || "Unknown",
          icon: "restaurant-outline",
          image: getFirstImage(c.image),
        }));
      } catch (e) {
        console.warn("Failed to fetch categories", e);
      }
      setCategories(cats);

      // 2. Fetch foods & products
      let allItems: MenuItem[] = [];
      if (chefUserId) {
        // Foods
        try {
          const foodRes = await api.get("/chef-foods", { params: { chef_user_id: chefUserId } });
          const foods = Array.isArray(foodRes.data) ? foodRes.data : [];
          const foodItems = foods.map((f: any) => ({
            id: String(f.id),
            type: "food" as const,
            name: f.name || "Unknown Dish",
            price: Number(f.final_price || f.mrp || f.price || 0),
            category: f.category || "Uncategorized",
            status: f.status || "Inactive",
            image: getFirstImage(f.images) || resolveImageUrl(f.packaging_image),
            rawItem: f,
          }));
          allItems = [...allItems, ...foodItems];
        } catch (e) {
          console.warn("Failed to fetch foods", e);
        }

        // Products
        try {
          const prodRes = await api.get(`/products/user/${chefUserId}`);
          const prods = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.data || []);
          const prodItems = prods.map((p: any) => ({
            id: String(p.id),
            type: "product" as const,
            name: p.name || "Unknown Product",
            price: Number(p.final_price || p.mrp || p.price || 0),
            category: p.category || "Uncategorized",
            status: p.status || "Inactive",
            image: getFirstImage(p.images) || resolveImageUrl(p.packaging_image),
            rawItem: p,
          }));
          allItems = [...allItems, ...prodItems];
        } catch (e) {
          console.warn("Failed to fetch products", e);
        }
      }
      
      setItems(allItems);
    } catch (err) {
      console.error("Failed to load menu data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const toggleStatus = async (item: MenuItem) => {
    const newStatus = item.status === "Active" ? "Inactive" : "Active";
    
    // Optimistic update
    setItems((prev) => prev.map((i) => i.id === item.id && i.type === item.type ? { ...i, status: newStatus } : i));

    try {
      const endpoint = item.type === "food" ? `/chef-foods/${item.id}` : `/products/${item.id}`;
      await api.put(endpoint, { status: newStatus });
    } catch (error) {
      console.error(`Failed to update ${item.type} status`, error);
      Alert.alert("Error", `Failed to update status for ${item.name}`);
      // Revert on failure
      setItems((prev) => prev.map((i) => i.id === item.id && i.type === item.type ? { ...i, status: item.status } : i));
    }
  };

  // ── Derived categories from actual items if API is empty ──
  const uniqueItemCats = Array.from(new Set(items.map(i => i.category))).filter(Boolean);
  const displayCats = categories.length > 0 ? categories : uniqueItemCats.map(name => ({ id: name, name, icon: "restaurant-outline" }));
  
  const allCategoryOption = { id: "All", name: "All Items", emoji: "🍽️" };
  const scrollCats = [allCategoryOption, ...displayCats];

  // Group items by category for rendering
  const filteredItems = activeCatId === "All" 
    ? items 
    : items.filter(i => {
        const cat = displayCats.find(c => c.id === activeCatId);
        return cat && i.category === cat.name;
      });

  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.pageBackground, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      <PageHeader
        title="Manage Menu"
        centerTitle
        onLeftPress={() => router.back()}
        leftIcon="arrow-back"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ── Categories Scroll ── */}
        <SectionHeader title="Categories" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        >
          {scrollCats.map((cat) => {
            const isActive = activeCatId === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setActiveCatId(cat.id)}
                style={{
                  width: 72,
                  height: 90,
                  borderRadius: 16,
                  backgroundColor: isActive ? colors.primary : colors.cardBackground,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 8,
                  shadowColor: "#000",
                  shadowOpacity: 0.04,
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    height: 40,
                    width: 40,
                    borderRadius: 20,
                    backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "#FFF3E0",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                    overflow: "hidden",
                  }}
                >
                  {cat.image ? (
                    <Image
                      source={{ uri: cat.image }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  ) : cat.icon ? (
                    <Ionicons name={cat.icon as any} size={20} color={isActive ? "#fff" : colors.primaryDark} />
                  ) : (
                    <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    textAlign: "center",
                    color: isActive ? "#fff" : colors.primaryDark,
                  }}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Items by Category ── */}
        {Object.entries(groupedItems).length === 0 ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Ionicons name="restaurant-outline" size={48} color="#ddd" />
            <Text style={{ color: colors.muted, marginTop: 12, fontSize: 15, fontWeight: "600" }}>No items found</Text>
          </View>
        ) : (
          Object.entries(groupedItems).map(([categoryName, catItems]) => (
            <View key={categoryName}>
              <SectionHeader title={categoryName} />
              <View style={{ paddingHorizontal: 16, gap: 12 }}>
                {catItems.map((item) => {
                  const isActive = item.status === "Active";
                  return (
                    <View
                      key={`${item.type}-${item.id}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: colors.cardBackground,
                        borderRadius: 20,
                        padding: 12,
                        shadowColor: "#000",
                        shadowOpacity: 0.04,
                        shadowOffset: { width: 0, height: 2 },
                        shadowRadius: 8,
                        elevation: 2,
                      }}
                    >
                      {/* Image */}
                      <View style={{ height: 74, width: 74, borderRadius: 12, marginRight: 14, backgroundColor: colors.softCard, overflow: "hidden" }}>
                        <Image
                          source={item.image ? { uri: item.image } : require("../../assets/images/dish_photos_grid.jpg")}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      </View>
                      
                      {/* Details */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primaryDark, flexShrink: 1 }} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <View style={{ backgroundColor: item.type === 'food' ? '#E8F5E9' : '#FFF3E0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 9, fontWeight: "800", color: item.type === 'food' ? '#2E7D32' : '#E65100', textTransform: 'uppercase' }}>
                              {item.type}
                            </Text>
                          </View>
                        </View>
                        
                        <Text style={{ fontSize: 15, fontWeight: "800", color: colors.primaryDark, marginBottom: 6 }}>
                          ₹{item.price.toFixed(2)}
                        </Text>
                        
                        <Text style={{ fontSize: 12, fontWeight: "600", color: isActive ? "#2E7D32" : "#C62828" }}>
                          {item.status}
                        </Text>
                      </View>
                      
                      {/* Toggle */}
                      <Switch
                        value={isActive}
                        onValueChange={() => toggleStatus(item)}
                        trackColor={{ false: "#E0E0E0", true: colors.primary }}
                        thumbColor="#fff"
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <BottomBar />
    </View>
  );
}
