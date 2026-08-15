import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { getStoredToken, loginWithIdentifier } from "../api";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = await getStoredToken();
      if (token) {
        router.replace("/dashboard");
        return;
      }
      setCheckingSession(false);
    };
    restoreSession();
  }, [router]);

  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    Keyboard.dismiss();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail) {
      setError("Please enter your email address.");
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
      const msg = err instanceof Error ? err.message : "Invalid email or password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View className="flex-1 bg-[#FFF8F2] items-center justify-center">
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#FFF8F2]"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8F2" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerClassName="flex-grow items-center pt-[60px] pb-10 px-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Logo Section */}
          <View className="w-[200px] h-[120px] mb-2.5 items-center justify-center">
            <Image
              source={require("../../assets/images/logo.png")}
              className="w-full h-full"
              contentFit="contain"
            />
          </View>

          {/* Greeting Section */}
          <View className="items-center mb-6">
            <Text className="text-2xl font-bold text-[#431407] mb-1.5">Welcome Back!</Text>
            <Text className="text-sm text-[#777777] text-center leading-5">
              Login to access your kitchen dashboard{"\n"}and manage your delicious dishes.
            </Text>
          </View>

          {/* Login Card */}
          <View className="w-full bg-white rounded-[24px] p-6 shadow-sm mb-6">
            {/* Card Header */}
            <View className="flex-row items-center mb-6">
              <View className="w-12 h-12 rounded-xl bg-[#FFF0E6] items-center justify-center mr-3">
                <MaterialCommunityIcons name="chef-hat" size={28} color="#ea580c" />
              </View>
              <View>
                <Text className="text-lg font-bold text-[#431407] mb-0.5">V2Home Chef Login</Text>
                <Text className="text-xs text-[#777777]">Please sign in to continue</Text>
              </View>
            </View>

            {/* Error Message */}
            {!!error && (
              <View className="flex-row items-center mb-4 bg-[#FFF3F3] p-2.5 rounded-lg">
                <Ionicons name="alert-circle-outline" size={14} color="#D32F2F" />
                <Text className="text-[13px] text-[#D32F2F] ml-1.5 flex-1">{error}</Text>
              </View>
            )}

            {/* Email Address Input */}
            <View className="mb-4">
              <Text className="text-[13px] font-semibold text-[#333333] mb-1.5 ml-0.5">Email Address</Text>
              <View className={`flex-row items-center border border-[#E5E7EB] rounded-xl h-[52px] px-3 bg-[#FAFAFA] ${error ? 'border-[#D32F2F] bg-[#FFF3F3]' : ''}`}>
                <Ionicons name="mail-outline" size={20} color="#777777" className="mr-2" />
                <TextInput
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) setError("");
                  }}
                  placeholder="Enter your email address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 text-[15px] text-[#333333] h-full py-0"
                  maxLength={100}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password Input */}
            <View className="mb-4">
              <Text className="text-[13px] font-semibold text-[#333333] mb-1.5 ml-0.5">Password</Text>
              <View className={`flex-row items-center border border-[#E5E7EB] rounded-xl h-[52px] px-3 bg-[#FAFAFA] ${error ? 'border-[#D32F2F] bg-[#FFF3F3]' : ''}`}>
                <Ionicons name="lock-closed-outline" size={20} color="#777777" className="mr-2" />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) setError("");
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPass}
                  className="flex-1 text-[15px] text-[#333333] h-full py-0"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} className="p-1">
                  <Ionicons
                    name={showPass ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#777777"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity className="self-end mb-5" activeOpacity={0.7}>
              <Text className="text-[13px] text-[#ea580c] font-semibold">Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              className={`flex-row items-center justify-center bg-[#ea580c] rounded-xl h-[52px] shadow-sm ${loading ? 'opacity-70' : ''}`}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="chef-hat" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text className="text-base font-bold text-white">Login</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-5">
              <View className="flex-1 h-px bg-[#E5E7EB]" />
              <Text className="mx-3 text-[13px] text-[#777777]">or login with</Text>
              <View className="flex-1 h-px bg-[#E5E7EB]" />
            </View>

            {/* WhatsApp Button */}
            <TouchableOpacity className="flex-row items-center justify-center border border-[#E5E7EB] rounded-xl h-[52px] bg-white mb-4" activeOpacity={0.8}>
              <FontAwesome5 name="whatsapp" size={18} color="#25D366" />
              <Text className="text-[15px] font-semibold text-[#333333] ml-2">Login with WhatsApp</Text>
            </TouchableOpacity>

            {/* Secure Note */}
            <View className="flex-row items-center justify-center">
              <Ionicons name="shield-checkmark" size={14} color="#22C55E" />
              <Text className="text-xs text-[#777777] ml-1.5">Secure login for V2Home Chefs only</Text>
            </View>
          </View>

          {/* Bottom Banner Section */}
          <View className="w-full items-center mt-2.5">
            <View className="flex-row items-center justify-between w-full mb-5 px-2.5">
              <View className="opacity-60">
                 <MaterialCommunityIcons name="account-tie-hat" size={40} color="#ea580c" />
              </View>
              <View className="flex-1 items-center px-2.5">
                <Text className="text-[15px] font-bold text-[#431407] mb-1 text-center">Delicious food made easy!</Text>
                <Text className="text-xs text-[#777777] text-center leading-4">
                  Manage your menu, orders and customers{"\n"}all in one place.
                </Text>
              </View>
              <View className="opacity-60">
                 <MaterialCommunityIcons name="food" size={40} color="#ea580c" />
              </View>
            </View>

            <Text className="text-sm text-[#777777]">
              Don't have an account? <Text className="text-[#ea580c] font-bold">Contact Admin</Text>
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
