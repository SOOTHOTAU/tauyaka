// src/screens/MarketplaceScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
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
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

// Contexts
import { usePrefs } from "../context/PreferencesContext.js";
import { useAuth } from "../context/AuthContext.js";
import { useData } from "../context/DataContext.js";

// Promo helpers (source of truth)
import {
  isActiveBoost,
  isActiveSponsor,
  remainingLabel,
  extendOrClear,
  cleanupPromotions,
} from "../utils/promoHelpers.js";

// Demo payments
import {
  normalizeSANumber,
  runDemoPaymentFlow,
  confirmPayment,
  cancelPayment,
} from "../payments/demoPayments.js";

// Image UX
import FadeImage from "../components/FadeImage.js";

/* =========================
   Business availability
   ========================= */
const BUSINESS_STATUS = ["Available", "Fully Booked", "Not Available"];
function statusColor(C, s) {
  const map = {
    Available: C?.primary ?? "#034750",
    "Fully Booked": "#F4A300",
    "Not Available": "#999999",
  };
  return map[s] || (C?.primary ?? "#034750");
}

/* =========================
   AsyncStorage (safe fallback)
   ========================= */
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

const PROFILE_KEY = "YAKA_BUSINESS_PROFILE_V1";
const REPORTS_KEY = "YAKA_REPORTS_ITEMS_V1";        // { [itemId]: { [userId]: "YYYY-MM-DD" } }
const OWNER_STATUS_KEY = "YAKA_OWNER_STATUS_MAP_V1"; // { [ownerId]: status }

// Pricing (demo)
const PRICE_PER_DAY = { boost: 10, sponsor: 12 };

export default function MarketplaceScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { C, styles: themeStyles } = usePrefs();
  const { user } = useAuth();
  const { marketplace, setMarketplace } = useMarketplaceBridge();

  const styles = useMemo(() => makeStyles(C, themeStyles), [C, themeStyles]);

  const [tab, setTab] = useState("Browse"); // Browse | My | Purchases
  const [profile, setProfile] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(blankForm());

  const [selectedCat, setSelectedCat] = useState("All");
  const [ownerStatusMap, setOwnerStatusMap] = useState({}); // ownerId -> status

  // Promote modal state
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteFor, setPromoteFor] = useState(null); // listing
  const [placement, setPlacement] = useState("boost"); // "boost" | "sponsor"
  const [days, setDays] = useState(7);                 // 7 | 14 | 30
  const [method, setMethod] = useState("eWallet");     // "eWallet" | "Airtime"
  const [msisdn, setMsisdn] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [otpHint, setOtpHint] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [payStage, setPayStage] = useState("form");    // "form" | "otp"
  const [busy, setBusy] = useState(false);

  // NEW: seller filter passed from Storefront
  const [ownerFilterId, setOwnerFilterId] = useState(null);
  const [ownerFilterName, setOwnerFilterName] = useState("");

  const myId = user?.id ?? "guest";
  const allItems = marketplace.items;

  // ---------- Load business profile + owner status map ----------
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) setProfile(JSON.parse(raw));
      } catch {}
      try {
        const rawMap = (await AsyncStorage.getItem(OWNER_STATUS_KEY)) || "{}";
        const parsed = JSON.parse(rawMap);
        setOwnerStatusMap(parsed && typeof parsed === "object" ? parsed : {});
      } catch {}
    })();
  }, []);

  // ---------- Pick up navigation params (filterOwnerId, ownerName) ----------
  useEffect(() => {
    const p = route?.params || {};
    if (p.filterOwnerId) {
      setTab("Browse"); // ensure we're on Browse
      setSelectedCat("All");
      setOwnerFilterId(p.filterOwnerId);
      setOwnerFilterName(p.ownerName || "");
    }
  }, [route?.params]);

  const clearOwnerFilter = useCallback(() => {
    setOwnerFilterId(null);
    setOwnerFilterName("");
  }, []);

  /* ------- EXPIRY CLEANUP ON OPEN (via helpers) ------- */
  useEffect(() => {
    if (!allItems?.length) return;
    const { items: cleaned, changed } = cleanupPromotions(allItems);
    if (changed) {
      setMarketplace((prev) => ({ ...prev, items: sortForBrowseMarketplace(cleaned) }));
    }
  }, [allItems, setMarketplace]);

  // Categories
  const defaultCats = ["Services","Electronics","Furniture","Baby","Clothing","Vehicles","Tools","Other"];
  const categories = useMemo(() => {
    const set = new Set(defaultCats);
    allItems.forEach((i) => i.category && set.add(capFirst(i.category)));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [allItems]);

  // Featured (boosted in Marketplace) — only visible if viewer has a business profile
  const viewerHasBusiness = !!profile;
  const featured = useMemo(
    () => allItems.filter((it) => isActiveBoost(it)).slice(0, 10),
    [allItems]
  );

  // Browse feed (category + optional owner filter) and soft-hide items with >= 3 reports
  const browseItems = useMemo(() => {
    let base =
      selectedCat === "All"
        ? allItems
        : allItems.filter((i) => capFirst(i.category || "Other") === selectedCat);

    if (ownerFilterId) {
      base = base.filter((i) => i.ownerId === ownerFilterId);
    }

    return sortForBrowseMarketplace(base).filter((i) => (i._reportCount || 0) < 3);
  }, [allItems, selectedCat, ownerFilterId]);

  // My items / purchases
  const myItems = useMemo(
    () => allItems.filter((i) => i.ownerId === myId).filter((i) => (i._reportCount || 0) < 3),
    [allItems, myId]
  );
  const myPurchases = marketplace.purchases;

  const requireProfileThen = (fn) => {
    if (!profile) {
      Alert.alert(
        "Create a business page",
        "Add your seller details before listing items.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Create Page", onPress: () => setProfileOpen(true) },
        ]
      );
      return;
    }
    fn?.();
  };

  // ---------- Storefront helpers (sync profile <-> marketplace.storefronts) ----------
  const upsertStorefront = useCallback((ownerId, nextProfile) => {
    if (!ownerId) return;
    setMarketplace((prev) => {
      const sf = { ...(prev.storefronts || {}) };
      sf[ownerId] = {
        id: ownerId,
        ownerId,
        name: nextProfile?.name || "My Business",
        description: nextProfile?.description || "",
        whatsapp: nextProfile?.whatsapp || "",
        phone: nextProfile?.phone || "",
        location: nextProfile?.location || "",
        status: nextProfile?.status || "Available",
        updatedAt: Date.now(),
        createdAt: sf[ownerId]?.createdAt || Date.now(),
      };
      return { ...prev, storefronts: sf };
    });
  }, [setMarketplace]);

  const removeStorefrontAndListings = useCallback((ownerId) => {
    setMarketplace((prev) => {
      const items = (prev.items || []).filter((i) => i.ownerId !== ownerId);
      const sf = { ...(prev.storefronts || {}) };
      delete sf[ownerId];
      return { ...prev, items, storefronts: sf };
    });
  }, [setMarketplace]);

  // ---------- Profile save / delete ----------
  const editProfileSave = async (next) => {
    const clean = {
      name: (next.name || "").trim() || "My Business",
      description: next.description?.trim() ?? "",
      phone: (next.phone || "").trim(),
      whatsapp: (next.whatsapp || "").trim(),
      location: next.location?.trim() ?? "",
      status: BUSINESS_STATUS.includes(next.status) ? next.status : "Available",
    };
    setProfile(clean);
    persistOwnerStatus(myId, clean.status);
    try { await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(clean)); } catch {}
    upsertStorefront(myId, clean);
    setProfileOpen(false);
    toast("Business page saved");
  };

  const persistOwnerStatus = async (ownerId, status) => {
    setOwnerStatusMap((prev) => {
      const next = { ...prev, [ownerId]: status };
      AsyncStorage.setItem(OWNER_STATUS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const deleteBusinessPage = useCallback(() => {
    Alert.alert(
      "Delete business page?",
      "This will remove your page, availability and ALL your listings. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try { await AsyncStorage.removeItem(PROFILE_KEY); } catch {}
            // Clear local profile state
            setProfile(null);
            // Remove availability status for this owner
            setOwnerStatusMap((prev) => {
              const next = { ...(prev || {}) };
              delete next[myId];
              AsyncStorage.setItem(OWNER_STATUS_KEY, JSON.stringify(next)).catch(() => {});
              return next;
            });
            // Remove storefront + all listings for owner
            removeStorefrontAndListings(myId);
            setProfileOpen(false);
            toast("Business page deleted");
          },
        },
      ]
    );
  }, [myId, removeStorefrontAndListings]);

  const enquire = (item) => {
    const wa = (item?.contact?.whatsapp || "").replace(/[^\d]/g, "");
    const tel = (item?.contact?.phone || "").replace(/[^\d]/g, "");
    if (wa) {
      const msg = encodeURIComponent(`Hi ${item.ownerName}, I'm interested in "${item.title}" listed on Yaka.`);
      Linking.openURL(`https://wa.me/${wa}?text=${msg}`).catch(() => toast("Could not open WhatsApp"));
      return;
    }
    if (tel) {
      Linking.openURL(`tel:${tel}`).catch(() => toast("Could not start call"));
      return;
    }
    Alert.alert("No contact available", "Seller didn't provide WhatsApp or phone. Try commenting on the post instead.");
  };

  /* ------- REPORT ITEM (rate limited 1/day/user) ------- */
  const onReportItem = async (item) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = (await AsyncStorage.getItem(REPORTS_KEY)) || "{}";
      const json = JSON.parse(raw);
      const userKey = myId;
      const perItem = json[item.id] || {};
      const last = perItem[userKey];
      if (last === today) {
        Alert.alert("Already reported", "You can report this item again tomorrow.");
        return;
      }
      setMarketplace((prev) => {
        const items = prev.items.map((it) =>
          it.id === item.id ? { ...it, _reportCount: (it._reportCount || 0) + 1 } : it
        );
        return { ...prev, items };
      });
      json[item.id] = { ...perItem, [userKey]: today };
      await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(json));
      Alert.alert("Report received", "Thanks for helping keep Yaka safe.");
    } catch {
      Alert.alert("Error", "Could not submit report right now.");
    }
  };

  /* ---------- Promote: compute amount ---------- */
  const amountZAR = useMemo(() => {
    const rate = placement === "boost" ? PRICE_PER_DAY.boost : PRICE_PER_DAY.sponsor;
    return Math.max(1, Math.round(rate * days)); // simple pricing
  }, [placement, days]);

  /* ---------- Promote: start & confirm ---------- */
  const startPayment = async () => {
    if (!promoteFor) return;
    const v = normalizeSANumber(msisdn);
    if (!v.ok) {
      Alert.alert("Invalid number", v.reason === "empty" ? "Enter a mobile number" : "Please use a valid SA number (0XXXXXXXXX or +27…)");
      return;
    }
    setBusy(true);
    const res = await runDemoPaymentFlow({
      method,
      amount: amountZAR,
      days,
      listingId: promoteFor.id,
      msisdn,
    });
    setBusy(false);
    if (!res.ok) {
      Alert.alert("Payment error", res.error || "Could not start payment");
      return;
    }
    setSessionId(res.sessionId);
    setOtpHint(res.otpHint);
    setPayStage("otp");
  };

  const confirmOtp = async () => {
    if (!sessionId) return;
    setBusy(true);
    const res = await confirmPayment({ sessionId, code: otpCode });
    setBusy(false);
    if (!res.ok) {
      if (res.error === "Timed out") {
        Alert.alert("Timeout", "The code expired. Please start again.");
        resetPromoteModal(true);
      } else {
        Alert.alert("Incorrect code", "Please try again.");
      }
      return;
    }
    const receipt = res.receipt;
    // Persist receipt on listing AND extend the promotion (no double-pay)
    const key = placement === "boost" ? "boostMarketplaceUntil" : "sponsorHomeUntil";
    setMarketplace((prev) => {
      const itemsWithPromo = extendOrClear(prev.items || [], promoteFor.id, key, { action: "extend", days }).slice();
      // Attach receipt
      const items = itemsWithPromo.map((it) => {
        if (it.id !== promoteFor.id) return it;
        const receipts = Array.isArray(it.receipts) ? it.receipts.slice() : [];
        receipts.unshift(receipt);
        return { ...it, receipts };
      });
      return { ...prev, items: sortForBrowseMarketplace(items) };
    });
    Alert.alert("Payment successful", `Ref: ${receipt.ref}\nYour promotion has been applied.`);
    resetPromoteModal();
  };

  const resetPromoteModal = (keepListing = false) => {
    setBusy(false);
    setSessionId(null);
    setOtpHint("");
    setOtpCode("");
    setPayStage("form");
    setMethod("eWallet");
    setDays(7);
    setPlacement("boost");
    setMsisdn("");
    setPromoteOpen(keepListing ? true : false);
    if (!keepListing) setPromoteFor(null);
  };

  /* ---------- Create listing ---------- */
  const submitListing = () => {
    if (!form.title?.trim()) return toast("Please add a title");
    if (!form.price || Number.isNaN(Number(form.price))) return toast("Please enter a valid price");

    const id = `mkt_${Date.now()}`;
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const item = {
      id,
      title: form.title.trim(),
      description: form.description?.trim() ?? "",
      price: Number(form.price),
      category: capFirst(form.category || "Other"),
      condition: form.condition || "New",
      images: form.images.filter(Boolean).slice(0, 3),
      contact: {
        whatsapp: form.whatsapp?.trim() || profile?.whatsapp || "",
        phone: form.phone?.trim() || profile?.phone || "",
      },
      ownerId: myId,
      ownerName: profile?.name || "Seller",
      createdAt: now,
      boostMarketplaceUntil: form.boostMarketplace ? now + WEEK : null,
      sponsorHomeUntil: form.sponsorHome ? now + WEEK : null,
      views: 0,
      reactions: 0,
      _reportCount: 0,
      receipts: [],
    };
    setMarketplace((prev) => ({
      ...prev,
      items: sortForBrowseMarketplace([item, ...prev.items]),
    }));
    setForm(blankForm());
    setFormOpen(false);
    toast("Listing created");
  };

  /* ---------- Renderers (memoized) ---------- */
  const renderItem = useCallback(({ item }) => {
    const sellerStatus =
      item.ownerId === myId ? (profile?.status ?? ownerStatusMap[myId]) : ownerStatusMap[item.ownerId];

    const disabled = sellerStatus === "Not Available";
    const waiting = sellerStatus === "Fully Booked";
    const isMine = item.ownerId === myId;
    const boosted = isActiveBoost(item);
    const sponsored = isActiveSponsor(item);

    const img0 = (Array.isArray(item.images) && item.images[0]) ? item.images[0] : "";

    return (
      <View style={styles.card} accessible accessibilityRole="summary">
        {/* Image (fade-in) */}
        <FadeImage
          uri={img0}
          style={{ height: 160, borderRadius: 12, marginBottom: 10 }}
          resizeMode="cover"
        />

        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2} allowFontScaling>
            {item.title}
          </Text>
          <Text style={styles.cardPrice} allowFontScaling>
            R {formatPrice(item.price)}
          </Text>
        </View>

        {/* Badges */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          {viewerHasBusiness && boosted && (
            <View style={styles.badge} accessible accessibilityLabel="Boosted item">
              <Ionicons name="flame" size={12} color="#fff" />
              <Text style={styles.badgeTxt}>Boosted • {remainingLabel(item.boostMarketplaceUntil)}</Text>
            </View>
          )}
          {sponsored && (
            <View style={styles.badge} accessible accessibilityLabel="Sponsored item">
              <Ionicons name="megaphone" size={12} color="#fff" />
              <Text style={styles.badgeTxt}>Sponsored • {remainingLabel(item.sponsorHomeUntil)}</Text>
            </View>
          )}
          {!!sellerStatus && (
            <View
              style={[styles.badgeGhost, { borderColor: statusColor(C, sellerStatus) }]}
              accessible
              accessibilityLabel={`Seller status ${sellerStatus}`}
            >
              <View style={[styles.statusDot, { backgroundColor: statusColor(C, sellerStatus) }]} />
              <Text numberOfLines={1} style={[styles.badgeGhostTxt, { maxWidth: 120 }]}>{sellerStatus}</Text>
            </View>
          )}
          {!!item.category && (
            <View style={styles.badgeGhost} accessible accessibilityLabel={`Category ${item.category}`}>
              <Text numberOfLines={1} style={[styles.badgeGhostTxt, { maxWidth: 120 }]}>{item.category}</Text>
            </View>
          )}
        </View>

        {!!item.description && (
          <Text style={styles.cardDesc} numberOfLines={3} allowFontScaling>
            {item.description}
          </Text>
        )}

        {/* D. Seller → Storefront link */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Storefront", { ownerId: item.ownerId, ownerName: item.ownerName })}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.ownerName}'s Storefront`}
          style={{ marginTop: 8, alignSelf: "flex-start" }}
        >
          <Text style={styles.cardSeller} numberOfLines={1} allowFontScaling>
            by {item.ownerName} · {timeAgo(item.createdAt)} — tap to view Storefront
          </Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.enquireBtn,
              disabled && { opacity: 0.4 },
              waiting && { backgroundColor: (C?.primary ?? "#034750") + "88" },
            ]}
            disabled={disabled}
            onPress={() => (waiting ? toast("Added to waitlist (demo)") : enquire(item))}
            accessibilityRole="button"
            accessibilityLabel={disabled ? "Unavailable" : waiting ? "Join Waitlist" : "Enquire"}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
            <Text style={styles.enquireTxt} allowFontScaling>
              {disabled ? "Unavailable" : waiting ? "Join Waitlist" : "Enquire"}
            </Text>
          </TouchableOpacity>

          {/* Owner actions */}
          {isMine ? (
            <>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() =>
                  setMarketplace((prev) => {
                    const items = extendOrClear(prev.items || [], item.id, "boostMarketplaceUntil", {
                      action: "extend",
                      days: 7,
                    }).slice();
                    return { ...prev, items: sortForBrowseMarketplace(items) };
                  })
                }
                onLongPress={() =>
                  setMarketplace((prev) => {
                    const items = extendOrClear(prev.items || [], item.id, "boostMarketplaceUntil", {
                      action: "clear",
                    }).slice();
                    return { ...prev, items: sortForBrowseMarketplace(items) };
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={isActiveBoost(item) ? "Extend Boost by 7 days (long-press to remove)" : "Boost in Marketplace"}
              >
                <Ionicons name="flame-outline" size={18} color={C.text} />
                <Text style={styles.ghostTxt} allowFontScaling>{isActiveBoost(item) ? `Extend +7d` : "Boost (Market)"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() =>
                  setMarketplace((prev) => {
                    const items = extendOrClear(prev.items || [], item.id, "sponsorHomeUntil", {
                      action: "extend",
                      days: 7,
                    }).slice();
                    return { ...prev, items };
                  })
                }
                onLongPress={() =>
                  setMarketplace((prev) => {
                    const items = extendOrClear(prev.items || [], item.id, "sponsorHomeUntil", {
                      action: "clear",
                    }).slice();
                    return { ...prev, items };
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={isActiveSponsor(item) ? "Extend Sponsor by 7 days (long-press to remove)" : "Sponsor in Home"}
              >
                <Ionicons name="megaphone-outline" size={18} color={C.text} />
                <Text style={styles.ghostTxt} allowFontScaling>{isActiveSponsor(item) ? `Extend +7d` : "Sponsor (Home)"}</Text>
              </TouchableOpacity>

              {/* Promote (payments demo) */}
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => {
                  setPromoteFor(item);
                  setPlacement("boost");
                  setDays(7);
                  setMethod("eWallet");
                  setMsisdn(profile?.whatsapp || "");
                  setPromoteOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Open Promote modal"
              >
                <Ionicons name="cash-outline" size={18} color={C.text} />
                <Text style={styles.ghostTxt} allowFontScaling>Promote…</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => removeItem(item.id, setMarketplace)}
                accessibilityRole="button"
                accessibilityLabel="Delete listing"
              >
                <Ionicons name="trash-outline" size={18} color={C.text} />
                <Text style={styles.ghostTxt} allowFontScaling>Delete</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => onReportItem(item)}
              accessibilityRole="button"
              accessibilityLabel="Report item"
            >
              <Ionicons name="flag-outline" size={18} color={C.text} />
              <Text style={styles.ghostTxt} allowFontScaling>Report</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [C, profile?.status, ownerStatusMap, myId, viewerHasBusiness, setMarketplace, styles, navigation]);

  const keyExtractor = useCallback((it) => it.id, []);
  const getItemLayout = useCallback((_data, index) => {
    // Image (160) + paddings & text (~140) ≈ 300; keep stable to help virtualization
    const ITEM_H = 300;
    return { length: ITEM_H, offset: ITEM_H * index, index };
  }, []);

  /* ---------- Header blocks for FlatList ---------- */
  const FilterBanner = useCallback(() => {
    if (!ownerFilterId) return null;
    return (
      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 10,
          borderRadius: 12,
          backgroundColor: (C?.primary ?? "#034750") + "12",
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.06)"
        }}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={`Filtering by seller ${ownerFilterName || ""}`}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Ionicons name="person-circle-outline" size={18} color={C.text} />
            <Text style={{ color: C.text, fontWeight: "700" }} numberOfLines={1} allowFontScaling>
              Filtering by seller{ownerFilterName ? `: ${ownerFilterName}` : ""}
            </Text>
          </View>
          <TouchableOpacity onPress={clearOwnerFilter} style={styles.headerPill} accessibilityRole="button" accessibilityLabel="Clear seller filter">
            <Ionicons name="close" size={16} color={C.text} />
            <Text style={styles.headerPillTxt} allowFontScaling>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [ownerFilterId, ownerFilterName, C?.primary, C?.text, clearOwnerFilter, styles.headerPill, styles.headerPillTxt]);

  const ChipsAndFeatured = useCallback(() => {
    return (
      <View>
        <FilterBanner />

        {/* Category chips — A11y state + wrap */}
        <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {categories.map((cat) => {
              const active = selectedCat === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    active && {
                      backgroundColor: (C?.primary ?? "#034750") + "15",
                      borderColor: C?.primary ?? "#034750",
                    },
                  ]}
                  onPress={() => setSelectedCat(cat)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Filter by ${cat}`}
                >
                  <Text
                    style={[
                      styles.catChipTxt,
                      active && { color: C?.primary ?? "#034750", fontWeight: "800" },
                    ]}
                    allowFontScaling
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Featured strip — hidden for viewers without a business profile */}
        {viewerHasBusiness && !!featured.length && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ paddingHorizontal: 12, paddingTop: 8 }}
            contentContainerStyle={{ gap: 10 }}
          >
            {featured.map((item) => (
              <View key={item.id} style={[styles.card, { width: 240 }]} accessible accessibilityRole="summary" accessibilityLabel="Featured boosted listing">
                <Text style={[styles.cardTitle, { marginTop: 2 }]} numberOfLines={1} allowFontScaling>
                  {item.title}
                </Text>
                <Text style={styles.cardPrice} allowFontScaling>R {formatPrice(item.price)}</Text>
                {!!item.description && (
                  <Text style={styles.cardDesc} numberOfLines={2} allowFontScaling>
                    {item.description}
                  </Text>
                )}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <View style={styles.badge}>
                    <Ionicons name="flame" size={12} color="#fff" />
                    <Text style={styles.badgeTxt} allowFontScaling>
                      Boosted • {remainingLabel(item.boostMarketplaceUntil)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }, [FilterBanner, categories, selectedCat, C?.primary, viewerHasBusiness, featured, styles]);

  /* ---------- UI ---------- */
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header} accessible accessibilityRole="header" accessibilityLabel="Marketplace header">
        {/* Title + status pill + tiny '+' all in one row */}
        <View style={styles.headerTop}>
          <Text style={styles.title} allowFontScaling>Marketplace</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Only show availability toggle if user has business profile */}
            {profile && (
              <TouchableOpacity
                style={styles.headerPill}
                onPress={() => {
                  const order = BUSINESS_STATUS;
                  const current = profile?.status ?? ownerStatusMap[user?.id ?? "guest"] ?? "Available";
                  const next = order[(order.indexOf(current) + 1) % order.length];
                  const merged = { ...(profile ?? {}), status: next };
                  setProfile(merged);
                  persistOwnerStatus(user?.id ?? "guest", next);
                  AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(merged)).catch(() => {});
                  upsertStorefront(myId, merged);
                }}
                accessibilityRole="button"
                accessibilityLabel="Quick toggle availability"
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: statusColor(C, profile?.status ?? ownerStatusMap[user?.id ?? "guest"] ?? "Available") },
                  ]}
                />
                <Text style={styles.headerPillTxt} allowFontScaling>{profile?.status ?? ownerStatusMap[user?.id ?? "guest"] ?? "Available"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Header action pills */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerPill}
            onPress={() => setProfileOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={profile ? "Open business page" : "Create business page"}
          >
            <Ionicons name="business-outline" size={16} color={C.text} />
            <Text style={styles.headerPillTxt} allowFontScaling>
              {profile?.name ? truncate(profile.name, 16) : "Create Business"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryPill}
            onPress={() => requireProfileThen(() => setFormOpen(true))}
            accessibilityRole="button"
            accessibilityLabel="Create listing"
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.primaryPillTxt} allowFontScaling>Create Listing</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs} accessibilityRole="tablist">
        {["Browse", "My", "Purchases"].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            accessibilityLabel={t}
          >
            <Text style={[styles.tabTxt, tab === t && styles.tabTxtActive]} allowFontScaling>
              {t === "My" ? "My Items" : t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lists */}
      {tab === "Browse" && (
        <FlatList
          data={browseItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          ListHeaderComponent={<ChipsAndFeatured />}
          initialNumToRender={8}
          windowSize={11}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Empty label={ownerFilterId ? "No listings for this seller." : "No listings yet. Be the first!"} />}
        />
      )}

      {tab === "My" && (
        <FlatList
          data={myItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={8}
          windowSize={11}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ padding: 24, alignItems: "center", gap: 12 }}>
              <Text style={{ opacity: 0.6 }} allowFontScaling>You haven't posted anything yet.</Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => requireProfileThen(() => setFormOpen(true))}
                accessibilityRole="button"
                accessibilityLabel="Create your first listing"
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.primaryTxt} allowFontScaling>Create your first listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {tab === "Purchases" && (
        <FlatList
          data={myPurchases}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <View style={styles.card} accessible accessibilityRole="summary" accessibilityLabel="purchase item">
              <Text style={styles.cardTitle} allowFontScaling>{item.title}</Text>
              <Text style={styles.cardPrice} allowFontScaling>R {formatPrice(item.price)}</Text>
              <Text style={styles.cardSeller} allowFontScaling>
                from {item.sellerName} · {timeAgo(item.createdAt)}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Empty label="No purchases yet." />}
        />
      )}

      {/* FAB: Logged-in users without business can tap + to create page */}
      {user?.id && !profile && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: C?.primary ?? "#034750" }]}
          onPress={() => setProfileOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Create business page"
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Profile Modal */}
      <Modal visible={profileOpen} animationType="slide" onRequestClose={() => setProfileOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={80}
        >
          <ScrollView contentContainerStyle={styles.modalInner}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.modalTitle} allowFontScaling>{profile ? "Business Page" : "Create Business Page"}</Text>
              {/* Only show delete button when editing existing profile */}
              {profile && (
                <TouchableOpacity onPress={deleteBusinessPage} accessibilityRole="button" accessibilityLabel="Delete business page">
                  <Ionicons name="trash-outline" size={22} color={C.error || "#B00020"} />
                </TouchableOpacity>
              )}
            </View>
            <Field label="Business / Seller Name" value={profile?.name ?? ""} onChangeText={(v) => setProfile({ ...(profile ?? {}), name: v })} placeholder="e.g., Thandi's Thrift" />
            <Field label="About" value={profile?.description ?? ""} onChangeText={(v) => setProfile({ ...(profile ?? {}), description: v })} placeholder="Short description" multiline />
            <Field label="WhatsApp Number" value={profile?.whatsapp ?? ""} onChangeText={(v) => setProfile({ ...(profile ?? {}), whatsapp: v })} placeholder="e.g., 0731234567" keyboardType="phone-pad" />
            <Field label="Phone Number" value={profile?.phone ?? ""} onChangeText={(v) => setProfile({ ...(profile ?? {}), phone: v })} placeholder="e.g., 0111234567" keyboardType="phone-pad" />
            <Field label="Location" value={profile?.location ?? ""} onChangeText={(v) => setProfile({ ...(profile ?? {}), location: v })} placeholder="e.g., Bothaville" />

            {/* Availability - Only show for existing business pages */}
            {profile && (
              <>
                <Text style={[styles.subtle, { marginTop: 8 }]} allowFontScaling>Availability</Text>
                <TouchableOpacity
                  style={styles.headerPill}
                  onPress={() => {
                    const order = BUSINESS_STATUS;
                    const current = profile?.status ?? "Available";
                    const next = order[(order.indexOf(current) + 1) % order.length];
                    setProfile({ ...(profile ?? {}), status: next });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle availability status"
                >
                  <View style={[styles.statusDot, { backgroundColor: statusColor(C, profile?.status ?? "Available") }]} />
                  <Text style={styles.headerPillTxt} allowFontScaling>{profile?.status ?? "Available"}</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.row}>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setProfileOpen(false)} accessibilityRole="button" accessibilityLabel="Cancel editing page">
                <Ionicons name="close-outline" size={18} color={C.text} />
                <Text style={styles.ghostTxt} allowFontScaling>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => editProfileSave(profile ?? {})} accessibilityRole="button" accessibilityLabel="Save business page">
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.primaryTxt} allowFontScaling>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Only show delete button when editing existing profile */}
            {profile && (
              <TouchableOpacity
                style={[styles.ghostBtn, { marginTop: 8, alignSelf: "flex-start", borderColor: C.error || "#B00020" }]}
                onPress={deleteBusinessPage}
                accessibilityRole="button"
                accessibilityLabel="Delete business page"
              >
                <Ionicons name="trash-outline" size={18} color={C.error || "#B00020"} />
                <Text style={[styles.ghostTxt, { color: C.error || "#B00020", fontWeight: "800" }]} allowFontScaling>Delete Page</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Listing Modal */}
      <Modal visible={formOpen} animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={80}
        >
          <ScrollView contentContainerStyle={styles.modalInner} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle} allowFontScaling>Create Listing</Text>
            <Field label="Title" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="e.g., 2nd-hand stroller" />
            <Field label="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Details, condition, etc." multiline />
            <Field label="Price (ZAR)" value={String(form.price ?? "")} onChangeText={(v) => setForm({ ...form, price: v.replace(/[^0-9.]/g, "") })} placeholder="e.g., 350" keyboardType="decimal-pad" />
            <Field label="Category" value={form.category} onChangeText={(v) => setForm({ ...form, category: v })} placeholder="e.g., Furniture" />
            <Field label="Condition" value={form.condition} onChangeText={(v) => setForm({ ...form, condition: v })} placeholder="New / Used" />

            <Text style={styles.subtle} allowFontScaling>Add up to 3 image URLs</Text>
            {[0, 1, 2].map((idx) => (
              <Field
                key={idx}
                label={`Image URL ${idx + 1}`}
                value={form.images[idx] ?? ""}
                onChangeText={(v) => {
                  const next = [...form.images];
                  next[idx] = v;
                  setForm({ ...form, images: next });
                }}
                placeholder="https://..."
                autoCapitalize="none"
              />
            ))}

            <Text style={[styles.subtle, { marginTop: 8 }]} allowFontScaling>Contact overrides</Text>
            <Field label="WhatsApp" value={form.whatsapp} onChangeText={(v) => setForm({ ...form, whatsapp: v })} placeholder="e.g., 0731234567" keyboardType="phone-pad" />
            <Field label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} placeholder="e.g., 0111234567" keyboardType="phone-pad" />

            {/* Placement toggles */}
            <View style={styles.boostRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: C.text }} allowFontScaling>Boost in Marketplace</Text>
                <Text style={styles.subtle} allowFontScaling>Pin to Featured and rank higher in Marketplace for 7 days</Text>
              </View>
              <Switch
                value={!!form.boostMarketplace}
                onValueChange={(v) => setForm({ ...form, boostMarketplace: v })}
                thumbColor={"#fff"}
                trackColor={{ false: (C?.primary ?? "#034750") + "33", true: C?.accent ?? "#F4A300" }}
                accessibilityRole="switch"
                accessibilityLabel="Toggle Boost in Marketplace"
                accessibilityState={{ checked: !!form.boostMarketplace }}
              />
            </View>

            <View style={styles.boostRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: C.text }} allowFontScaling>Sponsored in Home</Text>
                <Text style={styles.subtle} allowFontScaling>Show in the Home "All" feed for 7 days</Text>
              </View>
              <Switch
                value={!!form.sponsorHome}
                onValueChange={(v) => setForm({ ...form, sponsorHome: v })}
                thumbColor={"#fff"}
                trackColor={{ false: (C?.primary ?? "#034750") + "33", true: C?.accent ?? "#F4A300" }}
                accessibilityRole="switch"
                accessibilityLabel="Toggle Sponsored in Home"
                accessibilityState={{ checked: !!form.sponsorHome }}
              />
            </View>

            <View style={styles.row}>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => { setFormOpen(false); setForm(blankForm()); }} accessibilityRole="button" accessibilityLabel="Cancel creating listing">
                <Ionicons name="close-outline" size={18} color={C.text} />
                <Text style={styles.ghostTxt} allowFontScaling>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitListing} accessibilityRole="button" accessibilityLabel="Post listing">
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.primaryTxt} allowFontScaling>Post</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Promote Modal (Payments Demo) */}
      <Modal visible={promoteOpen} animationType="slide" onRequestClose={() => { setPromoteOpen(false); cancelPayment(sessionId); resetPromoteModal(); }}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
          <ScrollView contentContainerStyle={styles.modalInner} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.modalTitle} allowFontScaling>Promote Listing</Text>
              <TouchableOpacity onPress={() => { setPromoteOpen(false); cancelPayment(sessionId); resetPromoteModal(); }} accessibilityRole="button" accessibilityLabel="Close promote modal">
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>
            {promoteFor && (
              <Text style={{ marginBottom: 6, color: C.text, opacity: 0.6 }} allowFontScaling>
                {promoteFor.title} — R {formatPrice(promoteFor.price)}
              </Text>
            )}

            {/* Stage: form */}
            {payStage === "form" && (
              <>
                <Text style={[styles.subtle, { marginTop: 6 }]} allowFontScaling>Placement</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                  {[
                    { key: "boost", label: "Boost (Marketplace)" },
                    { key: "sponsor", label: "Sponsor (Home)" },
                  ].map((p) => {
                    const active = placement === p.key;
                    return (
                      <TouchableOpacity
                        key={p.key}
                        style={[
                          styles.statusChip,
                          active && { backgroundColor: (C?.primary ?? "#034750") + "15", borderColor: C?.primary ?? "#034750" },
                        ]}
                        onPress={() => setPlacement(p.key)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`Select ${p.label}`}
                      >
                        <Text style={{ color: C.text, fontWeight: "700" }} allowFontScaling>{p.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.subtle, { marginTop: 12 }]} allowFontScaling>Duration</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                  {[7, 14, 30].map((d) => {
                    const active = days === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.statusChip,
                          active && { backgroundColor: (C?.primary ?? "#034750") + "15", borderColor: C?.primary ?? "#034750" },
                        ]}
                        onPress={() => setDays(d)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`Select ${d} days`}
                      >
                        <Text style={{ color: C.text, fontWeight: "700" }} allowFontScaling>{d} days</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.subtle, { marginTop: 12 }]} allowFontScaling>Payment method</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                  {["eWallet", "Airtime"].map((m) => {
                    const active = method === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.statusChip,
                          active && { backgroundColor: (C?.primary ?? "#034750") + "15", borderColor: C?.primary ?? "#034750" },
                        ]}
                        onPress={() => setMethod(m)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`Select ${m}`}
                      >
                        <Ionicons name={m === "eWallet" ? "wallet-outline" : "phone-portrait-outline"} size={16} color={C.text} />
                        <Text style={{ color: C.text, fontWeight: "700" }} allowFontScaling>{m}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Field
                  label="Mobile number (SA)"
                  value={msisdn}
                  onChangeText={setMsisdn}
                  placeholder="0XXXXXXXXX or +27XXXXXXXXX"
                  keyboardType="phone-pad"
                />

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                  <Text style={{ color: C.text, fontWeight: "800" }} allowFontScaling>Total</Text>
                  <Text style={{ color: C.text, fontWeight: "800" }} allowFontScaling>R {formatPrice(amountZAR)}</Text>
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  <TouchableOpacity style={styles.ghostBtn} onPress={() => { setPromoteOpen(false); resetPromoteModal(); }} accessibilityRole="button" accessibilityLabel="Cancel payment">
                    <Ionicons name="close-outline" size={18} color={C.text} />
                    <Text style={styles.ghostTxt} allowFontScaling>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={busy} style={[styles.primaryBtn, busy && { opacity: 0.5 }]} onPress={startPayment} accessibilityRole="button" accessibilityLabel="Pay and get OTP">
                    <Ionicons name="lock-closed-outline" size={18} color="#fff" />
                    <Text style={styles.primaryTxt} allowFontScaling>{busy ? "Starting…" : "Pay & Get OTP"}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Stage: OTP */}
            {payStage === "otp" && (
              <>
                <Text style={[styles.subtle, { marginTop: 6 }]} allowFontScaling>
                  Enter the 6-digit code we "sent" to your number.
                </Text>
                <Text style={{ marginTop: 4, color: C.text, opacity: 0.6 }} allowFontScaling>
                  Demo code: <Text style={{ fontWeight: "800" }}>{otpHint}</Text>
                </Text>

                <Field
                  label="One-Time Password"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="123456"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />

                <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                  <TouchableOpacity
                    style={styles.ghostBtn}
                    onPress={() => { cancelPayment(sessionId); resetPromoteModal(); setPromoteOpen(false); }}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel confirmation"
                  >
                    <Ionicons name="close-outline" size={18} color={C.text} />
                    <Text style={styles.ghostTxt} allowFontScaling>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={busy} style={[styles.primaryBtn, busy && { opacity: 0.5 }]} onPress={confirmOtp} accessibilityRole="button" accessibilityLabel="Confirm OTP">
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.primaryTxt} allowFontScaling>{busy ? "Confirming…" : "Confirm"}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Helpers ---------- */

function useMarketplaceBridge() {
  const dataCtx = safeUseData();
  const [local, setLocal] = useState({
    items: sortForBrowseMarketplace(seedItems()),
    purchases: [],
    storefronts: {},
  });
  if (dataCtx?.marketplace && dataCtx?.setMarketplace) {
    const items = sortForBrowseMarketplace(dataCtx.marketplace.items || []);
    return { marketplace: { ...dataCtx.marketplace, items }, setMarketplace: dataCtx.setMarketplace };
  }
  return { marketplace: { ...local, items: sortForBrowseMarketplace(local.items || []) }, setMarketplace: setLocal };
}

function safeUseData() { try { return useData(); } catch { return null; } }

/* ---- Demo seed ---- */
function seedItems() {
  return [
    {
      id: "mkt_1",
      title: "Brick making mould",
      description: "Solid steel mould, barely used.",
      price: 1200,
      category: "Tools",
      condition: "Used",
      images: [],
      contact: { whatsapp: "", phone: "" },
      ownerId: "demo",
      ownerName: "Kagiso",
      createdAt: Date.now() - 1000 * 60 * 60 * 18,
      boostMarketplaceUntil: Date.now() + 3 * 24 * 60 * 60 * 1000, // demo boosted
      sponsorHomeUntil: null,
      views: 33,
      reactions: 5,
      _reportCount: 0,
      receipts: [],
    },
  ];
}

/* ---- Sorting (boosted first, then newest) ---- */
function sortForBrowseMarketplace(items) {
  const now = Date.now();
  return [...items].sort((a, b) => {
    const ab = (a.boostMarketplaceUntil ?? 0) > now;
    const bb = (b.boostMarketplaceUntil ?? 0) > now;
    if (ab !== bb) return ab ? -1 : 1; // boosted-first (Marketplace)
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}

/* ---- CRUD ---- */
function removeItem(id, setMarketplace) {
  setMarketplace((prev) => ({ ...prev, items: (prev.items || []).filter((i) => i.id !== id) }));
}

/* ---- UI atoms ---- */
function Empty({ label }) {
  return (
    <View style={{ padding: 24, alignItems: "center" }} accessible accessibilityRole="summary" accessibilityLabel="Empty state">
      <Text style={{ opacity: 0.6 }} allowFontScaling>{label}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, autoCapitalize }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ marginBottom: 6, opacity: 0.7 }} allowFontScaling>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        keyboardType={keyboardType}
        multiline={!!multiline}
        autoCapitalize={autoCapitalize ?? "sentences"}
        allowFontScaling
        style={{
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.1)",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 8,
          minHeight: multiline ? 80 : undefined,
          backgroundColor: "#fff",
        }}
      />
    </View>
  );
}

/* ---- Misc ---- */
function blankForm() {
  return {
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    images: ["", "", ""],
    whatsapp: "",
    phone: "",
    boostMarketplace: false,
    sponsorHome: false,
  };
}
function capFirst(s) { if (!s) return ""; return s.charAt(0).toUpperCase() + s.slice(1); }
function toast(msg) { Alert.alert("Yaka", msg); }
function truncate(s, n) { return s?.length > n ? s.slice(0, n - 1) + "…" : s; }
function formatPrice(n) { try { return Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 0 }); } catch { return String(n); } }
function timeAgo(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ---- Styles ---- */
function makeStyles(C, themeStyles) {
  const baseText = { color: C?.text ?? "#111" };
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C?.bg ?? "#f7f9fb" },

    header: {
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 8,
      backgroundColor: C?.bg ?? "#f7f9fb",
      borderBottomWidth: 1,
      borderBottomColor: "rgba(0,0,0,0.06)",
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    title: { fontSize: 22, fontWeight: "700", color: C?.text ?? "#111" },

    headerActions: { flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" },
    headerPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.1)",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: "#fff",
    },
    headerPillMini: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.1)",
      backgroundColor: "#fff",
    },
    headerPillTxt: { ...baseText, fontWeight: "600" },
    primaryPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: C?.primary ?? "#034750",
    },
    primaryPillTxt: { color: "#fff", fontWeight: "700" },

    tabs: {
      flexDirection: "row",
      paddingHorizontal: 8,
      paddingVertical: 6,
      gap: 8,
      backgroundColor: C?.bg ?? "#f7f9fb",
      borderBottomWidth: 1,
      borderBottomColor: "rgba(0,0,0,0.06)",
    },
    tabBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "transparent" },
    tabBtnActive: { backgroundColor: (C?.primary ?? "#034750") + "15" },
    tabTxt: { ...baseText, opacity: 0.8, fontWeight: "600" },
    tabTxtActive: { color: C?.primary ?? "#034750", opacity: 1 },

    // Category chips
    catChip: {
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.08)",
      backgroundColor: "#fff",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    catChipTxt: { ...baseText, opacity: 0.8, fontWeight: "700" },

    list: { padding: 12 },
    card: {
      backgroundColor: "#fff",
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.06)",
    },
    cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    cardTitle: { ...baseText, fontWeight: "700", fontSize: 16, flex: 1 },
    cardPrice: { color: C?.accent ?? "#F4A300", fontWeight: "800" },
    cardDesc: { ...baseText, opacity: 0.85, marginTop: 4 },
    cardSeller: { ...baseText, opacity: 0.7, fontSize: 12, textDecorationLine: "underline" },

    // ACTION ROW wraps on small screens
    row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" },

    enquireBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: C?.primary ?? "#034750",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
    },
    enquireTxt: { color: "#fff", fontWeight: "700" },

    ghostBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: (C?.primary ?? "#034750") + "10",
    },
    ghostTxt: { ...baseText, fontWeight: "700" },

    // Badges
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: C?.accent ?? "#F4A300",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },
    badgeGhost: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: "#fff",
    },
    badgeGhostTxt: { color: C?.text ?? "#111", fontWeight: "700", fontSize: 12 },

    // Availability selector
    statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
    statusChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.1)",
      backgroundColor: "#fff",
    },
    statusChipTxt: { color: C?.text ?? "#111", fontWeight: "600" },
    statusDot: { width: 8, height: 8, borderRadius: 99 },

    // Modals
    modal: { flex: 1, backgroundColor: C?.bg ?? "#f7f9fb" },
    modalInner: { padding: 16 },
    modalTitle: { ...baseText, fontSize: 18, fontWeight: "800", marginBottom: 8 },

    // Boost/Sponsor rows
    boostRow: {
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.06)",
      backgroundColor: "#fff",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    // Shared primary buttons
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: C?.primary ?? "#034750",
    },
    primaryTxt: { color: "#fff", fontWeight: "800" },

    // FAB
    fab: {
      position: "absolute",
      right: 16,
      bottom: 20,
      height: 56,
      width: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
    },
    subtle: { color: (C?.text ?? "#111") + "99", fontSize: 12 },
  });
}