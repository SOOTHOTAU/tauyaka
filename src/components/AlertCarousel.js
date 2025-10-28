// src/components/AlertCarousel.js
import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, useWindowDimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePrefs } from '../context/PreferencesContext.js';
import { useData } from '../context/DataContext.js';

const HPAD = 12;

const isAlertCat = (p) => {
  const c = (p?.category || '').toLowerCase();
  return c === 'alert' || c === 'alerts';
};

/**
 * Props:
 * - alerts?: Post[]
 * - dismissedMap?: { [id]: true }
 * - onDismiss?: (id: string) => void
 * - activeTab?: string
 * - horizontal?: boolean (default true)
 * - pagingEnabled?: boolean (default true)
 */
export default function AlertCarousel({
  alerts: alertsProp,
  dismissedMap,
  onDismiss,
  activeTab,
  horizontal = true,
  pagingEnabled = true,
}) {
  const { C, styles } = usePrefs();
  const { posts = [], homeDismissedAlerts = {}, setHomeDismissedAlerts } = useData();

  // Dimensions-aware card width for precise paging
  const { width } = useWindowDimensions();
  const CARD_WIDTH = Math.max(220, width - HPAD * 2); // single full-width card feel
  const ITEM_STRIDE = CARD_WIDTH + HPAD * 2;

  // Source: props (if provided) else DataContext
  const rawAlerts = useMemo(() => {
    const src = Array.isArray(alertsProp) ? alertsProp : posts.filter(isAlertCat);
    return src.slice().sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0));
  }, [alertsProp, posts]);

  const dismissed = dismissedMap || homeDismissedAlerts;

  // On Alerts tab, show all; elsewhere hide dismissed
  const alerts = useMemo(() => {
    if (activeTab === 'alerts') return rawAlerts;
    return rawAlerts.filter((p) => !(dismissed && dismissed[p.id]));
  }, [rawAlerts, dismissed, activeTab]);

  if (!alerts.length) return null;

  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);

  const onMomentumScrollEnd = useCallback(
    (e) => {
      const x = e?.nativeEvent?.contentOffset?.x || 0;
      const idx = Math.max(0, Math.min(alerts.length - 1, Math.round(x / ITEM_STRIDE)));
      if (idx !== activeIndex) setActiveIndex(idx);
    },
    [alerts.length, ITEM_STRIDE, activeIndex]
  );

  const handleDismiss = useCallback(
    (id) => {
      if (activeTab === 'alerts') return; // don’t allow dismiss on Alerts tab
      if (onDismiss) { onDismiss(id); return; }
      if (setHomeDismissedAlerts) {
        setHomeDismissedAlerts((prev) => ({ ...(prev || {}), [id]: true }));
      }
    },
    [activeTab, onDismiss, setHomeDismissedAlerts]
  );

  const keyExtractor = (item, idx) => String(item?.id ?? idx);

  return (
    <View style={{ marginBottom: 8 }}>
      {/* Header row: label + counter */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: HPAD, marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={16} color={C.primary} />
          <Text style={[styles.alertTitle, { fontSize: 13, marginLeft: 6 }]} numberOfLines={1}>Alerts</Text>
        </View>
        {alerts.length > 1 && (
          <View style={{ marginLeft: 'auto', backgroundColor: C.soft || 'rgba(0,0,0,0.06)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: C.subtext, fontSize: 12 }}>{activeIndex + 1}/{alerts.length}</Text>
          </View>
        )}
      </View>

      {/* Carousel (no outer "card" — each item is the card) */}
      <FlatList
        ref={listRef}
        data={alerts}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => (
          <View
            style={[
              styles.alertCard,
              {
                width: CARD_WIDTH,
                marginHorizontal: HPAD,
                // ensure inner absolute elements aren’t clipped
                overflow: 'visible',
              },
            ]}
          >
            {/* Dismiss sits fully inside the card, not cut */}
            {activeTab !== 'alerts' && (
              <TouchableOpacity
                onPress={() => handleDismiss(item.id)}
                style={[
                  styles.alertDismiss,
                  {
                    // Keep inside padding box of card
                    position: 'absolute',
                    top: 8,
                    right: 8,
                  },
                ]}
                accessibilityLabel="Dismiss alert"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={18} color={C.subtext} />
              </TouchableOpacity>
            )}

            <View style={styles.alertHeader}>
              <View style={styles.alertIconWrap}>
                <Ionicons name="warning-outline" size={16} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle} numberOfLines={1}>{item.title || 'Alert'}</Text>
                {item.author ? <Text style={styles.alertMeta} numberOfLines={1}>from {item.author}</Text> : null}
              </View>
            </View>

            {item.message ? <Text style={styles.alertBody} numberOfLines={3}>{item.message}</Text> : null}
          </View>
        )}
        horizontal={horizontal}
        pagingEnabled={pagingEnabled}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        bounces={false}
        snapToInterval={ITEM_STRIDE}
        snapToAlignment="start"
        onMomentumScrollEnd={onMomentumScrollEnd}
        // Make the first/last card align nicely with screen edges
        contentContainerStyle={{ paddingHorizontal: HPAD }}
        accessibilityHint={alerts.length > 1 ? "Swipe horizontally for more alerts" : undefined}
      />

      {/* Dots */}
      {alerts.length > 1 && (
        <View style={[styles.alertDots, { paddingHorizontal: HPAD }]}>
          {alerts.map((_, i) => (
            <View
              key={i}
              style={[
                styles.alertDot,
                {
                  backgroundColor: i === activeIndex ? C.primary : C.border,
                  transform: [{ scale: i === activeIndex ? 1.15 : 1 }],
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}
