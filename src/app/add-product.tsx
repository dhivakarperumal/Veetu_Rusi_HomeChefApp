import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View, ActivityIndicator } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { getStoredUser } from "../api";
import { colors } from "../theme/colors";
import PageHeader from "./componets/pageheader";

const DIETARY_OPTIONS = ["veg", "non-veg"];
const PACKAGING_OPTIONS = ["Pouch", "Box", "Foil", "Bottle", "Packet"];
const CUISINE_OPTIONS = ["Multi Cuisine", "North Indian", "South Indian", "Continental", "Chinese", "Italian", "Thai", "Mexican"];
const PRODUCT_TYPE_OPTIONS = ["Food", "Food Product"];

function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (date: string) => void;
}) {
  const [show, setShow] = useState(false);
  const parsed = value ? new Date(value) : new Date();
  const isValid = value && !isNaN(new Date(value).getTime());

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primaryDark, marginBottom: 8 }}>
        {label}
      </Text>
      <Pressable
        onPress={() => setShow(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 14,
          gap: 10,
        }}
      >
        <Ionicons name="calendar-outline" size={18} color={isValid ? colors.primary : colors.muted} />
        <Text style={{ fontSize: 15, color: isValid ? colors.primaryDark : colors.muted, flex: 1 }}>
          {isValid ? value : "Select date"}
        </Text>
        {isValid && (
          <Pressable onPress={() => onChange("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </Pressable>
      {show && (
        <DateTimePicker
          value={parsed}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_event: any, selected?: Date) => {
            setShow(Platform.OS === "ios");
            if (selected) {
              onChange(selected.toISOString().slice(0, 10));
            }
            if (Platform.OS !== "ios") setShow(false);
          }}
        />
      )}
    </View>
  );
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
  product_type: "Food Product",
  name: "",
  description: "",
  subcategory: "",
  cuisine: "",
  product_code: "",
  total_stock: "0",
  rating: "5",
  status: "Inactive",
  material: "",
  nutrition_info: "",
  storage_instructions: "Keep Refrigerated",
  presentation_style: "",
  portion_format: "",
  service_type: "",
  packaging_notes: "",
  heat_profile: "",
  serving_size: "",
  spice_level: "Medium",
  prep_time: "",
  preparation_url: "",
  shelf_life_days: "",
  mrp: "",
  offer: "",
  final_price: "",
  dietary_tag: "veg",
  net_weight: "",
  package_count: "",
  packaging_type: "Pouch",
  manufacture_date: "",
  expiry_date: "",
  packaging_image: "",
  images: [] as string[]
};

export default function AddProductScreen() {
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
        const res = await api.get(`/products/${id}`);
        // Handle potentially nested data
        const item = res.data?.data || res.data;
        if (!item) return;

        setForm({
          ...initialForm,
          category: item.category || "",
          product_type: item.product_type || "Food Product",
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
          total_stock: item.total_stock?.toString() || "0",
          status: item.status || "Active",
          images: Array.isArray(item.images) ? item.images : (item.images ? JSON.parse(item.images) : [])
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
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Img = `data:image/jpeg;base64,${asset.base64}`;
        if (field === 'images') {
          setForm(prev => ({ ...prev, images: [base64Img] }));
        } else {
          setForm(prev => ({ ...prev, packaging_image: base64Img }));
        }
      }
    } catch (e) {
      console.error("Image pick error:", e);
      Alert.alert("Error", "Could not select image.");
    }
  };

  const handleSubmit = async () => {
    if (!form.category || !form.name || !form.description || !form.mrp) {
      Alert.alert("Missing Fields", "Please complete all required fields (Name, Category, Description, MRP).");
      return;
    }
    
    setLoading(true);
    
    // Construct single variant based on form MRP/Offer
    const singleVariant = {
      weight: form.net_weight || null,
      price: Number(form.mrp) || 0,
      offer: Number(form.offer) || 0,
      final_price: Number(computedFinalPrice) || 0,
      stock: Number(form.total_stock) || 0,
      images: []
    };

    const payload = {
      ...form,
      shelf_life_days: form.shelf_life_days ? Number(form.shelf_life_days) : null,
      mrp: Number(form.mrp) || 0,
      offer: Number(form.offer) || 0,
      offer_price: Number(computedFinalPrice) || 0,
      product_type: form.product_type || "Food Product",
      packaging_image: form.packaging_image || null,
      preparation_url: form.preparation_url || null,
      total_stock: Number(form.total_stock) || 0,
      variants: [singleVariant],
      status: form.status || "Active",
    };

    try {
      if (id && id !== 'new') {
        await api.put(`/products/${id}`, payload);
        Alert.alert("Success", "Product updated successfully.");
      } else {
        await api.post("/products", payload);
        Alert.alert("Success", "Product added successfully.");
      }
      router.back();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.response?.data?.message || "Failed to save product.");
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
        title={id && id !== 'new' ? "Edit Product" : "Add New Product"}
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
        {/* ── Product Details ── */}
        <SectionHeader title="Product Details" />
        
        <FormGroup label="Product Name *">
          <InputField
            value={form.name}
            onChangeText={(t) => updateForm("name", t)}
            placeholder="e.g. Chicken Biryani or Turmeric Powder"
          />
        </FormGroup>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormGroup label="Product Code">
              <InputField
                value={form.product_code}
                onChangeText={(t) => updateForm("product_code", t)}
                placeholder="e.g. P123"
              />
            </FormGroup>
          </View>
          <View style={{ flex: 1 }}>
            <FormGroup label="Subcategory">
              <InputField
                value={form.subcategory}
                onChangeText={(t) => updateForm("subcategory", t)}
                placeholder="e.g. Spices"
              />
            </FormGroup>
          </View>
        </View>

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
            <FormGroup label="Spice Level">
              <InputField
                value={form.spice_level}
                onChangeText={(t) => updateForm("spice_level", t)}
                placeholder="e.g. Medium"
              />
            </FormGroup>
          </View>
        </View>

        <SectionHeader title="Product Info" />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormGroup label="Storage Instructions">
              <InputField
                value={form.storage_instructions}
                onChangeText={(t) => updateForm("storage_instructions", t)}
                placeholder="e.g. Keep Refrigerated"
              />
            </FormGroup>
          </View>
          <View style={{ flex: 1 }}>
            <FormGroup label="Serving Size">
              <InputField
                value={form.serving_size}
                onChangeText={(t) => updateForm("serving_size", t)}
                placeholder="e.g. 2 Persons"
              />
            </FormGroup>
          </View>
        </View>

        <FormGroup label="Nutrition Info">
          <InputField
            value={form.nutrition_info}
            onChangeText={(t) => updateForm("nutrition_info", t)}
            placeholder="e.g. Calories: 250, Protein: 10g"
            multiline
          />
        </FormGroup>

        <FormGroup label="Material / Ingredients">
          <InputField
            value={form.material}
            onChangeText={(t) => updateForm("material", t)}
            placeholder="e.g. Cotton (for non-food) or Main ingredients..."
          />
        </FormGroup>

        {/* ── Pricing & Packaging ── */}
        <SectionHeader title="Pricing & Inventory" />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormGroup label="Total Stock">
              <InputField
                value={form.total_stock}
                onChangeText={(t) => updateForm("total_stock", t)}
                placeholder="0"
                keyboardType="numeric"
              />
            </FormGroup>
          </View>
          <View style={{ flex: 1 }}>
            <FormGroup label="Status">
              <View style={{ flexDirection: "row", gap: 10 }}>
                {["Active", "Inactive"].map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => updateForm("status", opt)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      alignItems: "center",
                      borderColor: form.status === opt ? colors.primary : colors.border,
                      backgroundColor: form.status === opt ? "#E8F5E9" : colors.cardBackground,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: form.status === opt ? colors.primary : colors.primaryDark,
                      }}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </FormGroup>
          </View>
        </View>

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

        <SectionHeader title="Packaging Details" />

        <View style={{ flexDirection: "row", gap: 12 }}>
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
          <View style={{ flex: 1 }}>
            <FormGroup label="Package Count">
              <InputField
                value={form.package_count}
                onChangeText={(t) => updateForm("package_count", t)}
                placeholder="e.g. 1"
                keyboardType="numeric"
              />
            </FormGroup>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <DatePickerField
              label="Manufacture Date"
              value={form.manufacture_date}
              onChange={(d) => updateForm("manufacture_date", d)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DatePickerField
              label="Expiry Date"
              value={form.expiry_date}
              onChange={(d) => updateForm("expiry_date", d)}
            />
          </View>
        </View>

        <FormGroup label="Packaging Notes">
          <InputField
            value={form.packaging_notes}
            onChangeText={(t) => updateForm("packaging_notes", t)}
            placeholder="Any specific packaging notes..."
          />
        </FormGroup>

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

        {/* ── Instructions & Description ── */}
        <SectionHeader title="Instructions & Description" />

        <FormGroup label="Description *">
          <InputField
            value={form.description}
            onChangeText={(t) => updateForm("description", t)}
            placeholder="Add a short description..."
            multiline
          />
        </FormGroup>

        <FormGroup label="Ingredients List">
          <InputField
            value={form.ingredients}
            onChangeText={(t) => updateForm("ingredients", t)}
            placeholder="Detailed list of ingredients..."
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
            <FormGroup label="Product Image">
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
                  Upload Product Image
                </Text>
                {form.images.length > 0 && <Text style={{ fontSize: 11, color: colors.primary, marginTop: 4 }}>Image Selected</Text>}
              </Pressable>
            </FormGroup>
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
                {form.packaging_image ? <Text style={{ fontSize: 11, color: '#8E24AA', marginTop: 4 }}>Image Selected</Text> : null}
              </Pressable>
            </FormGroup>
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
               {id && id !== 'new' ? 'Save Changes' : 'Save Product'}
             </Text>
          )}
        </Pressable>

      </ScrollView>
    </View>
  );
}
