import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { getStoredToken, loginWithIdentifier } from "../api";
import { showAppDialog } from "../lib/app-dialog";
import { colors } from "../theme/colors";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getStoredToken();
        if (token) {
          router.replace("/dashboard");
          return;
        }
      } catch (err) {
        console.error("Error reading stored token", err);
      } finally {
        setCheckingSession(false);
      }
    };
    restoreSession();
  }, [router]);

  const handleLogin = async () => {
    Keyboard.dismiss();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail) {
      setError("Please enter your email or phone number.");
      return;
    }
    if (!cleanPass) {
      setError("Please enter your password.");
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
        (err as { message?: string })?.message ||
        (err instanceof Error ? err.message : "Invalid email or password.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    showAppDialog(
      "Forgot Password?",
      "To reset your kitchen password, please reach out to your Veetu Rusi administrator or contact kitchen support.",
      [
        { text: "Close", style: "cancel" },
        {
          text: "Contact Support",
          onPress: () => {
            Linking.openURL("https://wa.me/919876543210?text=Hi%2C%20I%20need%20to%20reset%20my%20Veetu%20Rusi%20Home%20Chef%20account%20password").catch(() => {});
          },
        },
      ]
    );
  };

  const handleAdminSupport = () => {
    showAppDialog(
      "Veetu Rusi Chef Support",
      "Need help accessing your kitchen portal or want to become a verified Home Chef partner?",
      [
        { text: "Dismiss", style: "cancel" },
        {
          text: "WhatsApp Support",
          onPress: () => {
            Linking.openURL("https://wa.me/919876543210?text=Hello%20Veetu%20Rusi%20Team%2C%20I%20need%20help%20with%20my%20Chef%20Portal").catch(() => {});
          },
        },
      ]
    );
  };

  if (checkingSession) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.pageBackground} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadgeContainer}>
              <View style={styles.logoCircle}>
                <Image
                  source={require("../../assets/images/ChatGPT Image Aug 14, 2026, 03_06_06 PM.png")}
                  style={styles.logoImage}
                  contentFit="contain"
                />
              </View>
            </View>

            <View style={styles.portalPill}>
              <Ionicons name="restaurant" size={13} color={colors.primary} />
              <Text style={styles.portalPillText}>CHEF PARTNER PORTAL</Text>
            </View>

            <Text style={styles.brandTitle}>Veetu Rusi</Text>
            <Text style={styles.brandTagline}>Cooked with Love • வீட்டு ருசி</Text>

            <Text style={styles.welcomeTitle}>Welcome Back, Chef!</Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in to manage your dishes, track incoming orders, and view daily earnings.
            </Text>
          </View>

          {/* Main Login Card */}
          <View style={styles.card}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <MaterialCommunityIcons name="chef-hat" size={24} color={colors.primary} />
              </View>
              <View style={styles.cardHeaderTextWrap}>
                <Text style={styles.cardTitle}>Kitchen Sign In</Text>
                <Text style={styles.cardSubtitle}>Enter your account credentials</Text>
              </View>
            </View>

            {/* Error Message Banner */}
            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#C62828" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email / Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address or Phone</Text>
              <View
                style={[
                  styles.inputWrap,
                  emailFocused && styles.inputWrapFocused,
                  !!error && styles.inputWrapError,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={emailFocused ? colors.primary : colors.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) setError("");
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="e.g. chef@veeturusi.com"
                  placeholderTextColor="#8EA399"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                  maxLength={100}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.inputLabel}>Password</Text>
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  hitSlop={8}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputWrap,
                  passwordFocused && styles.inputWrapFocused,
                  !!error && styles.inputWrapError,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={passwordFocused ? colors.primary : colors.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) setError("");
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="Enter your kitchen password"
                  placeholderTextColor="#8EA399"
                  secureTextEntry={!showPass}
                  style={styles.textInput}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPass(!showPass)}
                  style={styles.eyeBtn}
                  hitSlop={10}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPass ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Login Button */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.loginBtn,
                pressed && styles.loginBtnPressed,
                loading && styles.loginBtnDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.loginBtnContent}>
                  <Ionicons name="log-in-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.loginBtnText}>Sign In to Kitchen</Text>
                </View>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or kitchen support</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* WhatsApp / Admin Support Button */}
            <TouchableOpacity
              onPress={handleAdminSupport}
              style={styles.supportBtn}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="whatsapp" size={18} color="#25D366" />
              <Text style={styles.supportBtnText}>Connect with Kitchen Admin</Text>
            </TouchableOpacity>

            {/* Security Note */}
            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark" size={15} color={colors.primary} />
              <Text style={styles.securityNoteText}>
                Authorized Home Chef Access Only
              </Text>
            </View>
          </View>

          {/* Three Feature Highlights Pill Row */}
          <View style={styles.featuresRow}>
            <View style={styles.featurePill}>
              <Ionicons name="receipt-outline" size={14} color={colors.primary} />
              <Text style={styles.featurePillText}>Live Orders</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="trending-up-outline" size={14} color={colors.primary} />
              <Text style={styles.featurePillText}>Instant Payouts</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="heart-outline" size={14} color={colors.primary} />
              <Text style={styles.featurePillText}>Cooked with Love</Text>
            </View>
          </View>

          {/* Bottom Footer Note */}
          <View style={styles.footerWrap}>
            <Text style={styles.footerText}>
              Need to register as a partner chef?{" "}
              <Text onPress={handleAdminSupport} style={styles.footerLink}>
                Contact Admin
              </Text>
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.pageBackground,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.pageBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 44 : 52,
    paddingBottom: 36,
  },

  /* Top Brand Header */
  brandHeader: {
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  logoBadgeContainer: {
    marginBottom: 12,
  },
  logoCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoImage: {
    width: 74,
    height: 74,
  },
  portalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.softCard,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#D0E5DA",
  },
  portalPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.6,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.primaryDark,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    marginTop: 2,
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primaryDark,
    textAlign: "center",
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 320,
  },

  /* Main Card */
  card: {
    width: "100%",
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F5F2",
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.softCard,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#D6EBE0",
  },
  cardHeaderTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },

  /* Error Box */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
  },

  /* Input Fields */
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgotPasswordText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.primary,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "#FAFCFA",
    paddingHorizontal: 12,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: "#FFFFFF",
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inputWrapError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    fontWeight: "600",
    color: colors.primaryDark,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 4,
  },

  /* Login Button */
  loginBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  loginBtnPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.99 }],
  },
  loginBtnDisabled: {
    opacity: 0.75,
  },
  loginBtnContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  /* Divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5ECE7",
  },
  dividerText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
    paddingHorizontal: 10,
  },

  /* Support Button */
  supportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D2E7DC",
    backgroundColor: colors.softCard,
    marginBottom: 16,
  },
  supportBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryDark,
    marginLeft: 8,
  },

  /* Security Note */
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 2,
  },
  securityNoteText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.label,
  },

  /* Features Pill Row */
  featuresRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    marginBottom: 18,
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.label,
  },

  /* Footer */
  footerWrap: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  footerText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  footerLink: {
    color: colors.primary,
    fontWeight: "800",
  },
});
