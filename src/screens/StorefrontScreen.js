// src/screens/StorefrontScreen.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  FlatList,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { usePrefs } from "../context/PreferencesContext.js";
import { useAuth } from "../context/AuthContext.js";
import { useData } from "../context/DataContext.js";
import { isActiveBoost, isActiveSponsor, remainingLabel } from "../utils/promoHelpers.js";

/* ---------------------------
   AsyncStorage (safe fallback)
---------------------------- */
let AsyncStorage;
try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {
  const mem = {};
  AsyncStorage = {
    async getItem(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    async setItem(k, v) { mem[k] = v; },
    async removeItem(k) { delete mem[k]; },
  };
}

/* ---------------------------
   Keys
---------------------------- */
const PROFILE_KEY = "YAKA_BUSINESS_PROFILE_V1";                    // current user profile
const OWNER_STATUS_KEY = "YAKA_OWNER_STATUS_MAP_V1";               // ownerId -> status
const PROFILES_MAP_KEY = "YAKA_BUSINESS_PROFILES_MAP_V1";          // optional: ownerId -> profile (name, location, verified) for other sellers
const REPORT_SELLER_KEY = "YAKA_REPORT_SELLER_V1";                 // { [sellerId]: [{ ts, reasons:[], note? }] }

/* ---------------------------
   Helpers
---------------------------- */
const DAY = 24 * 60 * 60 * 1000;

function statusColor(C, s) {
  const map = {
    Available: C?.primary ?? "#034750",
    "Fully Booked": "#F4A300",
    "Not Available": "#999999",
  };
  return map[s] || (C?.primary ?? "#034750");
}

function timeFrameFilter(items, days) {
  if (!days) return items;
  const cutoff = Date.now() - days * DAY;
  return items.filter((it) => (it.createdAt ?? 0) >= cutoff);
}

function safeNameInitials(name) {
  const n = (name || "").trim();
  if (!n) return "Y";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}

function formatPrice(n) {
  try { return Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 0 }); }
  catch { return String(n); }
}

function sum(arr) { return arr.reduce((a, b) => a + b, 0); }

/* ---------------------------
   Component
---------------------------- */
export default function StorefrontScreen({ route, navigation }) {
  const { C } = usePrefs();
  const { user } = useAuth();
  const { marketplace } = useData();

  const styles = useMemo(() => makeStyles(C), [C]);

  // Who's storefront is this?
  const sellerId = route?.params?.ownerId || user?.id || "demo";
  const isOwner = !!user?.id && user.id === sellerId;

  // Profiles
  const [myProfile, setMyProfile] = useState(null);          // current user profile (owner only)
  const [profilesMap, setProfilesMap] = useState({});        // { ownerId: profile }
  const [ownerStatusMap, setOwnerStatusMap] = useState({});  // { ownerId: status }

  // Report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReasons, setReportReasons] = useState({}); // { reason: boolean }
  const [reportNote, setReportNote] = useState("");

  // Analytics filter
  const [range, setRange] = useState("7d"); // "7d" | "30d" | "all"

  // Load local persistence
  useEffect(() => {
    (async () => {
      try {
        if (isOwner) {
          const raw = await AsyncStorage.getItem(PROFILE_KEY);
          if (raw) setMyProfile(JSON.parse(raw));
        }
      } catch {}

      try {
        const rawMap = (await AsyncStorage.getItem(PROFILES_MAP_KEY)) || "{}";
        setProfilesMap(JSON.parse(rawMap) || {});
      } catch {}

      try {
        const rawStatus = (await AsyncStorage.getItem(OWNER_STATUS_KEY)) || "{}";
        setOwnerStatusMap(JSON.parse(rawStatus) || {});
      } catch {}
    })();
  }, [isOwner]);

  // Merge view profile
  const viewProfile = useMemo(() => {
    if (isOwner) return myProfile || {};
    return profilesMap[sellerId] || {};
  }, [isOwner, myProfile, profilesMap, sellerId]);

  const sellerStatus = viewProfile?.status || ownerStatusMap[sellerId] || "Available";

  // Seller listings
  const sellerItemsAll = useMemo(
    () => (marketplace?.items || []).filter((i) => i.ownerId === sellerId),
    [marketplace?.items, sellerId]
  );

  // Analytics slice
  const sellerItems = useMemo(() => {
    if (range === "7d") return timeFrameFilter(sellerItemsAll, 7);
    if (range === "30d") return timeFrameFilter(sellerItemsAll, 30);
    return sellerItemsAll;
  }, [sellerItemsAll, range]);

  // Analytics numbers (demo: from receipts, views, active promos)
  const views = sum(sellerItems.map((i) => i.views || 0));
  const enquiries = sum(sellerItems.map((i) => i.reactions || 0)); // using reactions as a proxy
  const boosts = sellerItems.filter((i) => isActiveBoost(i)).length;
  const sponsors = sellerItems.filter((i) => isActiveSponsor(i)).length;
  const revenueDemo = sum(
    sellerItems.flatMap((i) => (i.receipts || [])).map((r) => r.amount || 0)
  );

  const nameToShow = viewProfile?.name || route?.params?.ownerName || "Business";
  const locationToShow = viewProfile?.location || "—";

  const activeBoostBadges = sellerItemsAll
    .filter((i) => isActiveBoost(i) || isActiveSponsor(i))
    .slice(0, 3)
    .map((i) =>
      isActiveBoost(i)
        ? `Boost: ${remainingLabel(i.boostMarketplaceUntil)}`
        : `Sponsored: ${remainingLabel(i.sponsorHomeUntil)}`
    );

  // Save verify toggle (owner only)
  const onToggleVerified = async (value) => {
    if (!isOwner) return;
    const next = { ...(myProfile || {}), verified: !!value };
    setMyProfile(next);
    try { await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch {}
    // Also mirror to profiles map for other viewers (optional)
    try {
      const nextMap = { ...(profilesMap || {}), [sellerId]: next };
      setProfilesMap(nextMap);
      await AsyncStorage.setItem(PROFILES_MAP_KEY, JSON.stringify(nextMap));
    } catch {}
  };

  // Report modal handlers
  const reportChoices = [
    "Fraud or scam",
    "Counterfeit / illegal",
    "Hate or harassment",
    "Misinformation",
    "Unsafe product",
    "Other",
  ];

  const submitReport = async () => {
    const selected = Object.keys(reportReasons).filter((k) => reportReasons[k]);
    if (selected.length === 0) {
      Alert.alert("Select at least one reason");
      return;
    }
    const entry = { ts: Date.now(), reasons: selected, note: reportNote || "" };
    try {
      const raw = (await AsyncStorage.getItem(REPORT_SELLER_KEY)) || "{}";
      const json = JSON.parse(raw) || {};
      const list = Array.isArray(json[sellerId]) ? json[sellerId] : [];
      json[sellerId] = [entry, ...list].slice(0, 50); // cap locally
      await AsyncStorage.setItem(REPORT_SELLER_KEY, JSON.stringify(json));
      setReportOpen(false);
      setReportReasons({});
      setReportNote("");
      Alert.alert("Report submitted", "Thanks for helping keep Yaka safe.");
    } catch {
      Alert.alert("Could not save report right now.");
    }
  };

  const ListingCard = useCallback(
    ({ item }) => {
      const boosted = isActiveBoost(item);
      const sponsored = isActiveSponsor(item);
      return (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardPrice}>R {formatPrice(item.price)}</Text>
          </View>
          <Text style={styles.cardMeta}>
            {item.category || "Other"} • {item.condition || "New"}
          </Text>
          {(boosted || sponsored) && (
            <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {boosted && (
                <View style={styles.badge}>
                  <Ionicons name="flame" size={12} color="#fff" />
                  <Text style={styles.badgeTxt}>Boosted • {remainingLabel(item.boostMarketplaceUntil)}</Text>
                </View>
              )}
              {sponsored && (
                <View style={styles.badge}>
                  <Ionicons name="megaphone" size={12} color="#fff" />
                  <Text style={styles.badgeTxt}>Sponsored • {remainingLabel(item.sponsorHomeUntil)}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      );
    },
    [styles]
  );

  const headerCover = (
    <View style={styles.coverWrap}>
      <ImageBackground
        source={viewProfile?.coverUrl ? { uri: viewProfile.coverUrl } : undefined}
        style={styles.cover}
        resizeMode="cover"
      >
        {/* Fallback color block if no cover */}
        {!viewProfile?.coverUrl && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: (C?.primary ?? "#034750") + "22" }]} />
        )}

        {/* Subtle overlay (gradient-like without deps) */}
        <View style={styles.coverOverlay} />

        {/* Avatar + title row pinned at bottom */}
        <View style={styles.coverInner}>
          <View style={styles.avatar}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>
              {safeNameInitials(nameToShow)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={styles.bizName} numberOfLines={1}>{nameToShow}</Text>
              {!!viewProfile?.verified && (
                <View style={styles.verifyPill}>
                  <Ionicons name="checkmark-circle" size={14} color="#0B8B2E" />
                  <Text style={styles.verifyTxt}>Verified</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <Ionicons name="location-outline" size={14} color="#fff" />
              <Text style={styles.locationTxt} numberOfLines={1}>{locationToShow}</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {/* Cover */}
      {headerCover}

      <ScrollView contentContainerStyle={styles.body}>
        {/* Owner controls */}
        <View style={[styles.rowSpread, { marginBottom: 12 }]}>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => navigation?.goBack?.()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={18} color={C.text} />
            <Text style={styles.ghostTxt}>Back</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {!isOwner && (
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => setReportOpen(true)}
                accessibilityLabel="Report seller"
              >
                <Ionicons name="flag-outline" size={18} color={C.text} />
                <Text style={styles.ghostTxt}>Report Seller</Text>
              </TouchableOpacity>
            )}

            {isOwner && (
              <View style={[styles.verifyRow]}>
                <Text style={{ color: C.text, fontWeight: "700" }}>Verified Business</Text>
                <Switch
                  value={!!(myProfile?.verified)}
                  onValueChange={onToggleVerified}
                  thumbColor={"#fff"}
                  trackColor={{
                    false: (C?.primary ?? "#034750") + "33",
                    true: "#0B8B2E",
                  }}
                />
              </View>
            )}
          </View>
        </View>

        {/* About & contact */}
        <View style={styles.section}>
          {!!viewProfile?.description && (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.p}>{viewProfile.description}</Text>
            </>
          )}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            {!!viewProfile?.whatsapp && (
              <View style={styles.infoPill}>
                <Ionicons name="logo-whatsapp" size={16} color={C.text} />
                <Text style={styles.infoTxt}>{viewProfile.whatsapp}</Text>
              </View>
            )}
            {!!viewProfile?.phone && (
              <View style={styles.infoPill}>
                <Ionicons name="call-outline" size={16} color={C.text} />
                <Text style={styles.infoTxt}>{viewProfile.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Analytics */}
        <View style={styles.section}>
          <View style={styles.rowSpread}>
            <Text style={styles.sectionTitle}>Analytics</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { key: "7d", label: "Last 7d" },
                { key: "30d", label: "30d" },
                { key: "all", label: "All" },
              ].map((f) => {
                const active = range === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.filterChip,
                      active && { backgroundColor: (C?.primary ?? "#034750") + "15", borderColor: C?.primary ?? "#034750" },
                    ]}
                    onPress={() => setRange(f.key)}
                  >
                    <Text style={[styles.filterTxt, active && { color: C?.primary ?? "#034750", fontWeight: "800" }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Views</Text>
              <Text style={styles.statValue}>{formatPrice(views)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Enquiries</Text>
              <Text style={styles.statValue}>{formatPrice(enquiries)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Active Boosts</Text>
              <Text style={styles.statValue}>{boosts}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Active Sponsored</Text>
              <Text style={styles.statValue}>{sponsors}</Text>
            </View>
          </View>

          {/* Secondary row (demo “revenue” and promos) */}
          <View style={[styles.statsGrid, { marginTop: 8 }]}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Promo Revenue (demo)</Text>
              <Text style={styles.statValue}>R {formatPrice(revenueDemo)}</Text>
            </View>
            <View style={[styles.statCard, { flex: 2 }]}>
              <Text style={styles.statLabel}>Promotions</Text>
              <Text style={[styles.statValue, { fontSize: 16 }]} numberOfLines={1}>
                {activeBoostBadges.length ? activeBoostBadges.join(" · ") : "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Listings preview */}
        <View style={styles.section}>
          <View style={styles.rowSpread}>
            <Text style={styles.sectionTitle}>Listings</Text>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => {
                // Navigate to Marketplace with an owner filter hint
                navigation.navigate("Marketplace", { filterOwnerId: sellerId });
              }}
              accessibilityLabel="View all listings in Marketplace"
            >
              <Ionicons name="open-outline" size={18} color={C.text} />
              <Text style={styles.ghostTxt}>View all listings</Text>
            </TouchableOpacity>
          </View>

          {sellerItemsAll.length === 0 ? (
            <Text style={[styles.p, { opacity: 0.6 }]}>No listings yet.</Text>
          ) : (
            <FlatList
              data={sellerItemsAll.slice(0, 6)}
              keyExtractor={(it) => it.id}
              renderItem={ListingCard}
              scrollEnabled={false}
              contentContainerStyle={{ gap: 10, paddingTop: 8 }}
            />
          )}
        </View>
      </ScrollView>

      {/* Report Seller Modal */}
      <Modal visible={reportOpen} animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: C?.bg ?? "#f7f9fb" }]} edges={["top", "left", "right"]}>
          <View style={styles.modalInner}>
            <View style={styles.rowSpread}>
              <Text style={styles.modalTitle}>Report Seller</Text>
              <TouchableOpacity onPress={() => setReportOpen(false)} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.p, { opacity: 0.8 }]}>
              Help us understand the issue. Your report is local and anonymous in this demo.
            </Text>

            <View style={{ marginTop: 12, gap: 8 }}>
              {reportChoices.map((r) => {
                const active = !!reportReasons[r];
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.filterChip,
                      active && { backgroundColor: (C?.primary ?? "#034750") + "15", borderColor: C?.primary ?? "#034750" },
                      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
                    ]}
                    onPress={() => setReportReasons((prev) => ({ ...prev, [r]: !prev[r] }))}
                  >
                    <Text style={[styles.filterTxt, active && { color: C?.primary ?? "#034750", fontWeight: "800" }]}>{r}</Text>
                    {active && <Ionicons name="checkmark" size={18} color={C?.primary ?? "#034750"} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Notes (optional)</Text>
            <TextInput
              value={reportNote}
              onChangeText={setReportNote}
              placeholder="Add any details…"
              placeholderTextColor="#999"
              multiline
              style={styles.input}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setReportOpen(false)}>
                <Ionicons name="close-outline" size={18} color={C.text} />
                <Text style={styles.ghostTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitReport}>
                <Ionicons name="flag" size={18} color="#fff" />
                <Text style={styles.primaryTxt}>Submit report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------------------------
   Styles
---------------------------- */
function makeStyles(C) {
  const baseText = { color: C?.text ?? "#111" };
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C?.bg ?? "#f7f9fb" },

    coverWrap: { height: 180, backgroundColor: "#ccc" },
    cover: { flex: 1, justifyContent: "flex-end" },
    // Simulated gradient overlay: darker at bottom, lighter at top
    coverOverlay: {
      ...StyleSheet.absoluteFillObject,
      // Two-layer overlay for a "gradient-ish" feel
      // bottom darker
      backgroundColor: "transparent",
    },
    coverInner: {
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: "rgba(0,0,0,0.25)", // adds subtle readable strip at bottom
    },
    avatar: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: "center", justifyContent: "center",
      backgroundColor: (C?.primary ?? "#034750"),
    },
    bizName: { color: "#fff", fontSize: 18, fontWeight: "800", maxWidth: 220 },
    locationTxt: { color: "#fff", opacity: 0.9, fontWeight: "600" },

    verifyPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      backgroundColor: "#EAF8ED",
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    verifyTxt: { color: "#0B8B2E", fontWeight: "800", fontSize: 12 },

    body: { padding: 16, paddingBottom: 80 },

    rowSpread: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

    ghostBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 12, backgroundColor: (C?.primary ?? "#034750") + "10",
    },
    ghostTxt: { ...baseText, fontWeight: "700" },

    verifyRow: { flexDirection: "row", alignItems: "center", gap: 10 },

    section: { marginTop: 14 },
    sectionTitle: { ...baseText, fontWeight: "800", fontSize: 16, marginBottom: 6 },
    p: { ...baseText, opacity: 0.9 },

    infoPill: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 999, backgroundColor: "#fff",
      borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
    },
    infoTxt: { ...baseText, fontWeight: "700" },

    statsGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    statCard: {
      flex: 1, minWidth: 150,
      backgroundColor: "#fff",
      borderRadius: 14,
      padding: 12,
      borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
    },
    statLabel: { ...baseText, opacity: 0.7, fontWeight: "700" },
    statValue: { ...baseText, fontSize: 18, fontWeight: "900", marginTop: 4 },

    card: {
      backgroundColor: "#fff",
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.06)",
    },
    cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
    cardTitle: { ...baseText, fontWeight: "800", flex: 1 },
    cardMeta: { ...baseText, opacity: 0.7, marginTop: 2 },
    cardPrice: { color: C?.accent ?? "#F4A300", fontWeight: "900" },

    filterChip: {
      borderWidth: 1, borderColor: "rgba(0,0,0,0.1)",
      backgroundColor: "#fff",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    filterTxt: { ...baseText, fontWeight: "700" },

    // Modal
    modal: { flex: 1 },
    modalInner: { padding: 16, gap: 8 },
    modalTitle: { ...baseText, fontSize: 18, fontWeight: "800" },
    input: {
      minHeight: 100,
      borderWidth: 1, borderColor: "rgba(0,0,0,0.1)",
      borderRadius: 12,
      padding: 12,
      backgroundColor: "#fff",
      textAlignVertical: "top",
      color: C?.text ?? "#111",
    },

    primaryBtn: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 16, paddingVertical: 12,
      borderRadius: 12, backgroundColor: C?.primary ?? "#034750",
    },
    primaryTxt: { color: "#fff", fontWeight: "800" },
  });
}
