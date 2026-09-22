import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import api, { getStoredUser } from "../api";
import { showAppDialog } from "../lib/app-dialog";
import { colors } from "../theme/colors";
import PageHeader from "./componets/pageheader";

const DIETARY_OPTIONS = ["veg", "non-veg"];
const PACKAGING_OPTIONS = ["Pouch", "Box", "Foil", "Bottle", "Packet"];
const CUISINE_OPTIONS = ["Multi Cuisine", "North Indian", "South Indian", "Continental", "Chinese", "Italian", "Thai", "Mexican"];
const PRODUCT_TYPE_OPTIONS = ["Food", "Food Product"];

function parseImageCollection(value: unknown): string[] {
  let parsed = value;
  for (let pass = 0; pass < 2 && typeof parsed === "string"; pass += 1) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
  }
  if (Array.isArray(parsed)) {
    return parsed.filter((image): image is string => typeof image === "string" && image.trim().length > 0);
  }
  return typeof parsed === "string" && parsed.trim() ? [parsed.trim()] : [];
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: colors.primaryDark,
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function InputField({
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  prefix,
  editable = true,
}: {
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "url";
  multiline?: boolean;
  prefix?: string;
  editable?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: editable ? colors.cardBackground : "#f5f5f5",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
      }}
    >
      {prefix && (
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primaryDark, marginRight: 8 }}>
          {prefix}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        editable={editable}
        style={{
          flex: 1,
          paddingVertical: multiline ? 12 : 14,
          fontSize: 15,
          color: editable ? colors.primaryDark : colors.muted,
          minHeight: multiline ? 100 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 18,
        fontWeight: "800",
        color: colors.primaryDark,
        marginTop: 24,
        marginBottom: 16,
      }}
    >
      {title}
    </Text>
  );
}

const initialForm = {
  category: "",
  product_type: "Food",
  name: "",
  description: "",
  cuisine: "Multi Cuisine",
  prep_time: "",
  preparation_url: "",
  shelf_life_days: "",
  mrp: "",
  offer: "",
  final_price: "",
  dietary_tag: "veg",
  net_weight: "",
  packaging_type: "Pouch",
  packaging_image: "",
  ingredients: "",
  instructions: "",
  images: [] as string[]
};

export default function AddDishScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  useEffect(() => {
    const loadInit = async () => {
      try {
        const user = await getStoredUser();
        setProfile(user);
      } catch (e) {
        console.error(e);
      }
      setFetching(false);
    };
    loadInit();
  }, []);

  useEffect(() => {
    if (!profile) return;
    const loadCategories = async () => {
      try {
        let adminUserId = null;
        try {
          const profileRes = await api.get('/auth/profile');
          const homeChef = profileRes.data?.homeChef || null;
          adminUserId = homeChef?.created_by || homeChef?.franchise_user_id || homeChef?.created_by_user_id || null;
        } catch {
          // fallback
        }

        const res = await api.get("/home-chef-categories");
        // robust check in case it's nested
        const allCategories = Array.isArray(res.data) 
          ? res.data 
          : (res.data?.data || res.data?.categories || res.data?.homeChefCategories || []);

        let filtered = allCategories;

        if (adminUserId) {
          filtered = filtered.filter((cat: any) =>
            String(cat.created_by) === String(adminUserId) ||
            String(cat.created_by_user_id) === String(adminUserId) ||
            String(cat.franchise_user_id) === String(adminUserId)
          );
        }
        setCategories(filtered);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };
    loadCategories();
  }, [profile]);

  useEffect(() => {
    if (!profile || !id || id === 'new') return;
    const loadFood = async () => {
      try {
        setFetching(true);
        const res = await api.get(`/chef-foods/${id}`);
        const item = res.data;
        if (!item) return;
        setForm({
          category: item.category || "",
          product_type: item.product_type || "Food",
          name: item.name || "",
          description: item.description || "",
          cuisine: item.cuisine || "",
          prep_time: item.prep_time || "",
          preparation_url: item.preparation_url || "",
          shelf_life_days: item.shelf_life_days?.toString() || "",
          mrp: item.mrp?.toString() || "",
          offer: item.offer?.toString() || "",
          final_price: item.final_price?.toString() || "",
          dietary_tag: item.dietary_tag || "veg",
          net_weight: item.net_weight || "",
          packaging_type: item.packaging_type || "Pouch",
          packaging_image: item.packaging_image || "",
          ingredients: item.ingredients || "",
          instructions: item.instructions || "",
          images: parseImageCollection(item.images)
        });
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    loadFood();
  }, [profile, id]);

  const updateForm = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const computedFinalPrice = useMemo(() => {
    const mrp = parseFloat(form.mrp) || 0;
    const offer = parseFloat(form.offer) || 0;
    const computed = mrp - mrp * (offer / 100);
    return computed > 0 ? computed.toFixed(2) : "0.00";
  }, [form.mrp, form.offer]);

  const handlePickImage = async (field: 'images' | 'packaging_image') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAppDialog("Permission denied", "Please allow camera roll access to upload images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: field !== "images",
        allowsMultipleSelection: field === "images",
        selectionLimit: field === "images" ? 8 : 1,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (field === 'images') {
          const selectedImages = result.assets
            .filter((asset) => asset.base64)
            .map((asset) => `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`);
          setForm((prev) => ({
            ...prev,
            images: [...prev.images, ...selectedImages].slice(0, 8),
          }));
        } else {
          const asset = result.assets[0];
          const base64Img = `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`;
          setForm(prev => ({ ...prev, packaging_image: base64Img }));
        }
      }
    } catch (e) {
      console.error("Image pick error:", e);
      showAppDialog("Could not select image", "Please try choosing the image again.");
    }
  };

  const removeDishImage = (index: number) => {
    setForm((previous) => ({
      ...previous,
      images: previous.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!form.category || !form.name || !form.description || !form.mrp) {
      showAppDialog("Missing details", "Please complete the required name, category, description, and MRP fields.");
      return;
    }
    
    setLoading(true);
    const payload = {
      ...form,
      shelf_life_days: form.shelf_life_days ? Number(form.shelf_life_days) : null,
      mrp: Number(form.mrp),
      product_type: form.product_type || "Food",
      offer: Number(form.offer) || 0,
      final_price: Number(computedFinalPrice) || null,
      packaging_image: form.packaging_image || null,
      preparation_url: form.preparation_url || null
    };

    try {
      if (id && id !== 'new') {
        await api.put(`/chef-foods/${id}`, payload);
        showAppDialog("Dish updated", "Your food item was updated successfully.");
      } else {
        await api.post("/chef-foods", payload);
        showAppDialog("Dish added", "Your new food item is ready in your menu.");
      }
      router.back();
    } catch (err: any) {
      console.error(err);
      showAppDialog("Could not save dish", err.response?.data?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pageBackground }}>
         <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      <PageHeader
        title={id && id !== 'new' ? "Edit Dish" : "Add New Dish"}
        onLeftPress={() => router.back()}
        leftIcon="arrow-back"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingBottom: 40,
        }}
      >
        {/* ── Food Details ── */}
        <SectionHeader title="Food Details" />
        
        <FormGroup label="Dish Name *">
          <InputField
            value={form.name}
            onChangeText={(t) => updateForm("name", t)}
            placeholder="e.g. Chicken Biryani"
          />
        </FormGroup>

        <FormGroup label="Product Type *">
          <View style={{ flexDirection: "row", gap: 10 }}>
            {PRODUCT_TYPE_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => updateForm("product_type", opt)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  alignItems: "center",
                  borderColor: form.product_type === opt ? colors.primary : colors.border,
                  backgroundColor: form.product_type === opt ? "#E8F5E9" : colors.cardBackground,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: form.product_type === opt ? colors.primary : colors.primaryDark,
                  }}
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        </FormGroup>

        <FormGroup label="Category *">
          {categories.filter(c => {
            const t = (c.category_type || "").toLowerCase();
            const f = (form.product_type || "food").toLowerCase();
            return f === "food product" ? (t === "food product" || t === "food products") : t === "food";
          }).length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.muted }}>No categories available for this type.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {categories
                .filter(c => {
                  const t = (c.category_type || "").toLowerCase();
                  const f = (form.product_type || "food").toLowerCase();
                  return f === "food product" ? (t === "food product" || t === "food products") : t === "food";
                })
                .map((cat, idx) => {
                  const catName = cat.c_name || cat.name || cat.category_name || "Unknown";
                  const isSelected = form.category === catName;
                  return (
                    <Pressable
                      key={cat.id || idx}
                      onPress={() => updateForm("category", catName)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? "#E8F5E9" : colors.cardBackground,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: isSelected ? colors.primary : colors.primaryDark,
                        }}
                      >
                        {catName}
                      </Text>
                    </Pressable>
                  );
              })}
            </ScrollView>
          )}
        </FormGroup>

        <FormGroup label="Cuisine">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {CUISINE_OPTIONS.map((opt) => {
              const isSelected = form.cuisine === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => updateForm("cuisine", opt)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? "#E8F5E9" : colors.cardBackground,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: isSelected ? colors.primary : colors.primaryDark,
                    }}
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </FormGroup>

        <FormGroup label="Dietary Tag">
          <View style={{ flexDirection: "row", gap: 10 }}>
            {DIETARY_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => updateForm("dietary_tag", opt)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  alignItems: "center",
                  borderColor: form.dietary_tag === opt ? colors.primary : colors.border,
                  backgroundColor: form.dietary_tag === opt ? "#E8F5E9" : colors.cardBackground,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    textTransform: "capitalize",
                    color: form.dietary_tag === opt ? colors.primary : colors.primaryDark,
                  }}
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        </FormGroup>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormGroup label="Preparation Time">
              <InputField
                value={form.prep_time}
                onChangeText={(t) => updateForm("prep_time", t)}
                placeholder="e.g. 30 mins"
              />
            </FormGroup>
          </View>
          <View style={{ flex: 1 }}>
            <FormGroup label="Shelf Life (Days)">
              <InputField
                value={form.shelf_life_days}
                onChangeText={(t) => updateForm("shelf_life_days", t)}
                placeholder="e.g. 2"
                keyboardType="numeric"
              />
            </FormGroup>
          </View>
        </View>

        {/* ── Pricing & Packaging ── */}
        <SectionHeader title="Pricing & Packaging" />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormGroup label="MRP *">
              <InputField
                prefix="₹"
                value={form.mrp}
                onChangeText={(t) => updateForm("mrp", t)}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </FormGroup>
          </View>
          <View style={{ flex: 1 }}>
            <FormGroup label="Offer (%)">
              <InputField
                prefix="%"
                value={form.offer}
                onChangeText={(t) => updateForm("offer", t)}
                placeholder="0"
                keyboardType="numeric"
              />
            </FormGroup>
          </View>
          <View style={{ flex: 1 }}>
            <FormGroup label="Final Price">
              <InputField
                prefix="₹"
                value={computedFinalPrice}
                placeholder="0.00"
                editable={false}
              />
            </FormGroup>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormGroup label="Net Weight">
              <InputField
                value={form.net_weight}
                onChangeText={(t) => updateForm("net_weight", t)}
                placeholder="e.g. 500g"
              />
            </FormGroup>
          </View>
        </View>

        <FormGroup label="Packaging Type">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {PACKAGING_OPTIONS.map((opt) => {
              const isSelected = form.packaging_type === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => updateForm("packaging_type", opt)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? "#E8F5E9" : colors.cardBackground,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: isSelected ? colors.primary : colors.primaryDark,
                    }}
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </FormGroup>

        {/* ── Ingredients & Instructions ── */}
        <SectionHeader title="Details & Instructions" />

        <FormGroup label="Description *">
          <InputField
            value={form.description}
            onChangeText={(t) => updateForm("description", t)}
            placeholder="Add a short description..."
            multiline
          />
        </FormGroup>

        <FormGroup label="Ingredients">
          <InputField
            value={form.ingredients}
            onChangeText={(t) => updateForm("ingredients", t)}
            placeholder="List ingredients..."
            multiline
          />
        </FormGroup>

        <FormGroup label="Instructions / Recipe">
          <InputField
            value={form.instructions}
            onChangeText={(t) => updateForm("instructions", t)}
            placeholder="Preparation instructions..."
            multiline
          />
        </FormGroup>

        <FormGroup label="Preparation Video URL">
          <InputField
            value={form.preparation_url}
            onChangeText={(t) => updateForm("preparation_url", t)}
            placeholder="https://youtube.com/..."
            keyboardType="url"
          />
        </FormGroup>

        {/* ── Media ── */}
        <SectionHeader title="Images" />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormGroup label="Dish Image">
              <Pressable
                onPress={() => handlePickImage('images')}
                style={{
                  height: 120,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: colors.primary,
                  backgroundColor: "#E8F5E9",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="image-outline" size={32} color={colors.primary} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary, marginTop: 8 }}>
                  Upload Food Image
                </Text>
                <Text style={{ fontSize: 11, color: colors.primary, marginTop: 4 }}>
                  {form.images.length > 0
                    ? `${form.images.length} image${form.images.length === 1 ? "" : "s"} selected`
                    : "Select up to 8 images"}
                </Text>
              </Pressable>
            </FormGroup>
            {form.images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              >
                {form.images.map((image, index) => (
                  <View key={`${image.slice(0, 24)}-${index}`} style={{ position: "relative" }}>
                    <Image
                      source={{ uri: image }}
                      style={{ width: 58, height: 58, borderRadius: 10 }}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() => removeDishImage(index)}
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#C62828",
                      }}
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <FormGroup label="Packaging Image">
              <Pressable
                onPress={() => handlePickImage('packaging_image')}
                style={{
                  height: 120,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: '#BA68C8',
                  backgroundColor: "#F3E5F5",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="cube-outline" size={32} color="#8E24AA" />
                <Text style={{ fontSize: 14, fontWeight: "600", color: '#8E24AA', marginTop: 8 }}>
                  Upload Packaging Image
                </Text>
                {form.packaging_image ? <Text style={{ fontSize: 11, color: '#8E24AA', marginTop: 4 }}>Image selected</Text> : null}
              </Pressable>
            </FormGroup>
            {form.packaging_image ? (
              <Image
                source={{ uri: form.packaging_image }}
                style={{ width: "100%", height: 58, borderRadius: 10, marginTop: -8 }}
                contentFit="cover"
              />
            ) : null}
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: loading ? colors.muted : colors.primary,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 20,
            shadowColor: colors.primary,
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          {loading ? (
             <ActivityIndicator size="small" color="#fff" />
          ) : (
             <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>
               {id && id !== 'new' ? 'Save Changes' : 'Save Dish'}
             </Text>
          )}
        </Pressable>

      </ScrollView>
    </View>
  );
}
