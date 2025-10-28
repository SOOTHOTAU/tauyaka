// src/components/PostCard.js
import { memo, useEffect, useState } from "react";
import {
  Alert,
  Share,
  Text,
  TouchableOpacity,
  View,
  Image as RNImage,
  Linking
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from '@react-navigation/native';

// Contexts & Hooks
import { usePrefs } from '../context/PreferencesContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useData } from '../context/DataContext.js';
import { useToast } from '../context/ToastContext.js';

// Utils & Components
import { haptic, Speech, Notifications, isExpoGo, ExpoImage } from '../utils/device.js';
import { expiresInLabel, relTime, fmtDateTime } from '../utils/time.js';
import { prettyCategory, demoTranslateMessage, maskSensitive, isVerifiedAuthor } from '../utils/helpers.js';
import { canEditPost } from '../utils/posts.js';
import Verified from './Verified.js';

function useCountdown(targetTimestamp) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!targetTimestamp || targetTimestamp <= now) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp, now]);
  const diff = targetTimestamp - now;
  if (diff <= 0) return "Started";
  const s = Math.floor((diff / 1000) % 60);
  const m = Math.floor((diff / 1000 / 60) % 60);
  const h = Math.floor(diff / (1000 * 60 * 60));
  return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

export const PostCard = memo(function PostCard({
  item,
  translated,
  playingPostId,
  onToggleTranslate,
  onSpeak,
  onStopSpeak,
}) {
  const { C, styles, t, prefLanguage, prefDataSaver } = usePrefs();
  const { activeIdentity } = useAuth();
  const {
    comments,
    bookmarks, setBookmarks,
    reports, setReports,
    posts, setPosts,
    helpfuls, setHelpfuls,
    rsvps, setRsvps,
    mediaLoaded, setMediaLoaded,
  } = useData();
  const { showToast } = useToast();
  const navigation = useNavigation();

  const countdown = item?.eventAt ? useCountdown(item.eventAt) : null;

  const commentCount = (comments[item.id] || []).length;
  const isEvent = item.category === "event";
  const isAd = item.category === "ad";
  const isTranslated = !!translated[item.id];
  const baseMessage = isTranslated ? demoTranslateMessage(item) : item.message;
  const shownMessage = maskSensitive(baseMessage);
  const isOwner = (authorId) => activeIdentity?.id === authorId;
  const authorVerified = !!item.isVerified || isVerifiedAuthor(item.author);
  const hasPhone = !!item?.contact?.phone;
  const hasWA = !!item?.contact?.whatsapp;
  const hasAddress = !!item?.location?.label;
  const canShowImages = !!item.images?.length && (!prefDataSaver || mediaLoaded[item.id]);
  const shouldOfferLoadBtn = !!item.images?.length && prefDataSaver && !mediaLoaded[item.id];
  const onLoadImages = () => setMediaLoaded(prev => ({ ...prev, [item.id]: true }));
  const isBookmarked = !!bookmarks[item.id];
  const isHelpful = !!helpfuls[item.id];
  const isGoing = (rsvps[item.id]?.going || []).includes(activeIdentity?.id);
  const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

  const toggleBookmark = (id) => { haptic.select(); setBookmarks(prev => ({ ...prev, [id]: prev[id] ? undefined : { savedAt: Date.now() } })); };
  const sharePost = async (post) => { haptic.select(); try { await Share.share({ message: `${post.title}\n\n${shownMessage}` }); } catch { } };
  const reportPost = (postId) => {
    haptic.light();
    Alert.alert(
      "Report this post?",
      "Your report is anonymous and helps keep the community safe.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: t.reportSpam, style: "destructive",
          onPress: () => { setReports(prev => [...prev, { id: `rep_${Date.now()}`, postId, reason: "spam", time: Date.now() }]); showToast("Post reported as spam."); }
        },
        {
          text: t.reportHate, style: "destructive",
          onPress: () => { setReports(prev => [...prev, { id: `rep_${Date.now()}`, postId, reason: "hate_speech", time: Date.now() }]); showToast("Post reported for review."); }
        },
      ]
    );
  };

  const toggleRsvp = (postId) => {
    haptic.light();
    setRsvps(prev => {
      const currentGoing = prev[postId]?.going || [];
      const isAttending = currentGoing.includes(activeIdentity?.id);
      const newGoing = isAttending ? currentGoing.filter(id => id !== activeIdentity?.id) : [...currentGoing, activeIdentity?.id];
      return { ...prev, [postId]: { ...prev[postId], going: newGoing } };
    });
  };

  const toggleHelpful = (postId) => {
    haptic.light();
    const wasHelpful = helpfuls[postId];
    setHelpfuls(prev => ({ ...prev, [postId]: wasHelpful ? undefined : true }));
    setPosts(prevPosts => prevPosts.map(p => {
      if (p.id === postId) {
        const currentHelpful = p.reactions?.helpful || 0;
        return { ...p, reactions: { ...p.reactions, helpful: wasHelpful ? Math.max(0, currentHelpful - 1) : currentHelpful + 1 } };
      }
      return p;
    }));
  };

  const dial = (phone) => Linking.openURL(`tel:${(phone || "").replace(/[^\d+]/g, "")}`).catch(() => { });
  const openWhatsApp = (num) => {
    const n = (num || "").replace(/[^\d]/g, "");
    if (!n) return;
    Linking.openURL(`https://wa.me/${n}`).catch(() => { });
  };
  const openMaps = (address) => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`).catch(() => { });

  const scheduleEventReminder = async (eventPost) => {
    if (isExpoGo) {
      showToast("Reminders are not available in the Expo Go app.");
      return;
    }
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast("Notification permissions are required to set reminders.");
        return;
      }
      const trigger = new Date(eventPost.eventAt - 3600 * 1000);
      if (trigger < new Date()) {
        showToast("This event is starting in less than an hour.");
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Event Reminder: " + eventPost.title,
          body: `Starts in 1 hour at ${fmtDateTime(eventPost.eventAt, prefLanguage)}.`,
        },
        trigger,
      });
      showToast("Reminder set for 1 hour before the event!");
    } catch (e) {
      console.warn("Failed to schedule notification:", e);
      showToast("Could not set reminder.");
    }
  };

  const askDeletePost = (post) => {
    haptic.light();
    Alert.alert(
      "Delete this post?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: () => {
            setPosts(prev => prev.filter(p => p.id !== post.id));
            showToast("Post deleted.");
          }
        }
      ]
    );
  };

  const onPressEdit = () => {
    if (!canEditPost(item)) {
      showToast("You can only edit a post within 1 hour of posting.");
      return;
    }
    navigation.navigate('CreatePost', { editPost: item });
  };

  return (
    <View style={styles.card} accessibilityLabel={`Post: ${item.title}`}>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

      <View style={styles.cardMeta}>
        <Text>by </Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProfilePreview', { userId: item.authorId, userName: item.author })}>
          <Text style={styles.author}>{item.author}</Text>
        </TouchableOpacity>
        {authorVerified && <Verified />}
        {isAd && <Text style={styles.sponsoredLabel}>({t.sponsored})</Text>}
        <Text> • {(item.location?.label) || "Bothaville"} {!isAd && ` • ${relTime(item.timestamp)}`}</Text>
      </View>

      {!isAd && <Text style={[styles.cardMeta, { marginTop: 4 }]}><Text style={styles.badge}>{prettyCategory(item.category)}</Text></Text>}
      {!!item.expiryDate && !isAd && (<Text style={[styles.cardMeta, { marginTop: 4 }]}>{expiresInLabel(item.expiryDate)}</Text>)}
      {!!item.expiryDate && isAd && (<Text style={[styles.cardMeta, { marginTop: 4 }]}>{t.endsOn(fmtDateTime(item.expiryDate, prefLanguage))}</Text>)}

      <Text style={styles.cardMsg}>{shownMessage}</Text>

      {shouldOfferLoadBtn && (
        <TouchableOpacity onPress={onLoadImages} style={styles.utilityBtn} accessibilityLabel="Load images">
          <Text style={{ fontWeight: "900", color: C.text }}>Load images</Text>
        </TouchableOpacity>
      )}

      {canShowImages && (
        <View style={styles.thumbsRow}>
          {item.images.slice(0, 3).map((img, idx) => (
            <View key={`${item.id}_img_${idx}`} style={styles.thumb}>
              {ExpoImage
                ? <ExpoImage source={{ uri: img.uri }} style={styles.thumbImg} cachePolicy="disk" />
                : <RNImage source={{ uri: img.uri }} style={styles.thumbImg} />}
            </View>
          ))}
        </View>
      )}

      <View style={styles.utilityRow}>
        <TouchableOpacity style={styles.utilityBtn} onPress={() => onToggleTranslate(item.id)}>
          <Ionicons name="language-outline" size={16} color={C.primary} />
          <Text style={styles.utilityText}>{isTranslated ? t.showOriginal : t.translate}</Text>
        </TouchableOpacity>

        {playingPostId === item.id ? (
          <TouchableOpacity style={styles.utilityBtn} onPress={() => onStopSpeak()}>
            <Ionicons name="stop-circle-outline" size={16} color={C.primary} />
            <Text style={styles.utilityText}>{t.stop}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.utilityBtn} onPress={() => onSpeak(item)}>
            <Ionicons name="volume-high-outline" size={16} color={C.primary} />
            <Text style={styles.utilityText}>{t.listen}</Text>
          </TouchableOpacity>
        )}

        {isEvent && item.eventAt > Date.now() && (
          <TouchableOpacity style={styles.utilityBtn} onPress={() => scheduleEventReminder(item)}>
            <Ionicons name="alarm-outline" size={16} color={C.primary} />
            <Text style={styles.utilityText}>{t.remindMe}</Text>
          </TouchableOpacity>
        )}
      </View>

      {(hasPhone || hasWA) && (
        <View style={[styles.utilityRow, { justifyContent: 'flex-start' }]}>
          {hasPhone && (
            <TouchableOpacity style={styles.utilityIconBtn} onPress={() => dial(item.contact.phone)}>
              <Ionicons name="call-outline" size={20} color={C.primary} />
            </TouchableOpacity>
          )}
          {hasWA && (
            <TouchableOpacity style={styles.utilityIconBtn} onPress={() => openWhatsApp(item.contact.whatsapp)}>
              <Ionicons name="logo-whatsapp" size={20} color={C.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleHelpful(item.id)} hitSlop={hitSlop}>
          <Ionicons name={isHelpful ? "thumbs-up" : "thumbs-up-outline"} size={20} color={isHelpful ? C.primary : C.text} />
          {(item.reactions?.helpful > 0) && <Text style={[styles.actionText, isHelpful && styles.actionTextActive]}>{item.reactions.helpful}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Comments', { postId: item.id })} hitSlop={hitSlop}>
          <Ionicons name="chatbubble-outline" size={20} color={C.text} />
          {commentCount > 0 && <Text style={styles.actionText}>{commentCount}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleBookmark(item.id)} hitSlop={hitSlop}>
          <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={20} color={C.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => sharePost(item)} hitSlop={hitSlop}>
          <Ionicons name="share-social-outline" size={20} color={C.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => reportPost(item.id)} hitSlop={hitSlop}>
          <Ionicons name="flag-outline" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* Owner actions */}
      {isOwner(item.authorId) && (
        <View style={[styles.ownerRow, { gap: 10 }]}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onPressEdit}>
            <Text style={{ color: C.text, fontWeight: "800" }}>{t.editPost || "Edit"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: C.error }]} onPress={() => askDeletePost(item)}>
            <Text style={{ color: C.error, fontWeight: "800" }}>{t.delete || "Delete"}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Event footer */}
      {isEvent && (
        <View style={styles.eventRow}>
          <View>
            <Text style={styles.eventInfo}>🗓 {item.eventAt ? fmtDateTime(item.eventAt, prefLanguage) : "Time TBC"}</Text>
            {item.eventAt > Date.now() && <Text style={styles.eventCountdown}>Starts in: {countdown}</Text>}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {hasAddress && (
              <TouchableOpacity style={styles.eventBtn} onPress={() => openMaps(item.location.label)}>
                <Ionicons name="navigate-outline" size={16} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.eventBtn, isGoing && { backgroundColor: C.soft, borderWidth: 1, borderColor: C.primary }]}
              onPress={() => toggleRsvp(item.id)}
            >
              <Ionicons name={isGoing ? "checkmark-circle" : "calendar-outline"} size={16} color={isGoing ? C.primary : "#fff"} />
              <Text style={[styles.eventBtnText, isGoing && { color: C.primary }]}>{t.going} ({rsvps[item.id]?.going?.length || 0})</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});
