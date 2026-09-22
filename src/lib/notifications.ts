import Constants from "expo-constants";
import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

let notifications: NotificationsModule | null | undefined;

export function getNotifications(): NotificationsModule | null {
  if (notifications !== undefined) return notifications;

  if (Platform.OS === "web" || Constants.appOwnership === "expo") {
    notifications = null;
    return notifications;
  }

  try {
    notifications = require("expo-notifications") as NotificationsModule;
  } catch (error) {
    console.warn("Notifications are unavailable in this environment:", error);
    notifications = null;
  }

  return notifications;
}