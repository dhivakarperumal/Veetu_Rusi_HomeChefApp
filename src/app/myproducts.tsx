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
  Alert
} from "react-native";
import api, { API_BASE_URL, getStoredUser } from "../api";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";
import TopHeader from "./componets/topheader";

const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const resolveImageUrl = (path: string) => {
  if (!path) return path;
  let resolvedPath = path;
  if (path.includes("localhost:5000")) {
    resolvedPath = path.replace(/https?:\/\/localhost:5000/g, IMAGE_BASE_URL);
  } else if (path.includes("127.0.0.1:5000")) {
    resolvedPath = path.replace(/https?:\/\/127.0.0.1:5000/g, IMAGE_BASE_URL);
  }
  if (resolvedPath.startsWith("http")) return resolvedPath;
  return resolvedPath.startsWith("/")
    ? `${IMAGE_BASE_URL}${resolvedPath}`
    : `${IMAGE_BASE_URL}/${resolvedPath}`;
};

const getProductImage = (product: any) => {
  try {
    if (product.images) {
      let imgs = product.images;
      if (typeof imgs === 'string') {
        try { imgs = JSON.parse(imgs); } catch { imgs = null; }
      }
      if (typeof imgs === 'string') {
        try { imgs = JSON.parse(imgs); } catch { imgs = null; }
      }
      if (Array.isArray(imgs) && imgs.length > 0 && imgs[0]) {
        return resolveImageUrl(imgs[0]);
      }
    }
    if (product.packaging_image) {
      return resolveImageUrl(product.packaging_image);
    }
    if (product.variants?.length > 0 && product.variants[0]?.images) {
      let imgs = product.variants[0].images;
      if (typeof imgs === 'string') {
        try { imgs = JSON.parse(imgs); } catch { imgs = null; }
      }
      if (Array.isArray(imgs) && imgs.length > 0 && imgs[0]) {
        return resolveImageUrl(imgs[0]);
      }
    }
  } catch (e) {
    console.error('Error parsing images:', e);
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name || 'P')}&background=10b981&color=fff&size=400`;
};

function ProductCard({
  product,
  onDelete,
  onEdit,
}: {
  product: any;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const isActive = (product.status || "").toLowerCase() === "active";
  const imageUri = getProductImage(product);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        marginBottom: 12,
        padding: 12,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <Image
        source={{ uri: imageUri }}
        style={{ width: 80, height: 80, borderRadius: 16, marginRight: 14 }}
        contentFit="cover"
      />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primaryDark, flex: 1 }} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable onPress={() => onEdit(product.id)} hitSlop={8}>
              <Ionicons name="pencil" size={18} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => onDelete(product.id)} hitSlop={8}>
              <Ionicons name="trash" size={18} color="#C62828" />
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primaryDark }}>
              ₹{Number(product.price || 0).toFixed(2).replace(/\.00$/, "")}
            </Text>
            {product.mrp && product.mrp > product.price && (
              <Text style={{ fontSize: 12, fontWeight: "500", color: colors.muted, textDecorationLine: "line-through" }}>
                ₹{Number(product.mrp).toFixed(2).replace(/\.00$/, "")}
              </Text>
            )}
          </View>
          <View style={{
            backgroundColor: isActive ? "#E8F5E9" : (product.status === 'Low Stock' ? '#FFF8E1' : "#FFEBEE"),
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}>
            <Text style={{
              fontSize: 12,
              fontWeight: "700",
              color: isActive ? "#2E7D32" : (product.status === 'Low Stock' ? '#F57F17' : "#C62828"),
              textTransform: "capitalize",
            }}>
              {product.status || "Inactive"}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: colors.muted }}>
           {product.category || "Uncategorized"}
        </Text>
      </View>
    </View>
  );
}

export default function MyProductsScreen() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const user = await getStoredUser();
      const chefUserId = user?.user_id || user?.id;
      if (!chefUserId) return setProducts([]);
      
      const res = await api.get(`/products/user/${chefUserId}`);
      let allItems = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setProducts(allItems);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/chef/add-products/${id}` as any);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to delete this product?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/products/${id}`);
              setProducts(prev => prev.filter(p => p.id !== id));
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.product_code?.includes(searchTerm) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      <TopHeader showHero={false} title="My Products" />

      <View style={{ backgroundColor: colors.pageBackground, paddingTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 14, backgroundColor: colors.cardBackground, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 10, gap: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1 }}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search products..."
            placeholderTextColor={colors.muted}
            style={{ flex: 1, fontSize: 14, color: colors.primaryDark, padding: 0 }}
          />
          {searchTerm.length > 0 && (
            <Pressable onPress={() => setSearchTerm("")}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 }}>
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, color: colors.muted }}>Loading products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
            <Ionicons name="cube-outline" size={48} color={colors.muted} style={{ marginBottom: 14 }} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primaryDark }}>No products found</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, textAlign: "center" }}>Try a different search term.</Text>
          </View>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onDelete={handleDelete} onEdit={handleEdit} />
          ))
        )}
      </ScrollView>

      <Pressable onPress={() => router.push("/chef/add-products/new" as any)} style={{ position: "absolute", right: 20, bottom: 130, width: 58, height: 58, borderRadius: 29, backgroundColor: "#E65100", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.18, shadowOffset: { width: 0, height: 6 }, shadowRadius: 10, elevation: 6 }}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      <BottomBar />
    </View>
  );
}
