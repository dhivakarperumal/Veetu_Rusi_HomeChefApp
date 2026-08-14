import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";

const tabs = [
  {
    key: "home",
    label: "Home",
    icon: "home-outline",
    activeIcon: "home",
    route: "/",
  },
  {
    key: "orders",
    label: "Orders",
    icon: "receipt-outline",
    activeIcon: "receipt",
    route: "/orders",
  },
  {
    key: "dishes",
    label: "Dishes",
    icon: "restaurant-outline",
    activeIcon: "restaurant",
    route: "/dishes",
  },
  {
    key: "earnings",
    label: "Earnings",
    icon: "cash-outline",
    activeIcon: "cash",
    route: "/earnings",
  },
  {
    key: "profile",
    label: "Profile",
    icon: "person-outline",
    activeIcon: "person",
    route: "/profile",
  },
];

export default function BottomBar() {
  const router = useRouter();
  const pathname = usePathname();
  const activeTab =
    pathname === "/" ? "home" : pathname.replace("/", "") || "home";

  return (
    <SafeAreaView
      style={{
        backgroundColor: colors.navBackground,
      }}
    >
      <View
        className="border px-2 py-3 shadow-lg shadow-black/10"
        style={{
          backgroundColor: colors.navBackground,
          borderColor: colors.border,
        }}
      >
        <View className="flex-row items-center justify-between">
          {tabs.map(({ key, label, icon, activeIcon, route }) => {
            const isActive = activeTab === key;

            return (
              <Pressable
                key={key}
                onPress={() => router.push(route)}
                className="flex-1 items-center justify-center rounded-2xl py-3 px-2"
              >
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isActive ? colors.primary : "transparent",
                  }}
                >
                  <Ionicons
                    name={isActive ? activeIcon : icon}
                    size={22}
                    color={isActive ? colors.white : colors.label}
                  />
                </View>
                <Text
                  className="mt-1 text-[11px]"
                  style={{
                    color: isActive ? colors.primary : colors.label,
                    fontWeight: isActive ? "600" : "400",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
