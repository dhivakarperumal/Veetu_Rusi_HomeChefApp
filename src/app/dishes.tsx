import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";
import PageHeader from "./componets/pageheader";

// ── Types ─────────────────────────────────────────────────────────────────────
type Category = "All" | "Veg" | "Non-Veg" | "Combo";
type DishStatus = "Active" | "Inactive";

interface Dish {
  id: string;
  name: string;
  price: number;
  category: Exclude<Category, "All">;
  status: DishStatus;
  rating: number;
  reviews: number;
  orders: number;
  emoji: string;
  bg: string;
}

// ── Mock dishes ───────────────────────────────────────────────────────────────
const DISHES: Dish[] = [
  {
    id: "1",
    name: "Chicken Biryani",
    price: 150,
    category: "Non-Veg",
    status: "Active",
    rating: 4.8,
    reviews: 120,
    orders: 20,
    emoji: "🍗",
    bg: "#FFF3E0",
  },
  {
    id: "2",
    name: "Veg Pulao",
    price: 100,
    category: "Veg",
    status: "Active",
    rating: 4.6,
    reviews: 95,
    orders: 15,
    emoji: "🌿",
    bg: "#E8F5E9",
  },
  {
    id: "3",
    name: "Sambar Rice",
    price: 90,
    category: "Veg",
    status: "Active",
    rating: 4.7,
    reviews: 60,
    orders: 10,
    emoji: "🍲",
    bg: "#FFF8E1",
  },
  {
    id: "4",
    name: "Chicken Curry",
    price: 140,
    category: "Non-Veg",
    status: "Active",
    rating: 4.8,
    reviews: 95,
    orders: 18,
    emoji: "🍛",
    bg: "#FBE9E7",
  },
  {
    id: "5",
    name: "Curd Rice",
    price: 80,
    category: "Veg",
    status: "Active",
    rating: 4.7,
    reviews: 40,
    orders: 8,
    emoji: "🥣",
    bg: "#F3E5F5",
  },
  {
    id: "6",
    name: "Fish Curry + Rice",
    price: 180,
    category: "Combo",
    status: "Active",
    rating: 4.9,
    reviews: 72,
    orders: 22,
    emoji: "🐟",
    bg: "#E3F2FD",
  },
  {
    id: "7",
    name: "Egg Fried Rice",
    price: 110,
    category: "Non-Veg",
    status: "Inactive",
    rating: 4.5,
    reviews: 38,
    orders: 6,
    emoji: "🍳",
    bg: "#FFFDE7",
  },
  {
    id: "8",
    name: "Mini Meals Combo",
    price: 200,
    category: "Combo",
    status: "Active",
    rating: 4.8,
    reviews: 110,
    orders: 25,
    emoji: "🍱",
    bg: "#E8F5E9",
  },
];

const CATEGORIES: Category[] = ["All", "Veg", "Non-Veg", "Combo"];

// ── Dish Card ─────────────────────────────────────────────────────────────────
function DishCard({
  dish,
  onToggle,
}: {
  dish: Dish;
  onToggle: (id: string) => void;
}) {
  const isActive = dish.status === "Active";

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
          backgroundColor: dish.bg,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        <Text style={{ fontSize: 34 }}>{dish.emoji}</Text>
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
            <Ionicons
              name="ellipsis-vertical"
              size={16}
              color={colors.muted}
            />
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
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: colors.primaryDark,
            }}
          >
            ₹{dish.price}
          </Text>
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
              }}
            >
              {dish.status}
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
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [dishes, setDishes] = useState<Dish[]>(DISHES);

  const filtered = dishes.filter((d) => {
    const matchCat =
      activeCategory === "All" || d.category === activeCategory;
    const matchSearch = d.name
      .toLowerCase()
      .includes(search.toLowerCase().trim());
    return matchCat && matchSearch;
  });

  const toggleStatus = (id: string) => {
    setDishes((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: d.status === "Active" ? "Inactive" : "Active" }
          : d
      )
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      {/* ── Header ── */}
      <PageHeader
        title="My Dishes"
        onLeftPress={() => {}}
        leftIcon="menu-outline"
        rightActions={[
          {
            customContent: (
              <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.primary,
                  borderRadius: 50,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  gap: 5,
                }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                  Add Dish
                </Text>
              </Pressable>
            ),
          },
        ]}
      />

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
            placeholder="Search your dishes..."
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
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.muted}
              />
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
        {filtered.length === 0 ? (
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
              No dishes found
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

      <BottomBar />
    </View>
  );
}
