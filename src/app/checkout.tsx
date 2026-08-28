import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import api, { getStoredUser } from "../api";
import BottomBar from "./componets/buttombar";
import PageHeader from "./componets/pageheader";
import {
    CART_KEY,
    loadMaterialCollection,
    saveMaterialCollection,
} from "./materials-store";

const GREEN = "#2E7A4F";
const DARK = "#214D38";
const MUTED = "#5A7A6E";
const FIELD_NAMES = [
  ["customer_name", "Full name"],
  ["customer_email", "Email"],
  ["customer_phone", "Phone number"],
  ["street_address", "Street address"],
  ["city", "City"],
  ["district", "District"],
  ["state", "State"],
  ["country", "Country"],
  ["zip_code", "ZIP code"],
] as const;

export default function CheckoutScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [searchAddress, setSearchAddress] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("cod");
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    user_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    street_address: "",
    city: "",
    district: "",
    state: "",
    country: "India",
    zip_code: "",
  });

  useEffect(() => {
    const loadCheckout = async () => {
      const storedUser = await getStoredUser();
      setUser(storedUser);
      setForm((previous) => ({
        ...previous,
        user_id: storedUser?.user_id || storedUser?.id || "",
        customer_name:
          storedUser?.username ||
          storedUser?.name ||
          storedUser?.full_name ||
          "",
        customer_email: storedUser?.email || "",
        customer_phone:
          storedUser?.phone ||
          storedUser?.mobile ||
          storedUser?.mobile_number ||
          "",
      }));
      setItems(await loadMaterialCollection(CART_KEY));
      try {
        const response = await api.get("/orders/myorders");
        const seen = new Set<string>();
        setAddresses(
          (response.data || []).filter((address: any) => {
            const key =
              `${address.street_address}|${address.city}|${address.zip_code}`.toLowerCase();
            if (!address.street_address || seen.has(key)) return false;
            seen.add(key);
            return true;
          }),
        );
      } catch {
        console.warn("Could not load saved addresses", error);
      } finally {
        setLoading(false);
      }
    };
    loadCheckout();
  }, []);

  const updateField = (key: string, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setSelectedAddress(null);
  };

  const selectAddress = (address: any) => {
    setSelectedAddress(address.id);
    setForm((previous) => ({
      ...previous,
      customer_name: address.customer_name || previous.customer_name,
      customer_email: address.customer_email || previous.customer_email,
      customer_phone: address.customer_phone || previous.customer_phone,
      street_address: address.street_address || "",
      city: address.city || "",
      district: address.district || "",
      state: address.state || "",
      country: address.country || "India",
      zip_code: address.zip_code || "",
    }));
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error("permission");
      const position = await Location.getCurrentPositionAsync({});
      const address = (await Location.reverseGeocodeAsync(position.coords))[0];
      if (!address) throw new Error("address");
      setForm((previous) => ({
        ...previous,
        street_address: [address.name, address.street]
          .filter(Boolean)
          .join(", "),
        city: address.city || address.subregion || "",
        district: address.district || "",
        state: address.region || "",
        country: address.country || "India",
        zip_code: address.postalCode || "",
      }));
      setSelectedAddress(null);
      Alert.alert("Location detected", "Your address has been filled in.");
    } catch {
      Alert.alert(
        "Location error",
        "Could not detect your address. Please enter it manually.",
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const placeOrder = async () => {
    const missing = FIELD_NAMES.find(([key]) => !form[key]?.trim());
    if (missing)
      return Alert.alert(
        "Missing details",
        `Please enter ${missing[1].toLowerCase()}.`,
      );
    if (!items.length)
      return Alert.alert(
        "Cart is empty",
        "Add materials to your cart before checkout.",
      );
    const total = items.reduce(
      (sum, item) =>
        sum +
        Number(item.offer_price || item.price || item.mrp || 0) *
          (Number(item.quantity) || 1),
      0,
    );
    setSubmitting(true);
    try {
      await api.post("/orders", {
        ...form,
        user_id: user?.user_id || user?.id || form.user_id,
        email: form.customer_email,
        payment_method:
          paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment",
        payment_status: "pending",
        items: items.map((item) => ({
          product_id: item.product_id || item.id,
          quantity: Number(item.quantity) || 1,
          price: item.offer_price || item.price || item.mrp || 0,
          image: item.images,
        })),
        total_amount: total,
        created_at: new Date().toISOString(),
      });
      await saveMaterialCollection(CART_KEY, []);
      Alert.alert("Order placed", "Your materials order has been submitted.", [
        { text: "Done", onPress: () => router.replace("/buy-materials") },
      ]);
    } catch {
      Alert.alert(
        "Order failed",
        "Could not place your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAddresses = addresses.filter((address) =>
    `${address.customer_name || ""} ${address.street_address || ""} ${address.city || ""} ${address.district || ""} ${address.state || ""} ${address.zip_code || ""}`
      .toLowerCase()
      .includes(searchAddress.toLowerCase()),
  );
  const total = items.reduce(
    (sum, item) =>
      sum +
      Number(item.offer_price || item.price || item.mrp || 0) *
        (Number(item.quantity) || 1),
    0,
  );

  if (loading)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F8F6F1",
        }}
      >
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F6F1" }}>
      <PageHeader title="Checkout" onLeftPress={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {addresses.length > 0 && (
          <>
            <Text style={{ fontSize: 18, fontWeight: "800", color: DARK }}>
              Saved addresses
            </Text>
            <TextInput
              value={searchAddress}
              onChangeText={setSearchAddress}
              placeholder="Search saved address"
              placeholderTextColor={MUTED}
              style={{
                marginTop: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#D5E3DA",
                padding: 12,
                backgroundColor: "#fff",
                color: DARK,
              }}
            />
            {filteredAddresses.slice(0, 3).map((address) => (
              <Pressable
                key={String(address.id)}
                onPress={() => selectAddress(address)}
                style={{
                  marginTop: 8,
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor:
                    selectedAddress === address.id ? GREEN : "#E2EDE7",
                  backgroundColor: "#fff",
                }}
              >
                <Text style={{ fontWeight: "700", color: DARK }}>
                  {address.customer_name || "Saved address"}
                </Text>
                <Text style={{ marginTop: 3, color: MUTED }}>
                  {address.street_address}, {address.city}, {address.state}{" "}
                  {address.zip_code}
                </Text>
              </Pressable>
            ))}
          </>
        )}
        <Pressable
          onPress={getCurrentLocation}
          disabled={locationLoading}
          style={{
            alignItems: "center",
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: GREEN,
          }}
        >
          <Text style={{ color: GREEN, fontWeight: "800" }}>
            {locationLoading ? "Detecting location..." : "Use current location"}
          </Text>
        </Pressable>
        <Text
          style={{
            marginTop: 22,
            fontSize: 18,
            fontWeight: "800",
            color: DARK,
          }}
        >
          Delivery details
        </Text>
        {FIELD_NAMES.map(([key, label]) => (
          <TextInput
            key={key}
            value={form[key] || ""}
            onChangeText={(value) => updateField(key, value)}
            placeholder={label}
            placeholderTextColor={MUTED}
            keyboardType={
              key === "customer_phone" || key === "zip_code"
                ? "phone-pad"
                : key === "customer_email"
                  ? "email-address"
                  : "default"
            }
            style={{
              marginTop: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#D5E3DA",
              padding: 13,
              backgroundColor: "#fff",
              color: DARK,
            }}
          />
        ))}
        <Text
          style={{
            marginTop: 22,
            fontSize: 18,
            fontWeight: "800",
            color: DARK,
          }}
        >
          Payment method
        </Text>
        {(["cod", "razorpay"] as const).map((method) => (
          <Pressable
            key={method}
            onPress={() => setPaymentMethod(method)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 10,
              padding: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: paymentMethod === method ? GREEN : "#E2EDE7",
              backgroundColor: "#fff",
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: 2,
                borderColor: paymentMethod === method ? GREEN : MUTED,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              {paymentMethod === method && (
                <View
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 5,
                    backgroundColor: GREEN,
                  }}
                />
              )}
            </View>
            <Text style={{ color: DARK, fontWeight: "700" }}>
              {method === "cod"
                ? "Cash on Delivery"
                : "Online Payment (Razorpay)"}
            </Text>
          </Pressable>
        ))}
        <View
          style={{
            marginTop: 22,
            padding: 16,
            borderRadius: 12,
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", color: DARK }}>
            Order summary
          </Text>
          {items.map((item) => (
            <View
              key={String(item.id)}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 12,
              }}
            >
              <Text style={{ flex: 1, color: DARK }}>
                {item.name} x{Number(item.quantity) || 1}
              </Text>
              <Text style={{ fontWeight: "700", color: GREEN }}>
                Rs.{" "}
                {Number(item.offer_price || item.price || item.mrp || 0) *
                  (Number(item.quantity) || 1)}
              </Text>
            </View>
          ))}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 16,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: "#E2EDE7",
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "800", color: DARK }}>
              Total
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: GREEN }}>
              Rs. {total}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={placeOrder}
          disabled={submitting}
          style={{
            alignItems: "center",
            marginTop: 18,
            borderRadius: 12,
            padding: 15,
            backgroundColor: submitting ? "#91B5A0" : GREEN,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>
            {submitting ? "Placing order..." : "Place Order"}
          </Text>
        </Pressable>
      </ScrollView>
      <BottomBar />
    </View>
  );
}
