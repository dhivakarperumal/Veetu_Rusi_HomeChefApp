import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";
import PageHeader from "./componets/pageheader";

// ── Types & Mock Data ────────────────────────────────────────────────────────
type Category = { id: string; name: string; emoji?: string; icon?: string };

const CATEGORIES: Category[] = [
  { id: "1", name: "Biryani", emoji: "🥘" },
  { id: "2", name: "Rice", emoji: "🍚" },
  { id: "3", name: "Curry", emoji: "🍲" },
  { id: "4", name: "Snacks", emoji: "🥟" },
  { id: "5", name: "More", icon: "ellipsis-horizontal" },
];

interface Dish {
  id: string;
  name: string;
  price: number;
  rating: number;
  isActive: boolean;
  category: string;
}

const INITIAL_DISHES: Dish[] = [
  { id: "d1", name: "Chicken Biryani", price: 150, rating: 4.8, isActive: true, category: "Biryani Dishes" },
  { id: "d2", name: "Mutton Biryani", price: 180, rating: 4.7, isActive: true, category: "Biryani Dishes" },
  { id: "d3", name: "Veg Biryani", price: 120, rating: 4.6, isActive: true, category: "Biryani Dishes" },
  { id: "d4", name: "Veg Meals Combo", price: 130, rating: 4.7, isActive: true, category: "Combo Dishes" },
];

// ── Components ────────────────────────────────────────────────────────────────

function SectionHeader({ title, showAdd = false }: { title: string; showAdd?: boolean }) {
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
        <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
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
export default function DishesScreen() {
  const router = useRouter();
  const [activeCatId, setActiveCatId] = useState("1");
  const [dishes, setDishes] = useState<Dish[]>(INITIAL_DISHES);

  const toggleDish = (id: string) => {
    setDishes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isActive: !d.isActive } : d))
    );
  };

  const biryaniDishes = dishes.filter((d) => d.category === "Biryani Dishes");
  const comboDishes = dishes.filter((d) => d.category === "Combo Dishes");

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      {/* ── Header ── */}
      <PageHeader
        title="Menu"
        centerTitle
        onLeftPress={() => router.back()}
        leftIcon="arrow-back"
        rightActions={[
          {
            customContent: (
              <Pressable hitSlop={10}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary }}>
                  Edit
                </Text>
              </Pressable>
            ),
          },
        ]}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Categories ── */}
        <SectionHeader title="Categories" showAdd />
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        >
          {CATEGORIES.map((cat) => {
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
                {/* Inner Circle */}
                <View
                  style={{
                    height: 40,
                    width: 40,
                    borderRadius: 20,
                    backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "#FFF3E0",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  {cat.icon ? (
                    <Ionicons
                      name={cat.icon as any}
                      size={20}
                      color={isActive ? "#fff" : colors.primaryDark}
                    />
                  ) : (
                    <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: isActive ? "#fff" : colors.primaryDark,
                  }}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Biryani Dishes ── */}
        <SectionHeader title="Biryani Dishes" />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {biryaniDishes.map((dish) => (
            <View
              key={dish.id}
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
              <Image
                source={require("../../assets/images/dish_photos_grid.jpg")}
                style={{ height: 74, width: 74, borderRadius: 12, marginRight: 14 }}
                contentFit="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primaryDark, marginBottom: 4 }}>
                  {dish.name}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "800", color: colors.primaryDark, marginBottom: 6 }}>
                  ₹{dish.price}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primaryDark }}>
                    {dish.rating}
                  </Text>
                </View>
              </View>
              <Switch
                value={dish.isActive}
                onValueChange={() => toggleDish(dish.id)}
                trackColor={{ false: "#E0E0E0", true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* ── Combo Dishes ── */}
        <SectionHeader title="Combo Dishes" showAdd />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {comboDishes.map((dish) => (
            <View
              key={dish.id}
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
              <Image
                source={require("../../assets/images/dish_photos_grid.jpg")}
                style={{ height: 74, width: 74, borderRadius: 12, marginRight: 14 }}
                contentFit="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primaryDark, marginBottom: 4 }}>
                  {dish.name}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "800", color: colors.primaryDark, marginBottom: 6 }}>
                  ₹{dish.price}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primaryDark }}>
                    {dish.rating}
                  </Text>
                </View>
              </View>
              <Switch
                value={dish.isActive}
                onValueChange={() => toggleDish(dish.id)}
                trackColor={{ false: "#E0E0E0", true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomBar />
    </View>
  );
}
