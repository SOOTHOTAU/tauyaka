// src/screens/modals/ProfilePreviewScreen.js
import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { usePrefs } from '../../context/PreferencesContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { useData } from '../../context/DataContext.js';
import { useChat } from '../../context/ChatContext.js';
import { goToThread } from '../../navigation/goToThread.js';

import { PostCard } from '../../components/PostCard.js';
import Verified from '../../components/Verified.js';
import { ExpoImage } from '../../utils/device.js';

/* ---------- tiny helpers (no deps) ---------- */
const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// flatten common wrapper shapes: item.post, item.listing, etc.
function unwrap(item) {
  if (!item) return item;
  if (item.post) return item.post;
  if (item.listing) return item.listing;
  return item;
}

// pull best-effort author id + name across shapes (✅ now includes `author`)
function extractAuthorFields(p) {
  const authorObj = p.author || p.user || p.owner || p.seller || {};
  return {
    id:
      p.authorId ??
      p.userId ??
      p.ownerId ??
      p.sellerId ??
      authorObj.id ??
      p.byId ??
      null,
    name:
      // HomeScreen posts often use a plain string: p.author
      (typeof p.author === 'string' ? p.author : null) ??
      p.authorName ??
      p.userName ??
      p.ownerName ??
      p.sellerName ??
      authorObj.name ??
      p.by ??
      null,
  };
}

// build a single array with everything we might call "posts"
function collectAllPosts(useDataObj, routePosts) {
  const {
    posts,
    feed,
    homeFeed,
    groupPosts,
    groupsFeed,
    listings,
    marketplace,
    marketListings,
    sponsored,
  } = useDataObj || {};

  const arrs = [
    routePosts,        // highest-fidelity (if the feed passes items directly)
    posts,             // ✅ HomeScreen pulls from useData().posts
    feed,
    homeFeed,
    groupPosts,
    groupsFeed,
    listings,
    marketListings,
    marketplace,
    sponsored,
  ].filter(Boolean);

  let all = [];
  for (const a of arrs) {
    if (Array.isArray(a)) all = all.concat(a);
  }
  return all.map(unwrap).filter(Boolean);
}

function filterPostsByUser(idOrName, allPosts) {
  if (!idOrName) return [];
  const targetKey = slug(idOrName);
  const targetNameLC = String(idOrName).toLowerCase().trim();

  return allPosts.filter((raw) => {
    const p = unwrap(raw) || {};
    const { id, name } = extractAuthorFields(p);
    const idMatch = id ? slug(String(id)) === targetKey : false;
    const nameMatch = name ? String(name).toLowerCase().trim() === targetNameLC : false;
    return idMatch || nameMatch;
  });
}

function Hero({ C, styles, displayName, avatarUri, stats, onMessagePress }) {
  const initials = (displayName || '?')
    .split(' ')
    .map(s => s?.[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6 }}>
      <View style={[styles.card, { padding: 16 }]}>
        {/* Identity */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={onMessagePress} accessibilityLabel={`Message ${displayName}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                overflow: 'hidden',
                backgroundColor: C.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {avatarUri && ExpoImage ? (
                <ExpoImage source={{ uri: avatarUri }} style={{ width: 56, height: 56 }} />
              ) : (
                <Text style={{ color: C.subtext, fontWeight: '800', fontSize: 20 }}>{initials}</Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMessagePress}
            accessibilityLabel={`Message ${displayName}`}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.h3} numberOfLines={1}>
              {displayName}
            </Text>
            <Verified />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
          {[
            { label: 'Posts', value: stats.posts },
            { label: 'Groups', value: stats.groups },
            { label: 'Helpful', value: stats.helpful },
          ].map(s => (
            <View key={s.label} style={{ minWidth: 72 }}>
              <Text style={styles.h4}>{s.value}</Text>
              <Text style={{ color: C.subtext }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Message */}
        <TouchableOpacity
          onPress={onMessagePress}
          accessibilityLabel={`Message ${displayName}`}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[
            styles.primaryBtn,
            {
              marginTop: 14,
              height: 44,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            },
          ]}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProfilePreviewScreen() {
  const { C, styles } = usePrefs();
  const navigation = useNavigation();
  const route = useRoute();

  // Params from tap on Home feed card
  const { userId, userName, posts: routePosts } = route.params || {};
  const who = userId || userName;
  const displayName = userName || 'User';

  const { avatars } = useAuth();
  const avatarUri = (userId && avatars?.[userId]) || null;

  const dataCtx = useData() || {};
  const { groupMemberships } = dataCtx;
  const { getUserPosts, openThreadWith } = useChat() || {};

  // Build a broad pool (includes useData().posts used in HomeScreen)
  const allPosts = useMemo(() => collectAllPosts(dataCtx, routePosts), [dataCtx, routePosts]);

  // Prefer useChat().getUserPosts; fallback to combined pool
  const posts = useMemo(() => {
    if (typeof getUserPosts === 'function') {
      const res = getUserPosts(who);
      if (Array.isArray(res) && res.length) return res.map(unwrap);
    }
    return filterPostsByUser(who, allPosts);
  }, [getUserPosts, who, allPosts]);

  // Stats
  const postsCount = posts.length;
  const helpful = posts.reduce((acc, pRaw) => {
    const p = unwrap(pRaw) || {};
    const v = p?.reactions?.helpful ?? p?.likes?.helpful ?? p?.helpfulCount ?? 0;
    return acc + (Number(v) || 0);
  }, 0);

  const targetGroupsCount = useMemo(() => {
    if (!userId) return 0;
    return Object.values(groupMemberships || {}).filter(arr => Array.isArray(arr) && arr.includes(userId)).length;
  }, [groupMemberships, userId]);

  const stats = {
    posts: postsCount || 0,
    groups: targetGroupsCount || 0,
    helpful: helpful || 0,
  };

  // Message (handles sync/async + fallback id), then nudge Inbox to top
  const onMessagePress = async () => {
    const nameForId = who || 'User';
    const maybe = typeof openThreadWith === 'function' ? openThreadWith(nameForId) : null;
    const threadId = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
    const fallbackId = `u-${slug(nameForId) || 'user'}`;
    const id = threadId || fallbackId;

    if (id) {
      goToThread(navigation, id, { fromProfile: true });
      setTimeout(() => {
        navigation.navigate('Main', {
          screen: 'Messages',
          params: { screen: 'Inbox', params: { refresh: Date.now() } },
        });
      }, 0);
    }
  };

  const renderPost = ({ item }) => (
    <PostCard
      item={unwrap(item)}
      translated={{}}
      playingPostId={null}
      onToggleTranslate={() => {}}
      onSpeak={() => {}}
      onStopSpeak={() => {}}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header (consistent with Groups) */}
      <View
        style={[
          styles.headerRow,
          { paddingHorizontal: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 46, alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.sectionTitle, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={{ width: 46, alignItems: 'center' }} />
      </View>

      {/* Posts with Hero header */}
      <FlatList
        data={posts}
        keyExtractor={(it, i) => String(unwrap(it)?.id ?? unwrap(it)?.key ?? `${displayName}-${i}`)}
        renderItem={renderPost}
        ListHeaderComponent={
          <Hero
            C={C}
            styles={styles}
            displayName={displayName}
            avatarUri={avatarUri}
            stats={stats}
            onMessagePress={onMessagePress}
          />
        }
        contentContainerStyle={{ paddingBottom: 24, gap: 10 }}
        ListEmptyComponent={
          <View style={[styles.card, { marginHorizontal: 12, alignItems: 'center', padding: 16 }]}>
            <Text style={{ color: C.subtext }}>{`No posts from ${displayName} yet.`}</Text>
          </View>
        }
        initialNumToRender={8}
        windowSize={10}
        maxToRenderPerBatch={8}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </SafeAreaView>
  );
}
