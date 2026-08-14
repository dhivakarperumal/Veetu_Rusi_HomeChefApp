import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const API_BASE_URL = " https://veeturusi.qtechx.com/api";
// export const API_BASE_URL = "http://192.168.1.5:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 8000,
});

const MAX_RETRIES = 1;
let cachedToken = null;

export function clearTokenCache() {
  cachedToken = null;
}

api.interceptors.request.use(async (config) => {
  const storageToken = await AsyncStorage.getItem("userToken");
  const activeToken = storageToken || cachedToken;

  if (activeToken) {
    cachedToken = activeToken;
    config.headers.Authorization = `Bearer ${activeToken}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const retryCount = originalRequest?._retryCount || 0;
    const isNetworkError =
      !error.response && (error.code || error.message === "Network Error");

    if (isNetworkError && originalRequest && retryCount < MAX_RETRIES) {
      originalRequest._retryCount = retryCount + 1;
      return api(originalRequest);
    }

    if (error.response) {
      return Promise.reject({
        status: error.response.status,
        message: error.response.data?.message || "Server error",
        data: error.response.data,
      });
    }

    return Promise.reject({
      status: "network_error",
      message: `Network connection failed. Check that ${API_BASE_URL} is reachable.`,
    });
  },
);

export default api;