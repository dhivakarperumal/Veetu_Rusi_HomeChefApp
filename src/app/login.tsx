import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStoredToken, loginWithIdentifier } from "../api";
import { showAppDialog } from "../lib/app-dialog";

const isValidIdentifier = (val: string) => {
  const t = val.trim();
  if (!t) return false;
  if (t.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  }
  const digitsOnly = t.replace(/\D/g, "");
  if (digitsOnly.length >= 8) return true;
  return t.length >= 3;
};

const isValidPassword = (val: string) => {
  return val.trim().length >= 4;
};

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const passwordRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const activeInputRef = useRef<"email" | "password" | null>(null);

  const failedCredentialsRef = useRef<string>("");
  const autoLoginTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  const scrollToInput = (inputType: "email" | "password") => {
    activeInputRef.current = inputType;
    const targetY = inputType === "password" ? 220 : 130;
    scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    // Also scroll with short delays to account for soft keyboard animation on Android
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    }, 100);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    }, 250);
  };

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      const kh = e?.endCoordinates?.height || 280;
      setKeyboardHeight(kh);
      const targetY = activeInputRef.current === "password" ? 220 : 130;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
      }, 50);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      activeInputRef.current = null;
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getStoredToken();
        if (token) {
          router.replace("/dashboard");
          return;
        }
        const savedEmail = await AsyncStorage.getItem("lastLoginIdentifier");
        if (savedEmail) {
          setEmail(savedEmail);
        }
      } catch (err) {
        console.error("Error reading stored session/identifier", err);
      } finally {
        setCheckingSession(false);
      }
    };
    restoreSession();

    return () => {
      if (autoLoginTimerRef.current) {
        clearTimeout(autoLoginTimerRef.current);
      }
    };
  }, []);

  const attemptLogin = async (
    emailToUse?: string,
    passToUse?: string,
    options: { isAuto?: boolean } = {},
  ) => {
    if (autoLoginTimerRef.current) {
      clearTimeout(autoLoginTimerRef.current);
      autoLoginTimerRef.current = null;
    }

    const cleanEmail = (emailToUse !== undefined ? emailToUse : email).trim();
    const cleanPass = (passToUse !== undefined ? passToUse : password).trim();
    const credentialKey = `${cleanEmail.toLowerCase()}:${cleanPass}`;

    if (!cleanEmail) {
      if (!options.isAuto) setError("Please enter your email or phone number.");
      return;
    }
    if (!cleanPass) {
      if (!options.isAuto) setError("Please enter your password.");
      return;
    }

    if (options.isAuto && failedCredentialsRef.current === credentialKey) {
      return;
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    setLoading(true);
    if (!options.isAuto) {
      setError("");
      Keyboard.dismiss();
    }

    try {
      const response = await loginWithIdentifier(cleanEmail, cleanPass);
      if (response?.token) {
        failedCredentialsRef.current = "";
        Keyboard.dismiss();
        AsyncStorage.setItem("lastLoginIdentifier", cleanEmail).catch(() => {});
        router.replace("/dashboard");
        return;
      } else {
        throw new Error(response?.message || "Login failed. Please try again.");
      }
    } catch (err) {
      failedCredentialsRef.current = credentialKey;
      const currentKey = `${email.trim().toLowerCase()}:${password.trim()}`;
      if (!options.isAuto || currentKey === credentialKey) {
        const msg =
          (err as { message?: string })?.message ||
          (err instanceof Error ? err.message : "Invalid email or password.");
        setError(msg);
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  const scheduleAutoLogin = (emailVal: string, passVal: string, delay = 700) => {
    if (autoLoginTimerRef.current) {
      clearTimeout(autoLoginTimerRef.current);
      autoLoginTimerRef.current = null;
    }

    const cleanEmail = emailVal.trim();
    const cleanPass = passVal.trim();

    if (!isValidIdentifier(cleanEmail) || !isValidPassword(cleanPass)) {
      return;
    }

    const credKey = `${cleanEmail.toLowerCase()}:${cleanPass}`;
    if (failedCredentialsRef.current === credKey) {
      return;
    }

    autoLoginTimerRef.current = setTimeout(() => {
      attemptLogin(cleanEmail, cleanPass, { isAuto: true });
    }, delay);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (error) setError("");
    scheduleAutoLogin(text, password, 700);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (error) setError("");
    scheduleAutoLogin(email, text, 700);
  };

  const handleLogin = () => {
    failedCredentialsRef.current = "";
    attemptLogin(email, password, { isAuto: false });
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
            Linking.openURL(
              "https://wa.me/919876543210?text=Hi%2C%20I%20need%20to%20reset%20my%20Veetu%20Rusi%20Home%20Chef%20account%20password",
            ).catch(() => {});
          },
        },
      ],
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
            Linking.openURL(
              "https://wa.me/919876543210?text=Hello%20Veetu%20Rusi%20Team%2C%20I%20need%20help%20with%20my%20Chef%20Portal",
            ).catch(() => {});
          },
        },
      ],
    );
  };

  if (checkingSession) {
    return (
      <View className="flex-1 bg-[#F4F1EA] items-center justify-center">
        <ActivityIndicator size="large" color="#1E6A4B" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F4F1EA]"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F4F1EA" />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: Platform.OS === "android" ? 28 : 44,
          paddingBottom: keyboardVisible ? (Platform.OS === "android" ? 280 : 120) : 36,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Brand Header */}
        <View className="w-full items-center mb-3.5">
          {/* Logo Emblem */}
          <View className="mb-2.5">
            <View className="w-[76px] h-[76px] rounded-full bg-white border-2 border-[#DDE6E1] items-center justify-center overflow-hidden shadow-sm">
              <Image
                source={require("../../assets/images/home_chef_logo.png")}
                style={{ width: 68, height: 68 }}
                contentFit="contain"
              />
            </View>
          </View>

          {/* Portal Badge */}
          <View className="flex-row items-center gap-1.5 bg-[#EAF4EE] px-3 py-0.5 rounded-full mb-1.5 border border-[#D0E5DA]">
            <Ionicons name="restaurant" size={12} color="#1E6A4B" />
            <Text className="text-[10.5px] font-extrabold text-[#1E6A4B] tracking-wider">
              CHEF PARTNER PORTAL
            </Text>
          </View>

          {/* Brand Title */}
          <Text className="text-[26px] font-black text-[#1D3D30] tracking-tight leading-8">
            Veetu Rusi
          </Text>
          <Text className="text-[11.5px] font-semibold text-[#698077] mt-0.5 mb-2">
            Cooked with Love • வீட்டு ருசி
          </Text>

          {/* Welcome Headings */}
          <Text className="text-xl font-extrabold text-[#1D3D30] text-center mb-0.5">
            Welcome Back, Chef!
          </Text>
          <Text className="text-xs text-[#698077] text-center leading-[17px] max-w-[320px]">
            Sign in to manage your dishes, orders, and daily earnings.
          </Text>
        </View>

        {/* Main Login Card */}
        <View className="w-full bg-white rounded-[24px] px-5 py-[22px] border border-[#DDE6E1] shadow-md mb-5">
          {/* Card Header */}
          <View className="flex-row items-center pb-3.5 mb-4 border-b border-[#F0F5F2]">
            <View className="w-11 h-11 rounded-2xl bg-[#EAF4EE] border border-[#D6EBE0] items-center justify-center mr-3">
              <MaterialCommunityIcons name="chef-hat" size={24} color="#1E6A4B" />
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-extrabold text-[#1D3D30]">
                Kitchen Sign In
              </Text>
              <Text className="text-xs text-[#698077] mt-0.5">
                Enter your account credentials
              </Text>
            </View>
          </View>

          {/* Error Banner */}
          {!!error && (
            <View className="flex-row items-center bg-[#FDF2F2] border border-[#FCA5A5] rounded-xl px-3 py-2.5 mb-4 gap-2">
              <Ionicons name="alert-circle" size={18} color="#C62828" />
              <Text className="flex-1 text-[#B91C1C] text-[13px] font-semibold">
                {error}
              </Text>
            </View>
          )}

          {/* Email / Username Input */}
          <View className="mb-4">
            <Text className="text-[13px] font-bold text-[#1D3D30] mb-1.5 ml-0.5">
              Email Address or Phone
            </Text>
            <View
              className={`flex-row items-center h-[52px] rounded-[14px] border-[1.5px] px-3 bg-[#FAFCFA] ${
                error ? "border-[#EF4444] bg-[#FEF2F2]" : "border-[#DDE6E1]"
              }`}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color="#1E6A4B"
                style={{ marginRight: 10 }}
              />
              <TextInput
                value={email}
                onChangeText={handleEmailChange}
                onFocus={() => scrollToInput("email")}
                placeholder="e.g. chef@veeturusi.com"
                placeholderTextColor="#8EA399"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                importantForAutofill="yes"
                className="flex-1 h-full text-[15px] font-semibold text-[#1D3D30] py-0"
                maxLength={100}
                returnKeyType="next"
                onSubmitEditing={() => {
                  if (isValidPassword(password)) {
                    handleLogin();
                  } else {
                    passwordRef.current?.focus();
                    scrollToInput("password");
                  }
                }}
              />
            </View>
          </View>

          {/* Password Input */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-1.5 ml-0.5">
              <Text className="text-[13px] font-bold text-[#1D3D30]">Password</Text>
              <TouchableOpacity
                onPress={handleForgotPassword}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <Text className="text-[12.5px] font-bold text-[#1E6A4B]">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>
            <View
              className={`flex-row items-center h-[52px] rounded-[14px] border-[1.5px] px-3 bg-[#FAFCFA] ${
                error ? "border-[#EF4444] bg-[#FEF2F2]" : "border-[#DDE6E1]"
              }`}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#1E6A4B"
                style={{ marginRight: 10 }}
              />
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={handlePasswordChange}
                onFocus={() => scrollToInput("password")}
                onBlur={() => {
                  if (isValidIdentifier(email) && isValidPassword(password)) {
                    scheduleAutoLogin(email, password, 150);
                  }
                }}
                placeholder="Enter your kitchen password"
                placeholderTextColor="#8EA399"
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                importantForAutofill="yes"
                className="flex-1 h-full text-[15px] font-semibold text-[#1D3D30] py-0"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPass(!showPass)}
                className="p-1.5 ml-1"
                hitSlop={10}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPass ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#698077"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Primary Login Button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className={`h-[52px] rounded-[14px] bg-[#1E6A4B] items-center justify-center mt-1.5 shadow-md active:bg-[#1D3D30] active:scale-[0.99] ${
              loading ? "opacity-75" : ""
            }`}
          >
            {loading ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                <Text className="text-white text-base font-extrabold tracking-wide">
                  Signing In...
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons
                  name="log-in-outline"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-white text-base font-extrabold tracking-wide">
                  Sign In to Kitchen
                </Text>
              </View>
            )}
          </Pressable>

          {/* Divider */}
          <View className="flex-row items-center my-[18px]">
            <View className="flex-1 h-px bg-[#E5ECE7]" />
            <Text className="text-xs text-[#698077] font-semibold px-2.5">
              or kitchen support
            </Text>
            <View className="flex-1 h-px bg-[#E5ECE7]" />
          </View>

          {/* WhatsApp / Admin Support Button */}
          <TouchableOpacity
            onPress={handleAdminSupport}
            className="flex-row items-center justify-center h-[50px] rounded-[14px] border-[1.5px] border-[#D2E7DC] bg-[#EAF4EE] mb-4"
            activeOpacity={0.8}
          >
            <FontAwesome5 name="whatsapp" size={18} color="#25D366" />
            <Text className="text-sm font-bold text-[#1D3D30] ml-2">
              Connect with Kitchen Admin
            </Text>
          </TouchableOpacity>

          {/* Security Note */}
          <View className="flex-row items-center justify-center gap-1.5 pt-0.5">
            <Ionicons name="shield-checkmark" size={15} color="#1E6A4B" />
            <Text className="text-[11.5px] font-semibold text-[#4A675F]">
              Authorized Home Chef Access Only
            </Text>
          </View>
        </View>

        {/* Three Feature Highlights Pill Row */}
        <View className="flex-row items-center justify-center gap-2 w-full mb-[18px]">
          <View className="flex-row items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-[#DDE6E1]">
            <Ionicons name="receipt-outline" size={14} color="#1E6A4B" />
            <Text className="text-[11px] font-bold text-[#4A675F]">Live Orders</Text>
          </View>
          <View className="flex-row items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-[#DDE6E1]">
            <Ionicons name="trending-up-outline" size={14} color="#1E6A4B" />
            <Text className="text-[11px] font-bold text-[#4A675F]">Instant Payouts</Text>
          </View>
          <View className="flex-row items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-[#DDE6E1]">
            <Ionicons name="heart-outline" size={14} color="#1E6A4B" />
            <Text className="text-[11px] font-bold text-[#4A675F]">Cooked with Love</Text>
          </View>
        </View>

        {/* Bottom Footer Note */}
        <View className="items-center px-2.5">
          <Text className="text-[13px] text-[#698077] text-center">
            Need to register as a partner chef?{" "}
            <Text onPress={handleAdminSupport} className="text-[#1E6A4B] font-extrabold">
              Contact Admin
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
