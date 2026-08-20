import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getStoredUser, logoutUser } from "../../api";

const GREEN = "#2E7A4F";
const DARK = "#1A3328";

// ── Time-based greeting ──────────────────────────────────────────────────
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      text: "Good Morning!",
      emoji: "☀️",
      sub: "Let's make today\ndelicious.",
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      text: "Good Afternoon!",
      emoji: "🌞",
      sub: "Keep up the great\nwork today.",
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      text: "Good Evening!",
      emoji: "🌇",
      sub: "Hope your day\nwas wonderful.",
    };
  } else {
    return {
      text: "Good Night!",
      emoji: "🌙",
      sub: "Rest well and\ncome back refreshed.",
    };
  }
}

export default function TopHeader({
  showHero = true,
  title = "V2Home Chef",
  rightContent,
}) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileDrop, setShowProfileDrop] = useState(false);
  const [showNotifDrop, setShowNotifDrop] = useState(false);
  const [user, setUser] = useState(null);
  const [todayNewOrders, setTodayNewOrders] = useState([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await getStoredUser();
      setUser(storedUser || null);
    };
    loadUser();
  }, []);

  useEffect(() => {
    // Fetch today's new orders for notifications
    const fetchNotifications = async () => {
      try {
        const { default: api } = await import("../../api");
        const res = await api.get("/user-food-orders/chef");
        const today = new Date().toDateString();
        const orders = res.data || [];
        const newToday = orders.filter((o) => {
          const s = (o.status || "").toLowerCase();
          const isNew = [
            "pending",
            "new",
            "new order",
            "order placed",
          ].includes(s);
          const orderDate = new Date(
            o.ordered_at || o.created_at || Date.now(),
          ).toDateString();
          return isNew && orderDate === today;
        });
        setTodayNewOrders(newToday);
      } catch (err) {
        console.log("Error fetching notifications", err);
      }
    };
    fetchNotifications();
    // Poll every 20 seconds while header is mounted
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const profileName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.name ||
    user?.email ||
    "Chef";

  const profileEmail = user?.email || user?.identifier || "chef@example.com";
  const profileInitial = profileName.charAt(0).toUpperCase() || "C";
  const greetingName =
    user?.firstName || user?.name || profileName.split(" ")[0] || "Chef";

  const handleLogout = async () => {
    setShowProfileDrop(false);
    await logoutUser();
    router.replace("/");
  };

  return (
    <>
      <StatusBar style="light" backgroundColor={GREEN} />

      {/* ── Sidebar Overlay (Drawer Modal) ── */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View className="flex-1 bg-black/45">
            <TouchableWithoutFeedback>
              <View
                className="absolute bottom-0 left-0 top-0 w-[280px] bg-[#2E7A4F]"
                style={{ paddingTop: insets.top + 20 }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowMenu(false)}
                  className="ml-5 mb-6 h-11 w-11 items-center justify-center rounded-full bg-black/20"
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>

                <View className="mb-8 flex-row items-center px-5">
                  <View className="h-[52px] w-[52px] items-center justify-center rounded-2xl bg-white/20">
                    <MaterialCommunityIcons
                      name="home-heart"
                      size={26}
                      color="#fff"
                    />
                  </View>
                  <View className="ml-3.5">
                    <Text className="text-xl font-extrabold text-white">
                      Veetu Rusi
                    </Text>
                    <Text className="mt-0.5 text-[13px] text-white/75">
                      Cooked with Love
                    </Text>
                  </View>
                </View>

                {[
                  {
                    icon: "speedometer-outline",
                    label: "Dashboard",
                    route: "/orders",
                  },
                  {
                    icon: "settings-outline",
                    label: "Settings",
                    route: "/profile",
                  },
                ].map(({ icon, label, route }) => (
                  <TouchableOpacity
                    key={label}
                    activeOpacity={0.7}
                    onPress={() => {
                      setShowMenu(false);
                      if (route) router.push(route);
                    }}
                    className="mx-5 mb-2 flex-row items-center rounded-2xl bg-white/10 px-4 py-3.5"
                  >
                    <Ionicons name={icon} size={22} color="#fff" />
                    <Text className="ml-3.5 text-[15px] font-semibold text-white">
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Profile Dropdown Modal ── */}
      <Modal visible={showProfileDrop} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowProfileDrop(false)}>
          <View className="flex-1 bg-black/10">
            <TouchableWithoutFeedback>
              <View
                className="absolute w-[180px] overflow-hidden rounded-2xl bg-white shadow-lg"
                style={{ top: insets.top + 55, right: 16 }}
              >
                <View className="border-b border-[#F0F0F0] bg-[#F9F9F9] px-4 py-3.5">
                  <Text className="text-[15px] font-bold text-[#1A3328]">
                    {profileName}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-[#7A8E87]">
                    {profileEmail}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row items-center gap-3 px-4 py-3.5"
                  onPress={() => {
                    setShowProfileDrop(false);
                    router.push("/profile");
                  }}
                >
                  <Ionicons name="person-outline" size={18} color={DARK} />
                  <Text className="text-sm font-semibold text-[#1A3328]">
                    My Profile
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row items-center gap-3 border-t border-[#F0F0F0] px-4 py-3.5"
                  onPress={handleLogout}
                >
                  <Ionicons name="log-out-outline" size={18} color="#D32F2F" />
                  <Text className="text-sm font-semibold text-[#D32F2F]">
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Notifications Dropdown Modal ── */}
      <Modal visible={showNotifDrop} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowNotifDrop(false)}>
          <View className="flex-1 bg-black/10">
            <TouchableWithoutFeedback>
              <View
                className="absolute w-[250px] overflow-hidden rounded-2xl bg-white shadow-lg"
                style={{ top: insets.top + 55, right: 60 }}
              >
                <View className="border-b border-[#F0F0F0] bg-[#F9F9F9] px-4 py-3.5">
                  <Text className="text-[15px] font-bold text-[#1A3328]">
                    Notifications
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-[#7A8E87]">
                    {todayNewOrders.length} new orders today
                  </Text>
                </View>
                {todayNewOrders.length === 0 ? (
                  <View className="items-center p-5">
                    <Text className="text-[13px] text-[#7A8E87]">
                      No new orders right now.
                    </Text>
                  </View>
                ) : (
                  todayNewOrders.map((o, idx) => (
                    <TouchableOpacity
                      key={o.id || o._id || idx}
                      activeOpacity={0.7}
                      className="flex-row items-center gap-3 border-b border-[#F0F0F0] px-4 py-3.5"
                      onPress={() => {
                        setShowNotifDrop(false);
                        router.push(`/order/${o.id || o._id}`);
                      }}
                    >
                      <View className="flex-1">
                        <Text className="text-[13px] font-semibold text-[#1A3328]">
                          #{o.order_id || o.id} - {o.customer_name || "Unknown"}
                        </Text>
                        <Text className="mt-0.5 text-[11px] font-bold text-[#E65100]">
                          New Order
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Header Area ── */}
      <View className="bg-[#2E7A4F]" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between px-5 pb-5 pt-2">
          <View className="flex-1 flex-row items-center">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowMenu(true)}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/15"
            >
              <View className="items-start gap-[4.5px]">
                <View
                  className="h-[3px] rounded-full bg-white"
                  style={{ width: 18 }}
                />
                <View
                  className="h-[3px] rounded-full bg-white"
                  style={{ width: 12 }}
                />
                <View
                  className="h-[3px] rounded-full bg-white"
                  style={{ width: 7 }}
                />
              </View>
            </TouchableOpacity>

            <View className="ml-2.5 flex-row items-center">
              <Text className="text-[17px] font-bold text-white">{title}</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2.5">
            {rightContent && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 8,
                  gap: 8,
                }}
              >
                {rightContent}
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              className="h-[38px] w-[38px] items-center justify-center rounded-full bg-black/15"
              onPress={() => setShowNotifDrop(true)}
            >
              <Ionicons name="notifications-outline" size={22} color="#fff" />
              {todayNewOrders.length > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    backgroundColor: "#E65100",
                    height: 16,
                    minWidth: 16,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                    borderWidth: 1.5,
                    borderColor: GREEN,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}
                  >
                    {todayNewOrders.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              className="h-[38px] w-[38px] items-center justify-center rounded-full border-2 border-[#E65100] bg-[#FFF3E0]"
              onPress={() => setShowProfileDrop(true)}
            >
              <Text className="text-lg font-extrabold text-[#E65100]">
                {profileInitial}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showHero &&
          (() => {
            const greeting = getGreeting();
            return (
              <View className="mx-4 mb-5 h-40 overflow-hidden rounded-[24px] bg-black/20">
                <Image
                  source={require("../../../assets/images/chef_hero.jpg")}
                  className="absolute bottom-0 right-0 h-[165px] w-40"
                  contentFit="cover"
                />
                <View className="absolute bottom-0 left-0 right-0 top-0 bg-black/10" />
                <View className="max-w-[62%] p-5">
                  <Text className="text-sm font-medium text-white/85">
                    Hello, {greetingName}! 👋
                  </Text>
                  <Text className="mt-0.5 text-2xl font-extrabold leading-[30px] text-white">
                    {greeting.emoji} {greeting.text}
                  </Text>
                  <Text className="mt-1.5 text-[13px] leading-[18px] text-white/80">
                    {greeting.sub}
                  </Text>
                  <View className="mt-3 flex-row items-center self-start rounded-full bg-white/25 px-3 py-1">
                    <Ionicons name="heart" size={12} color="#FF8A65" />
                    <Text className="ml-1.5 text-xs font-bold text-white">
                      Cooked with Love
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}
      </View>
    </>
  );
}
