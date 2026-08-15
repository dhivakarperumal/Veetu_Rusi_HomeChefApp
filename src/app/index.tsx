import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F3E8" />

      {/* Decorative spice dots */}
      <View style={styles.dotTopRight} />
      <View style={styles.dotBottomLeft} />

      {/* Brand Logo */}
      <View style={styles.logoWrap}>
        <Image
          source={require("../../assets/images/ChatGPT Image Aug 14, 2026, 03_06_06 PM.png")}
          style={styles.logoImage}
          contentFit="contain"
        />
      </View>

      {/* Tagline */}
      <Text style={styles.taglineEn}>Home Food. Healthy &amp; Tasty 🌿</Text>
      <Text style={styles.taglineTa}>வீட்டு சுவை... அம்மா சுவை!</Text>

      {/* Hero Food Image */}
      <View style={styles.heroWrap}>
        <Image
          source={require("../../assets/images/chef_hero.jpg")}
          style={styles.heroImage}
          contentFit="cover"
        />
        {/* Soft vignette ring */}
        <View style={styles.heroRing} />
      </View>

      {/* Bottom badge */}
      <View style={styles.bottomBadge}>
        <View style={styles.dot} />
        <Text style={styles.badgeText}>Home Chef Partner App</Text>
        <View style={styles.dot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F9F3E8",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Platform.OS === "android" ? 40 : 60,
    paddingBottom: 40,
  },
  dotTopRight: {
    position: "absolute",
    top: 60,
    right: 30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E8C97A",
    opacity: 0.25,
  },
  dotBottomLeft: {
    position: "absolute",
    bottom: 80,
    left: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#4C9A6A",
    opacity: 0.18,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 6,
  },
  logoImage: {
    width: width * 0.68,
    height: width * 0.68,
  },
  taglineEn: {
    fontSize: 15,
    color: "#5A7A6E",
    fontWeight: "500",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  taglineTa: {
    fontSize: 16,
    color: "#C56A1C",
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 28,
  },
  heroWrap: {
    width: width * 0.82,
    height: width * 0.82,
    borderRadius: (width * 0.82) / 2,
    overflow: "hidden",
    borderWidth: 6,
    borderColor: "#D4B483",
    shadowColor: "#8B5E2E",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroRing: {
    position: "absolute",
    inset: 0,
    borderRadius: 1000,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
  },
  bottomBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 28,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#C56A1C",
    opacity: 0.7,
  },
  badgeText: {
    fontSize: 13,
    color: "#8B6E4E",
    fontWeight: "600",
    letterSpacing: 0.8,
  },
});
