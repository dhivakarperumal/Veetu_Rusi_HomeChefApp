import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../api";
import PageHeader from "./componets/pageheader";

const GREEN = "#009B68";
const DARK = "#172333";
const MUTED = "#64748B";
const BORDER = "#DCE5EF";
const MAX_IMAGES = 5;

type CategoryRequestForm = {
  catType: string;
  name: string;
  description: string;
  subcategory: string[];
  images: string[];
};

const createEmptyForm = (): CategoryRequestForm => ({
  catType: "Food",
  name: "",
  description: "",
  subcategory: [],
  images: [],
});

const fieldInput = {
  minHeight: 50,
  borderWidth: 1,
  borderColor: BORDER,
  backgroundColor: "#F7F9FB",
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 14,
  fontWeight: "600" as const,
  color: DARK,
};

export default function CategoryRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CategoryRequestForm>(createEmptyForm);
  const [subcategoryInput, setSubcategoryInput] = useState("");

  const fetchRequests = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setLoadError("");
    try {
      const response = await api.get("/category-requests/mine");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.requests || [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setLoadError(
        error?.data?.message ||
          error?.message ||
          "Could not load your requests.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void fetchRequests(), 0);
    return () => clearTimeout(timer);
  }, [fetchRequests]);

  const closeSheet = () => {
    if (submitting) return;
    setSheetOpen(false);
    setForm(createEmptyForm());
    setSubcategoryInput("");
  };

  const addSubcategory = () => {
    const value = subcategoryInput.trim();
    if (!value || form.subcategory.includes(value)) return;
    setForm((current) => ({
      ...current,
      subcategory: [...current.subcategory, value],
    }));
    setSubcategoryInput("");
  };

  const pickImages = async () => {
    if (form.images.length >= MAX_IMAGES) {
      Alert.alert("Image limit reached", `Select up to ${MAX_IMAGES} images.`);
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Allow photo library access to add category images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES - form.images.length,
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return;

      const images = await Promise.all(
        result.assets.map(async (asset) => {
          const compressed = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 700 } }],
            {
              compress: 0.35,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            },
          );
          if (!compressed.base64) {
            throw new Error("Could not process one of the selected images.");
          }
          return `data:image/jpeg;base64,${compressed.base64}`;
        }),
      );
      setForm((current) => ({
        ...current,
        images: [...current.images, ...images].slice(0, MAX_IMAGES),
      }));
    } catch (error: any) {
      Alert.alert(
        "Could not select images",
        error?.message || "Please try choosing the images again.",
      );
    }
  };

  const submitRequest = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.images.length) {
      Alert.alert(
        "Complete the request",
        "Category name, description, and at least one image are required.",
      );
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/category-requests", {
        category_type: form.catType,
        c_name: form.name.trim(),
        discripti: form.description.trim(),
        subcategory: form.subcategory,
        image: form.images,
      });
      setSheetOpen(false);
      setForm(createEmptyForm());
      setSubcategoryInput("");
      await fetchRequests(true);
      Alert.alert("Request submitted", "Your category is awaiting review.");
    } catch (error: any) {
      Alert.alert(
        "Submission failed",
        error?.data?.message ||
          error?.message ||
          "Could not submit your category request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderRequest = (request: any, index: number) => {
    const status = request.status || request.requestStatus || "Pending";
    const normalized = String(status).toLowerCase();
    const statusColor =
      normalized === "approved"
        ? "#18864B"
        : normalized === "rejected"
          ? "#C62828"
          : "#A05A00";
    return (
      <View
        key={
          request.id ||
          request._id ||
          `${request.c_name || request.name}-${index}`
        }
        style={styles.requestRow}
      >
        <View style={styles.requestIcon}>
          <Ionicons name="pricetag-outline" size={19} color={GREEN} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={styles.requestName}>
            {request.c_name || request.name || "Category request"}
          </Text>
          <Text style={styles.requestMeta}>
            {request.category_type || request.catType || "Food"}
            {request.createdAt || request.created_at
              ? ` · ${new Date(request.createdAt || request.created_at).toLocaleDateString()}`
              : ""}
          </Text>
        </View>
        <Text
          style={[
            styles.statusBadge,
            { color: statusColor, backgroundColor: `${statusColor}15` },
          ]}
        >
          {status}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <PageHeader
        title="Category Requests"
        onLeftPress={() => router.back()}
        headerBackgroundColor={GREEN}
        safeAreaBackgroundColor={GREEN}
        headerForegroundColor="#FFFFFF"
        titleFontSize={18}
      />
      <View style={styles.pageContent}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={GREEN} />
          </View>
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={30} color={MUTED} />
            <Text style={styles.emptyText}>{loadError}</Text>
            <TouchableOpacity onPress={() => void fetchRequests()}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void fetchRequests(true)}
                tintColor={GREEN}
              />
            }
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          >
            {requests.length ? (
              <View style={styles.list}>{requests.map(renderRequest)}</View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="pricetag-outline" size={28} color={GREEN} />
                </View>
                <Text style={styles.emptyTitle}>No requests yet</Text>
                <Text style={styles.emptyText}>
                  Tap + to suggest a category for review.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <TouchableOpacity
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Add category request"
        activeOpacity={0.85}
        style={[
          styles.floatingAdd,
          { bottom: Math.max(insets.bottom, 12) + 18 },
        ]}
      >
        <Ionicons name="add" size={29} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={styles.backdrop} onPress={closeSheet} />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 10) },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>New category request</Text>
                <Text style={styles.sheetSubtitle}>
                  Submit a product classification for review
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeSheet}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Close request form"
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formBody}
            >
              <View style={styles.topFields}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Category type *</Text>
                  <View style={styles.typeSelector}>
                    {[
                      { value: "Food", label: "Food" },
                      { value: "food products", label: "Food Products" },
                    ].map(({ value, label }) => {
                      const selected = form.catType === value;
                      return (
                        <TouchableOpacity
                          key={value}
                          onPress={() =>
                            setForm((current) => ({
                              ...current,
                              catType: value,
                            }))
                          }
                          style={[
                            styles.typeOption,
                            selected && styles.typeOptionSelected,
                          ]}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.typeOptionText,
                              selected && styles.typeOptionTextSelected,
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Category ID</Text>
                  <View style={styles.generatedId}>
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color={GREEN}
                    />
                    <Text style={styles.generatedIdText}>
                      Generated after approval
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Category name *</Text>
              <TextInput
                value={form.name}
                onChangeText={(name) =>
                  setForm((current) => ({ ...current, name }))
                }
                placeholder="Enter name"
                maxLength={100}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Detailed description *</Text>
              <TextInput
                value={form.description}
                onChangeText={(description) =>
                  setForm((current) => ({ ...current, description }))
                }
                placeholder="Describe this category"
                multiline
                textAlignVertical="top"
                maxLength={1000}
                style={[styles.input, styles.descriptionInput]}
              />

              <Text style={styles.fieldLabel}>Subcategories</Text>
              <View style={styles.subcategoryRow}>
                <TextInput
                  value={subcategoryInput}
                  onChangeText={setSubcategoryInput}
                  onSubmitEditing={addSubcategory}
                  returnKeyType="done"
                  placeholder="Type a subcategory and press Enter or +"
                  style={[styles.input, { flex: 1 }]}
                />
                <TouchableOpacity
                  onPress={addSubcategory}
                  accessibilityRole="button"
                  accessibilityLabel="Add subcategory"
                  style={styles.subcategoryAdd}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              {!!form.subcategory.length && (
                <View style={styles.chips}>
                  {form.subcategory.map((subcategory) => (
                    <TouchableOpacity
                      key={subcategory}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          subcategory: current.subcategory.filter(
                            (item) => item !== subcategory,
                          ),
                        }))
                      }
                      style={styles.chip}
                    >
                      <Text style={styles.chipText}>{subcategory}</Text>
                      <Ionicons name="close-circle" size={15} color={GREEN} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.fieldLabel}>Images *</Text>
              <TouchableOpacity
                onPress={pickImages}
                activeOpacity={0.75}
                style={styles.imagePicker}
              >
                <Ionicons name="image-outline" size={29} color={GREEN} />
                <Text style={styles.imagePickerText}>
                  Select category images
                </Text>
                <Text style={styles.imagePickerHint}>
                  {form.images.length}/{MAX_IMAGES} selected
                </Text>
              </TouchableOpacity>
              {!!form.images.length && (
                <View style={styles.imageGrid}>
                  {form.images.map((image, index) => (
                    <View
                      key={`${index}-${image.length}`}
                      style={styles.imageTile}
                    >
                      <Image
                        source={{ uri: image }}
                        style={styles.previewImage}
                      />
                      <TouchableOpacity
                        onPress={() =>
                          setForm((current) => ({
                            ...current,
                            images: current.images.filter(
                              (_, imageIndex) => imageIndex !== index,
                            ),
                          }))
                        }
                        accessibilityLabel="Remove image"
                        style={styles.removeImage}
                      >
                        <Ionicons name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                onPress={closeSheet}
                disabled={submitting}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitRequest}
                disabled={submitting}
                style={[styles.submitButton, submitting && { opacity: 0.65 }]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Submit request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = {
  screen: { flex: 1, backgroundColor: "#F8F6F1" },
  pageContent: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  floatingAdd: {
    position: "absolute" as const,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: GREEN,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    elevation: 7,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: MUTED,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  pageTitle: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "900" as const,
    color: DARK,
  },
  centerState: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  list: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#E6E9ED",
  },
  requestRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 11,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F2",
  },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#EAF6EF",
  },
  requestName: { fontSize: 14, fontWeight: "800" as const, color: DARK },
  requestMeta: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600" as const,
    color: MUTED,
  },
  statusBadge: {
    overflow: "hidden" as const,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: "800" as const,
  },
  emptyState: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#EAF6EF",
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "800" as const,
    color: DARK,
  },
  emptyText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center" as const,
    color: MUTED,
  },
  retryText: {
    marginTop: 12,
    color: GREEN,
    fontSize: 13,
    fontWeight: "800" as const,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end" as const,
    backgroundColor: "rgba(17,35,27,0.50)",
  },
  backdrop: {
    ...({} as any),
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    maxHeight: "93%" as const,
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden" as const,
  },
  sheetHeader: {
    minHeight: 94,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: GREEN,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900" as const,
    color: "#fff",
    textTransform: "uppercase" as const,
  },
  sheetSubtitle: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.88)",
    textTransform: "uppercase" as const,
  },
  closeButton: {
    width: 42,
    height: 42,
    marginLeft: 10,
    borderRadius: 13,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  formBody: {
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 24,
    gap: 9,
  },
  topFields: { flexDirection: "row" as const, gap: 10, marginBottom: 8 },
  fieldLabel: {
    marginBottom: 0,
    fontSize: 11,
    fontWeight: "800" as const,
    color: DARK,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  typeSelector: {
    minHeight: 50,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: "#F7F9FB",
  },
  typeOption: {
    flex: 1,
    minHeight: 40,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 10,
  },
  typeOptionSelected: { backgroundColor: "#fff" },
  typeOptionText: { fontSize: 11, fontWeight: "700" as const, color: MUTED },
  typeOptionTextSelected: { color: GREEN },
  generatedId: {
    minHeight: 50,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#C8EBD8",
    borderRadius: 14,
    backgroundColor: "#EFFAF4",
  },
  generatedIdText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700" as const,
    color: "#075E46",
  },
  input: { ...fieldInput },
  descriptionInput: { minHeight: 100 },
  subcategoryRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  subcategoryAdd: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: GREEN,
  },
  chips: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginTop: 2,
  },
  chip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#EAF6EF",
  },
  chipText: { fontSize: 12, fontWeight: "700" as const, color: DARK },
  imagePicker: {
    minHeight: 112,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1.5,
    borderStyle: "dashed" as const,
    borderColor: "#83D8AD",
    borderRadius: 17,
    backgroundColor: "#F0FBF5",
    padding: 14,
  },
  imagePickerText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "800" as const,
    color: GREEN,
  },
  imagePickerHint: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "600" as const,
    color: MUTED,
  },
  imageGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
  },
  imageTile: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  previewImage: { width: "100%" as const, height: "100%" as const },
  removeImage: {
    position: "absolute" as const,
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheetFooter: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 9,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF0F2",
    backgroundColor: "#fff",
  },
  cancelButton: {
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cancelText: { fontSize: 13, fontWeight: "700" as const, color: DARK },
  submitButton: {
    minWidth: 145,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: GREEN,
  },
  submitText: { fontSize: 13, fontWeight: "800" as const, color: "#fff" },
};
