import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, {
  API_BASE_URL,
  getHomeChefAttendance,
  getStoredUser,
  logoutUser,
  setHomeChefAttendanceStatus,
} from "../api";
import BottomBar from "../components/buttombar";
import {
  hasCachedPageData,
  setCachedPageData,
  usePageCacheState,
} from "../lib/page-cache";
import { colors } from "../theme/colors";

// ── Image resolver ────────────────────────────────────────────────────────────
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");
const HOME_CHEF_UPLOADS_PATH = "/uploads/homechefs";
const resolveUrl = (path: string | null | undefined): string | null => {
  if (!path || typeof path !== "string") return null;
  const t = path.trim().replace(/\\/g, "/");
  if (!t) return null;
  if (t.includes("localhost:5000") || t.includes("127.0.0.1:5000")) {
    return resolveUrl(
      t
        .replace(/https?:\/\/localhost:5000/g, IMAGE_BASE_URL)
        .replace(/https?:\/\/127\.0\.0\.1:5000/g, IMAGE_BASE_URL),
    );
  }
  if (t.startsWith("http")) {
    try {
      const parsed = new URL(t);
      const pathname = parsed.pathname.replace(/^\/+/, "");
      if (pathname && !pathname.startsWith("uploads/")) {
        parsed.pathname = `${HOME_CHEF_UPLOADS_PATH}/${pathname}`;
      }
      return parsed.toString();
    } catch {
      return t;
    }
  }
  if (t.startsWith("//")) return `https:${t}`;
  if (t.startsWith("/uploads/")) return `${IMAGE_BASE_URL}${t}`;
  if (t.startsWith("/"))
    return `${IMAGE_BASE_URL}${HOME_CHEF_UPLOADS_PATH}${t}`;
  return `${IMAGE_BASE_URL}${HOME_CHEF_UPLOADS_PATH}/${t.replace(/^\/+/, "")}`;
};

type ProfileDialogTone = "default" | "danger" | "success" | "error";

type ProfileDialogOptions = {
  title: string;
  message: string;
  tone?: ProfileDialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
};

type ProfileDialogProps = ProfileDialogOptions & {
  visible: boolean;
  onClose: () => void;
};

const categoryRequestStyles = StyleSheet.create({
  label: {
    marginBottom: 7,
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.55,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8FAF8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryDark,
  },
});
const categoryRequestLabelStyle = categoryRequestStyles.label;
const categoryRequestInputStyle = categoryRequestStyles.input;

function ProfileDialog({
  visible,
  title,
  message,
  tone = "default",
  confirmLabel = "Okay",
  cancelLabel,
  onConfirm,
  onClose,
}: ProfileDialogProps) {
  const isDanger = tone === "danger";
  const accent = isDanger ? "#C62828" : colors.primary;
  const icon =
    tone === "success"
      ? "checkmark-circle"
      : tone === "error"
        ? "alert-circle"
        : isDanger
          ? "log-out"
          : "information-circle";

  const handleConfirm = async () => {
    onClose();
    await onConfirm?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(17, 35, 27, 0.52)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 380,
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            padding: 24,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              backgroundColor: isDanger ? "#FFEBEE" : colors.softCard,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <Ionicons name={icon as any} size={27} color={accent} />
          </View>
          <Text
            style={{
              fontSize: 21,
              fontWeight: "800",
              color: colors.primaryDark,
              marginBottom: 8,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 21,
              color: colors.muted,
              marginBottom: 24,
            }}
          >
            {message}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {cancelLabel && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={onClose}
                style={{
                  flex: 1,
                  borderRadius: 13,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  paddingVertical: 13,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: colors.primaryDark,
                  }}
                >
                  {cancelLabel}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleConfirm}
              style={{
                flex: 1,
                borderRadius: 13,
                backgroundColor: accent,
                paddingVertical: 13,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#fff" }}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const openDocumentUrl = async (
  docUrl: string | null | undefined,
  showDialog: (options: ProfileDialogOptions) => void,
) => {
  const normalizedUrl = resolveUrl(docUrl);
  if (!normalizedUrl) {
    showDialog({
      title: "Document unavailable",
      message: "This document is not available to view yet.",
      tone: "error",
    });
    return;
  }

  try {
    const supported = await Linking.canOpenURL(normalizedUrl);
    if (!supported) {
      showDialog({
        title: "Unable to open",
        message: "This document cannot be opened on this device.",
        tone: "error",
      });
      return;
    }
    await Linking.openURL(normalizedUrl);
  } catch (error) {
    console.warn("Open document failed:", error);
    showDialog({
      title: "Could not open document",
      message: "The file link is invalid or unavailable.",
      tone: "error",
    });
  }
};

// ── Detail Row ────────────────────────────────────────────────────────────────
const DETAIL_ROW_ICONS: Record<
  string,
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  "Full Name": "person-outline",
  Mobile: "call-outline",
  "Alt Mobile": "call-outline",
  Email: "mail-outline",
  "Door Number": "home-outline",
  Street: "map-outline",
  Area: "location-outline",
  Landmark: "flag-outline",
  City: "business-outline",
  District: "map-outline",
  State: "map-outline",
  Pincode: "pin-outline",
  "Account Status": "shield-checkmark-outline",
  "Kitchen Name": "storefront-outline",
  "Kitchen Type": "restaurant-outline",
  "Kitchen Address": "location-outline",
  "Cuisine Type": "restaurant-outline",
  "Veg / Non-Veg": "leaf-outline",
  Experience: "time-outline",
  "Aadhaar Number": "card-outline",
  "PAN Number": "card-outline",
  "GST Number": "document-text-outline",
  "Account Holder Name": "person-outline",
  "Bank Account Number": "card-outline",
  "IFSC Code": "business-outline",
  "UPI ID": "wallet-outline",
  "Pre-Order Available": "cart-outline",
  "Delivery Radius": "navigate-outline",
  "Cutoff Time": "time-outline",
  "Daily Order Capacity": "people-outline",
  "Available Days": "calendar-outline",
  "Available Slots": "time-outline",
};

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  if (!value) return null;
  const rowIcon =
    icon || DETAIL_ROW_ICONS[label] || "information-circle-outline";
  return (
    <View
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 3,
        }}
      >
        <View style={{ width: 20 }}>
          <Ionicons name={rowIcon} size={15} color={colors.primarySoft} />
        </View>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: colors.muted,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: colors.primaryDark,
          marginLeft: 20,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({
  title,
  icon,
  children,
  onPress,
  expanded,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  children: React.ReactNode;
  onPress: () => void;
  expanded: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
        overflow: "hidden",
      }}
    >
      {/* Tappable header row */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 16,
          paddingHorizontal: 16,
        }}
      >
        {/* Icon bubble */}
        <View
          style={{
            height: 40,
            width: 40,
            borderRadius: 12,
            backgroundColor: colors.softCard,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <Ionicons name={icon} size={19} color={colors.primary} />
        </View>

        {/* Title */}
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: "700",
            color: colors.primaryDark,
          }}
        >
          {title}
        </Text>

        {/* Chevron */}
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-forward"}
          size={18}
          color={colors.muted}
        />
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: 16,
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
}

// ── Stat Column ───────────────────────────────────────────────────────────────
function StatCol({
  value,
  label,
  suffix,
}: {
  value: string;
  label: string;
  suffix?: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text
          style={{ fontSize: 22, fontWeight: "800", color: colors.primaryDark }}
        >
          {value}
        </Text>
        {suffix}
      </View>
      <Text
        style={{
          fontSize: 12,
          color: colors.muted,
          marginTop: 4,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Edit Field ────────────────────────────────────────────────────────────────
function EditField({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: colors.muted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: "#F8FAF8",
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 14,
          color: colors.primaryDark,
        }}
      />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();

  const [authUser, setAuthUser] = usePageCacheState<any>(
    "profile.authUser",
    null,
  );
  const [chefData, setChefData] = usePageCacheState<any>(
    "profile.chefData",
    null,
  );
  const [loading, setLoading] = useState(
    () => !hasCachedPageData("profile.loaded"),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendance, setAttendance] = useState<any>(null);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [dialog, setDialog] = useState<ProfileDialogOptions | null>(null);

  const showDialog = (options: ProfileDialogOptions) => setDialog(options);

  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (key: string) =>
    setExpanded((prev) => (prev === key ? null : key));
  const [categoryRequestSheetOpen, setCategoryRequestSheetOpen] =
    useState(false);
  const [submittingCategoryRequest, setSubmittingCategoryRequest] =
    useState(false);
  const [categoryRequestForm, setCategoryRequestForm] = useState({
    catType: "Food",
    name: "",
    description: "",
    subcategory: [] as string[],
    images: [] as string[],
  });
  const [subcategoryInput, setSubcategoryInput] = useState("");

  const resetCategoryRequestForm = () => {
    setCategoryRequestForm({
      catType: "Food",
      name: "",
      description: "",
      subcategory: [],
      images: [],
    });
    setSubcategoryInput("");
  };

  const addCategorySubcategory = () => {
    const value = subcategoryInput.trim();
    if (!value || categoryRequestForm.subcategory.includes(value)) return;
    setCategoryRequestForm((current) => ({
      ...current,
      subcategory: [...current.subcategory, value],
    }));
    setSubcategoryInput("");
  };

  const pickCategoryRequestImages = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showDialog({
          title: "Permission needed",
          message: "Allow photo library access to add category images.",
          tone: "error",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
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
      setCategoryRequestForm((current) => ({
        ...current,
        images: [...current.images, ...images],
      }));
    } catch (pickError: any) {
      console.warn("Category request image selection failed:", pickError);
      showDialog({
        title: "Could not select images",
        message: pickError?.message || "Please try choosing the images again.",
        tone: "error",
      });
    }
  };

  const submitCategoryRequest = async () => {
    if (
      !categoryRequestForm.name.trim() ||
      !categoryRequestForm.description.trim() ||
      categoryRequestForm.images.length === 0
    ) {
      showDialog({
        title: "Complete the request",
        message:
          "Enter a category name and description, and select at least one image.",
        tone: "error",
      });
      return;
    }

    try {
      setSubmittingCategoryRequest(true);
      await api.post("/category-requests", {
        category_type: categoryRequestForm.catType,
        c_name: categoryRequestForm.name.trim(),
        discripti: categoryRequestForm.description.trim(),
        subcategory: categoryRequestForm.subcategory,
        image: categoryRequestForm.images,
      });
      setCategoryRequestSheetOpen(false);
      resetCategoryRequestForm();
      showDialog({
        title: "Request submitted",
        message: "Your category request has been submitted for review.",
        tone: "success",
      });
    } catch (submitError: any) {
      showDialog({
        title: "Submission failed",
        message:
          submitError?.data?.message ||
          submitError?.message ||
          "Could not submit your category request. Please try again.",
        tone: "error",
      });
    } finally {
      setSubmittingCategoryRequest(false);
    }
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const stored = await getStoredUser();
      setAuthUser(stored);

      const res = await api.get("/auth/profile");
      const d = res.data;
      const homeChef =
        d?.homeChef ||
        d?.home_chef ||
        d?.chef ||
        d?.profile ||
        (d?.name ? d : null);

      setChefData(homeChef || null);
      // Mark the profile loaded only after both user and profile data are resolved.
      setCachedPageData("profile.loaded", true);
    } catch (e: any) {
      console.warn("[profile] fetch error:", e?.message || e);
      setError("Could not load profile details. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hasCachedPageData("profile.loaded")) {
      const timer = setTimeout(() => void fetchProfile(), 0);
      return () => clearTimeout(timer);
    }
  }, [fetchProfile]);

  const loadAttendanceStatus = useCallback(async () => {
    try {
      const data = await getHomeChefAttendance();
      const currentSession =
        data?.currentSession ?? data?.current_session ?? data?.session ?? null;
      setAttendance(currentSession ? { ...data, currentSession } : data || null);
    } catch (error) {
      if ((error as any)?.status === 401) return;
      setAttendance(null);
    }
  }, []);

  const handleAttendanceToggle = async () => {
    const action = attendance?.currentSession ? "check_out" : "check_in";
    setAttendanceActionLoading(true);
    try {
      const result = await setHomeChefAttendanceStatus(action);
      const currentSession =
        result?.currentSession ??
        result?.current_session ??
        result?.session ??
        null;
      setAttendance(currentSession ? { ...result, currentSession } : result || null);
      showDialog({
        title: action === "check_in" ? "Checked in" : "Checked out",
        message:
          result?.message ||
          (action === "check_in"
            ? "You are now online and ready to cook."
            : "You are now offline and your attendance has been closed."),
        tone: "success",
        confirmLabel: "Okay",
      });
    } catch (error: any) {
      showDialog({
        title: "Attendance update failed",
        message:
          error?.message ||
          error?.response?.data?.message ||
          "Unable to update your attendance right now.",
        tone: "error",
        confirmLabel: "Okay",
      });
    } finally {
      setAttendanceActionLoading(false);
    }
  };

  useEffect(() => {
    void loadAttendanceStatus();
    const attendanceInterval = setInterval(() => {
      void loadAttendanceStatus();
    }, 15000);
    return () => clearInterval(attendanceInterval);
  }, [loadAttendanceStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    void loadAttendanceStatus();
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const displayName =
    chefData?.name ||
    authUser?.fullName ||
    [authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ") ||
    authUser?.name ||
    "Chef";

  const displayEmail =
    chefData?.email || authUser?.email || authUser?.identifier || "—";
  const displayPhone =
    chefData?.mobile || authUser?.phone || authUser?.mobile || "—";
  const displayStatus = chefData?.status || null;
  const displayCity = chefData?.city || null;
  const attendanceStatus = attendance?.currentSession ? "Online" : "Offline";
  const todaysAttendance = attendance?.records?.[0] || null;
  const displayKitchenType = chefData?.kitchen_type || null;
  const profilePhotoUrl = resolveUrl(chefData?.profile_photo);
  const documentRows = [
    {
      field: "aadhaar_front",
      label: "Aadhaar (Front)",
      url: resolveUrl(chefData?.aadhaar_front_url),
    },
    {
      field: "aadhaar_back",
      label: "Aadhaar (Back)",
      url: resolveUrl(chefData?.aadhaar_back_url),
    },
    {
      field: "pan_card",
      label: "PAN Card",
      url: resolveUrl(chefData?.pan_card_url),
    },
    {
      field: "fssai_certificate",
      label: "FSSAI Certificate",
      url: resolveUrl(chefData?.fssai_certificate_url),
    },
    {
      field: "gst_certificate",
      label: "GST Certificate",
      url: resolveUrl(chefData?.gst_certificate_url),
    },
    {
      field: "selfie_verification",
      label: "Selfie Verification",
      url: resolveUrl(chefData?.selfie_verification_url),
    },
    {
      field: "signature",
      label: "Signature",
      url: resolveUrl(chefData?.signature_url),
    },
  ];

  const experienceLabel = chefData?.experience_years
    ? `${chefData.experience_years}y`
    : "—";
  const vegLabel = chefData?.veg_nonveg || "—";

  const getProfileIdentity = () => {
    const profileName =
      authUser?.fullName ||
      chefData?.name ||
      form.fullName ||
      displayName ||
      "Chef";
    const profileEmail =
      authUser?.email ||
      chefData?.email ||
      authUser?.identifier ||
      form.email ||
      "";
    const profilePhone =
      authUser?.phone ||
      chefData?.mobile ||
      authUser?.mobile ||
      form.phone ||
      "";
    const username =
      authUser?.username ||
      chefData?.username ||
      (profileName || "").trim() ||
      (profileEmail ? profileEmail.split("@")[0] : "") ||
      "chef";

    return {
      fullName: String(profileName || "Chef").trim(),
      email: String(profileEmail || "").trim(),
      phone: String(profilePhone || "").trim(),
      username: String(username || "chef").trim(),
    };
  };

  // ── Edit handlers ──────────────────────────────────────────────────────────
  const openEdit = () => {
    setForm({
      fullName: displayName,
      email: displayEmail !== "—" ? displayEmail : "",
      phone: displayPhone !== "—" ? displayPhone : "",
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const identity = getProfileIdentity();
      const cleanFullName = identity.fullName;
      const cleanEmail = identity.email;
      const cleanPhone = identity.phone;

      if (!cleanFullName || !cleanEmail) {
        showDialog({
          title: "Profile incomplete",
          message:
            "Your account needs a valid username and email before uploading documents.",
          tone: "error",
        });
        return;
      }

      const payload = {
        username: identity.username,
        fullName: cleanFullName,
        name: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        mobile: cleanPhone,
      };
      await api.put("/auth/profile", payload);
      const updated = { ...(authUser || {}), ...payload };
      await AsyncStorage.setItem("userProfile", JSON.stringify(updated));
      setAuthUser(updated);
      setIsEditing(false);
    } catch (e) {
      console.warn("Save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocument = async (field: string, label: string) => {
    try {
      if (!authUser && !chefData) {
        await fetchProfile();
      }

      const identity = getProfileIdentity();
      const cleanFullName = identity.fullName;
      const cleanEmail = identity.email;
      const cleanPhone = identity.phone;

      if (!identity.username || !cleanEmail) {
        showDialog({
          title: "Profile incomplete",
          message:
            "Your account needs a valid username and email before uploading documents.",
          tone: "error",
        });
        return;
      }

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showDialog({
          title: "Permission needed",
          message:
            "Please allow access to your photo library to upload this document.",
          tone: "error",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const formData = new FormData();

      formData.append("username", String(identity.username));
      formData.append("fullName", String(cleanFullName));
      formData.append("name", String(cleanFullName));
      formData.append("email", String(cleanEmail));
      formData.append("phone", String(cleanPhone));
      formData.append("mobile", String(cleanPhone));
      formData.append(field, {
        uri: asset.uri,
        name: asset.fileName || `${field}-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      } as any);

      setUploadingDoc(field);
      const response = await api.put("/auth/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const responseData = response.data?.data || response.data || {};
      const uploadedUrl =
        responseData[`${field}_url`] ||
        responseData[field] ||
        responseData.url ||
        responseData?.profile?.[`${field}_url`];

      if (uploadedUrl) {
        setChefData((prev: any) => ({
          ...prev,
          [`${field}_url`]: uploadedUrl,
        }));
      }

      showDialog({
        title: "Upload complete",
        message: `${label} uploaded successfully.`,
        tone: "success",
      });
    } catch (e: any) {
      console.warn("Document upload failed:", e);
      showDialog({
        title: "Upload failed",
        message:
          e?.message || "Could not upload this document. Please try again.",
        tone: "error",
      });
    } finally {
      setUploadingDoc(null);
    }
  };

  const confirmLogout = async () => {
    await logoutUser();
    router.replace("/");
  };

  const handleLogout = () => {
    showDialog({
      title: "Log out of Veetu Rusi?",
      message: "You will need to sign in again to manage your kitchen.",
      tone: "danger",
      cancelLabel: "Stay signed in",
      confirmLabel: "Log out",
      onConfirm: confirmLogout,
    });
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.pageBackground,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#2E7A4F" }}
    >
      <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
        <StatusBar barStyle="light-content" backgroundColor="#2E7A4F" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* ════════════════════════════════════ HERO HEADER */}
          <View style={{ backgroundColor: "#2E7A4F" }}>
            <View
              style={{
                alignItems: "center",
                paddingTop: 24,
                paddingBottom: 44,
                paddingHorizontal: 20,
              }}
            >
              {/* Avatar */}
              <View style={{ position: "relative", marginBottom: 16 }}>
                <View
                  style={{
                    height: 100,
                    width: 100,
                    borderRadius: 50,
                    borderWidth: 3,
                    borderColor: "rgba(255,255,255,0.9)",
                    overflow: "hidden",
                    backgroundColor: "rgba(255,255,255,0.2)",
                  }}
                >
                  {profilePhotoUrl ? (
                    <Image
                      source={{ uri: profilePhotoUrl }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="person"
                        size={58}
                        color="rgba(255,255,255,0.9)"
                      />
                    </View>
                  )}
                </View>

                {/* Edit pencil badge */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={openEdit}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    height: 30,
                    width: 30,
                    borderRadius: 15,
                    backgroundColor: "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOpacity: 0.18,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Ionicons name="pencil" size={13} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Name */}
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: "#fff",
                  marginBottom: 6,
                  letterSpacing: -0.3,
                }}
              >
                {displayName}
              </Text>

              {/* Status pill */}
              {displayStatus && (
                <View
                  style={{
                    backgroundColor:
                      displayStatus === "Approved"
                        ? "rgba(255,255,255,0.22)"
                        : "rgba(230,81,0,0.85)",
                    paddingHorizontal: 14,
                    paddingVertical: 5,
                    borderRadius: 20,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.35)",
                  }}
                >
                  <Text
                    style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}
                  >
                    {displayStatus === "Approved" ? "✓ " : ""}
                    {displayStatus}
                  </Text>
                </View>
              )}

              {/* Email */}
              <Text
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.85)",
                  marginBottom: 4,
                }}
              >
                {displayEmail}
              </Text>

              {/* Phone */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 6,
                }}
              >
                <Ionicons
                  name="call-outline"
                  size={13}
                  color="rgba(255,255,255,0.7)"
                />
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
                  {displayPhone}
                </Text>
              </View>

              {/* Location */}
              {(displayCity || displayKitchenType) && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                >
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color="rgba(255,255,255,0.7)"
                  />
                  <Text
                    style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}
                  >
                    {[displayCity, displayKitchenType]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ════════════════════════════════════ STATS STRIP (floats over hero) */}
          <View
            style={{
              marginHorizontal: 20,
              marginTop: -28,
              backgroundColor: colors.cardBackground,
              borderRadius: 20,
              flexDirection: "row",
              paddingVertical: 18,
              paddingHorizontal: 10,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: 6 },
              shadowRadius: 14,
              elevation: 6,
            }}
          >
            <StatCol value={experienceLabel} label="Experience" />
            <View
              style={{
                width: 1,
                backgroundColor: colors.border,
                alignSelf: "stretch",
                marginVertical: 4,
              }}
            />
            <StatCol value={vegLabel} label="Type" />
            <View
              style={{
                width: 1,
                backgroundColor: colors.border,
                alignSelf: "stretch",
                marginVertical: 4,
              }}
            />
            <StatCol
              value="4.8"
              label="Rating"
              suffix={<Ionicons name="star" size={14} color="#F59E0B" />}
            />
          </View>

          {/* Error banner */}
          {error && (
            <View
              style={{
                backgroundColor: "#FFF3E0",
                marginHorizontal: 20,
                marginTop: 14,
                borderRadius: 14,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Ionicons name="warning-outline" size={18} color="#E65100" />
              <Text
                style={{
                  flex: 1,
                  color: "#E65100",
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* ════════════════════════════════════ EDIT FORM */}
          {isEditing && (
            <View
              style={{
                marginHorizontal: 20,
                marginTop: 16,
                backgroundColor: colors.cardBackground,
                borderRadius: 20,
                padding: 20,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "800",
                  color: colors.primaryDark,
                  marginBottom: 18,
                }}
              >
                Edit Profile
              </Text>

              <EditField
                label="Full Name"
                value={form.fullName}
                onChangeText={(t) => setForm((p) => ({ ...p, fullName: t }))}
              />
              <EditField
                label="Email"
                value={form.email}
                onChangeText={(t) => setForm((p) => ({ ...p, email: t }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <EditField
                label="Phone"
                value={form.phone}
                onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />

              <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsEditing(false)}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    paddingVertical: 13,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: colors.primaryDark,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    backgroundColor: colors.primary,
                    paddingVertical: 13,
                    alignItems: "center",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}
                    >
                      Save
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ════════════════════════════════════ SECTION CARDS */}
          <View style={{ marginTop: 20 }}>
            {/* Personal Information */}
            <SectionCard
              title="Personal Information"
              icon="person-outline"
              expanded={expanded === "personal"}
              onPress={() => toggle("personal")}
            >
              <DetailRow
                label="Full Name"
                value={chefData?.name}
                icon="person-outline"
              />
              <DetailRow
                label="Mobile"
                value={chefData?.mobile}
                icon="call-outline"
              />
              <DetailRow
                label="Alt Mobile"
                value={chefData?.alt_mobile}
                icon="call-outline"
              />
              <DetailRow
                label="Email"
                value={chefData?.email}
                icon="mail-outline"
              />
              <DetailRow label="Door Number" value={chefData?.door_number} />
              <DetailRow
                label="Street"
                value={chefData?.street_name}
                icon="map-outline"
              />
              <DetailRow label="Area" value={chefData?.area_name} />
              <DetailRow label="Landmark" value={chefData?.landmark} />
              <DetailRow
                label="City"
                value={chefData?.city}
                icon="location-outline"
              />
              <DetailRow label="District" value={chefData?.district} />
              <DetailRow label="State" value={chefData?.state} />
              <DetailRow label="Pincode" value={chefData?.pincode} />
              <DetailRow
                label="Account Status"
                value={displayStatus}
                icon="checkmark-circle-outline"
              />
            </SectionCard>

            {/* Kitchen Information */}
            <SectionCard
              title="Kitchen Information"
              icon="storefront-outline"
              expanded={expanded === "kitchen"}
              onPress={() => toggle("kitchen")}
            >
              <DetailRow
                label="Kitchen Name"
                value={chefData?.kitchen_name}
                icon="storefront-outline"
              />
              <DetailRow label="Kitchen Type" value={chefData?.kitchen_type} />
              <DetailRow
                label="Kitchen Address"
                value={chefData?.kitchen_address}
                icon="map-outline"
              />
              <DetailRow label="Cuisine Type" value={chefData?.cuisine_type} />
              <DetailRow
                label="Veg / Non-Veg"
                value={
                  chefData?.veg_nonveg === "both"
                    ? "Both Veg & Non-Veg"
                    : chefData?.veg_nonveg || null
                }
              />
              <DetailRow
                label="Experience"
                value={
                  chefData?.experience_years
                    ? `${chefData.experience_years} years`
                    : null
                }
              />
              <DetailRow
                label="Aadhaar Number"
                value={chefData?.aadhaar_number}
              />
              <DetailRow label="PAN Number" value={chefData?.pan_number} />
              <DetailRow label="GST Number" value={chefData?.gst_number} />
            </SectionCard>

            {/* Bank Details */}
            <SectionCard
              title="Bank Details"
              icon="card-outline"
              expanded={expanded === "bank"}
              onPress={() => toggle("bank")}
            >
              <DetailRow
                label="Account Holder Name"
                value={chefData?.account_holder_name}
                icon="person-outline"
              />
              <DetailRow
                label="Bank Account Number"
                value={chefData?.bank_account_number}
                icon="card-outline"
              />
              <DetailRow label="IFSC Code" value={chefData?.ifsc_code} />
              <DetailRow label="UPI ID" value={chefData?.upi_id} />
            </SectionCard>

            {/* Documents */}
            <SectionCard
              title="Documents & Verification"
              icon="document-text-outline"
              expanded={expanded === "docs"}
              onPress={() => toggle("docs")}
            >
              {documentRows.map((doc) => (
                <View
                  key={doc.label}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 12,
                        fontWeight: "700",
                        color: colors.muted,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                      }}
                    >
                      {doc.label}
                    </Text>
                    {doc.url ? (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => openDocumentUrl(doc.url, showDialog)}
                        style={{
                          backgroundColor: colors.primary,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: "#fff",
                          }}
                        >
                          View
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: "#F1F3F2",
                          fontSize: 11,
                          fontWeight: "700",
                          color: colors.muted,
                        }}
                      >
                        Not uploaded
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: doc.url ? colors.primaryDark : colors.muted,
                      marginTop: 6,
                    }}
                  >
                    {doc.url ? "✓ Uploaded" : "Not uploaded"}
                  </Text>
                </View>
              ))}
            </SectionCard>

            {/* Delivery Settings */}
            <SectionCard
              title="Delivery Settings"
              icon="bicycle-outline"
              expanded={expanded === "delivery"}
              onPress={() => toggle("delivery")}
            >
              <DetailRow
                label="Pre-Order Available"
                value={
                  chefData?.preorder_available === 1 ||
                  chefData?.preorder_available === true
                    ? "✓ Enabled"
                    : "✗ Disabled"
                }
                icon="cart-outline"
              />
              <DetailRow
                label="Delivery Radius"
                value={
                  chefData?.delivery_radius
                    ? `${chefData.delivery_radius} km`
                    : null
                }
              />
              <DetailRow label="Cutoff Time" value={chefData?.cutoff_time} />
              <DetailRow
                label="Daily Order Capacity"
                value={chefData?.daily_order_capacity?.toString()}
              />
              <DetailRow
                label="Available Days"
                value={chefData?.available_days}
              />
              <DetailRow
                label="Available Slots"
                value={chefData?.available_slots}
              />
            </SectionCard>
          </View>

          {/* ════════════════════════════════════ ATTENDANCE CARD */}
          <View className="mx-5 mt-5 rounded-[20px] bg-white p-[18px] shadow-sm shadow-black/5">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-[10px]">
                <View
                  className={
                    attendance?.currentSession
                      ? "h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5E9]"
                      : "h-10 w-10 items-center justify-center rounded-xl bg-[#FFF3E0]"
                  }
                >
                  <Ionicons
                    name={attendance?.currentSession ? "checkmark-circle" : "time-outline"}
                    size={20}
                    color={attendance?.currentSession ? "#2E7A4F" : "#E65100"}
                  />
                </View>
                <View>
                  <Text className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#7A8E87]">
                    My Attendance
                  </Text>
                  <Text className="mt-1 text-[18px] font-extrabold text-[#1A3328]">
                    {attendanceStatus}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleAttendanceToggle}
                disabled={attendanceActionLoading}
                className={
                  attendance?.currentSession
                    ? "rounded-xl bg-[#C62828] px-[14px] py-[10px] opacity-100"
                    : "rounded-xl bg-[#2E7A4F] px-[14px] py-[10px] opacity-100"
                }
                style={attendanceActionLoading ? { opacity: 0.7 } : undefined}
              >
                <Text className="text-[11px] font-extrabold uppercase tracking-wide text-white">
                  {attendanceActionLoading
                    ? "Updating..."
                    : attendance?.currentSession
                      ? "Check out"
                      : "Check in"}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              className={
                attendance?.currentSession
                  ? "mt-2 rounded-[14px] bg-[#E8F5E9] p-3"
                  : "mt-2 rounded-[14px] bg-[#FFF8F1] p-3"
              }
            >
              <Text
                className={
                  attendance?.currentSession
                    ? "text-[12px] font-bold text-[#2E7A4F]"
                    : "text-[12px] font-bold text-[#E65100]"
                }
              >
                {attendance?.currentSession
                  ? `Checked in since ${new Date(attendance.currentSession.check_in_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "You are currently offline. Check in to start your shift."}
              </Text>
            </View>

            {todaysAttendance && (
              <View className="mt-4 flex-row items-center justify-between border-t border-[#E7EEE9] pt-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase tracking-[0.6px] text-[#7A8E87]">
                    Latest session
                  </Text>
                  <Text className="mt-1 text-[13px] font-bold text-[#1A3328]">
                    {new Date(todaysAttendance.check_in_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </Text>
                </View>
                <Text className="self-center text-[13px] font-bold text-[#1A3328]">
                  {todaysAttendance.check_out_at ? "Completed" : "Active"}
                </Text>
              </View>
            )}
          </View>

          {/* ════════════════════════════════════ QUICK NAV */}
          <View
            style={{
              backgroundColor: colors.cardBackground,
              marginHorizontal: 20,
              marginTop: 12,
              borderRadius: 20,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {[
              {
                label: "My Orders",
                icon: "receipt-outline" as const,
                route: "/material-orders",
              },
              {
                label: "My Attendance",
                icon: "time-outline" as const,
                route: "/attendance",
              },
              {
                label: "Category Requests",
                icon: "receipt-outline" as const,
                route: "/category-requests",
              },
              {
                label: "Show All Orders",
                icon: "receipt-outline" as const,
                route: "/all-orders",
              },
              {
                label: "My Dishes",
                icon: "restaurant-outline" as const,
                route: "/dishes",
              },
              {
                label: "My Products",
                icon: "cube-outline" as const,
                route: "/myproducts",
              },
              {
                label: "Manage Menu",
                icon: "list-outline" as const,
                route: "/menu",
              },
            ].map((item, idx, arr) => (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.7}
                onPress={() => router.push(item.route as any)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    height: 40,
                    width: 40,
                    borderRadius: 12,
                    backgroundColor: colors.softCard,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <Ionicons name={item.icon} size={19} color={colors.primary} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.primaryDark,
                  }}
                >
                  {item.label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.muted}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* ════════════════════════════════════ LOGOUT */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              backgroundColor: colors.cardBackground,
              borderRadius: 20,
              paddingVertical: 16,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View
              style={{
                height: 40,
                width: 40,
                borderRadius: 12,
                backgroundColor: "#FFEBEE",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Ionicons name="log-out-outline" size={19} color="#C62828" />
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 15,
                fontWeight: "700",
                color: "#C62828",
              }}
            >
              Logout
            </Text>
          </TouchableOpacity>

          {/* Version */}
          <Text
            style={{
              textAlign: "center",
              fontSize: 12,
              color: colors.muted,
              marginTop: 24,
              marginBottom: 4,
            }}
          >
            Veetu Rusi V2Home Chef · v1.0.0
          </Text>
        </ScrollView>

        <ProfileDialog
          visible={!!dialog}
          title={dialog?.title || ""}
          message={dialog?.message || ""}
          tone={dialog?.tone}
          confirmLabel={dialog?.confirmLabel}
          cancelLabel={dialog?.cancelLabel}
          onConfirm={dialog?.onConfirm}
          onClose={() => setDialog(null)}
        />

        <Modal
          visible={categoryRequestSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setCategoryRequestSheetOpen(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(17, 35, 27, 0.52)",
            }}
          >
            <View
              style={{
                maxHeight: "92%",
                backgroundColor: colors.cardBackground,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 17,
                  backgroundColor: colors.primary,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "900",
                      color: "#fff",
                      textTransform: "uppercase",
                    }}
                  >
                    New category request
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      fontWeight: "700",
                      color: "rgba(255,255,255,0.85)",
                      textTransform: "uppercase",
                    }}
                  >
                    Submit a product classification for review
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCategoryRequestSheetOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close category request"
                  style={{
                    width: 42,
                    height: 42,
                    marginLeft: 10,
                    borderRadius: 14,
                    backgroundColor: "rgba(0,0,0,0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={23} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 18, paddingBottom: 24 }}
              >
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={categoryRequestLabelStyle}>
                      Category type <Text style={{ color: "#D32F2F" }}>*</Text>
                    </Text>
                    <View
                      style={{
                        minHeight: 50,
                        flexDirection: "row",
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: "#F8FAF8",
                        borderRadius: 14,
                        padding: 4,
                      }}
                    >
                      {[
                        { value: "Food", label: "Food" },
                        { value: "food products", label: "Food Products" },
                      ].map(({ value, label }) => {
                        const selected = categoryRequestForm.catType === value;
                        return (
                          <TouchableOpacity
                            key={value}
                            onPress={() =>
                              setCategoryRequestForm((current) => ({
                                ...current,
                                catType: value,
                              }))
                            }
                            style={{
                              flex: 1,
                              minHeight: 40,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 10,
                              backgroundColor: selected
                                ? "#fff"
                                : "transparent",
                            }}
                          >
                            <Text
                              numberOfLines={1}
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: selected
                                  ? colors.primaryDark
                                  : colors.muted,
                              }}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={categoryRequestLabelStyle}>Category ID</Text>
                    <View
                      style={{
                        minHeight: 49,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        borderWidth: 1,
                        borderColor: "#C8EBD8",
                        backgroundColor: "#EFFAF4",
                        borderRadius: 14,
                        paddingHorizontal: 12,
                      }}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color={colors.primary}
                      />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 12,
                          fontWeight: "700",
                          color: colors.primaryDark,
                        }}
                      >
                        Generated after approval
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={[categoryRequestLabelStyle, { marginTop: 17 }]}>
                  Category name <Text style={{ color: "#D32F2F" }}>*</Text>
                </Text>
                <TextInput
                  value={categoryRequestForm.name}
                  onChangeText={(name) =>
                    setCategoryRequestForm((current) => ({ ...current, name }))
                  }
                  placeholder="Enter name"
                  maxLength={100}
                  style={categoryRequestInputStyle}
                />

                <Text style={[categoryRequestLabelStyle, { marginTop: 17 }]}>
                  Detailed description{" "}
                  <Text style={{ color: "#D32F2F" }}>*</Text>
                </Text>
                <TextInput
                  value={categoryRequestForm.description}
                  onChangeText={(description) =>
                    setCategoryRequestForm((current) => ({
                      ...current,
                      description,
                    }))
                  }
                  placeholder="Describe this category"
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                  style={[categoryRequestInputStyle, { minHeight: 110 }]}
                />

                <Text style={[categoryRequestLabelStyle, { marginTop: 17 }]}>
                  Subcategories
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={subcategoryInput}
                    onChangeText={setSubcategoryInput}
                    onSubmitEditing={addCategorySubcategory}
                    returnKeyType="done"
                    placeholder="Type a subcategory"
                    style={[categoryRequestInputStyle, { flex: 1 }]}
                  />
                  <TouchableOpacity
                    onPress={addCategorySubcategory}
                    accessibilityRole="button"
                    accessibilityLabel="Add subcategory"
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 15,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="add" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                {!!categoryRequestForm.subcategory.length && (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 10,
                    }}
                  >
                    {categoryRequestForm.subcategory.map((subcategory) => (
                      <TouchableOpacity
                        key={subcategory}
                        onPress={() =>
                          setCategoryRequestForm((current) => ({
                            ...current,
                            subcategory: current.subcategory.filter(
                              (item) => item !== subcategory,
                            ),
                          }))
                        }
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                          paddingHorizontal: 11,
                          paddingVertical: 7,
                          borderRadius: 20,
                          backgroundColor: "#EAF6EF",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: colors.primaryDark,
                          }}
                        >
                          {subcategory}
                        </Text>
                        <Ionicons
                          name="close-circle"
                          size={15}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={[categoryRequestLabelStyle, { marginTop: 17 }]}>
                  Images <Text style={{ color: "#D32F2F" }}>*</Text>
                </Text>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={pickCategoryRequestImages}
                  style={{
                    minHeight: 112,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderStyle: "dashed",
                    borderColor: "#83D8AD",
                    backgroundColor: "#F0FBF5",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 16,
                  }}
                >
                  <Ionicons
                    name="image-outline"
                    size={28}
                    color={colors.primary}
                  />
                  <Text
                    style={{
                      marginTop: 7,
                      fontSize: 13,
                      fontWeight: "800",
                      color: colors.primaryDark,
                    }}
                  >
                    Select category images
                  </Text>
                </TouchableOpacity>
                {!!categoryRequestForm.images.length && (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 10,
                      marginTop: 12,
                    }}
                  >
                    {categoryRequestForm.images.map((image, index) => (
                      <View
                        key={`${index}-${image.length}`}
                        style={{
                          width: 70,
                          height: 70,
                          borderRadius: 12,
                          overflow: "hidden",
                        }}
                      >
                        <Image
                          source={{ uri: image }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                        <TouchableOpacity
                          onPress={() =>
                            setCategoryRequestForm((current) => ({
                              ...current,
                              images: current.images.filter(
                                (_, imageIndex) => imageIndex !== index,
                              ),
                            }))
                          }
                          accessibilityLabel="Remove image"
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: "rgba(0,0,0,0.65)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 10,
                  paddingHorizontal: 18,
                  paddingVertical: 13,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  backgroundColor: colors.cardBackground,
                }}
              >
                <TouchableOpacity
                  onPress={() => setCategoryRequestSheetOpen(false)}
                  disabled={submittingCategoryRequest}
                  style={{
                    paddingHorizontal: 17,
                    paddingVertical: 12,
                    borderRadius: 13,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: colors.primaryDark,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submitCategoryRequest}
                  disabled={submittingCategoryRequest}
                  style={{
                    minWidth: 150,
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    borderRadius: 13,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: submittingCategoryRequest ? 0.65 : 1,
                  }}
                >
                  {submittingCategoryRequest ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      style={{ fontSize: 13, fontWeight: "800", color: "#fff" }}
                    >
                      Submit request
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <BottomBar />
      </View>
    </SafeAreaView>
  );
}
