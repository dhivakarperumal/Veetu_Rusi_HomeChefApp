import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getStoredUser, logoutUser } from "../../api";

const GREEN = "#2E7A4F";
const DARK = "#1A3328";

export default function TopHeader() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileDrop, setShowProfileDrop] = useState(false);
  const [user, setUser] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await getStoredUser();
      setUser(storedUser || null);
    };

    loadUser();
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
      {/* ── Sidebar Overlay (Drawer Modal) ── */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.modalScrim}>
            <TouchableWithoutFeedback>
              <View style={[styles.drawer, { paddingTop: insets.top + 20 }]}>
                {/* Close button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowMenu(false)}
                  style={styles.drawerCloseBtn}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>

                {/* Brand */}
                <View style={styles.drawerBrandRow}>
                  <View style={styles.drawerBrandIconWrap}>
                    <MaterialCommunityIcons
                      name="home-heart"
                      size={26}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.drawerBrandTextWrap}>
                    <Text style={styles.drawerBrandTitle}>Veetu Rusi</Text>
                    <Text style={styles.drawerBrandSub}>Cooked with Love</Text>
                  </View>
                </View>

                {/* Nav items */}
                {[
                  { icon: "speedometer-outline", label: "Dashboard" },
                  { icon: "settings-outline", label: "Settings" },
                  { icon: "help-circle-outline", label: "Help & Support" },
                ].map(({ icon, label }) => (
                  <TouchableOpacity
                    key={label}
                    activeOpacity={0.7}
                    onPress={() => setShowMenu(false)}
                    style={styles.drawerNavItem}
                  >
                    <Ionicons name={icon} size={22} color="#fff" />
                    <Text style={styles.drawerNavLabel}>{label}</Text>
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
          <View style={styles.dropScrim}>
            <TouchableWithoutFeedback>
              <View style={[styles.dropDownBox, { top: insets.top + 55 }]}>
                <View style={styles.dropHeader}>
                  <Text style={styles.dropName}>{profileName}</Text>
                  <Text style={styles.dropEmail}>{profileEmail}</Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.dropItem}
                  onPress={() => {
                    setShowProfileDrop(false);
                    router.push("/profile");
                  }}
                >
                  <Ionicons name="person-outline" size={18} color={DARK} />
                  <Text style={styles.dropItemText}>My Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.dropItem,
                    { borderTopWidth: 1, borderColor: "#F0F0F0" },
                  ]}
                  onPress={handleLogout}
                >
                  <Ionicons name="log-out-outline" size={18} color="#D32F2F" />
                  <Text style={[styles.dropItemText, { color: "#D32F2F" }]}>
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Header Area ── */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        {/* Nav row */}
        <View style={styles.navRow}>
          <View style={styles.leftGroup}>
            {/* Hamburger */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowMenu(true)}
              style={styles.iconButton}
            >
              <View style={styles.staggeredMenu}>
                <View style={[styles.menuLine, { width: 18 }]} />
                <View style={[styles.menuLine, { width: 12 }]} />
                <View style={[styles.menuLine, { width: 7 }]} />
              </View>
            </TouchableOpacity>

            {/* Brand */}
            <View style={styles.brandCenter}>
              <Text style={styles.brandCenterText}>Home Chef</Text>
            </View>
          </View>

          {/* Right actions: notifications + profile avatar */}
          <View style={styles.rightActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.notificationButton}
              onPress={() => {}}
            >
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.avatarButton}
              onPress={() => setShowProfileDrop(true)}
            >
              <Text style={styles.avatarText}>{profileInitial}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Hero card ── */}
        <View style={styles.heroCard}>
          {/* Chef image — right half */}
          <Image
            source={require("../../../assets/images/chef_hero.jpg")}
            style={styles.heroImage}
            contentFit="cover"
          />

          {/* Gradient fade so text stays readable */}
          <View style={styles.heroOverlay} />

          {/* Text — left side */}
          <View style={styles.heroContent}>
            <Text style={styles.heroGreeting}>Hello, {greetingName}! 👋</Text>
            <Text style={styles.heroTitle}>Good morning!</Text>
            <Text style={styles.heroSub}>Let's make today{"\n"}delicious.</Text>

            {/* Badge */}
            <View style={styles.heroBadge}>
              <Ionicons name="heart" size={12} color="#FF8A65" />
              <Text style={styles.heroBadgeText}>Cooked with Love</Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  /* Sidebar Modal */
  modalScrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: GREEN,
  },
  drawerCloseBtn: {
    marginLeft: 20,
    marginBottom: 24,
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  drawerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  drawerBrandIconWrap: {
    height: 52,
    width: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerBrandTextWrap: {
    marginLeft: 14,
  },
  drawerBrandTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  drawerBrandSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginTop: 2,
  },
  drawerNavItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  drawerNavLabel: {
    color: "#fff",
    marginLeft: 14,
    fontSize: 15,
    fontWeight: "600",
  },

  /* Profile Dropdown */
  dropScrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  dropDownBox: {
    position: "absolute",
    right: 16,
    width: 180,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    overflow: "hidden",
  },
  dropHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#F9F9F9",
    borderBottomWidth: 1,
    borderColor: "#F0F0F0",
  },
  dropName: {
    fontSize: 15,
    fontWeight: "700",
    color: DARK,
  },
  dropEmail: {
    fontSize: 11,
    color: "#7A8E87",
    marginTop: 2,
  },
  dropItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  dropItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: DARK,
  },

  /* Header Main */
  headerContainer: {
    backgroundColor: GREEN,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  notificationButton: {
    height: 38,
    width: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  avatarButton: {
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#FFF3E0",
    borderWidth: 2,
    borderColor: "#E65100",
  },
  avatarText: {
    color: "#E65100",
    fontSize: 18,
    fontWeight: "800",
  },
  brandCenter: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  brandCenterText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },

  /* Hero Card */
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.18)",
    overflow: "hidden",
    height: 160,
  },
  heroImage: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 160,
    height: 165,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  heroContent: {
    padding: 20,
    maxWidth: "62%",
  },
  heroGreeting: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 2,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  heroSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  heroBadge: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  heroBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  staggeredMenu: {
    gap: 4.5,
    alignItems: "flex-start",
  },
  menuLine: {
    height: 3,
    backgroundColor: "#fff",
    borderRadius: 3,
  },
});
