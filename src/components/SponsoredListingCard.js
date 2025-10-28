// src/components/SponsoredListingCard.js
import React from "react";
import { View, Text, TouchableOpacity, Linking, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { usePrefs } from "../context/PreferencesContext.js";

export default function SponsoredListingCard({ listing }) {
  const { C } = usePrefs();
  const navigation = useNavigation();
  if (!listing) return null;

  const enquire = () => {
    const wa = (listing?.contact?.whatsapp || "").replace(/[^\d]/g, "");
    const tel = (listing?.contact?.phone || "").replace(/[^\d]/g, "");
    if (wa) {
      const msg = encodeURIComponent(
        `Hi ${listing.ownerName}, I'm interested in "${listing.title}" listed on Yaka.`
      );
      Linking.openURL(`https://wa.me/${wa}?text=${msg}`).catch(() => {});
      return;
    }
    if (tel) {
      Linking.openURL(`tel:${tel}`).catch(() => {});
    }
  };

  return (
    <View style={[styles.card, { borderColor: "rgba(0,0,0,0.06)" }]}>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.sponsorBadge,
            { backgroundColor: (C?.primary ?? "#034750") + "12", borderColor: C?.primary ?? "#034750" },
          ]}
        >
          <Ionicons name="megaphone-outline" size={12} color={C?.primary ?? "#034750"} />
          <Text style={[styles.sponsorTxt, { color: C?.primary ?? "#034750" }]}>Sponsored</Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("Storefront", { ownerId: listing.ownerId, ownerName: listing.ownerName })}
          accessibilityLabel={`Open ${listing.ownerName} storefront`}
        >
          <Text
            style={[
              styles.by,
              { color: (C?.text ?? "#111") + "99", textDecorationLine: "underline" },
            ]}
          >
            by {listing.ownerName}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.title, { color: C?.text ?? "#111" }]} numberOfLines={2}>
        {listing.title}
      </Text>
      {!!listing.description && (
        <Text style={[styles.desc, { color: (C?.text ?? "#111") + "CC" }]} numberOfLines={3}>
          {listing.description}
        </Text>
      )}
      <Text style={[styles.price, { color: C?.accent ?? "#F4A300" }]}>
        R {Number(listing.price).toLocaleString("en-ZA")}
      </Text>

      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: C?.primary ?? "#034750" }]}
          onPress={enquire}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
          <Text style={styles.ctaTxt}>Enquire</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 8,
    borderWidth: 1,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  sponsorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  sponsorTxt: { fontWeight: "800", fontSize: 12 },
  by: { fontSize: 12, fontWeight: "600" },
  title: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  desc: { marginTop: 6 },
  price: { marginTop: 8, fontWeight: "900" },
  ctaRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctaTxt: { color: "#fff", fontWeight: "800" },
});
