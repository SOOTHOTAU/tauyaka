// src/screens/ArchiveScreen.js
import React, { useMemo } from 'react';
import { View, Text, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePrefs } from '../context/PreferencesContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useData } from '../context/DataContext.js';
import { PostCard } from '../components/PostCard.js';

// --- tiny helpers (no deps) ---
const MS = 1000;
const DAY = 24 * 60 * 60 * MS;

const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function unwrap(item) {
  if (!item) return item;
  if (item.post) return item.post;
  if (item.listing) return item.listing;
  return item;
}

function extractAuthor(p) {
  const obj = p.author || p.user || p.owner || p.seller || {};
  const name =
    (typeof p.author === 'string' ? p.author : null) ??
    p.authorName ??
    p.userName ??
    p.ownerName ??
    p.sellerName ??
    obj.name ??
    p.by ??
    null;
  const id =
    p.authorId ??
    p.userId ??
    p.ownerId ??
    p.sellerId ??
    obj.id ??
    p.byId ??
    null;
  return { id, name };
}

// Choose the best expiry for a post:
// 1) explicit expiresAt (ms)
// 2) timestamp + durationDays
// 3) fallback to 7 days after timestamp
function getExpiresAt(p) {
  const ts = Number(p?.timestamp || 0);
  if (p?.expiresAt) return Number(p.expiresAt);
  if (p?.durationDays && ts) return ts + Number(p.durationDays) * DAY;
  // default: 7 days window
  return ts ? ts + 7 * DAY : 0;
}

export default function ArchiveScreen() {
  const { C, styles, t } = usePrefs();
  const { activeIdentity } = useAuth() || {};
  const { posts: allPosts = [] } = useData() || {};

  // identify current user
  const myId = activeIdentity?.id ?? activeIdentity?.userId ?? null;
  const myName = activeIdentity?.displayName || activeIdentity?.name || null;
  const mySlug = myId ? slug(myId) : null;
  const myNameLC = myName ? String(myName).toLowerCase().trim() : null;

  const mine = useMemo(() => {
    const base = Array.isArray(allPosts) ? allPosts : [];
    return base.filter((raw) => {
      const p = unwrap(raw) || {};
      const { id, name } = extractAuthor(p);
      const idMatch = mySlug && id ? slug(String(id)) === mySlug : false;
      const nameMatch =
        myNameLC && name ? String(name).toLowerCase().trim() === myNameLC : false;
      return idMatch || nameMatch;
    });
  }, [allPosts, mySlug, myNameLC]);

  const archived = useMemo(() => {
    const now = Date.now();
    return mine
      .map(unwrap)
      .filter(Boolean)
      .filter((p) => {
        const exp = getExpiresAt(p);
        return exp > 0 && now > exp; // only include if we know it expired
      })
      .sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0));
  }, [mine]);

  const renderItem = ({ item }) => (
    <View style={{ opacity: 0.9 }}>
      {/* Optional: small “Expired” stripe above each card */}
      <View style={{ alignSelf: 'flex-start', marginLeft: 12, marginBottom: 4, backgroundColor: C.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
        <Text style={{ color: C.subtext, fontSize: 11 }}>
          {t?.expired ?? 'Expired'}
        </Text>
      </View>
      <PostCard
        item={item}
        translated={{}}
        playingPostId={null}
        onToggleTranslate={() => {}}
        onSpeak={() => {}}
        onStopSpeak={() => {}}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.headerRow, { paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle]}>{t?.myArchive ?? 'My Archive'}</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Tip */}
      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        <View style={[styles.card, { padding: 12 }]}>
          <Text style={{ color: C.subtext, fontSize: 13 }}>
            {t?.archiveInfo ??
              'Posts move here after their active period ends (default 7 days). You can re-post from the original editor if needed.'}
          </Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={archived}
        keyExtractor={(it, i) => String(unwrap(it)?.id ?? i)}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: C.subtext }}>
              {t?.noArchived ?? 'You have no archived posts yet.'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 90, paddingTop: 8, rowGap: 10 }}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={8}
        windowSize={10}
      />
    </SafeAreaView>
  );
}
