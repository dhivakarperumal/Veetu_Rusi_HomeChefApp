import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image as ExpoImage } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import api, { API_BASE_URL, getStoredUser } from "../api";
import { showAppDialog } from "../lib/app-dialog";
import {
    deleteCachedPageData,
    hasCachedPageData,
    usePageCacheState,
} from "../lib/page-cache";
import { colors } from "../theme/colors";
import PageHeader from "./componets/pageheader";

const MAX_PRODUCT_IMAGES = 4;
const MAX_PRODUCT_PAYLOAD_CHARS = 1500000;

const DIETARY_OPTIONS = ["veg", "non-veg"];
const PACKAGING_OPTIONS = ["Pouch", "Box", "Foil", "Bottle", "Packet"];
const CUISINE_OPTIONS = [
  "Multi Cuisine",
  "North Indian",
  "South Indian",
  "Continental",
  "Chinese",
  "Italian",
  "Thai",
  "Mexican",
];

type VariantDraft = {
  weight: string;
  price: string;
  offer: string;
  stock: string;
};

const createVariant = (variant?: Partial<VariantDraft>): VariantDraft => ({
  weight: variant?.weight || "",
  price: variant?.price || "",
  offer: variant?.offer ?? "0",
  stock: variant?.stock || "",
});

const getVariantFinalPrice = (variant: VariantDraft) => {
  const price = Number(variant.price) || 0;
  const offer = Number(variant.offer) || 0;
  return Math.max(0, price - price * (offer / 100)).toFixed(2);
};

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
    return parsed.filter(
      (image): image is string =>
        typeof image === "string" && image.trim().length > 0,
    );
  }
  return typeof parsed === "string" && parsed.trim() ? [parsed.trim()] : [];
}

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

function normalizeUploadedImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const imageUrl = value.trim();
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("data:")) {
    return imageUrl;
  }
  return imageUrl.startsWith("/")
    ? `${API_ORIGIN}${imageUrl}`
    : `${API_ORIGIN}/${imageUrl}`;
}

function getUploadedImageUrls(data: any): string[] {
  const candidates =
    data?.urls ||
    data?.images ||
    data?.files ||
    data?.uploadedFiles ||
    data?.data?.urls ||
    data?.data?.images ||
    data?.data ||
    data?.url;
  const values = Array.isArray(candidates) ? candidates : [candidates];
  return values
    .map((item: any) =>
      normalizeUploadedImageUrl(item?.url || item?.path || item),
    )
    .filter((url: string | null): url is string => Boolean(url));
}

async function uploadProductImages(assets: ImagePicker.ImagePickerAsset[]) {
  const formData = new FormData();
  for (const asset of assets) {
    const compressed = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 700 } }],
      {
        compress: 0.3,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    formData.append("images", {
      uri: compressed.uri,
      name: asset.fileName || `product-image-${Date.now()}.jpg`,
      type: "image/jpeg",
    } as any);
  }

  const response = await api.post(
    "/upload/images?folder=homechefProducts",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    },
  );
  const urls = getUploadedImageUrls(response.data);
  if (urls.length !== assets.length) {
    throw new Error("The image upload did not return all image URLs.");
  }
  return urls;
}

function DatePickerField({
  label,
  required = false,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (date: string) => void;
}) {
  const [show, setShow] = useState(false);
  const parsed = value ? new Date(value) : new Date();
  const isValid = value && !isNaN(new Date(value).getTime());

  return (
    <View style={{ marginBottom: 18 }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Text
          style={{ fontSize: 13, fontWeight: "700", color: colors.primaryDark }}
        >
          {label}
        </Text>
        {required ? (
          <Text style={{ marginLeft: 4, color: "#C62828", fontWeight: "800" }}>
            *
          </Text>
        ) : null}
      </View>
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
        }}
      >
        <Text
          style={{
            fontSize: 15,
            color: isValid ? colors.primaryDark : colors.muted,
            flex: 1,
          }}
        >
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

function FormGroup({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Text
          style={{ fontSize: 13, fontWeight: "700", color: colors.primaryDark }}
        >
          {label}
        </Text>
        {required ? (
          <Text style={{ marginLeft: 4, color: "#C62828", fontWeight: "800" }}>
            *
          </Text>
        ) : null}
      </View>
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
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: colors.primaryDark,
            marginRight: 8,
          }}
        >
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
  ingredients: "",
  instructions: "",
  cuisine: "",
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
  images: [] as string[],
  variants: [createVariant()],
};

export default function AddProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const formCacheKey = `add-product.form.${id || "new"}`;

  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = usePageCacheState<any[]>(
    "add-product.categories",
    [],
  );
  const [form, setForm] = usePageCacheState(formCacheKey, initialForm);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(() =>
    Boolean(id && id !== "new" && !hasCachedPageData(formCacheKey)),
  );

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
    if (hasCachedPageData("add-product.categories")) return;
    const loadCategories = async () => {
      try {
        let adminUserId = null;
        try {
          const profileRes = await api.get("/auth/profile");
          const homeChef = profileRes.data?.homeChef || null;
          adminUserId =
            homeChef?.created_by ||
            homeChef?.franchise_user_id ||
            homeChef?.created_by_user_id ||
            null;
        } catch {
          // fallback
        }

        const res = await api.get("/home-chef-categories");
        // robust check in case it's nested
        const allCategories = Array.isArray(res.data)
          ? res.data
          : res.data?.data ||
            res.data?.categories ||
            res.data?.homeChefCategories ||
            [];

        let filtered = allCategories;

        if (adminUserId) {
          filtered = filtered.filter(
            (cat: any) =>
              String(cat.created_by) === String(adminUserId) ||
              String(cat.created_by_user_id) === String(adminUserId) ||
              String(cat.franchise_user_id) === String(adminUserId),
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
    if (!profile || !id || id === "new") return;
    if (hasCachedPageData(formCacheKey)) return;
    const loadFood = async () => {
      try {
        setFetching(true);
        const res = await api.get(`/products/${id}`);
        // Handle potentially nested data
        const item = res.data?.data || res.data;
        if (!item) return;

        let savedVariants = item.variants;
        if (typeof savedVariants === "string") {
          try {
            savedVariants = JSON.parse(savedVariants);
          } catch {
            savedVariants = [];
          }
        }
        const variants: VariantDraft[] = Array.isArray(savedVariants)
          ? savedVariants.map((variant: any) =>
              createVariant({
                weight: String(variant.weight || ""),
                price: String(variant.price ?? item.mrp ?? ""),
                offer: String(variant.offer ?? item.offer ?? 0),
                stock: String(variant.stock ?? ""),
              }),
            )
          : [];
        const firstVariant =
          variants[0] ||
          createVariant({
            weight: item.net_weight || "",
            price: String(item.mrp ?? ""),
            offer: String(item.offer ?? 0),
            stock: String(item.total_stock ?? ""),
          });

        setForm({
          ...initialForm,
          category: item.category || "",
          product_type: "Food Product",
          name: item.name || "",
          description: item.description || "",
          cuisine: item.cuisine || "",
          preparation_url: item.preparation_url || "",
          shelf_life_days: item.shelf_life_days?.toString() || "",
          mrp: firstVariant.price,
          offer: firstVariant.offer,
          final_price: item.final_price?.toString() || "",
          dietary_tag: item.dietary_tag || "veg",
          net_weight: firstVariant.weight,
          packaging_type: item.packaging_type || "Pouch",
          packaging_image: item.packaging_image || "",
          total_stock: String(
            variants.length > 0
              ? variants.reduce(
                  (total, variant) => total + (Number(variant.stock) || 0),
                  0,
                )
              : (item.total_stock ?? 0),
          ),
          status: item.status || "Active",
          images: parseImageCollection(item.images),
          variants: variants.length > 0 ? variants : [firstVariant],
        });
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    loadFood();
  }, [profile, id, formCacheKey]);

  const updateForm = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const variantRows: VariantDraft[] =
    form.variants?.length > 0
      ? form.variants
      : [
          createVariant({
            weight: form.net_weight,
            price: form.mrp,
            offer: form.offer,
            stock: form.total_stock,
          }),
        ];

  const updateVariant = (
    index: number,
    field: keyof VariantDraft,
    value: string,
  ) => {
    setForm((previous) => {
      const rows = previous.variants?.length
        ? previous.variants
        : [
            createVariant({
              weight: previous.net_weight,
              price: previous.mrp,
              offer: previous.offer,
              stock: previous.total_stock,
            }),
          ];
      const nextVariants = rows.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant,
      );
      const firstVariant = nextVariants[0];
      return {
        ...previous,
        variants: nextVariants,
        net_weight: firstVariant.weight,
        mrp: firstVariant.price,
        offer: firstVariant.offer,
        total_stock: firstVariant.stock,
      };
    });
  };

  const addVariant = () => {
    setForm((previous) => {
      const existingVariants = previous.variants?.length
        ? previous.variants
        : [
            createVariant({
              weight: previous.net_weight,
              price: previous.mrp,
              offer: previous.offer,
              stock: previous.total_stock,
            }),
          ];
      return { ...previous, variants: [...existingVariants, createVariant()] };
    });
  };

  const removeVariant = (index: number) => {
    setForm((previous) => {
      const existingVariants = previous.variants?.length
        ? previous.variants
        : [
            createVariant({
              weight: previous.net_weight,
              price: previous.mrp,
              offer: previous.offer,
              stock: previous.total_stock,
            }),
          ];
      const rows = existingVariants.filter(
        (_variant, variantIndex) => variantIndex !== index,
      );
      const firstVariant = rows[0] || createVariant();
      return {
        ...previous,
        variants: rows.length > 0 ? rows : [firstVariant],
        net_weight: firstVariant.weight,
        mrp: firstVariant.price,
        offer: firstVariant.offer,
        total_stock: firstVariant.stock,
      };
    });
  };

  const handlePickImage = async (field: "images" | "packaging_image") => {
    try {
      const currentImageCount =
        field === "images" ? form.images.length : form.packaging_image ? 1 : 0;
      const remainingSlots =
        field === "images" ? MAX_PRODUCT_IMAGES - currentImageCount : 1;
      if (remainingSlots <= 0) {
        showAppDialog(
          "Image limit reached",
          field === "images"
            ? `You can add up to ${MAX_PRODUCT_IMAGES} product images.`
            : "Remove the current packaging image before choosing another.",
        );
        return;
      }

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAppDialog(
          "Permission denied",
          "Please allow camera roll access to upload images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: field === "images",
        selectionLimit: remainingSlots,
        quality: 0.6,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uploadedImages = await uploadProductImages(result.assets);
        if (field === "images") {
          setForm((prev) => ({
            ...prev,
            images: [...prev.images, ...uploadedImages].slice(
              0,
              MAX_PRODUCT_IMAGES,
            ),
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            packaging_image: uploadedImages[0],
          }));
        }
      }
    } catch (e) {
      console.error("Image pick error:", e);
      showAppDialog(
        "Could not select image",
        "Please try choosing the image again.",
      );
    }
  };

  const removeProductImage = (index: number) => {
    setForm((previous) => ({
      ...previous,
      images: previous.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const handleSubmit = async () => {
    const hasText = (value: unknown) => String(value ?? "").trim().length > 0;
    const missingFields = [
      !hasText(form.name) && "Product Name",
      !hasText(form.category) && "Category",
      !hasText(form.cuisine) && "Cuisine",
      !hasText(form.storage_instructions) && "Storage Instructions",
      !hasText(form.serving_size) && "Serving Size",
      !hasText(form.nutrition_info) && "Nutrition Info",
      !hasText(form.material) && "Material / Ingredients",
      ...variantRows.flatMap((variant, index) => [
        !hasText(variant.weight) && `Variant ${index + 1} weight`,
        !hasText(variant.price) && `Variant ${index + 1} price`,
        !hasText(variant.offer) && `Variant ${index + 1} offer`,
        !hasText(variant.stock) && `Variant ${index + 1} stock`,
      ]),
      !hasText(form.shelf_life_days) && "Shelf Life",
      !hasText(form.package_count) && "Package Count",
      !hasText(form.manufacture_date) && "Manufacture Date",
      !hasText(form.expiry_date) && "Expiry Date",
      !hasText(form.packaging_notes) && "Packaging Notes",
      !hasText(form.description) && "Description",
      !hasText(form.ingredients) && "Ingredients List",
      !hasText(form.instructions) && "Instructions",
      !hasText(form.preparation_url) && "Preparation Video URL",
      form.images.length === 0 && "Product Image",
      !hasText(form.packaging_image) && "Packaging Image",
    ].filter(Boolean);

    if (missingFields.length > 0) {
      showAppDialog(
        "Missing details",
        `Please complete: ${missingFields.join(", ")}.`,
      );
      return;
    }

    const numericFields = [
      ["Shelf Life", form.shelf_life_days, 0],
      ["Package Count", form.package_count, 0],
    ] as const;
    const invalidNumericField = numericFields.find(
      ([, value, minimum, maximum]) => {
        const number = Number(value);
        return (
          !Number.isFinite(number) ||
          number < minimum ||
          (maximum !== undefined && number > maximum)
        );
      },
    );
    if (invalidNumericField) {
      showAppDialog(
        "Check product details",
        `${invalidNumericField[0]} must be a valid number${
          invalidNumericField[3] !== undefined
            ? ` between ${invalidNumericField[2]} and ${invalidNumericField[3]}`
            : ` greater than or equal to ${invalidNumericField[2]}`
        }.`,
      );
      return;
    }

    for (const [index, variant] of variantRows.entries()) {
      const fields = [
        [`Variant ${index + 1} price`, variant.price, 0],
        [`Variant ${index + 1} offer`, variant.offer, 0, 100],
        [`Variant ${index + 1} stock`, variant.stock, 0],
      ] as const;
      const invalidField = fields.find(([, value, minimum, maximum]) => {
        const number = Number(value);
        return (
          !Number.isFinite(number) ||
          number < minimum ||
          (maximum !== undefined && number > maximum)
        );
      });
      if (invalidField) {
        showAppDialog(
          "Check product variants",
          `${invalidField[0]} must be a valid number${
            invalidField[3] !== undefined
              ? ` between ${invalidField[2]} and ${invalidField[3]}`
              : ` greater than or equal to ${invalidField[2]}`
          }.`,
        );
        return;
      }
    }

    setLoading(true);

    const savedVariants = variantRows.map((variant) => ({
      weight: variant.weight.trim(),
      price: Number(variant.price),
      offer: Number(variant.offer),
      final_price: Number(getVariantFinalPrice(variant)),
      stock: Number(variant.stock),
      images: form.images,
    }));
    const firstVariant = savedVariants[0];
    const totalStock = savedVariants.reduce(
      (total, variant) => total + variant.stock,
      0,
    );

    const payload = {
      ...form,
      shelf_life_days: form.shelf_life_days
        ? Number(form.shelf_life_days)
        : null,
      mrp: firstVariant.price,
      offer: firstVariant.offer,
      offer_price: firstVariant.final_price,
      product_type: "Food Product",
      packaging_image: form.packaging_image || null,
      preparation_url: form.preparation_url || null,
      net_weight: firstVariant.weight,
      total_stock: totalStock,
      variants: savedVariants,
      status: form.status || "Active",
    };

    if (JSON.stringify(payload).length > MAX_PRODUCT_PAYLOAD_CHARS) {
      setLoading(false);
      showAppDialog(
        "Images are too large",
        "Please remove an image and choose smaller photos before saving the product.",
      );
      return;
    }

    try {
      if (id && id !== "new") {
        await api.put(`/products/${id}`, payload, { timeout: 60000 });
        showAppDialog(
          "Product updated",
          "Your product was updated successfully.",
        );
      } else {
        await api.post("/products", payload, { timeout: 60000 });
        showAppDialog(
          "Product added",
          "Your new product is ready in your store.",
        );
      }
      deleteCachedPageData(formCacheKey);
      router.back();
    } catch (err: any) {
      console.error(err);
      showAppDialog(
        "Could not save product",
        err?.message || "Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.pageBackground,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      <PageHeader
        title={id && id !== "new" ? "Edit Product" : "Add New Product"}
        onLeftPress={() => router.back()}
        leftIcon="arrow-back"
        headerBackgroundColor="#2E7A4F"
        headerForegroundColor="#FFFFFF"
        safeAreaBackgroundColor="#2E7A4F"
        backButtonBackgroundColor="#2E7A4F"
        backButtonIconColor="#FFFFFF"
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

        <FormGroup label="Product Name" required>
          <InputField
            value={form.name}
            onChangeText={(t) => updateForm("name", t)}
            placeholder="e.g. Chicken Biryani or Turmeric Powder"
          />
        </FormGroup>

        <FormGroup label="Product Type">
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: "#E8F5E9",
            }}
          >
            <Text style={{ fontWeight: "700", color: colors.primary }}>
              Food Product
            </Text>
          </View>
        </FormGroup>

        <FormGroup label="Category" required>
          {categories.filter((c) => {
            const t = (c.category_type || "").toLowerCase();
            return t === "food product" || t === "food products";
          }).length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.muted }}>
              No categories available for this type.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {categories
                .filter((c) => {
                  const t = (c.category_type || "").toLowerCase();
                  return t === "food product" || t === "food products";
                })
                .map((cat, idx) => {
                  const catName =
                    cat.c_name || cat.name || cat.category_name || "Unknown";
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
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                        backgroundColor: isSelected
                          ? "#E8F5E9"
                          : colors.cardBackground,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: isSelected
                            ? colors.primary
                            : colors.primaryDark,
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

        <FormGroup label="Cuisine" required>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
          >
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
                    backgroundColor: isSelected
                      ? "#E8F5E9"
                      : colors.cardBackground,
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

        <FormGroup label="Dietary Tag" required>
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
                  borderColor:
                    form.dietary_tag === opt ? colors.primary : colors.border,
                  backgroundColor:
                    form.dietary_tag === opt
                      ? "#E8F5E9"
                      : colors.cardBackground,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    textTransform: "capitalize",
                    color:
                      form.dietary_tag === opt
                        ? colors.primary
                        : colors.primaryDark,
                  }}
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        </FormGroup>

        <SectionHeader title="Product Info" />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormGroup label="Storage Instructions" required>
              <InputField
                value={form.storage_instructions}
                onChangeText={(t) => updateForm("storage_instructions", t)}
                placeholder="e.g. Keep Refrigerated"
              />
            </FormGroup>
          </View>
          <View style={{ flex: 1 }}>
            <FormGroup label="Serving Size" required>
              <InputField
                value={form.serving_size}
                onChangeText={(t) => updateForm("serving_size", t)}
                placeholder="e.g. 2 Persons"
              />
            </FormGroup>
          </View>
        </View>

        <FormGroup label="Nutrition Info" required>
          <InputField
            value={form.nutrition_info}
            onChangeText={(t) => updateForm("nutrition_info", t)}
            placeholder="e.g. Calories: 250, Protein: 10g"
            multiline
          />
        </FormGroup>

        <FormGroup label="Material / Ingredients" required>
          <InputField
            value={form.material}
            onChangeText={(t) => updateForm("material", t)}
            placeholder="e.g. Cotton (for non-food) or Main ingredients..."
          />
        </FormGroup>

        {/* ── Pricing & Packaging ── */}
        <SectionHeader title="Pricing & Inventory" />

        <Text style={{ marginTop: -8, marginBottom: 14, color: colors.muted }}>
          Set a separate price and stock level for each size or pack.
        </Text>
        {variantRows.map((variant, index) => (
          <View
            key={`variant-${index}`}
            style={{
              marginBottom: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 14,
              backgroundColor: colors.cardBackground,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: colors.primaryDark,
                }}
              >
                Variant {index + 1}
              </Text>
              {variantRows.length > 1 ? (
                <Pressable
                  onPress={() => removeVariant(index)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove variant ${index + 1}`}
                >
                  <Ionicons name="trash-outline" size={19} color="#C62828" />
                </Pressable>
              ) : null}
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FormGroup label="Weight / Pack" required>
                  <InputField
                    value={variant.weight}
                    onChangeText={(value) =>
                      updateVariant(index, "weight", value)
                    }
                    placeholder="e.g. 500 g"
                  />
                </FormGroup>
              </View>
              <View style={{ flex: 1 }}>
                <FormGroup label="Stock" required>
                  <InputField
                    value={variant.stock}
                    onChangeText={(value) =>
                      updateVariant(index, "stock", value)
                    }
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </FormGroup>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FormGroup label="Price (MRP)" required>
                  <InputField
                    prefix="₹"
                    value={variant.price}
                    onChangeText={(value) =>
                      updateVariant(index, "price", value)
                    }
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </FormGroup>
              </View>
              <View style={{ flex: 1 }}>
                <FormGroup label="Offer (%)" required>
                  <InputField
                    prefix="%"
                    value={variant.offer}
                    onChangeText={(value) =>
                      updateVariant(index, "offer", value)
                    }
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </FormGroup>
              </View>
            </View>

            <FormGroup label="Final Price">
              <InputField
                prefix="₹"
                value={getVariantFinalPrice(variant)}
                placeholder="0.00"
                editable={false}
              />
            </FormGroup>
          </View>
        ))}

        <Pressable
          onPress={addVariant}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 18,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 12,
          }}
          accessibilityRole="button"
          accessibilityLabel="Add product variant"
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={colors.primary}
          />
          <Text style={{ fontWeight: "800", color: colors.primary }}>
            Add Variant
          </Text>
        </Pressable>

        <Text style={{ marginBottom: 16, color: colors.muted, fontSize: 13 }}>
          Total inventory:{" "}
          {variantRows.reduce(
            (total, variant) => total + (Number(variant.stock) || 0),
            0,
          )}
        </Text>

        <FormGroup label="Status" required>
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
                  borderColor:
                    form.status === opt ? colors.primary : colors.border,
                  backgroundColor:
                    form.status === opt ? "#E8F5E9" : colors.cardBackground,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color:
                      form.status === opt ? colors.primary : colors.primaryDark,
                  }}
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        </FormGroup>

        <SectionHeader title="Packaging Details" />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormGroup label="Shelf Life (Days)" required>
              <InputField
                value={form.shelf_life_days}
                onChangeText={(t) => updateForm("shelf_life_days", t)}
                placeholder="e.g. 2"
                keyboardType="numeric"
              />
            </FormGroup>
          </View>
          <View style={{ flex: 1 }}>
            <FormGroup label="Package Count" required>
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
              required
              value={form.manufacture_date}
              onChange={(d) => updateForm("manufacture_date", d)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DatePickerField
              label="Expiry Date"
              required
              value={form.expiry_date}
              onChange={(d) => updateForm("expiry_date", d)}
            />
          </View>
        </View>

        <FormGroup label="Packaging Notes" required>
          <InputField
            value={form.packaging_notes}
            onChangeText={(t) => updateForm("packaging_notes", t)}
            placeholder="Any specific packaging notes..."
          />
        </FormGroup>

        <FormGroup label="Packaging Type" required>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
          >
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
                    backgroundColor: isSelected
                      ? "#E8F5E9"
                      : colors.cardBackground,
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

        <FormGroup label="Description" required>
          <InputField
            value={form.description}
            onChangeText={(t) => updateForm("description", t)}
            placeholder="Add a short description..."
            multiline
          />
        </FormGroup>

        <FormGroup label="Ingredients List" required>
          <InputField
            value={form.ingredients}
            onChangeText={(t) => updateForm("ingredients", t)}
            placeholder="Detailed list of ingredients..."
            multiline
          />
        </FormGroup>

        <FormGroup label="Instructions / Recipe" required>
          <InputField
            value={form.instructions}
            onChangeText={(t) => updateForm("instructions", t)}
            placeholder="Preparation instructions..."
            multiline
          />
        </FormGroup>

        <FormGroup label="Preparation Video URL" required>
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
            <FormGroup label="Product Image" required>
              <Pressable
                onPress={() => handlePickImage("images")}
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
                <Ionicons
                  name="image-outline"
                  size={32}
                  color={colors.primary}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.primary,
                    marginTop: 8,
                  }}
                >
                  Upload Product Image
                </Text>
                <Text
                  style={{ fontSize: 11, color: colors.primary, marginTop: 4 }}
                >
                  {form.images.length > 0
                    ? `${form.images.length} image${form.images.length === 1 ? "" : "s"} selected`
                    : `Select up to ${MAX_PRODUCT_IMAGES} images`}
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
                  <View
                    key={`${image.slice(0, 24)}-${index}`}
                    style={{ position: "relative" }}
                  >
                    <ExpoImage
                      source={{ uri: image }}
                      style={{ width: 58, height: 58, borderRadius: 10 }}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() => removeProductImage(index)}
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
            <FormGroup label="Packaging Image" required>
              <Pressable
                onPress={() => handlePickImage("packaging_image")}
                style={{
                  height: 120,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: "#BA68C8",
                  backgroundColor: "#F3E5F5",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="cube-outline" size={32} color="#8E24AA" />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#8E24AA",
                    marginTop: 8,
                  }}
                >
                  Upload Packaging Image
                </Text>
                {form.packaging_image ? (
                  <Text
                    style={{ fontSize: 11, color: "#8E24AA", marginTop: 4 }}
                  >
                    Image selected
                  </Text>
                ) : null}
              </Pressable>
            </FormGroup>
            {form.packaging_image ? (
              <ExpoImage
                source={{ uri: form.packaging_image }}
                style={{
                  width: "100%",
                  height: 58,
                  borderRadius: 10,
                  marginTop: -8,
                }}
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
              {id && id !== "new" ? "Save Changes" : "Save Product"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
