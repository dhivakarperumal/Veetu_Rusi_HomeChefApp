import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getStoredUser } from "../api";
import { colors } from "../theme/colors";
import BottomBar from "./componets/buttombar";

// ── Menu items ────────────────────────────────────────────────────────────────
const MENU_ITEMS = [
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
  },
  {
    key: "bank",
    label: "Bank Details",
    icon: "card-outline" as const,
  },
  {
    key: "docs",
    label: "Documents",
    icon: "document-text-outline" as const,
  },
  {
    key: "delivery",
    label: "Delivery Settings",
    icon: "bicycle-outline" as const,
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
      router.push(route);
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

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      const storedUser = await getStoredUser();
      setProfile(storedUser || null);
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

            {/* Name */}
            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: "#fff",
                marginBottom: 4,
              }}
            >
              {displayName}
            </Text>

            {/* Role */}
            <Text
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.8)",
                marginBottom: 10,
              }}
            >
              {displayRole}
            </Text>

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

        {/* ── Stats strip ── */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.cardBackground,
            marginHorizontal: 20,
            marginTop: -24,
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
          {MENU_ITEMS.map((item, idx) => (
            <MenuItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              route={item.route}
              isLast={idx === MENU_ITEMS.length - 1}
            />
          ))}
        </View>

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
