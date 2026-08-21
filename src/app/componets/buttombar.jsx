import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LABEL = "#5A7A6E";

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
      <View style={styles.border} />

      <View style={styles.tabs}>
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
                style={[
                  styles.iconPill,
                  isActive ? styles.activeIconPill : styles.inactiveIconPill,
                ]}
              >
                <Ionicons
                  name={isActive ? activeIcon : icon}
                  size={22}
                  color={isActive ? "#fff" : LABEL}
                />
              </View>

              <Text
                style={[
                  styles.label,
                  isActive ? styles.activeLabel : styles.inactiveLabel,
                ]}
              >
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
    backgroundColor: "#F8F6F1",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
    elevation: 4,
  },
  border: { height: 1, backgroundColor: "#E2EDE7" },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  iconPill: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  activeIconPill: {
    height: 48,
    width: 52,
    borderRadius: 999,
    backgroundColor: "#2E7A4F",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  inactiveIconPill: { height: 38, width: 46 },
  label: { marginTop: 4, fontSize: 10.5, letterSpacing: 0.2 },
  activeLabel: { fontWeight: "700", color: "#2E7A4F" },
  inactiveLabel: { fontWeight: "500", color: LABEL },
});
