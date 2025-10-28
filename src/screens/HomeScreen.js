// src/screens/HomeScreen.js
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";

// Contexts
import { usePrefs } from "../context/PreferencesContext.js";
import { useAuth } from "../context/AuthContext.js";
import { useData } from "../context/DataContext.js";

// Utils & Components
import { Speech } from "../utils/device.js";
import Header from "../components/Header.js";
import { PostCard } from "../components/PostCard.js";
import AlertCarousel from "../components/AlertCarousel.js";

// Sponsored injection
import { pickSponsored, injectSponsoredIntoFeed } from "../utils/injectSponsored.js";
import SponsoredListingCard from "../components/SponsoredListingCard.js";

// NEW: unified promo helpers
import { isActiveSponsor } from "../utils/promoHelpers.js";

const Segments = memo(({ activeTab, setActiveTab, counts, trendingCount, t, styles }) => {
  const tabs = [
    { key: "all",           label: t.tabAll(counts.all) },
    { key: "alerts",        label: `Alerts (${counts.alert})` },
    { key: "events",        label: t.tabEvents(counts.event) },
    { key: "opportunities", label: t.tabOpps(counts.opportunity) },
    // { key: "market",      label: t.tabMarket(counts.market) },
    { key: "lostfound",     label: t.tabLostFound(counts.lostfound) },
    { key: "community",     label: t.tabCommunity(counts.community) },
    { key: "trending",      label: t.tabTrending(trendingCount) },
  ];
  return (
    <View style={styles.segmentsWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.segments, { paddingHorizontal: 4 }]}>
        {tabs.map((seg) => {
          const active = activeTab === seg.key;
          return (
            <TouchableOpacity
              key={seg.key}
              onPress={() => setActiveTab(seg.key)}
              style={[styles.segmentPill, active && styles.segmentPillActive]}
              accessibilityRole="button"
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {seg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

export default function HomeScreen({ navigation }) {
  const { C, styles, t, prefTtsRate } = usePrefs();
  const { comments, homeDismissedAlerts = {}, posts = [], setHomeDismissedAlerts, marketplace } = useData();
  const { activeIdentity } = useAuth();

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [translated, setTranslated] = useState({});
  const [playingPostId, setPlayingPostId] = useState(null);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(search), 180);
    return () => clearTimeout(h);
  }, [search]);
  const searchQ = useMemo(() => (debouncedSearch || "").trim().toLowerCase(), [debouncedSearch]);

  useEffect(() => {
    const unsub = navigation.addListener("blur", () => {
      try { Speech.stop(); } catch {}
      setPlayingPostId(null);
    });
    return unsub;
  }, [navigation]);

  const speakPost = useCallback(
    (item) => {
      try {
        Speech.stop();
        Speech.speak(`${item.title}. ${item.message}`, { rate: prefTtsRate || 1.0 });
        setPlayingPostId(item.id);
      } catch {}
    },
    [prefTtsRate]
  );
  const stopPostSpeech = useCallback(() => {
    try { Speech.stop(); } catch {}
    setPlayingPostId(null);
  }, []);

  const hotScore = useCallback(
    (p) => {
      const hours = Math.max(1, (Date.now() - (p.timestamp || 0)) / (1000 * 60 * 60));
      const commentsCount = (comments[p.id] || []).length;
      const helpful = p.reactions?.helpful || 0;
      return (commentsCount * 2 + helpful * 3 + 1) / Math.pow(hours, 0.35);
    },
    [comments]
  );

  const alertsAll = useMemo(
    () => posts.filter((p) => p.category === "alert").slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
    [posts]
  );

  const trendingList = useMemo(() => {
    return posts
      .filter((p) => p.category !== "alert" && p.category !== "ad")
      .map((p) => ({ ...p, _score: hotScore(p) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 5);
  }, [posts, hotScore]);

  const counts = useMemo(() => {
    return posts.reduce(
      (acc, p) => {
        acc.all = (acc.all || 0) + 1;
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
      },
      { all: 0, alert: 0, opportunity: 0, event: 0, lostfound: 0, community: 0 }
    );
  }, [posts]);

  const prePaginated = useMemo(() => {
    let list = posts;
    if (activeTab === "trending") {
      list = trendingList;
    } else if (activeTab !== "all") {
      const map = { alerts: "alert", opportunities: "opportunity", events: "event", community: "community", lostfound: "lostfound" };
      const desired = map[activeTab];
      if (desired) list = posts.filter((p) => p.category === desired);
    }
    if (activeTab !== "alerts") list = list.filter((p) => !(p.category === "alert" && homeDismissedAlerts[p.id]));
    if (activeTab !== "trending") list = list.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // sort a copy
    if (searchQ) {
      list = list.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(searchQ) ||
          (p.message || "").toLowerCase().includes(searchQ) ||
          (p.author || "").toLowerCase().includes(searchQ)
      );
    }
    return list;
  }, [posts, searchQ, activeTab, trendingList, homeDismissedAlerts]);

  const PAGE = 15;
  const [pageCount, setPageCount] = useState(1);
  const visiblePosts = useMemo(
    () => prePaginated.slice(0, PAGE * pageCount),
    [prePaginated, pageCount]
  );

  // Sponsored injection (filter to ACTIVE sponsors here to unify logic)
  const [seenSponsored] = useState(new Set());
  const sponsoredCandidates = useMemo(() => {
    const items = (marketplace?.items || []).filter((it) => isActiveSponsor(it));
    return pickSponsored(items, { seenIds: seenSponsored, max: 3 });
  }, [marketplace?.items, seenSponsored]);

  const visibleWithSponsored = useMemo(() => {
    if (activeTab !== "all" || searchQ) return visiblePosts;
    return injectSponsoredIntoFeed(visiblePosts, sponsoredCandidates, { slots: [2, 9, 16] });
  }, [activeTab, searchQ, visiblePosts, sponsoredCandidates]);

  const listRef = useRef(null);
  useEffect(() => {
    setPageCount(1);
    if (listRef.current) listRef.current.scrollToOffset({ offset: 0, animated: false });
  }, [activeTab, searchQ]);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  };

  const renderPostCard = useCallback(
    ({ item }) => (
      <PostCard
        item={item}
        translated={translated}
        playingPostId={playingPostId}
        onToggleTranslate={(id) => setTranslated((p) => ({ ...(p || {}), [id]: !p?.[id] }))}
        onSpeak={speakPost}
        onStopSpeak={stopPostSpeech}
      />
    ),
    [translated, playingPostId, speakPost, stopPostSpeech]
  );

  const renderItem = useCallback(
    ({ item, index }) => {
      if (item && item.__type === "sponsored") {
        return <SponsoredListingCard listing={item.listing} />;
      }
      return renderPostCard({ item, index });
    },
    [renderPostCard]
  );

  const handleDismissAlert = useCallback(
    (alertId) => {
      setHomeDismissedAlerts((prev) => ({ ...(prev || {}), [alertId]: true })); // guard prev
    },
    [setHomeDismissedAlerts]
  );

  const showPinnedCarousel = activeTab !== "alerts" && alertsAll.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Header search={search} onSearchChange={setSearch} />

      <Segments
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={counts}
        trendingCount={trendingList.length}
        t={t}
        styles={styles}
      />

      <FlatList
        ref={listRef}
        data={visibleWithSponsored}
        keyExtractor={(item, idx) =>
          item && item.__type === "sponsored"
            ? `s_${item?.listing?.id ?? idx}_${idx}`
            : String(item?.id ?? idx) // robust key
        }
        renderItem={renderItem}
        ListHeaderComponent={
          showPinnedCarousel ? (
            <View style={{ paddingBottom: 8 }}>
              <AlertCarousel
                alerts={alertsAll}
                dismissedMap={homeDismissedAlerts}
                onDismiss={handleDismissAlert}
                pagingEnabled
                horizontal
              />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
        onEndReached={() => {
          if (visiblePosts.length < prePaginated.length) setPageCount((p) => p + 1);
        }}
        onEndReachedThreshold={0.8}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ color: C.subtext }}>{t.noPosts}</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 90 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreatePost", { editPost: null })}
        accessibilityLabel="Create new post"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
