import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import PageHeader from "./componets/pageheader";

const DIETARY_OPTIONS = ["veg", "non-veg"];
const PACKAGING_OPTIONS = ["Pouch", "Box", "Foil", "Bottle", "Packet"];
const CUISINE_OPTIONS = ["North Indian", "South Indian", "Continental", "Chinese", "Italian"];
const CATEGORY_OPTIONS = ["Main Course", "Rice", "Snacks", "Desserts"];

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

export default function AddDishScreen() {
  const router = useRouter();
  
  const [form, setForm] = useState({
    category: "Main Course",
    product_type: "Food",
    name: "",
    description: "",
    cuisine: "North Indian",
    prep_time: "",
    preparation_url: "",
    shelf_life_days: "",
    mrp: "",
    offer: "",
    dietary_tag: "non-veg",
    net_weight: "",
    packaging_type: "Box",
    ingredients: "",
    instructions: "",
  });

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const finalPrice = useMemo(() => {
    const mrp = parseFloat(form.mrp) || 0;
    const offer = parseFloat(form.offer) || 0;
    const computed = mrp - mrp * (offer / 100);
    return computed > 0 ? computed.toFixed(2) : "0.00";
  }, [form.mrp, form.offer]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      <PageHeader
        title="Add New Dish"
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
        
        <FormGroup label="Dish Name">
          <InputField
            value={form.name}
            onChangeText={(t) => updateForm("name", t)}
            placeholder="e.g. Chicken Biryani"
          />
        </FormGroup>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormGroup label="Category">
              <InputField
                value={form.category}
                onChangeText={(t) => updateForm("category", t)}
                placeholder="Category"
              />
            </FormGroup>
          </View>
          <View style={{ flex: 1 }}>
            <FormGroup label="Cuisine">
              <InputField
                value={form.cuisine}
                onChangeText={(t) => updateForm("cuisine", t)}
                placeholder="Cuisine"
              />
            </FormGroup>
          </View>
        </View>

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
            <FormGroup label="MRP">
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
                value={finalPrice}
                placeholder="0.00"
                editable={false}
              />
            </FormGroup>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormGroup label="Packaging Type">
              <InputField
                value={form.packaging_type}
                onChangeText={(t) => updateForm("packaging_type", t)}
                placeholder="e.g. Box"
              />
            </FormGroup>
          </View>
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

        {/* ── Ingredients & Instructions ── */}
        <SectionHeader title="Details & Instructions" />

        <FormGroup label="Description">
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
                style={{
                  backgroundColor: "#EAF4EA",
                  borderRadius: 16,
                  height: 140,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "#C9DCCF",
                  borderStyle: "dashed",
                }}
              >
                <Ionicons name="image-outline" size={32} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primaryDark, marginTop: 8 }}>
                  Upload Food
                </Text>
              </Pressable>
            </FormGroup>
          </View>

          <View style={{ flex: 1 }}>
            <FormGroup label="Packaging Image">
              <Pressable
                style={{
                  backgroundColor: "#F3E5F5",
                  borderRadius: 16,
                  height: 140,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "#E1BEE7",
                  borderStyle: "dashed",
                }}
              >
                <Ionicons name="cube-outline" size={32} color="#8E24AA" />
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primaryDark, marginTop: 8 }}>
                  Upload Package
                </Text>
              </Pressable>
            </FormGroup>
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={{
            backgroundColor: colors.primary,
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
          <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>
            Save Dish
          </Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}
