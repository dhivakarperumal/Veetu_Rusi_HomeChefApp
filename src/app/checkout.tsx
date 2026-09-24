import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import api, { getStoredUser } from "../api";
import {
    CART_KEY,
    loadMaterialCollection,
    saveMaterialCollection,
} from "../lib/materials-store";
import BottomBar from "./componets/buttombar";
import PageHeader from "./componets/pageheader";

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
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;
const RAZORPAY_KEY_ID = "rzp_test_SGj8n5SyKSE10b";

type CheckoutDialogTone = "info" | "success" | "error";

type CheckoutDialogState = {
  title: string;
  message: string;
  tone: CheckoutDialogTone;
  buttonLabel?: string;
  onConfirm?: () => void;
};

function CheckoutDialog({
  dialog,
  onClose,
}: {
  dialog: CheckoutDialogState | null;
  onClose: () => void;
}) {
  if (!dialog) return null;

  const accent = dialog.tone === "error" ? "#C62828" : GREEN;
  const icon =
    dialog.tone === "success"
      ? "checkmark-circle"
      : dialog.tone === "error"
        ? "alert-circle"
        : "information-circle";

  const confirm = () => {
    onClose();
    dialog.onConfirm?.();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(17, 35, 27, 0.54)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 380,
            borderRadius: 24,
            padding: 24,
            backgroundColor: "#fff",
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: dialog.tone === "error" ? "#FFEBEE" : "#EAF4EE",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <Ionicons name={icon as any} size={29} color={accent} />
          </View>
          <Text style={{ fontSize: 21, fontWeight: "800", color: DARK }}>
            {dialog.title}
          </Text>
          <Text
            style={{
              marginTop: 8,
              marginBottom: 24,
              fontSize: 14,
              lineHeight: 21,
              color: MUTED,
            }}
          >
            {dialog.message}
          </Text>
          <Pressable
            onPress={confirm}
            style={{
              borderRadius: 13,
              paddingVertical: 14,
              alignItems: "center",
              backgroundColor: accent,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>
              {dialog.buttonLabel || "Done"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { product: productParam } = useLocalSearchParams<{
    product?: string;
  }>();
  let buyNowProduct: any = null;
  if (productParam) {
    try {
      buyNowProduct = JSON.parse(productParam);
    } catch {
      buyNowProduct = null;
    }
  }
  const [items, setItems] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [searchAddress, setSearchAddress] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("cod");
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statePickerVisible, setStatePickerVisible] = useState(false);
  const [dialog, setDialog] = useState<CheckoutDialogState | null>(null);
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
      setItems(
        buyNowProduct
          ? [buyNowProduct]
          : await loadMaterialCollection(CART_KEY),
      );
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
        console.warn("Could not load saved addresses");
      } finally {
        setLoading(false);
      }
    };
    loadCheckout();
    // The checkout payload is fixed when this route opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setDialog({
        title: "Location added",
        message: "Your delivery address has been filled in from your current location.",
        tone: "success",
      });
    } catch {
      setDialog({
        title: "Location unavailable",
        message: "Could not detect your address. Please enter it manually.",
        tone: "error",
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const saveOrder = async (paymentId?: string) => {
    const paymentCompleted = paymentMethod === "razorpay";
    await api.post("/orders", {
      ...form,
      user_id: user?.user_id || user?.id || form.user_id,
      email: form.customer_email,
      payment_method: paymentCompleted ? "Online Payment" : "Cash on Delivery",
      payment_status: paymentCompleted ? "paid" : "pending",
      payment_id: paymentId || null,
      items: items.map((item) => ({
        product_id: item.product_id || item.id,
        quantity: Number(item.quantity) || 1,
        price: item.offer_price || item.price || item.mrp || 0,
        image: item.images,
      })),
      total_amount: total,
      created_at: new Date().toISOString(),
    });
    if (!buyNowProduct) await saveMaterialCollection(CART_KEY, []);
  };

  const placeOrder = async () => {
    const missing = FIELD_NAMES.find(([key]) => !form[key]?.trim());
    if (missing) {
      setDialog({
        title: "Almost ready",
        message: `Please enter your ${missing[1].toLowerCase()} to continue.`,
        tone: "info",
      });
      return;
    }
    if (!items.length) {
      setDialog({
        title: "Your cart is empty",
        message: "Add materials to your cart before placing an order.",
        tone: "info",
      });
      return;
    }
    const total = items.reduce(
      (sum, item) =>
        sum +
        Number(item.offer_price || item.price || item.mrp || 0) *
          (Number(item.quantity) || 1),
      0,
    );
    setSubmitting(true);
    try {
      if (paymentMethod === "razorpay") {
        let RazorpayCheckout: any;
        try {
          RazorpayCheckout = require("react-native-razorpay").default;
        } catch {
          setDialog({
            title: "Payment unavailable",
            message:
              "Razorpay requires an Android development build. It is not available in Expo Go.",
            tone: "error",
          });
          return;
        }

        const payment = await RazorpayCheckout.open({
          key: RAZORPAY_KEY_ID,
          amount: Math.round(total * 100),
          currency: "INR",
          name: "Veetu Rusi",
          description: "Materials order payment",
          method: {
            card: true,
            netbanking: true,
            upi: true,
            wallet: true,
            emi: true,
            paylater: true,
          },
          prefill: {
            name: form.customer_name,
            email: form.customer_email,
            contact: form.customer_phone,
          },
          theme: { color: GREEN },
        });
        await saveOrder(payment?.razorpay_payment_id);
      } else {
        await saveOrder();
      }

      setDialog({
        title: "Order placed",
        message: "Your materials order has been submitted successfully.",
        tone: "success",
        buttonLabel: "View materials",
        onConfirm: () => router.replace("/buy-materials"),
      });
    } catch (error: any) {
      if (paymentMethod === "razorpay") {
        console.warn("Razorpay payment was cancelled or failed", error);
        setDialog({
          title: "Payment not completed",
          message:
            error?.description ||
            "The payment was not completed. Your order was not placed.",
          tone: "error",
        });
        return;
      }
      setDialog({
        title: "Order could not be placed",
        message: "Could not place your order. Please try again.",
        tone: "error",
      });
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
      <PageHeader
        title="Checkout"
        onLeftPress={() => router.back()}
        rightActions={
          [
            {
              icon: locationLoading ? "locate" : "location-outline",
              onPress: getCurrentLocation,
            },
          ] as any
        }
      />
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
            {searchAddress.trim() ? (
              filteredAddresses.length > 0 ? (
                filteredAddresses.slice(0, 3).map((address) => (
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
                ))
              ) : (
                <Text style={{ marginTop: 12, color: MUTED }}>
                  No saved address found
                </Text>
              )
            ) : (
              <Text style={{ marginTop: 12, color: MUTED }}>
                Search to show saved addresses
              </Text>
            )}
          </>
        )}
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
        {FIELD_NAMES.map(([key, label]) =>
          key === "state" ? (
            <Pressable
              key={key}
              onPress={() => setStatePickerVisible(true)}
              style={{
                marginTop: 10,
                minHeight: 52,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#D5E3DA",
                paddingHorizontal: 13,
                backgroundColor: "#fff",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: form[key] ? DARK : MUTED, fontSize: 16 }}>
                {form[key] || label}
              </Text>
              <Ionicons name="chevron-down" size={20} color={MUTED} />
            </Pressable>
          ) : (
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
          ),
        )}
        <Modal
          visible={statePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setStatePickerVisible(false)}
        >
          <Pressable
            onPress={() => setStatePickerVisible(false)}
            style={{
              flex: 1,
              backgroundColor: "rgba(17, 35, 27, 0.45)",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={{
                maxHeight: "80%",
                borderRadius: 18,
                backgroundColor: "#fff",
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  fontSize: 19,
                  fontWeight: "800",
                  color: DARK,
                }}
              >
                Select state
              </Text>
              <ScrollView>
                {INDIAN_STATES.map((state) => (
                  <Pressable
                    key={state}
                    onPress={() => {
                      updateField("state", state);
                      setStatePickerVisible(false);
                    }}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 13,
                      backgroundColor: form.state === state ? "#EAF4EE" : "#fff",
                    }}
                  >
                    <Text style={{ color: DARK, fontSize: 16 }}>{state}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
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
      <CheckoutDialog dialog={dialog} onClose={() => setDialog(null)} />
      <BottomBar />
    </View>
  );
}
