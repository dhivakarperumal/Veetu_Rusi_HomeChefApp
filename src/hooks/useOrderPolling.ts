import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import api, { isNewOrderStatus } from "../api";

export function useOrderPolling(intervalMs = 15000) {
  const seenOrdersRef = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    // Load previously seen orders from storage so we don't notify on reload
    const loadSeenOrders = async () => {
      try {
        const stored = await AsyncStorage.getItem("seenOrderIds");
        if (stored) {
          const parsed = JSON.parse(stored);
          seenOrdersRef.current = new Set(parsed);
        }
      } catch (e) {
        console.error("Failed to load seen orders", e);
      }
    };

    loadSeenOrders();

    const checkNewOrders = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return; // Don't poll if not logged in

        const res = await api.get("/user-food-orders/chef");
        const orders = res.data || [];

        let newOrdersFound = false;
        let latestNewOrder = null;

        for (const o of orders) {
          const id = String(o.id || o._id);
          // Check if it's a "New" order
          if (isNewOrderStatus(o.status)) {
            if (!seenOrdersRef.current.has(id)) {
              seenOrdersRef.current.add(id);
              newOrdersFound = true;
              latestNewOrder = o;
            }
          } else {
            // For non-new orders, we still mark them as seen to avoid weird bugs
            seenOrdersRef.current.add(id);
          }
        }

        if (newOrdersFound) {
          // Save updated set to storage
          await AsyncStorage.setItem(
            "seenOrderIds",
            JSON.stringify(Array.from(seenOrdersRef.current)),
          );

          // Only notify if it's not the initial load (we don't want a barrage of notifications on app start)
          if (!isInitialLoad.current && latestNewOrder) {
            const displayId =
              latestNewOrder.order_id || latestNewOrder.id || "Unknown";

            await Notifications.scheduleNotificationAsync({
              content: {
                title: "New Order Received! 👨‍🍳",
                body: `Order #${displayId} is waiting for your acceptance.`,
                sound: true,
                data: { orderId: latestNewOrder.id },
              },
              trigger: null, // trigger immediately
            });
          }
        }

        isInitialLoad.current = false;
      } catch (error) {
        if ((error as { status?: number })?.status !== 401) {
          console.log("Polling error:", error);
        }
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Run once immediately, then on interval
    checkNewOrders();
    const interval = setInterval(checkNewOrders, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);
}
