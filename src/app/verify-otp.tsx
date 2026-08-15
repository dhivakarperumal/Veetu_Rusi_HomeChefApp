import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { loginWithIdentifier } from "../api";
import { colors } from "../theme/colors";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 28;

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { identifier, mode } = useLocalSearchParams<{
    identifier: string;
    mode: string;
  }>();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));

  // Focus first box on mount
  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // Countdown
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (val: string, idx: number) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];

    if (val.length > 1) {
      // Paste support
      const digits = val.replace(/\D/g, "").slice(0, OTP_LENGTH);
      for (let i = 0; i < OTP_LENGTH; i++) next[i] = digits[i] ?? "";
      setOtp(next);
      inputRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    next[idx] = val;
    setOtp(next);
    if (val && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
    if (error) setError("");
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
      const next = [...otp];
      next[idx - 1] = "";
      setOtp(next);
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await loginWithIdentifier(identifier ?? "", code);
      if (response?.token) {
        router.replace("/dashboard");
      } else {
        throw new Error(response?.message || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed.";
      setError(msg);
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setOtp(Array(OTP_LENGTH).fill(""));
    setError("");
    setCountdown(RESEND_SECONDS);
    setCanResend(false);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const pad = (n: number) => String(n).padStart(2, "0");
  const timerLabel = `${pad(Math.floor(countdown / 60))}:${pad(countdown % 60)}`;
  const filled = otp.filter(Boolean).length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F5EFE6" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.55 }]}
          hitSlop={14}
        >
          <View style={styles.backCircle}>
            <Ionicons name="arrow-back" size={20} color="#1D3D30" />
          </View>
        </Pressable>

        {/* Brand */}
        <View style={styles.brandRow}>
          <View style={styles.logoCircle}>
            <Image
              source={require("../../assets/images/ChatGPT Image Aug 14, 2026, 03_06_06 PM.png")}
              style={styles.logoImg}
              contentFit="contain"
            />
          </View>
          <Text style={styles.brandName}>Veetu Rusi</Text>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Verify OTP</Text>
        <Text style={styles.desc}>
          We have sent OTP to
        </Text>
        <Text style={styles.identifierText}>{identifier}</Text>

        {/* OTP Card */}
        <View style={styles.card}>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(filled / OTP_LENGTH) * 100}%` },
              ]}
            />
          </View>

          {/* OTP Boxes */}
          <View style={styles.otpRow}>
            {otp.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(r) => { inputRefs.current[idx] = r; }}
                value={digit}
                onChangeText={(v) => handleChange(v, idx)}
                onKeyPress={(e) => handleKeyPress(e, idx)}
                keyboardType="number-pad"
                maxLength={6}
                selectTextOnFocus
                style={[
                  styles.otpBox,
                  digit ? styles.otpBoxFilled : null,
                  error ? styles.otpBoxError : null,
                ]}
                textAlign="center"
                caretHidden
              />
            ))}
          </View>

          {/* Error */}
          {!!error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color="#C62828" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Resend */}
          <View style={styles.resendRow}>
            {canResend ? (
              <Pressable
                onPress={handleResend}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <Text style={styles.resendLink}>Resend OTP</Text>
              </Pressable>
            ) : (
              <Text style={styles.timerText}>
                Resend OTP in{" "}
                <Text style={styles.timerBold}>{timerLabel}</Text>
              </Text>
            )}
          </View>

          {/* Verify Button */}
          <Pressable
            onPress={handleVerify}
            disabled={loading || filled < OTP_LENGTH}
            style={({ pressed }) => [
              styles.verifyBtn,
              filled === OTP_LENGTH && styles.verifyBtnReady,
              pressed && filled === OTP_LENGTH && styles.verifyBtnPressed,
              loading && styles.verifyBtnLoading,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text
                  style={[
                    styles.verifyBtnText,
                    filled < OTP_LENGTH && styles.verifyBtnTextDim,
                  ]}
                >
                  Verify &amp; Login
                </Text>
                {filled === OTP_LENGTH && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#fff"
                    style={{ marginLeft: 6 }}
                  />
                )}
              </>
            )}
          </Pressable>
        </View>

        {/* Security Notice */}
        <View style={styles.securityBadge}>
          <View style={styles.lockCircle}>
            <Ionicons name="lock-closed" size={18} color="#1E6A4B" />
          </View>
          <View style={styles.securityTextWrap}>
            <Text style={styles.securityTitle}>Secure &amp; Easy</Text>
            <Text style={styles.securitySub}>Your details are safe with us</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5EFE6",
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "android" ? 48 : 56,
    paddingBottom: 36,
  },

  /* Back */
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EDE5D8",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Brand */
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  logoCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFF8EE",
    borderWidth: 1.5,
    borderColor: "#E8D5B5",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C5952A",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  logoImg: {
    width: 42,
    height: 42,
  },
  brandName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E6A4B",
    letterSpacing: -0.4,
    fontStyle: "italic",
  },

  /* Heading */
  heading: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1D3D30",
    textAlign: "center",
    marginBottom: 6,
  },
  desc: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
  identifierText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1D3D30",
    textAlign: "center",
    marginTop: 3,
    marginBottom: 22,
  },

  /* Card */
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 1,
    borderColor: "#EDE5D8",
  },

  /* Progress */
  progressTrack: {
    height: 3,
    backgroundColor: "#E8EFE9",
    borderRadius: 2,
    marginBottom: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#1E6A4B",
    borderRadius: 2,
  },

  /* OTP row */
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 50,
    borderWidth: 2,
    borderColor: "#D8E8DF",
    borderRadius: 14,
    backgroundColor: "#F5FAF7",
    fontSize: 22,
    fontWeight: "700",
    color: "#1D3D30",
  },
  otpBoxFilled: {
    borderColor: "#1E6A4B",
    backgroundColor: "#EAF5EF",
    shadowColor: "#1E6A4B",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  otpBoxError: {
    borderColor: "#C62828",
    backgroundColor: "#FFF5F5",
  },

  /* Error */
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  errorText: {
    color: "#C62828",
    fontSize: 12,
    flex: 1,
  },

  /* Resend */
  resendRow: {
    alignItems: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  resendLink: {
    color: "#1E6A4B",
    fontWeight: "700",
    fontSize: 14.5,
    textDecorationLine: "underline",
    textDecorationColor: "#1E6A4B",
  },
  timerText: {
    fontSize: 13.5,
    color: colors.muted,
  },
  timerBold: {
    color: "#C56A1C",
    fontWeight: "700",
  },

  /* Verify button */
  verifyBtn: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: "#C8D8D2",
    borderRadius: 13,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnReady: {
    backgroundColor: "#1E6A4B",
    shadowColor: "#1E6A4B",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  verifyBtnPressed: {
    opacity: 0.87,
    transform: [{ scale: 0.982 }],
  },
  verifyBtnLoading: {
    opacity: 0.72,
  },
  verifyBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  verifyBtnTextDim: {
    color: "#8AA89E",
  },

  /* Security badge */
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 22,
    backgroundColor: "#EAF5EF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    width: "100%",
    borderWidth: 1,
    borderColor: "#C5E0CF",
  },
  lockCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C5E0CF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  securityTextWrap: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E6A4B",
  },
  securitySub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
});
