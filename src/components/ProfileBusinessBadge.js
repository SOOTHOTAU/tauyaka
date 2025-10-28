// src/components/ProfileBusinessBadge.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { usePrefs } from "../context/PreferencesContext.js";

export default function ProfileBusinessBadge({ status = "available" }) {
  const { C } = usePrefs();
  const conf = status === "available"
    ? { label: "Available", bg: C.greenSoft, fg: C.green, icon: "checkmark-circle" }
    : status === "fully_booked"
    ? { label: "Fully booked", bg: C.orangeSoft, fg: C.orange, icon: "time" }
    : { label: "Not available", bg: C.mutedSoft, fg: C.muted, icon: "remove-circle" };

  return (
    <View style={[styles.wrap, { backgroundColor: conf.bg, borderColor: conf.fg }]}>
      <Ionicons name={conf.icon} size={12} color={conf.fg} />
      <Text style={[styles.txt, { color: conf.fg }]} numberOfLines={1}>{conf.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  txt: { fontSize: 12, fontWeight: "700" }
});
