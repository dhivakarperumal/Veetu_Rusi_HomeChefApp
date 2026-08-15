import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const GREEN = "#2E7A4F";
const DARK  = "#1A3328";
const MUTED = "#7A8E87";
const BG    = "#F7F2EA";

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode]           = useState<"mobile" | "email">("mobile");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [focused, setFocused]     = useState(false);

  const handleSendOTP = async () => {
    const clean = identifier.trim();
    if (!clean) {
      setError(mode === "mobile" ? "Please enter your mobile number." : "Please enter your email address.");
      return;
    }
    if (mode === "mobile" && clean.replace(/\D/g, "").length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await new Promise((r) => setTimeout(r, 700));
      const formatted = mode === "mobile" ? `+91 ${clean.slice(0, 5)} ${clean.slice(5)}` : clean;
      router.push({ pathname: "/verify-otp", params: { identifier: formatted, mode } });
    } catch {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ─── Logo Icon ─── */}
        <View style={styles.logoIconWrap}>
          <MaterialCommunityIcons name="home-heart" size={38} color={GREEN} />
        </View>

        {/* ─── Brand Name ─── */}
        <Text style={styles.brandName}>
          <Text style={styles.brandGreen}>Veetu </Text>
          <Text style={styles.brandOrange}>Rusi</Text>
        </Text>

        {/* ─── Greeting ─── */}
        <Text style={styles.greeting}>Welcome Back!</Text>
        <Text style={styles.greetingSub}>Login to continue</Text>

        {/* ─── Chef Illustration ─── */}
        <View style={styles.illustWrap}>
          <Image
            source={require("../../assets/images/chef_hero.jpg")}
            style={styles.illustImg}
            contentFit="cover"
          />
        </View>

        {/* ─── Form Container ─── */}
        <View style={styles.formWrap}>

          {/* Toggle */}
          <View style={styles.toggle}>
            {(["mobile", "email"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => { setMode(m); setIdentifier(""); setError(""); }}
                style={[styles.toggleTab, mode === m && styles.toggleTabActive]}
              >
                <Text style={[styles.toggleTabText, mode === m && styles.toggleTabTextActive]}>
                  {m === "mobile" ? "Mobile Number" : "Email"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Input */}
          <View style={[styles.inputBox, focused && styles.inputBoxFocused, !!error && styles.inputBoxError]}>
            {mode === "mobile" ? (
              <View style={styles.dialWrap}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.dial}> +91</Text>
                <View style={styles.inputSep} />
              </View>
            ) : (
              <View style={styles.dialWrap}>
                <Ionicons name="mail-outline" size={17} color={MUTED} />
                <View style={styles.inputSep} />
              </View>
            )}
            <TextInput
              value={identifier}
              onChangeText={(t) => { setIdentifier(t); if (error) setError(""); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              keyboardType={mode === "mobile" ? "phone-pad" : "email-address"}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={mode === "mobile" ? "Enter mobile number" : "Enter email address"}
              placeholderTextColor="#B2C2BC"
              style={styles.textInput}
              maxLength={mode === "mobile" ? 10 : 100}
            />
          </View>

          {/* Error */}
          {!!error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Send OTP */}
          <TouchableOpacity
            onPress={handleSendOTP}
            disabled={loading}
            activeOpacity={0.82}
            style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sendBtnText}>Send OTP</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divLabel}>or</Text>
            <View style={styles.divLine} />
          </View>

          {/* Google */}
          <TouchableOpacity
            activeOpacity={0.78}
            style={styles.googleBtn}
          >
            <FontAwesome5 name="google" size={16} color="#EA4335" />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          New to Veetu Rusi?{"  "}
          <Text style={styles.footerLink}>Sign Up</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 44 : 52,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },

  /* Logo */
  logoIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#EAF3ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: GREEN,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  /* Brand */
  brandName: {
    fontSize: 30,
    fontWeight: "800",
    fontStyle: "italic",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  brandGreen: {
    color: GREEN,
  },
  brandOrange: {
    color: "#C9631A",
  },

  /* Greeting */
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: DARK,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  greetingSub: {
    fontSize: 13.5,
    color: MUTED,
    textAlign: "center",
    marginTop: 3,
    marginBottom: 16,
  },

  /* Illustration */
  illustWrap: {
    width: width - 48,
    height: 170,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#E8E0D0",
    shadowColor: "#8B6940",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  illustImg: {
    width: "100%",
    height: "100%",
  },

  /* Form */
  formWrap: {
    width: "100%",
  },

  /* Toggle */
  toggle: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#D5E2DC",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 3,
    marginBottom: 14,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9,
    alignItems: "center",
  },
  toggleTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  toggleTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
  },
  toggleTabTextActive: {
    color: GREEN,
    fontWeight: "700",
  },

  /* Input */
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D5E2DC",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 52,
    marginBottom: 4,
  },
  inputBoxFocused: {
    borderColor: GREEN,
    shadowColor: GREEN,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  inputBoxError: {
    borderColor: "#D32F2F",
  },
  dialWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4,
  },
  flag: {
    fontSize: 19,
  },
  dial: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E5A47",
    marginRight: 2,
  },
  inputSep: {
    width: 1.5,
    height: 20,
    backgroundColor: "#C8D8D2",
    marginLeft: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: DARK,
    paddingVertical: 13,
    paddingHorizontal: 8,
  },

  /* Error */
  errorText: {
    fontSize: 12,
    color: "#D32F2F",
    paddingLeft: 4,
    marginTop: 4,
    marginBottom: 2,
  },

  /* Send OTP Button */
  sendBtn: {
    marginTop: 14,
    backgroundColor: GREEN,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#104028",
    shadowOpacity: 0.38,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sendBtnDisabled: {
    backgroundColor: "#8DB8A0",
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  /* Divider */
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  divLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D5E0DA",
  },
  divLabel: {
    marginHorizontal: 14,
    fontSize: 13,
    color: MUTED,
    fontWeight: "500",
  },

  /* Google */
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D5E2DC",
    borderRadius: 12,
    height: 52,
    overflow: "hidden",
  },
  googleBtnText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: DARK,
  },

  /* Footer */
  footer: {
    marginTop: 22,
    fontSize: 13.5,
    color: MUTED,
    textAlign: "center",
  },
  footerLink: {
    color: GREEN,
    fontWeight: "700",
  },
});
