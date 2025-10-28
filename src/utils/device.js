import { Platform, Image as RNImage } from "react-native";

/** --- Safe Haptics import (no-op fallback) --- **/
let Haptics = { impactAsync: async () => {}, selectionAsync: async () => {} };
try { Haptics = require("expo-haptics"); } catch { console.warn("[Yaka] Haptics disabled (expo-haptics not installed)."); }
export const haptic = { light: () => Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light || undefined), select: () => Haptics.selectionAsync?.() };

/** --- Speech (TTS) --- **/
import * as Speech from "expo-speech";
export { Speech };

/** --- Safe Notifications import (no-op fallback) --- **/
let Notifications = {
  getPermissionsAsync: async () => ({ status: "undetermined" }),
  requestPermissionsAsync: async () => ({ status: "denied" }),
  scheduleNotificationAsync: async () => {},
  setNotificationChannelAsync: async () => {},
  setNotificationHandler: () => {},
  getExpoPushTokenAsync: async () => ({ data: `mock-token-${Date.now()}` }),
};
try {
  Notifications = require("expo-notifications");
  Notifications.setNotificationHandler?.({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync?.("yaka-default", { name: "Default", importance: 3 });
  }
} catch { console.warn("[Yaka] Local notifications disabled (expo-notifications not installed)."); }
export { Notifications };

/** --- Expo Constants (detect Expo Go) --- **/
let Constants = null;
try { Constants = require("expo-constants").default; } catch {}
export const isExpoGo = Constants?.appOwnership === "expo";

/** --- Safe Image (expo-image) with fallback to RN Image --- **/
let ExpoImage = null;
try { ExpoImage = require("expo-image").Image; } catch { ExpoImage = RNImage; }
export { ExpoImage };

/** --- Safe Image Picker + Manipulator with fallbacks --- **/
let ImagePicker = { requestMediaLibraryPermissionsAsync: async () => ({ status: "denied" }), launchImageLibraryAsync: async () => ({ canceled: true }) };
let ImageManipulator = { manipulateAsync: async (uri) => ({ uri }) };
try { ImagePicker = require("expo-image-picker"); } catch { console.warn("[Yaka] Image Picker disabled (expo-image-picker not installed)."); }
try { ImageManipulator = require("expo-image-manipulator"); } catch { console.warn("[Yaka] Image compression disabled (expo-image-manipulator not installed)."); }
export { ImagePicker, ImageManipulator };
