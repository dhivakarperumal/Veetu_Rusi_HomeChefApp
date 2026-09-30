import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import api, {
  API_BASE_URL,
  getApiErrorMessage,
  isNewOrderStatus,
} from "../api";
import BottomBar from "../components/buttombar";
import TopHeader from "../components/topheader";
import { showAppDialog } from "../lib/app-dialog";
import { formatCurrencyAmount } from "../lib/format-currency";
import { hasCachedPageData, usePageCacheState } from "../lib/page-cache";
import { colors } from "../theme/colors";

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

async function uploadPackingImage(
  orderId: string,
  orderCode: string,
  asset: ImagePicker.ImagePickerAsset,
  onProgress: (percent: number) => void,
) {
  const compressed = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 900 } }],
    { compress: 0.55, format: ImageManipulator.SaveFormat.JPEG },
  );
  const formData = new FormData();
  formData.append("order_id", orderCode);
  formData.append("order_record_id", orderId);
  formData.append("images", {
    uri: compressed.uri,
    name: `packing-${orderCode.replace(/[^a-z0-9_-]/gi, "_")}-${Date.now()}.jpg`,
    type: "image/jpeg",
  } as any);

  const response = await api.post(
    `/upload/images?folder=orderPacking&order_id=${encodeURIComponent(orderCode)}`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
      onUploadProgress: (event) => {
        if (event.total) {
          onProgress(
            Math.min(100, Math.round((event.loaded / event.total) * 100)),
          );
        }
      },
    },
  );
  const data = response.data;
  const imageCandidate =
    data?.urls?.[0] ||
    data?.images?.[0] ||
    data?.files?.[0] ||
    data?.data?.urls?.[0] ||
    data?.data?.images?.[0] ||
    data?.data?.url ||
    data?.url;
  const imagePath =
    imageCandidate?.url || imageCandidate?.path || imageCandidate;
  if (typeof imagePath !== "string" || !imagePath.trim()) {
    throw new Error("The image upload did not return an image URL.");
  }
  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith("data:")) {
    return imagePath;
  }
  return imagePath.startsWith("/")
    ? `${API_ORIGIN}${imagePath}`
    : `${API_ORIGIN}/${imagePath}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type OrderStatus =
  | "New"
  | "Preparing"
  | "Cooking"
  | "Ready"
  | "Packing"
  | "Packed"
  | "Searching Delivery Partner"
  | "Delivery Partner Assigned"
  | "Out for Delivery"
  | "Delivered"
  | "Completed"
  | "Cancelled";
type OrderTab =
  | OrderStatus
  | "All Status"
  | "Packing"
  | "Searching Delivery Partner"
  | "Delivery Partner Assigned"
  | "Cancelled";

interface Order {
  id: string;
  order_id: string;
  status: OrderStatus;
  rawStatus: string;
  customer: string;
  firstItemImage?: string;
  itemNames: string[];
  items: number;
  amount: number;
  location: string;
  time: string;
  orderedAt?: string;
  acceptedAt?: string;
  acceptedTime?: string;
  deliveryAt?: string;
  deliveryTime?: string;
  preparationMinutes?: number;
  cancellationReason?: string;
  cancellationNotes?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  deliveryPartnerVehicle?: string;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  OrderStatus,
  { color: string; bg: string; label: string }
> = {
  New: { color: "#E65100", bg: "#FFF3E0", label: "New" },
  Preparing: { color: "#1565C0", bg: "#E3F2FD", label: "Preparing" },
  Cooking: { color: "#1565C0", bg: "#E3F2FD", label: "Cooking" },
  Ready: { color: "#2E7D32", bg: "#E8F5E9", label: "Ready" },
  Packing: { color: "#9A5B00", bg: "#FFF3D6", label: "Packing" },
  Packed: { color: "#2E7D32", bg: "#E8F5E9", label: "Packed" },
  "Searching Delivery Partner": {
    color: "#1565C0",
    bg: "#E3F2FD",
    label: "Searching Delivery Partner",
  },
  "Delivery Partner Assigned": {
    color: "#1565C0",
    bg: "#E3F2FD",
    label: "Delivery Partner Assigned",
  },
  "Out for Delivery": {
    color: "#9A5B00",
    bg: "#FFF3D6",
    label: "Out for Delivery",
  },
  Delivered: { color: "#2E7D32", bg: "#E8F5E9", label: "Delivered" },
  Completed: { color: "#4A675F", bg: "#ECEFF1", label: "Completed" },
  Cancelled: { color: "#C62828", bg: "#FFEBEE", label: "Cancelled" },
};

const mapStatus = (status: string): OrderStatus => {
  const s = (status || "").toLowerCase();
  if (["cancelled", "canceled"].includes(s)) return "Cancelled";
  if (isNewOrderStatus(s)) return "New";
  if (s === "accepted") return "Preparing";
  if (["preparing", "cooking"].includes(s)) return "Cooking";
  if (["food ready", "ready"].includes(s)) return "Ready";
  if (s === "packing") return "Packing";
  if (s === "packed") return "Packed";
  if (s === "searching delivery partner") return "Searching Delivery Partner";
  if (s === "delivery partner assigned") return "Delivery Partner Assigned";
  if (s === "out for delivery") return "Out for Delivery";
  if (s === "delivered") return "Delivered";
  if (s === "completed") return "Completed";
  return "New";
};

const formatOrderDateTime = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatOrderListTime = (value: unknown): string => {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dateLabel =
    date.toDateString() === today.toDateString()
      ? "Today"
      : date.toDateString() === yesterday.toDateString()
        ? "Yesterday"
        : date.toLocaleDateString([], { day: "2-digit", month: "short" });
  const timeLabel = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateLabel}, ${timeLabel}`;
};

const getFirstItemImage = (items: unknown): string | undefined => {
  if (!Array.isArray(items) || !items[0]) return undefined;

  const item = items[0];
  const imageValues = [
    item.image,
    item.image_url,
    item.product_image,
    item.food_image,
    item.images,
    item.packaging_image,
    item.product?.image,
    item.product?.image_url,
    item.product?.product_image,
    item.product?.images,
    item.food?.image,
    item.food?.image_url,
    item.food?.images,
  ];

  for (const value of imageValues) {
    let candidate = value;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (Array.isArray(candidate)) {
        candidate = candidate.find(Boolean);
        continue;
      }
      if (candidate && typeof candidate === "object") {
        candidate =
          candidate.url ||
          candidate.uri ||
          candidate.path ||
          candidate.image ||
          candidate.src;
        continue;
      }
      if (typeof candidate !== "string" || !candidate.trim()) break;

      try {
        candidate = JSON.parse(candidate.trim());
      } catch {
        candidate = candidate.trim();
        break;
      }
    }

    if (typeof candidate !== "string" || !candidate.trim()) continue;
    const imagePath = candidate
      .trim()
      .replace(/https?:\/\/(localhost|127\.0\.0\.1):5000/g, API_ORIGIN);
    if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith("data:")) {
      return imagePath;
    }
    return imagePath.startsWith("/")
      ? `${API_ORIGIN}${imagePath}`
      : `${API_ORIGIN}/${imagePath}`;
  }

  return undefined;
};

const getOrderItemNames = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map(
      (item: any) =>
        item?.name ||
        item?.item_name ||
        item?.product_name ||
        item?.food_name ||
        item?.dish_name ||
        item?.product?.name ||
        item?.product?.product_name ||
        item?.food?.name ||
        item?.food?.food_name,
    )
    .filter(
      (name: unknown): name is string =>
        typeof name === "string" && name.trim().length > 0,
    )
    .map((name: string) => name.trim());
};

const normalizeTimestamp = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const calculateDeliveryDeadline = (acceptedAt: unknown): string | undefined => {
  if (!acceptedAt) return undefined;
  const acceptedDate = new Date(String(acceptedAt));
  if (Number.isNaN(acceptedDate.getTime())) return undefined;
  return new Date(acceptedDate.getTime() + 3 * 60 * 60 * 1000).toISOString();
};

const START_COOKING_BUFFER_MINUTES = 60;

function parsePreparationMinutes(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  }
  if (typeof value !== "string" || !value.trim()) return undefined;

  const normalized = value.trim().toLowerCase();
  const hours = normalized.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr|h)\b/);
  const minutes = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|min|m)\b/,
  );
  if (hours || minutes) {
    return (
      (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0)
    );
  }

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? numericValue
    : undefined;
}

function getOrderPreparationMinutes(order: any): number | undefined {
  const directDuration = [
    order.preparation_time_minutes,
    order.food_preparation_time_minutes,
    order.prep_time_minutes,
    order.food_preparation_time,
    order.preparation_time,
    order.prep_time,
  ]
    .map(parsePreparationMinutes)
    .find((minutes) => minutes !== undefined);
  if (directDuration !== undefined) return directDuration;

  let items = order.items;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  if (!Array.isArray(items)) return undefined;

  const itemDurations = items.flatMap((item: any) =>
    [
      item.preparation_time_minutes,
      item.food_preparation_time_minutes,
      item.prep_time_minutes,
      item.food_preparation_time,
      item.preparation_time,
      item.prep_time,
      item.product?.prep_time,
      item.food?.prep_time,
    ]
      .map(parsePreparationMinutes)
      .filter((minutes): minutes is number => minutes !== undefined),
  );
  return itemDurations.length > 0 ? Math.max(...itemDurations) : undefined;
}

function getStartCookingTimestamp(order: Order): number | undefined {
  const deliveryTimestamp = order.deliveryAt
    ? Date.parse(order.deliveryAt)
    : Number.NaN;
  if (
    !Number.isFinite(deliveryTimestamp) ||
    order.preparationMinutes === undefined ||
    !Number.isFinite(order.preparationMinutes)
  ) {
    return undefined;
  }
  return (
    deliveryTimestamp -
    (order.preparationMinutes + START_COOKING_BUFFER_MINUTES) * 60_000
  );
}

const formatRemainingDeliveryTime = (
  acceptedAt: string | undefined,
  deliveryAt: string | undefined,
  now: number,
): string | undefined => {
  if (!acceptedAt || !deliveryAt) return undefined;
  const acceptedDate = new Date(acceptedAt);
  const deliveryDate = new Date(deliveryAt);
  if (
    Number.isNaN(acceptedDate.getTime()) ||
    Number.isNaN(deliveryDate.getTime())
  ) {
    return undefined;
  }
  const remainingMs = deliveryDate.getTime() - now;
  if (remainingMs <= 0) return "Delivery Time Reached";
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onAccept,
  onReject,
  onMarkReady,
  onStartPacking,
  onStartCooking,
  onStatusUpdate,
  onPress,
  now,
  busy = false,
}: {
  order: Order;
  onAccept?: (id: string) => void;
  onReject?: (order: Order) => void;
  onMarkReady?: (id: string) => void;
  onStartPacking?: (order: Order) => void;
  onStartCooking?: (id: string) => void;
  onStatusUpdate?: (id: string, status: string) => void;
  onPress?: () => void;
  now: number;
  busy?: boolean;
}) {
  const cfg = STATUS_CONFIG[order.status];
  const itemNames = Array.isArray(order.itemNames) ? order.itemNames : [];
  const rawStatus = (order.rawStatus || "").toLowerCase();
  const showAccept = order.status === "New";
  const showStartCooking =
    order.status === "Preparing" && rawStatus === "accepted";
  const showStart = order.status === "Cooking";
  const startCookingTimestamp = showStartCooking
    ? getStartCookingTimestamp(order)
    : undefined;
  const canStartCooking =
    startCookingTimestamp !== undefined && now >= startCookingTimestamp;
  const startCookingTime = startCookingTimestamp
    ? new Date(startCookingTimestamp).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : undefined;
  const nextStatus =
    rawStatus === "food ready" || rawStatus === "ready"
      ? { label: "Packing", status: "Packing" }
      : rawStatus === "packed"
        ? {
            label: "Search Delivery Partner",
            status: "Searching Delivery Partner",
          }
        : rawStatus === "out for delivery"
          ? { label: "Mark Delivered", status: "Delivered" }
          : rawStatus === "packing"
            ? {
                label: "Find Delivery Partner",
                status: "Searching Delivery Partner",
              }
            : rawStatus === "searching delivery partner"
              ? {
                  label: "Partner Accepted",
                  status: "Delivery Partner Assigned",
                }
              : rawStatus === "delivery partner assigned"
                ? { label: "Out for Delivery", status: "Out for Delivery" }
                : null;

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        marginTop: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Card header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: "#2E7A4F",
          borderBottomWidth: 1,
          borderBottomColor: "#286E48",
        }}
      >
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: "800",
            }}
            numberOfLines={1}
          >
            Order #{String(order.order_id).replace(/\D/g, "").slice(-3)}
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}
          >
            <Ionicons name="time-outline" size={13} color="#EAF4EE" />
            <Text style={{ color: "#EAF4EE", fontSize: 12, marginLeft: 4 }}>
              {order.time}
            </Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: cfg.bg,
            borderRadius: 10,
            paddingHorizontal: 11,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: cfg.color, fontSize: 12, fontWeight: "700" }}>
            {cfg.label}
          </Text>
        </View>
      </View>

      <View style={{ padding: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <View
            style={{
              height: 42,
              width: 42,
              borderRadius: 8,
              backgroundColor: colors.softCard,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
              overflow: "hidden",
            }}
          >
            {order.firstItemImage ? (
              <ExpoImage
                source={{ uri: order.firstItemImage }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <Ionicons name="person" size={20} color={colors.primarySoft} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            {itemNames.length > 0 && (
              <Text
                style={{
                  color: colors.primaryDark,
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: "600",
                }}
              >
                {itemNames.join(", ")}
              </Text>
            )}
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              {order.items} {order.items === 1 ? "item" : "items"}
            </Text>
          </View>
        </View>

        {(order.acceptedTime ||
          order.deliveryTime ||
          order.status === "New") && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 4,
              marginBottom:
                showAccept || showStartCooking || showStart || nextStatus
                  ? 8
                  : 0,
            }}
          >
            {order.acceptedTime && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={15}
                  color="#2E7D32"
                />
                <Text
                  style={{ color: colors.muted, fontSize: 12, marginLeft: 4 }}
                >
                  Accepted: {order.acceptedTime}
                </Text>
              </View>
            )}
            {order.deliveryTime && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="time-outline"
                  size={15}
                  color={colors.primary}
                />
                <Text
                  style={{ color: colors.muted, fontSize: 12, marginLeft: 4 }}
                >
                  Delivery: {order.deliveryTime}
                </Text>
              </View>
            )}
            {order.status !== "Cancelled" &&
              order.acceptedAt &&
              order.deliveryAt && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="hourglass-outline"
                    size={15}
                    color="#E65100"
                  />
                  <Text
                    style={{
                      color: "#E65100",
                      fontSize: 12,
                      marginLeft: 4,
                      fontWeight: "700",
                    }}
                  >
                    Delivery in{" "}
                    {formatRemainingDeliveryTime(
                      order.acceptedAt,
                      order.deliveryAt,
                      now,
                    )}
                  </Text>
                </View>
              )}
            {order.status === "New" && !order.acceptedAt && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="hourglass-outline"
                  size={15}
                  color={colors.muted}
                />
                <Text
                  style={{ color: colors.muted, fontSize: 12, marginLeft: 4 }}
                >
                  Awaiting acceptance
                </Text>
              </View>
            )}
          </View>
        )}

        {order.status === "Cancelled" &&
          (order.cancellationReason || order.cancellationNotes) && (
            <View
              style={{
                marginTop: 12,
                marginBottom: 2,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#FFD7D7",
                backgroundColor: "#FFF7F7",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#C62828"
                />
                <Text
                  style={{ color: "#A52A2A", fontSize: 12, fontWeight: "800" }}
                >
                  Cancellation reason
                </Text>
              </View>
              {order.cancellationReason && (
                <Text
                  style={{
                    marginTop: 5,
                    color: "#4A3535",
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {order.cancellationReason}
                </Text>
              )}
              {order.cancellationNotes && (
                <Text
                  style={{
                    marginTop: 3,
                    color: "#765F5F",
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  {order.cancellationNotes}
                </Text>
              )}
            </View>
          )}

        {rawStatus === "delivery partner assigned" &&
          (order.deliveryPartnerName ||
            order.deliveryPartnerPhone ||
            order.deliveryPartnerVehicle) && (
            <View
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.softCard,
              }}
            >
              <Text
                style={{
                  color: colors.primaryDark,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                Delivery Partner
              </Text>
              {order.deliveryPartnerName && (
                <Text
                  style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}
                >
                  {order.deliveryPartnerName}
                </Text>
              )}
              {order.deliveryPartnerPhone && (
                <Text
                  style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}
                >
                  {order.deliveryPartnerPhone}
                </Text>
              )}
              {order.deliveryPartnerVehicle && (
                <Text
                  style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}
                >
                  {order.deliveryPartnerVehicle}
                </Text>
              )}
            </View>
          )}
      </View>

      {/* Card footer */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: "#FBFCFA",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom:
              showAccept || showStartCooking || showStart || nextStatus ? 8 : 0,
          }}
        >
          <View>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              Order total
            </Text>
            <Text
              style={{
                color: colors.primaryDark,
                fontSize: 16,
                fontWeight: "800",
                marginTop: 2,
              }}
            >
              ₹{formatCurrencyAmount(order.amount)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text
              style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}
            >
              View details
            </Text>
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </View>
        </View>

        {showAccept && (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => onReject?.(order)}
              disabled={busy}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#C62828",
                borderRadius: 14,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "#C62828", fontSize: 15, fontWeight: "700" }}
              >
                Reject
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onAccept?.(order.id)}
              disabled={busy}
              style={{
                flex: 1.5,
                backgroundColor: colors.primary,
                borderRadius: 14,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                {busy ? "Accepting..." : "Accept Order"}
              </Text>
            </Pressable>
          </View>
        )}

        {showStartCooking && (
          <Pressable
            onPress={() => onStartCooking?.(order.id)}
            disabled={busy || !canStartCooking}
            accessibilityState={{ disabled: busy || !canStartCooking }}
            style={{
              backgroundColor:
                busy || !canStartCooking ? colors.muted : colors.primary,
              borderRadius: 14,
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
              {busy ? "Starting..." : "Start Cooking"}
            </Text>
          </Pressable>
        )}
        {showStartCooking && !canStartCooking && (
          <Text
            style={{
              marginTop: 8,
              color: colors.muted,
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {startCookingTime
              ? `Start Cooking available at ${startCookingTime}`
              : "Delivery or preparation time unavailable"}
          </Text>
        )}

        {showStart && (
          <Pressable
            onPress={() => onMarkReady?.(order.id)}
            disabled={busy}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 14,
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
              Mark Ready
            </Text>
          </Pressable>
        )}

        {nextStatus && (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              if (nextStatus.status === "Packing") {
                onStartPacking?.(order);
              } else {
                onStatusUpdate?.(order.id, nextStatus.status);
              }
            }}
            disabled={busy || nextStatus.label === "Partner Accepted"}
            style={{
              backgroundColor:
                nextStatus.label === "Partner Accepted"
                  ? colors.muted
                  : colors.primary,
              borderRadius: 14,
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
              {nextStatus.label}
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS: OrderTab[] = [
  "All Status",
  "New",
  "Preparing",
  "Packing",
  "Searching Delivery Partner",
  "Delivery Partner Assigned",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const matchesTab = (order: Order, tab: OrderTab) => {
  if (tab === "All Status") {
    const rawStatus = (order.rawStatus || "").toLowerCase();
    return (
      order.status !== "Cancelled" &&
      order.status !== "Completed" &&
      !/\bdelivered\b/.test(rawStatus)
    );
  }
  if (
    tab === "Packing" ||
    tab === "Searching Delivery Partner" ||
    tab === "Delivery Partner Assigned"
  ) {
    return (order.rawStatus || "").toLowerCase() === tab.toLowerCase();
  }
  if (tab === "Cancelled") return order.status === "Cancelled";
  return order.status === tab;
};

const getOrderTimestamp = (order: Order) => {
  const timestamp = Date.parse(order.orderedAt || "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<OrderTab>("New");
  const [orders, setOrders] = usePageCacheState<Order[]>("orders.list", []);
  const [refreshing, setRefreshing] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  // Optional: you can add a filterSort state here if needed, e.g. "Newest", "Oldest", "Highest Amount"
  const [filterSort, setFilterSort] = useState<
    "Newest" | "Oldest" | "Highest Amount"
  >("Newest");
  const [actionId, setActionId] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNotes, setCancelNotes] = useState("");
  const [showReasons, setShowReasons] = useState(false);
  const [packingOrder, setPackingOrder] = useState<Order | null>(null);
  const [packingImage, setPackingImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadedPackingImage, setUploadedPackingImage] = useState<
    string | null
  >(null);
  const [packingUploadProgress, setPackingUploadProgress] = useState(0);
  const [packingError, setPackingError] = useState("");
  const [packingUploading, setPackingUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cancellationReasons = [
    "Item unavailable",
    "Too busy to prepare",
    "Delivery issue",
    "Customer request",
    "Other",
  ];

  const fetchOrders = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/user-food-orders/chef");
      const mappedOrders = res.data.map((o: any) => {
        const orderStatus = o.order_status || o.status;
        const rawStatus = String(orderStatus || "").toLowerCase();
        const acceptedAt = [
          o.accepted_at,
          o.acceptedAt,
          o.order_accepted_at,
          o.accepted_time,
          o.accepted_date_time,
          o.acceptedDateTime,
          ["accepted", "preparing"].includes(rawStatus)
            ? o.updated_at
            : undefined,
        ]
          .map(normalizeTimestamp)
          .find(Boolean);
        const storedDeliveryAt = [
          o.delivery_time,
          o.delivery_at,
          o.deliveryTime,
          o.deliveryDateTime,
          o.estimated_delivery_time,
          o.expected_delivery_time,
          o.delivered_at,
        ]
          .map(normalizeTimestamp)
          .find(Boolean);
        const deliveryAt =
          storedDeliveryAt || calculateDeliveryDeadline(acceptedAt);

        return {
          id: o.id || o._id,
          order_id: o.order_id || o.id || "Unknown",
          status: mapStatus(orderStatus),
          rawStatus: orderStatus,
          preparationMinutes: getOrderPreparationMinutes(o),
          customer: o.customer_name || "Unknown",
          firstItemImage: getFirstItemImage(o.items),
          itemNames: getOrderItemNames(o.items),
          items:
            o.chef_total_quantity ??
            (o.items?.reduce(
              (sum: number, item: any) => sum + (Number(item.quantity) || 1),
              0,
            ) ||
              0),
          amount: parseFloat((o.chef_total_amount ?? o.total_amount) || 0),
          location: o.street_address
            ? `${o.street_address}, ${o.city || ""}`.replace(/,\s*$/, "")
            : o.customer_address || o.delivery_address || "Unknown Location",
          orderedAt: normalizeTimestamp(o.ordered_at || o.created_at),
          cancellationReason:
            o.cancellation_reason ||
            o.cancel_reason ||
            o.cancellationReason ||
            "",
          cancellationNotes:
            o.cancellation_notes || o.cancel_notes || o.cancellationNotes || "",
          deliveryPartnerName:
            o.delivery_partner_name ||
            o.deliveryPartner?.name ||
            o.delivery_partner?.name,
          deliveryPartnerPhone:
            o.delivery_partner_phone ||
            o.deliveryPartner?.phone ||
            o.delivery_partner?.phone,
          deliveryPartnerVehicle:
            o.delivery_partner_vehicle ||
            o.deliveryPartner?.vehicle ||
            o.delivery_partner?.vehicle,
          time: formatOrderListTime(o.ordered_at || o.created_at),
          acceptedTime: formatOrderDateTime(acceptedAt),
          acceptedAt,
          deliveryAt,
          deliveryTime: formatOrderDateTime(deliveryAt),
        };
      });
      setOrders(mappedOrders);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hasCachedPageData("orders.list")) {
      const timer = setTimeout(() => void fetchOrders(), 0);
      return () => clearTimeout(timer);
    }
  }, [fetchOrders]);

  let filtered = orders.filter((o) => matchesTab(o, activeTab));

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.customer.toLowerCase().includes(s) ||
        o.order_id.toLowerCase().includes(s) ||
        o.location.toLowerCase().includes(s),
    );
  }

  // Apply sorting
  if (filterSort === "Newest") {
    filtered.sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
  } else if (filterSort === "Oldest") {
    filtered.sort((a, b) => getOrderTimestamp(a) - getOrderTimestamp(b));
  } else if (filterSort === "Highest Amount") {
    filtered.sort((a, b) => b.amount - a.amount);
  }

  const handleAccept = async (id: string) => {
    if (actionId) return;
    setActionId(id);
    try {
      const acceptedAt = new Date();
      const selectedDeliveryAt = orders.find(
        (order) => String(order.id) === String(id),
      )?.deliveryAt;
      const selectedDeliveryDate = selectedDeliveryAt
        ? new Date(selectedDeliveryAt)
        : null;
      const deliveryTime =
        selectedDeliveryDate && Number.isFinite(selectedDeliveryDate.getTime())
          ? selectedDeliveryDate
          : new Date(acceptedAt.getTime() + 3 * 60 * 60 * 1000);
      await api.patch(`/user-food-orders/status/${id}`, {
        status: "Accepted",
        accepted_at: acceptedAt.toISOString(),
        delivery_time: deliveryTime.toISOString(),
      });
      await fetchOrders();
    } catch (error) {
      showAppDialog("Could not accept order", getApiErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const openCancelModal = (order: Order) => {
    setCancelOrder(order);
    setCancelReason("");
    setCancelNotes("");
    setShowReasons(false);
  };

  const closeCancelModal = () => {
    if (actionId) return;
    setCancelOrder(null);
    setShowReasons(false);
  };

  const handleCancelOrder = async () => {
    if (!cancelOrder || !cancelReason || actionId) return;
    setActionId(cancelOrder.id);
    try {
      await api.patch(`/user-food-orders/status/${cancelOrder.id}`, {
        status: "Cancelled",
        cancellation_reason: cancelReason,
        cancellation_notes: cancelNotes.trim() || undefined,
      });
      closeCancelModal();
      await fetchOrders();
    } catch (error) {
      showAppDialog("Could not cancel order", getApiErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const handleMarkReady = async (id: string) => {
    if (actionId) return;
    setActionId(id);
    try {
      await api.patch(`/user-food-orders/status/${id}`, {
        status: "Food Ready",
      });
      await fetchOrders();
    } catch (error) {
      showAppDialog("Could not update order", getApiErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (actionId) return;
    setActionId(id);
    try {
      await api.patch(`/user-food-orders/status/${id}`, { status });
      await fetchOrders();
    } catch (error) {
      showAppDialog("Could not update order", getApiErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const handleStartPacking = (order: Order) => {
    const rawStatus = String(order.rawStatus || "").toLowerCase();
    if (
      order.status !== "Ready" ||
      !["ready", "food ready"].includes(rawStatus)
    ) {
      return;
    }
    setPackingOrder(order);
    setPackingImage(null);
    setUploadedPackingImage(null);
    setPackingUploadProgress(0);
    setPackingError("");
  };

  const closePackingModal = () => {
    if (packingUploading) return;
    setPackingOrder(null);
    setPackingImage(null);
    setUploadedPackingImage(null);
    setPackingUploadProgress(0);
    setPackingError("");
  };

  const pickPackingImage = async (source: "library" | "camera") => {
    if (!packingOrder || packingUploading) return;
    setPackingError("");
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        setPackingError(
          source === "camera"
            ? "Allow camera access to take a packing photo."
            : "Allow photo library access to select a packing photo.",
        );
        return;
      }

      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3] as [number, number],
        quality: 0.8,
      };
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.assets?.[0];
      if (result.canceled || !asset) return;

      const mimeType = asset.mimeType?.toLowerCase();
      const filePath = (asset.fileName || asset.uri).split(/[?#]/, 1)[0];
      const validImage = mimeType
        ? ["image/jpeg", "image/jpg", "image/png"].includes(mimeType)
        : /\.(jpe?g|png)$/i.test(filePath);
      if (!validImage) {
        setPackingError("Choose a JPG, JPEG, or PNG image.");
        return;
      }

      setPackingImage(asset);
      setUploadedPackingImage(null);
      setPackingUploadProgress(0);
    } catch (error) {
      setPackingError(
        getApiErrorMessage(error, "Could not select the packing image."),
      );
    }
  };

  const confirmPacking = async () => {
    if (!packingOrder || !packingImage || packingUploading) return;
    const rawStatus = String(packingOrder.rawStatus || "").toLowerCase();
    if (
      packingOrder.status !== "Ready" ||
      !["ready", "food ready"].includes(rawStatus)
    ) {
      setPackingError("This order is no longer ready to be packed.");
      return;
    }

    setPackingUploading(true);
    setPackingError("");
    try {
      const packingImageUrl =
        uploadedPackingImage ||
        (await uploadPackingImage(
          packingOrder.id,
          packingOrder.order_id,
          packingImage,
          setPackingUploadProgress,
        ));
      setUploadedPackingImage(packingImageUrl);
      setPackingUploadProgress(100);

      await api.patch(
        `/user-food-orders/status/${encodeURIComponent(packingOrder.id)}`,
        {
          order_id: packingOrder.order_id,
          order_status: "Packed",
          status: "Packed",
          packing_image: packingImageUrl,
        },
      );

      setPackingOrder(null);
      setPackingImage(null);
      setUploadedPackingImage(null);
      setPackingUploadProgress(0);
      await fetchOrders();
    } catch (error) {
      console.error("Could not confirm packing:", error);
      setPackingError(
        getApiErrorMessage(
          error,
          "Packing image upload failed. The order status was not changed.",
        ),
      );
    } finally {
      setPackingUploading(false);
    }
  };

  const handleStartCooking = async (id: string) => {
    if (actionId) return;
    const order = orders.find((item) => String(item.id) === String(id));
    const startCookingAt = order ? getStartCookingTimestamp(order) : undefined;
    if (startCookingAt === undefined) {
      showAppDialog(
        "Start time unavailable",
        "Delivery time or food preparation time is missing, so the start time cannot be calculated.",
      );
      return;
    }

    const now = Date.now();
    if (now < startCookingAt) {
      const availableAt = new Date(startCookingAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      showAppDialog(
        "Cooking cannot start yet",
        `Start Cooking available at ${availableAt}.`,
      );
      return;
    }

    setActionId(id);
    try {
      await api.patch(`/user-food-orders/status/${id}`, {
        status: "Cooking",
      });
      await fetchOrders();
    } catch (error) {
      showAppDialog("Could not start cooking", getApiErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      <TopHeader showHero={false} title="Orders" />

      {/* Search bar with filter icon */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginHorizontal: 20,
          marginTop: 16,
          backgroundColor: colors.cardBackground,
          borderRadius: 50,
          paddingHorizontal: 14,
          paddingVertical: 10,
          gap: 8,
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search customer, ID, location..."
          placeholderTextColor={colors.muted}
          style={{
            flex: 1,
            fontSize: 14,
            color: colors.primaryDark,
            padding: 0,
          }}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} style={{ marginRight: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}

        <View
          style={{
            width: 1,
            height: 24,
            backgroundColor: colors.border,
            marginHorizontal: 4,
          }}
        />

        <Pressable
          onPress={() => setShowFilter(true)}
          accessibilityRole="button"
          accessibilityLabel={`Filter and sort orders. Current status: ${activeTab}`}
          style={{ padding: 4, position: "relative" }}
        >
          <Ionicons name="options-outline" size={20} color={colors.primary} />
          {activeTab !== "All Status" ? (
            <View
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: colors.primary,
              }}
            />
          ) : null}
        </Pressable>
      </View>

      {/* ── Order list ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchOrders}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 100,
        }}
      >
        {filtered.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 60,
            }}
          >
            <View
              style={{
                height: 72,
                width: 72,
                borderRadius: 36,
                backgroundColor: colors.softCard,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="receipt-outline" size={32} color={colors.muted} />
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.primaryDark,
              }}
            >
              No {activeTab} Orders
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.muted,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              You have no {activeTab.toLowerCase()} orders right now.
            </Text>
          </View>
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAccept={handleAccept}
              onReject={openCancelModal}
              onMarkReady={handleMarkReady}
              onStartCooking={handleStartCooking}
              onStartPacking={handleStartPacking}
              onStatusUpdate={handleStatusUpdate}
              busy={actionId === order.id}
              now={clock}
              onPress={() => router.push(`/order/${order.id}`)}
            />
          ))
        )}
      </ScrollView>

      <BottomBar />

      <Modal
        visible={Boolean(packingOrder)}
        transparent
        animationType="slide"
        onRequestClose={closePackingModal}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            onPress={closePackingModal}
            disabled={packingUploading}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          />
          <View
            style={{
              maxHeight: "88%",
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 26,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              backgroundColor: colors.pageBackground,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <View>
                <Text
                  style={{
                    color: colors.primaryDark,
                    fontSize: 18,
                    fontWeight: "800",
                  }}
                >
                  Packing Confirmation
                </Text>
                <Text
                  style={{ marginTop: 3, color: colors.muted, fontSize: 13 }}
                >
                  Order #{packingOrder?.order_id}
                </Text>
              </View>
              <Pressable
                onPress={closePackingModal}
                disabled={packingUploading}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close packing confirmation"
              >
                <Ionicons name="close" size={23} color={colors.primaryDark} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 14 }}
            >
              <Text
                style={{
                  marginBottom: 8,
                  color: colors.primaryDark,
                  fontSize: 14,
                  fontWeight: "800",
                }}
              >
                Image Upload
              </Text>

              {packingImage ? (
                <View
                  style={{
                    height: 190,
                    overflow: "hidden",
                    borderRadius: 14,
                    backgroundColor: colors.softCard,
                  }}
                >
                  <ExpoImage
                    source={{ uri: packingImage.uri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                  <Pressable
                    onPress={() => {
                      setPackingImage(null);
                      setUploadedPackingImage(null);
                      setPackingUploadProgress(0);
                      setPackingError("");
                    }}
                    disabled={packingUploading}
                    accessibilityRole="button"
                    accessibilityLabel="Remove packing photo"
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.94)",
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#C62828" />
                  </Pressable>
                </View>
              ) : (
                <View
                  style={{
                    height: 150,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: colors.primary,
                    backgroundColor: colors.softCard,
                  }}
                >
                  <Ionicons
                    name="image-outline"
                    size={30}
                    color={colors.primary}
                  />
                  <Text
                    style={{
                      marginTop: 8,
                      color: colors.primaryDark,
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    Add a photo of the packed order
                  </Text>
                  <Text
                    style={{ marginTop: 4, color: colors.muted, fontSize: 12 }}
                  >
                    JPG, JPEG, or PNG
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Pressable
                  onPress={() => void pickPackingImage("library")}
                  disabled={packingUploading}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    borderRadius: 11,
                    backgroundColor: colors.cardBackground,
                  }}
                >
                  <Ionicons
                    name="images-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {packingImage ? "Change Photo" : "Choose Photo"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void pickPackingImage("camera")}
                  disabled={packingUploading}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 11,
                    backgroundColor: colors.cardBackground,
                  }}
                >
                  <Ionicons
                    name="camera-outline"
                    size={18}
                    color={colors.primaryDark}
                  />
                  <Text
                    style={{ color: colors.primaryDark, fontWeight: "700" }}
                  >
                    Take Photo
                  </Text>
                </Pressable>
              </View>

              {packingUploading ? (
                <View style={{ marginTop: 14 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 7,
                    }}
                  >
                    <Text style={{ color: colors.primaryDark, fontSize: 12 }}>
                      {packingUploadProgress >= 100
                        ? "Saving packed order..."
                        : "Uploading packing image..."}
                    </Text>
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 12,
                        fontWeight: "800",
                      }}
                    >
                      {packingUploadProgress}%
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 7,
                      overflow: "hidden",
                      borderRadius: 4,
                      backgroundColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: `${packingUploadProgress}%`,
                        height: "100%",
                        backgroundColor: colors.primary,
                      }}
                    />
                  </View>
                </View>
              ) : null}

              {packingError ? (
                <Text
                  style={{
                    marginTop: 12,
                    color: "#C62828",
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                >
                  {packingError}
                </Text>
              ) : null}
            </ScrollView>

            <Pressable
              onPress={() => void confirmPacking()}
              disabled={!packingImage || packingUploading}
              style={{
                minHeight: 48,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 12,
                backgroundColor:
                  !packingImage || packingUploading
                    ? colors.muted
                    : colors.primary,
              }}
            >
              {packingUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : null}
              <Text
                style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "800" }}
              >
                {packingUploading ? "Confirming..." : "Confirm Packing"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(cancelOrder)}
        transparent
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <Pressable style={styles.cancelOverlay} onPress={closeCancelModal}>
          <Pressable style={styles.cancelCard} onPress={() => undefined}>
            <View style={styles.cancelHeader}>
              <View style={styles.cancelTitleRow}>
                <View style={styles.cancelIcon}>
                  <Ionicons name="close-circle" size={28} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.cancelTitle}>Cancel Order</Text>
                  <Text style={styles.cancelOrderId}>
                    #{cancelOrder?.order_id}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={closeCancelModal}
                disabled={Boolean(actionId)}
                style={styles.cancelClose}
              >
                <Ionicons name="close" size={21} color="#52645B" />
              </Pressable>
            </View>

            <View style={styles.cancelWarning}>
              <Ionicons name="warning-outline" size={22} color="#B26A00" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelWarningTitle}>
                  Are you sure you want to cancel this order?
                </Text>
                <Text style={styles.cancelWarningText}>
                  This action cannot be undone. Select a cancellation reason
                  before continuing.
                </Text>
              </View>
            </View>

            <Text style={styles.cancelLabel}>
              Cancellation Reason <Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              onPress={() => setShowReasons((visible) => !visible)}
              disabled={Boolean(actionId)}
              style={styles.reasonSelect}
            >
              <Text
                style={[
                  styles.reasonText,
                  !cancelReason && styles.reasonPlaceholder,
                ]}
              >
                {cancelReason || "Select a reason..."}
              </Text>
              <Ionicons
                name={showReasons ? "chevron-up" : "chevron-down"}
                size={19}
                color="#283A33"
              />
            </Pressable>
            {showReasons && (
              <View style={styles.reasonMenu}>
                {cancellationReasons.map((reason) => (
                  <Pressable
                    key={reason}
                    onPress={() => {
                      setCancelReason(reason);
                      setShowReasons(false);
                    }}
                    style={styles.reasonOption}
                  >
                    <Text style={styles.reasonOptionText}>{reason}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.cancelLabel}>
              Additional Notes <Text style={styles.optional}>(Optional)</Text>
            </Text>
            <TextInput
              value={cancelNotes}
              onChangeText={setCancelNotes}
              editable={!actionId}
              multiline
              numberOfLines={3}
              placeholder="Provide any extra details about this cancellation..."
              placeholderTextColor="#8A9691"
              style={styles.notesInput}
              textAlignVertical="top"
            />

            <View style={styles.cancelActions}>
              <Pressable
                onPress={closeCancelModal}
                disabled={Boolean(actionId)}
                style={styles.keepButton}
              >
                <Text style={styles.keepButtonText}>No, Keep Order</Text>
              </Pressable>
              <Pressable
                onPress={handleCancelOrder}
                disabled={!cancelReason || Boolean(actionId)}
                style={[
                  styles.confirmCancelButton,
                  (!cancelReason || actionId) && styles.confirmCancelDisabled,
                ]}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.confirmCancelText}>
                  {actionId ? "Cancelling..." : "Yes, Cancel Order"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Filter Bottom Sheet Modal ── */}
      <Modal
        visible={showFilter}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilter(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={() => setShowFilter(false)}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          />
          <View
            style={{
              maxHeight: "88%",
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 28,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: colors.primaryDark,
                }}
              >
                Filter Orders
              </Text>
              <Pressable onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={24} color={colors.primaryDark} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "800",
                  color: colors.primaryDark,
                  marginBottom: 6,
                }}
              >
                Order Status
              </Text>
              {TABS.map((tab) => {
                const isActive = activeTab === tab;
                const count = orders.filter((order) =>
                  matchesTab(order, tab),
                ).length;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    style={{
                      minHeight: 44,
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        color: isActive ? colors.primary : colors.primaryDark,
                        fontSize: 13,
                        fontWeight: isActive ? "800" : "600",
                      }}
                    >
                      {tab}
                    </Text>
                    <Text
                      style={{
                        minWidth: 28,
                        marginRight: 10,
                        color: colors.muted,
                        fontSize: 12,
                        textAlign: "right",
                      }}
                    >
                      {count}
                    </Text>
                    <Ionicons
                      name={isActive ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={isActive ? colors.primary : colors.muted}
                    />
                  </Pressable>
                );
              })}

              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "800",
                  color: colors.primaryDark,
                  marginTop: 18,
                  marginBottom: 10,
                }}
              >
                Sort By
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                {(["Newest", "Oldest", "Highest Amount"] as const).map(
                  (sort) => {
                    const isActive = filterSort === sort;
                    return (
                      <Pressable
                        key={sort}
                        onPress={() => setFilterSort(sort)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          borderRadius: 10,
                          backgroundColor: isActive
                            ? colors.primary
                            : colors.softCard,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: isActive
                            ? colors.primary
                            : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: isActive ? "#fff" : colors.primaryDark,
                          }}
                        >
                          {sort}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowFilter(false)}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = {
  cancelOverlay: {
    flex: 1,
    justifyContent: "center" as const,
    padding: 18,
    backgroundColor: "rgba(7, 13, 10, 0.72)",
  },
  cancelCard: {
    width: "100%" as const,
    maxWidth: 440,
    alignSelf: "center" as const,
    overflow: "hidden" as const,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 12,
  },
  cancelHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: 20,
    backgroundColor: "#FFF6F6",
    borderBottomWidth: 1,
    borderBottomColor: "#F3E5E5",
  },
  cancelTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  cancelIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#F32632",
    shadowColor: "#F32632",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
  cancelTitle: { color: "#202522", fontSize: 21, fontWeight: "800" as const },
  cancelOrderId: { marginTop: 3, color: "#8A8F8C", fontSize: 13 },
  cancelClose: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#F3F4F3",
  },
  cancelWarning: {
    flexDirection: "row" as const,
    gap: 12,
    margin: 20,
    marginBottom: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: "#FFD273",
    borderRadius: 15,
    backgroundColor: "#FFF9E8",
  },
  cancelWarningTitle: {
    color: "#A76100",
    fontSize: 15,
    fontWeight: "800" as const,
    lineHeight: 21,
  },
  cancelWarningText: {
    marginTop: 5,
    color: "#A84F1C",
    fontSize: 13,
    lineHeight: 20,
  },
  cancelLabel: {
    marginHorizontal: 20,
    marginBottom: 8,
    color: "#37434C",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  required: { color: "#E53935" },
  optional: { color: "#9AA29E", fontWeight: "500" as const },
  reasonSelect: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginHorizontal: 20,
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#DDE3E0",
    borderRadius: 13,
    backgroundColor: "#FBFCFB",
  },
  reasonText: { color: "#283A33", fontSize: 15 },
  reasonPlaceholder: { color: "#697570" },
  reasonMenu: {
    marginHorizontal: 20,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#DDE3E0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  reasonOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2EF",
  },
  reasonOptionText: { color: "#283A33", fontSize: 14 },
  notesInput: {
    marginHorizontal: 20,
    minHeight: 88,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DDE3E0",
    borderRadius: 13,
    color: "#283A33",
    fontSize: 14,
    backgroundColor: "#FBFCFB",
  },
  cancelActions: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 24,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#EEF1EF",
  },
  keepButton: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minHeight: 56,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#DDE3E0",
    borderRadius: 14,
  },
  keepButtonText: {
    color: "#1D3D30",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  confirmCancelButton: {
    flex: 1.35,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: "#F2767B",
  },
  confirmCancelDisabled: { opacity: 0.5 },
  confirmCancelText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800" as const,
  },
};
