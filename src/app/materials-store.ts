import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform, ToastAndroid } from "react-native";
import { API_BASE_URL } from "../api";

export const FAVORITES_KEY = "buyMaterialsFavorites";
export const CART_KEY = "buyMaterialsCart";

export function showMaterialToast(message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert("Materials", message);
  }
}

const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export function getMaterialImage(item: any) {
  let image = Array.isArray(item?.images) ? item.images[0] : item?.images;
  if (typeof image === "string") {
    try {
      const parsed = JSON.parse(image);
      image = Array.isArray(parsed) ? parsed[0] : parsed;
    } catch {
      // The value is already a direct image path.
    }
  }

  if (typeof image === "string" && image.trim()) {
    const trimmed = image.trim();
    if (trimmed.startsWith("data:")) return trimmed;
    if (
      trimmed.includes("localhost:5000") ||
      trimmed.includes("127.0.0.1:5000")
    ) {
      return trimmed
        .replace(/https?:\/\/localhost:5000/g, IMAGE_BASE_URL)
        .replace(/https?:\/\/127\.0\.0\.1:5000/g, IMAGE_BASE_URL);
    }
    if (trimmed.startsWith("http")) return trimmed;
    return trimmed.startsWith("/")
      ? `${IMAGE_BASE_URL}${trimmed}`
      : `${IMAGE_BASE_URL}/${trimmed}`;
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(item?.name || "Material")}&background=f3f4f6&color=64748b&size=400`;
}

export async function loadMaterialCollection(key: string) {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function saveMaterialCollection(key: string, collection: any[]) {
  await AsyncStorage.setItem(key, JSON.stringify(collection));
}

export async function setMaterialInCollection(
  key: string,
  product: any,
  included: boolean,
) {
  const collection = await loadMaterialCollection(key);
  const productId = String(product.id);
  const next = included
    ? [
        ...collection.filter((item: any) => String(item.id) !== productId),
        product,
      ]
    : collection.filter((item: any) => String(item.id) !== productId);
  await AsyncStorage.setItem(key, JSON.stringify(next));
}
