import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { loginWithIdentifier } from "../api";

const { width } = Dimensions.get("window");

const GREEN = "#2E7A4F";
const DARK = "#1A3328";
const MUTED = "#7A8E87";
const BG = "#F7F2EA";

export default function LoginScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<"mobile" | "email">("mobile");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const identifierRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  /* ── Reset on tab switch ── */
  const switchMode = (m: "mobile" | "email") => {
    Keyboard.dismiss();
    setMode(m);
    setIdentifier("");
    setPassword("");
    setError("");
    setShowPass(false);
  };

  /* ── Validate & Send OTP ── */
  const handleSendOTP = async () => {
    Keyboard.dismiss();
    const clean = identifier.trim();
    if (!clean) {
      setError("Please enter your mobile number.");
      return;
    }
    if (clean.replace(/\D/g, "").length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await new Promise((r) => setTimeout(r, 700));
      const formatted = `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
      router.push({
        pathname: "/verify-otp",
        params: { identifier: formatted, mode: "mobile" },
      });
    } catch {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Validate & Email Login ── */
  const handleEmailLogin = async () => {
    Keyboard.dismiss();
    const cleanEmail = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!cleanPass) {
      setError("Please enter your password.");
      return;
    }
    if (cleanPass.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await loginWithIdentifier(cleanEmail, cleanPass);
      if (response?.token) {
        router.replace("/dashboard");
      } else {
        throw new Error(response?.message || "Login failed. Please try again.");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Invalid email or password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePrimaryAction = () =>
    mode === "mobile" ? handleSendOTP() : handleEmailLogin();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
      >
        {/* ── Logo ── */}
        <View style={styles.logoIconWrap}>
          <MaterialCommunityIcons name="home-heart" size={38} color={GREEN} />
        </View>

        {/* ── Brand ── */}
        <Text style={styles.brandName}>
          <Text style={styles.brandGreen}>Veetu </Text>
          <Text style={styles.brandOrange}>Rusi</Text>
        </Text>

        {/* ── Greeting ── */}
        <Text style={styles.greeting}>Welcome Back!</Text>
        <Text style={styles.greetingSub}>Login to continue</Text>

        {/* ── Chef Illustration ── */}
        <View style={styles.illustWrap}>
          <Image
            source={require("../../assets/images/chef_hero.jpg")}
            style={styles.illustImg}
            contentFit="cover"
          />
        </View>

        {/* ── Form ── */}
        <View style={styles.formWrap}>
          {/* Toggle */}
          <View style={styles.toggle}>
            {(["mobile", "email"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => switchMode(m)}
                style={[styles.toggleTab, mode === m && styles.toggleTabActive]}
              >
                <Text
                  style={[
                    styles.toggleTabText,
                    mode === m && styles.toggleTabTextActive,
                  ]}
                >
                  {m === "mobile" ? "Mobile Number" : "Email"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── Identifier input (mobile number or email) ── */}
          <View
            style={[
              styles.inputBox,
              emailFocused && styles.inputBoxFocused,
              !!error && !passFocused && styles.inputBoxError,
            ]}
          >
            {mode === "mobile" ? (
              <View style={styles.prefixWrap}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.dial}> +91</Text>
                <View style={styles.inputSep} />
              </View>
            ) : (
              <View style={styles.prefixWrap}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color={emailFocused ? GREEN : MUTED}
                />
                <View style={styles.inputSep} />
              </View>
            )}

            <TextInput
              ref={identifierRef}
              value={identifier}
              onChangeText={(t) => {
                setIdentifier(t);
                if (error) setError("");
              }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType={mode === "mobile" ? "phone-pad" : "email-address"}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={mode === "email" ? "email" : "tel"}
              placeholder={
                mode === "mobile"
                  ? "Enter mobile number"
                  : "Enter email address"
              }
              placeholderTextColor="#B2C2BC"
              style={styles.textInput}
              maxLength={mode === "mobile" ? 10 : 100}
              returnKeyType={mode === "mobile" ? "done" : "next"}
              enablesReturnKeyAutomatically
              onSubmitEditing={() => {
                if (mode === "mobile") {
                  handleSendOTP();
                } else {
                  passwordRef.current?.focus();
                }
              }}
            />
          </View>

          {/* ── Password input (email mode only) ── */}
          {mode === "email" && (
            <View
              style={[
                styles.inputBox,
                styles.inputBoxTop,
                passFocused && styles.inputBoxFocused,
              ]}
            >
              <View style={styles.prefixWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color={passFocused ? GREEN : MUTED}
                />
                <View style={styles.inputSep} />
              </View>

              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError("");
                }}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                placeholder="Enter password"
                placeholderTextColor="#B2C2BC"
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                style={styles.textInput}
                returnKeyType="done"
                enablesReturnKeyAutomatically
                onSubmitEditing={handleEmailLogin}
              />

              <TouchableOpacity
                onPress={() => setShowPass((v) => !v)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPass ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color={passFocused ? GREEN : MUTED}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Forgot password */}
          {mode === "email" && (
            <TouchableOpacity activeOpacity={0.7} style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* Error */}
          {!!error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={13} color="#D32F2F" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Primary Button */}
          <TouchableOpacity
            onPress={handlePrimaryAction}
            disabled={loading}
            activeOpacity={0.82}
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === "mobile" ? "Send OTP" : "Login"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divLabel}>or</Text>
            <View style={styles.divLine} />
          </View>

          {/* Google */}
          <TouchableOpacity activeOpacity={0.78} style={styles.googleBtn}>
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
  screen: { flex: 1, backgroundColor: BG },

  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 44 : 52,
    paddingBottom: 40,
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
  brandGreen: { color: GREEN },
  brandOrange: { color: "#C9631A" },

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
  illustImg: { width: "100%", height: "100%" },

  /* Form */
  formWrap: { width: "100%" },

  /* Toggle */
  toggle: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#D5E2DC",
    borderRadius: 12,
    backgroundColor: "#EEF5F0",
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
  toggleTabText: { fontSize: 13, fontWeight: "600", color: MUTED },
  toggleTabTextActive: { color: GREEN, fontWeight: "700" },

  /* Input box */
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D5E2DC",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 54,
  },
  inputBoxTop: {
    marginTop: 10,
  },
  inputBoxFocused: {
    borderColor: GREEN,
    shadowColor: GREEN,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  inputBoxError: {
    borderColor: "#D32F2F",
  },

  /* Prefix / icon area */
  prefixWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  flag: { fontSize: 19 },
  dial: { fontSize: 14, fontWeight: "700", color: "#2E5A47" },
  inputSep: {
    width: 1.5,
    height: 22,
    backgroundColor: "#C8D8D2",
    marginHorizontal: 10,
  },

  /* Text input */
  textInput: {
    flex: 1,
    fontSize: 15,
    color: DARK,
    height: "100%",
    paddingVertical: 0,
  },

  /* Eye toggle */
  eyeBtn: { padding: 4 },

  /* Forgot */
  forgotWrap: { alignSelf: "flex-end", marginTop: 8, marginBottom: 2 },
  forgotText: { fontSize: 12.5, color: GREEN, fontWeight: "600" },

  /* Error */
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingLeft: 2,
  },
  errorText: { fontSize: 12, color: "#D32F2F", flex: 1 },

  /* Primary button */
  primaryBtn: {
    marginTop: 16,
    backgroundColor: GREEN,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#104028",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  primaryBtnDisabled: {
    backgroundColor: "#8DB8A0",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
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
  divLine: { flex: 1, height: 1, backgroundColor: "#D5E0DA" },
  divLabel: {
    marginHorizontal: 14,
    fontSize: 13,
    color: MUTED,
    fontWeight: "500",
  },

  /* Google button */
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
  googleBtnText: { fontSize: 14.5, fontWeight: "600", color: DARK },

  /* Footer */
  footer: { marginTop: 22, fontSize: 13.5, color: MUTED, textAlign: "center" },
  footerLink: { color: GREEN, fontWeight: "700" },
});
