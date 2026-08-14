import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";

export default function TopHeader() {
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  return (
    <>
      {/* ── Sidebar Overlay ── */}
      {showMenuDropdown && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
          }}
        >
          {/* Scrim */}
          <Pressable
            onPress={() => setShowMenuDropdown(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.45)",
            }}
          />

          {/* Drawer */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: 280,
              backgroundColor: colors.primary,
              paddingTop: 52,
            }}
          >
            {/* Close button */}
            <Pressable
              onPress={() => setShowMenuDropdown(false)}
              style={{
                marginLeft: 20,
                marginBottom: 24,
                height: 40,
                width: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.25)",
              }}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>

            {/* Brand */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                marginBottom: 32,
              }}
            >
              <View
                style={{
                  height: 48,
                  width: 48,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="restaurant-outline" size={24} color="#fff" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
                  Home Chef
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                  Cooked with Love
                </Text>
              </View>
            </View>

            {/* Nav items */}
            {[
              { icon: "speedometer-outline", label: "Dashboard" },
              { icon: "settings-outline", label: "Settings" },
              { icon: "help-circle-outline", label: "Help & Support" },
            ].map(({ icon, label }) => (
              <Pressable
                key={label}
                onPress={() => setShowMenuDropdown(false)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginHorizontal: 20,
                  marginBottom: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.12)",
                }}
              >
                <Ionicons name={icon} size={22} color="#fff" />
                <Text
                  style={{
                    color: "#fff",
                    marginLeft: 14,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* ── Header (SafeArea covers status bar) ── */}
      <SafeAreaView
        edges={["top"]}
        style={{ backgroundColor: colors.primary }}
      >
        {/* Nav row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 16,
          }}
        >
          {/* Hamburger */}
          <Pressable
            onPress={() => setShowMenuDropdown(true)}
            style={{
              height: 40,
              width: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              backgroundColor: "rgba(0,0,0,0.18)",
            }}
          >
            <Ionicons name="menu-outline" size={24} color="#fff" />
          </Pressable>

          {/* Brand */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                height: 32,
                width: 32,
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              <Ionicons name="restaurant-outline" size={18} color="#fff" />
            </View>
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
              Home Chef
            </Text>
          </View>

          {/* Bell */}
          <Pressable
            style={{
              height: 40,
              width: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              backgroundColor: "rgba(0,0,0,0.18)",
            }}
          >
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                height: 8,
                width: 8,
                borderRadius: 4,
                backgroundColor: "#FF5252",
                borderWidth: 1.5,
                borderColor: colors.primary,
              }}
            />
          </Pressable>
        </View>

        {/* ── Hero card — sits flush inside the green SafeAreaView ── */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 24,
            backgroundColor: "rgba(0,0,0,0.18)",
            overflow: "hidden",
            height: 160,
          }}
        >
          {/* Chef image — right half */}
          <Image
            source={require("../../../assets/images/chef_hero.jpg")}
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 160,
              height: 165,
            }}
            contentFit="cover"
          />

          {/* Gradient fade so text stays readable */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.08)",
            }}
          />

          {/* Text — left side */}
          <View style={{ padding: 18, maxWidth: "58%" }}>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "500" }}>
              Hello, Akshaya! 👋
            </Text>
            <Text
              style={{
                color: "#fff",
                fontSize: 22,
                fontWeight: "800",
                marginTop: 2,
                lineHeight: 28,
              }}
            >
              Good morning!
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.78)",
                fontSize: 13,
                marginTop: 4,
                lineHeight: 18,
              }}
            >
              Let's make today{"\n"}delicious.
            </Text>

            {/* Badge */}
            <View
              style={{
                marginTop: 10,
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                backgroundColor: "rgba(255,255,255,0.22)",
                borderRadius: 50,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Ionicons name="heart" size={11} color="#FF8A65" />
              <Text
                style={{
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: "600",
                  marginLeft: 4,
                }}
              >
                Cooked with Love
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}
