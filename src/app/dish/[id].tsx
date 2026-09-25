import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import api, { API_BASE_URL } from "../../api";
import { showAppDialog } from "../../lib/app-dialog";
import { colors } from "../../theme/colors";
import PageHeader from "../componets/pageheader";

const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

function parseImageCollection(value: unknown): string[] {
  let parsed = value;
  for (let pass = 0; pass < 2 && typeof parsed === "string"; pass += 1) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
  }
  const values = Array.isArray(parsed) ? parsed : [parsed];
  return values
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => {
      const image = item.trim();
      if (/^(https?:\/\/|data:)/i.test(image)) return image;
      return image.startsWith("/") ? `${IMAGE_BASE_URL}${image}` : `${IMAGE_BASE_URL}/${image}`;
    });
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ color: colors.muted, fontSize: 14 }}>{label}</Text>
      <Text style={{ flex: 1, marginLeft: 18, textAlign: "right", color: colors.primaryDark, fontSize: 14, fontWeight: "700" }}>{String(value)}</Text>
    </View>
  );
}

export default function DishDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dish, setDish] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDish = async () => {
      try {
        const response = await api.get(`/chef-foods/${id}`);
        setDish(response.data?.data || response.data);
      } catch (error: any) {
        console.error("Failed to load dish details", error);
        showAppDialog("Could not load dish", error?.message || "Please try again.");
      } finally {
        setLoading(false);
      }
    };
    if (id) void loadDish();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.pageBackground }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!dish) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
        <PageHeader title="Dish Details" onLeftPress={() => router.back()} leftIcon="arrow-back" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: colors.muted }}>Dish details are unavailable.</Text>
        </View>
      </View>
    );
  }

  const images = Array.from(new Set([
    ...parseImageCollection(dish.images),
    ...parseImageCollection(dish.packaging_image),
  ]));
  const finalPrice = dish.final_price || dish.mrp || dish.price || 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      <PageHeader title="Dish Details" onLeftPress={() => router.back()} leftIcon="arrow-back" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        {images.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }}>
            {images.map((image, index) => (
              <Image key={`${image}-${index}`} source={{ uri: image }} style={{ width: 360, height: 250, marginHorizontal: 18, borderRadius: 18 }} contentFit="cover" />
            ))}
          </ScrollView>
        ) : (
          <View style={{ height: 180, borderRadius: 18, backgroundColor: colors.softCard, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="image-outline" size={42} color={colors.muted} />
          </View>
        )}

        <Text style={{ marginTop: 22, fontSize: 26, fontWeight: "800", color: colors.primaryDark }}>{dish.name || "Dish"}</Text>
        <Text style={{ marginTop: 8, fontSize: 24, fontWeight: "800", color: colors.primary }}>₹{Number(finalPrice).toFixed(2)}</Text>

        <View style={{ marginTop: 20, padding: 16, borderRadius: 16, backgroundColor: colors.cardBackground }}>
          <DetailRow label="Category" value={dish.category} />
          <DetailRow label="Cuisine" value={dish.cuisine} />
          <DetailRow label="Dietary tag" value={dish.dietary_tag} />
          <DetailRow label="Net weight" value={dish.net_weight} />
          <DetailRow label="Packaging" value={dish.packaging_type} />
          <DetailRow label="MRP" value={dish.mrp ? `₹${dish.mrp}` : null} />
          <DetailRow label="Offer" value={dish.offer ? `${dish.offer}%` : null} />
          <DetailRow label="Shelf life" value={dish.shelf_life_days ? `${dish.shelf_life_days} days` : null} />
          <DetailRow label="Status" value={dish.status} />
        </View>

        {[
          ["Description", dish.description],
          ["Ingredients", dish.ingredients],
          ["Instructions", dish.instructions],
        ].map(([title, value]) => value ? (
          <View key={String(title)} style={{ marginTop: 22 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.primaryDark, marginBottom: 8 }}>{title}</Text>
            <Text style={{ fontSize: 15, lineHeight: 23, color: colors.primaryDark }}>{String(value)}</Text>
          </View>
        ) : null)}

        <Pressable onPress={() => router.push({ pathname: "/add-dish", params: { id: String(dish.id || id) } } as any)} style={{ marginTop: 28, borderRadius: 14, paddingVertical: 15, alignItems: "center", backgroundColor: colors.primary }}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>Edit Dish</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
