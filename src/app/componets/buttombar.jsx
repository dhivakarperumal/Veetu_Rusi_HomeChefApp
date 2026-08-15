import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GREEN = "#2E7A4F";
const GREEN_SOFT = "#EAF4EE";
const LABEL = "#5A7A6E";
const NAV_BG = "#F8F6F1";
const BORDER = "#E2EDE7";

const TABS = [
  {
    key: "dashboard",
    label: "Home",
    icon: "home-outline",
    activeIcon: "home",
    route: "/dashboard",
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
  const insets = useSafeAreaInsets();

  const activeKey = (() => {
    if (pathname === "/" || pathname === "/dashboard") return "dashboard";
    const seg = pathname.replace("/", "").split("/")[0];
    return TABS.find((t) => t.key === seg)?.key ?? "dashboard";
  })();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 8 }]}>
      {/* Top border line */}
      <View style={styles.topBorder} />

      <View style={styles.row}>
        {TABS.map(({ key, label, icon, activeIcon, route }) => {
          const isActive = activeKey === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => router.push(route)}
              activeOpacity={0.7}
              style={styles.tab}
            >
              {/* Pill indicator */}
              <View
                style={[styles.iconWrap, isActive && styles.iconWrapActive]}
              >
                <Ionicons
                  name={isActive ? activeIcon : icon}
                  size={22}
                  color={isActive ? "#fff" : LABEL}
                />
              </View>

              <Text style={[styles.label, isActive && styles.labelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: NAV_BG,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 12,
  },
  topBorder: {
    height: 1,
    backgroundColor: BORDER,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  iconWrap: {
    width: 46,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconWrapActive: {
    backgroundColor: GREEN,
    width: 64,
    height: 40,
    borderRadius: 20,
    shadowColor: GREEN,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  label: {
    fontSize: 10.5,
    fontWeight: "500",
    color: LABEL,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: GREEN,
    fontWeight: "700",
  },
});
