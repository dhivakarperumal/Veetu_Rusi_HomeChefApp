import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { getStoredToken } from "../api";

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedToken = await getStoredToken();
        setToken(storedToken);
      } catch {
        setToken(null);
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, []);

  if (checking) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FFF8F2",
        }}
      >
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  if (token) {
    return <Redirect href="/dashboard" />;
  }

  return <Redirect href="/login" />;
}
