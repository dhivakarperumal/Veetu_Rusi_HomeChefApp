import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { getStoredUser } from "../api";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";

// ── Menu items (to be populated with onPress in component) ────────────────────
const getMenuItems = (onItemPress: (key: string) => void) => [
  {
    key: "my_products",
    label: "My Products",
    icon: "cube-outline" as const,
    route: "/myproducts",
  },
  {
    key: "menu",
    label: "Manage Menu",
    icon: "restaurant-outline" as const,
    route: "/menu",
  },
  {
    key: "kitchen",
    label: "Kitchen Information",
    icon: "storefront-outline" as const,
    onPress: () => onItemPress("kitchen"),
  },
  {
    key: "bank",
    label: "Bank Details",
    icon: "card-outline" as const,
    onPress: () => onItemPress("bank"),
  },
  {
    key: "docs",
    label: "Documents",
    icon: "document-text-outline" as const,
    onPress: () => onItemPress("docs"),
  },
  {
    key: "delivery",
    label: "Delivery Settings",
    icon: "bicycle-outline" as const,
    onPress: () => onItemPress("delivery"),
  },
  {
    key: "notifications",
    label: "Notification Settings",
    icon: "notifications-outline" as const,
  },
];

// ── Stat column ───────────────────────────────────────────────────────────────
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
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text
          style={{
            fontSize: 26,
            fontWeight: "800",
            color: colors.primaryDark,
          }}
        >
          {value}
        </Text>
        {suffix}
      </View>
      <Text
        style={{
          fontSize: 14,
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

// ── Menu row ──────────────────────────────────────────────────────────────────
function MenuItem({
  icon,
  label,
  onPress,
  route,
  danger,
  isLast,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress?: () => void;
  route?: string;
  danger?: boolean;
  isLast?: boolean;
}) {
  const router = useRouter();

  const handlePress = () => {
    if (route) {
      router.push(route as any);
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "#F2F7F4" : colors.cardBackground,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 18,
          paddingHorizontal: 16,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            height: 42,
            width: 42,
            borderRadius: 12,
            backgroundColor: danger ? "#FFEBEE" : "#E8F3EE",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <Ionicons
            name={icon}
            size={20}
            color={danger ? "#C62828" : colors.primary}
          />
        </View>

        <Text
          style={{
            flex: 1,
            fontSize: 17,
            fontWeight: "600",
            color: danger ? "#C62828" : colors.primaryDark,
            lineHeight: 24,
          }}
        >
          {label}
        </Text>

        {!danger && (
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        )}
      </View>
    </Pressable>
  );
}

// ── Detail Row Component ──────────────────────────────────────────────────────
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
  return (
    <View
      style={{
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        {icon && <Ionicons name={icon} size={16} color={colors.primary} />}
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>
          {label}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: colors.primaryDark,
          marginLeft: icon ? 24 : 0,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeDetailPanel, setActiveDetailPanel] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      const storedUser = await getStoredUser();
      setProfile(storedUser || null);
      setForm({
        fullName:
          storedUser?.fullName ||
          [storedUser?.firstName, storedUser?.lastName]
            .filter(Boolean)
            .join(" ") ||
          storedUser?.name ||
          "",
        email: storedUser?.email || storedUser?.identifier || "",
        phone:
          storedUser?.phone ||
          storedUser?.mobile ||
          storedUser?.phone_number ||
          "",
        address: storedUser?.address || storedUser?.street_address || "",
        city: storedUser?.city || "",
      });
    };

    loadProfile();
  }, []);

  const displayName =
    profile?.fullName ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    profile?.name ||
    profile?.email ||
    "Chef";

  const displayEmail =
    profile?.email || profile?.identifier || "chef@example.com";
  const displayRole = profile?.role || "Home Chef";

  const openEdit = () => {
    setForm({
      fullName:
        profile?.fullName ||
        [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
        profile?.name ||
        "",
      email: profile?.email || profile?.identifier || "",
      phone: profile?.phone || profile?.mobile || profile?.phone_number || "",
      address: profile?.address || profile?.street_address || "",
      city: profile?.city || "",
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = form.fullName.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPhone = form.phone.trim();

    if (!trimmedName) {
      return;
    }

    setSaving(true);

    try {
      const [firstName, ...rest] = trimmedName.split(" ");
      const lastName = rest.join(" ");

      const payload = {
        fullName: trimmedName,
        firstName,
        lastName: lastName || "",
        email: trimmedEmail,
        phone: trimmedPhone,
        mobile: trimmedPhone,
        phone_number: trimmedPhone,
        address: form.address.trim(),
        city: form.city.trim(),
      };

      const updated = { ...(profile || {}), ...payload };
      await AsyncStorage.setItem("userProfile", JSON.stringify(updated));
      setProfile(updated);

      try {
        await api.put("/auth/profile", payload);
      } catch (error) {
        console.warn(
          "Profile update backend call failed, stored locally only:",
          error,
        );
      }

      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDetailPanelPress = (panelKey: string) => {
    setActiveDetailPanel(activeDetailPanel === panelKey ? null : panelKey);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Green hero header ── */}
        <SafeAreaView
          edges={["top"]}
          style={{ backgroundColor: colors.primary }}
        >
          <View
            style={{
              alignItems: "center",
              paddingTop: 20,
              paddingBottom: 36,
              paddingHorizontal: 20,
            }}
          >
            {/* Avatar */}
            <View style={{ position: "relative", marginBottom: 14 }}>
              <View
                style={{
                  height: 104,
                  width: 104,
                  borderRadius: 52,
                  borderWidth: 3,
                  borderColor: "#fff",
                  overflow: "hidden",
                  backgroundColor: "rgba(255,255,255,0.15)",
                }}
              >
                <Image
                  source={require("../../assets/images/chef_hero.jpg")}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </View>

              {/* Edit badge */}
              <Pressable
                onPress={openEdit}
                style={{
                  position: "absolute",
                  bottom: 2,
                  right: 2,
                  height: 28,
                  width: 28,
                  borderRadius: 14,
                  backgroundColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="pencil" size={13} color={colors.primary} />
              </Pressable>
            </View>

            {/* Name with Home Chef badge */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: "#fff",
                }}
              >
                {displayName}
              </Text>
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.25)",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.4)",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#fff",
                  }}
                >
                  {displayRole}
                </Text>
              </View>
            </View>

            {/* Email */}
            <Text
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.8)",
                marginBottom: 10,
              }}
            >
              {displayEmail}
            </Text>

            {/* Rating */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#fff",
                }}
              >
                4.8
              </Text>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                (230 Reviews)
              </Text>
            </View>
          </View>
        </SafeAreaView>

        {isEditing && (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 20,
              backgroundColor: colors.cardBackground,
              borderRadius: 20,
              padding: 18,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: colors.primaryDark,
                marginBottom: 16,
              }}
            >
              Edit profile
            </Text>

            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.muted,
                marginBottom: 8,
              }}
            >
              Full name
            </Text>
            <TextInput
              value={form.fullName}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, fullName: text }))
              }
              placeholder="Enter full name"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "#F8FAF8",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                marginBottom: 14,
                color: colors.primaryDark,
              }}
            />

            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.muted,
                marginBottom: 8,
              }}
            >
              Email
            </Text>
            <TextInput
              value={form.email}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, email: text }))
              }
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "#F8FAF8",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                marginBottom: 14,
                color: colors.primaryDark,
              }}
            />

            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.muted,
                marginBottom: 8,
              }}
            >
              Phone
            </Text>
            <TextInput
              value={form.phone}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, phone: text }))
              }
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "#F8FAF8",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                marginBottom: 14,
                color: colors.primaryDark,
              }}
            />

            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.muted,
                marginBottom: 8,
              }}
            >
              City
            </Text>
            <TextInput
              value={form.city}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, city: text }))
              }
              placeholder="Enter city"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "#F8FAF8",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                marginBottom: 14,
                color: colors.primaryDark,
              }}
            />

            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.muted,
                marginBottom: 8,
              }}
            >
              Address
            </Text>
            <TextInput
              value={form.address}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, address: text }))
              }
              placeholder="Enter address"
              multiline
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "#F8FAF8",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                minHeight: 80,
                textAlignVertical: "top",
                marginBottom: 18,
                color: colors.primaryDark,
              }}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => setIsEditing(false)}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingVertical: 12,
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
              </Pressable>

              <Pressable
                onPress={handleSaveProfile}
                disabled={saving}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  paddingVertical: 12,
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
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Stats strip ── */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.cardBackground,
            marginHorizontal: 20,
            marginTop: isEditing ? 20 : -24,
            borderRadius: 20,
            paddingVertical: 18,
            paddingHorizontal: 10,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <StatCol value="120+" label="Dishes" />

          {/* Vertical divider */}
          <View
            style={{
              width: 1,
              backgroundColor: colors.border,
              marginVertical: 4,
            }}
          />

          <StatCol value="98%" label="On-Time" />

          {/* Vertical divider */}
          <View
            style={{
              width: 1,
              backgroundColor: colors.border,
              marginVertical: 4,
            }}
          />

          <StatCol
            value="4.8"
            label="Rating"
            suffix={<Ionicons name="star" size={14} color="#F59E0B" />}
          />
        </View>

        {/* ── Menu card ── */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            marginHorizontal: 20,
            marginTop: 20,
            borderRadius: 20,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {getMenuItems(handleDetailPanelPress).map((item, idx) => (
            <MenuItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              route={item.route}
              onPress={item.onPress}
              isLast={idx === getMenuItems(handleDetailPanelPress).length - 1}
            />
          ))}
        </View>

        {/* ── Kitchen Information Detail Panel ── */}
        {activeDetailPanel === "kitchen" && (
          <View
            style={{
              backgroundColor: colors.cardBackground,
              marginHorizontal: 20,
              marginTop: 14,
              borderRadius: 20,
              padding: 16,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: colors.primaryDark,
                marginBottom: 12,
              }}
            >
              Kitchen Information
            </Text>
            <DetailRow
              label="Kitchen Name"
              value={profile?.kitchen_name}
              icon="storefront-outline"
            />
            <DetailRow label="Kitchen Type" value={profile?.kitchen_type} />
            <DetailRow label="Address" value={profile?.kitchen_address} />
            <DetailRow label="Cuisine Type" value={profile?.cuisine_type} />
            <DetailRow
              label="Veg/Non-Veg"
              value={
                profile?.veg_nonveg === "both"
                  ? "Both Veg & Non-Veg"
                  : profile?.veg_nonveg
              }
            />
            <DetailRow
              label="Experience Years"
              value={profile?.experience_years}
            />
          </View>
        )}

        {/* ── Bank Details Panel ── */}
        {activeDetailPanel === "bank" && (
          <View
            style={{
              backgroundColor: colors.cardBackground,
              marginHorizontal: 20,
              marginTop: 14,
              borderRadius: 20,
              padding: 16,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: colors.primaryDark,
                marginBottom: 12,
              }}
            >
              Bank Details
            </Text>
            <DetailRow
              label="Account Holder Name"
              value={profile?.account_holder_name}
              icon="person-outline"
            />
            <DetailRow
              label="Bank Account Number"
              value={profile?.bank_account_number}
            />
            <DetailRow label="IFSC Code" value={profile?.ifsc_code} />
            <DetailRow label="Bank Branch" value={profile?.bank_branch} />
            <DetailRow label="UPI ID" value={profile?.upi_id} />
          </View>
        )}

        {/* ── Documents Panel ── */}
        {activeDetailPanel === "docs" && (
          <View
            style={{
              backgroundColor: colors.cardBackground,
              marginHorizontal: 20,
              marginTop: 14,
              borderRadius: 20,
              padding: 16,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: colors.primaryDark,
                marginBottom: 12,
              }}
            >
              Documents & Verification
            </Text>
            <DetailRow
              label="Aadhaar (Front)"
              value={profile?.aadhaar_front_url ? "✓ Uploaded" : "Not uploaded"}
              icon="checkmark-circle-outline"
            />
            <DetailRow
              label="Aadhaar (Back)"
              value={profile?.aadhaar_back_url ? "✓ Uploaded" : "Not uploaded"}
            />
            <DetailRow
              label="PAN Card"
              value={profile?.pan_card_url ? "✓ Uploaded" : "Not uploaded"}
            />
            <DetailRow
              label="FSAI Certificate"
              value={
                profile?.fsai_certificate_url ? "✓ Uploaded" : "Not uploaded"
              }
            />
            <DetailRow
              label="GST Certificate"
              value={
                profile?.gst_certificate_url ? "✓ Uploaded" : "Not uploaded"
              }
            />
            <DetailRow
              label="Selfie Verification"
              value={
                profile?.selfie_verification_url ? "✓ Verified" : "Pending"
              }
            />
          </View>
        )}

        {/* ── Delivery Settings Panel ── */}
        {activeDetailPanel === "delivery" && (
          <View
            style={{
              backgroundColor: colors.cardBackground,
              marginHorizontal: 20,
              marginTop: 14,
              borderRadius: 20,
              padding: 16,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: colors.primaryDark,
                marginBottom: 12,
              }}
            >
              Delivery Settings
            </Text>
            <DetailRow
              label="Pre-Order Available"
              value={
                profile?.preorder_available === 1 ? "✓ Enabled" : "✗ Disabled"
              }
              icon="cart-outline"
            />
            <DetailRow
              label="Delivery Radius"
              value={
                profile?.delivery_radius
                  ? `${profile.delivery_radius} km`
                  : "Not set"
              }
            />
            <DetailRow label="Cutoff Time" value={profile?.cutoff_time} />
            <DetailRow
              label="Daily Order Capacity"
              value={profile?.daily_order_capacity}
            />
            <DetailRow label="Available Days" value={profile?.available_days} />
            <DetailRow
              label="Available Slots"
              value={profile?.available_slots}
            />
          </View>
        )}

        {/* App version */}
        <Text
          style={{
            textAlign: "center",
            fontSize: 12,
            color: colors.muted,
            marginTop: 20,
          }}
        >
          Veetu Rusi Home Chef · v1.0.0
        </Text>
      </ScrollView>

      <BottomBar />
    </View>
  );
}
