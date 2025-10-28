import React, { useState, useEffect } from 'react';
import {
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image as RNImage,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { usePrefs } from '../../context/PreferencesContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { useData } from '../../context/DataContext.js';
import { ImagePicker, ImageManipulator } from '../../utils/device.js';
import { prettyCategory, isVerifiedAuthor } from '../../utils/helpers.js';
import { canPost } from '../../utils/roles.js';
import { useToast } from '../../context/ToastContext.js';

export default function CreatePostModal({ route, navigation }) {
  const { editPost } = route.params || {};

  const { C, styles, t, currentTown } = usePrefs();
  const { activeIdentity } = useAuth();
  const { posts, setPosts } = useData();
  const { showToast } = useToast();

  const [newTitle, setNewTitle] = useState("");
  const [newMsg, setNewMsg] = useState("");
  const [newCategory, setNewCategory] = useState("community");
  const [anonymous, setAnonymous] = useState(false);
  const [creating, setCreating] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [newImages, setNewImages] = useState([]);
  const [newPhone, setNewPhone] = useState("");
  const [newWhatsApp, setNewWhatsApp] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [eventDate, setEventDate] = useState(""); // YYYY-MM-DD
  const [eventTime, setEventTime] = useState(""); // HH:MM
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (editPost) {
      setNewTitle(editPost.title || "");
      setNewMsg(editPost.message || "");
      setNewCategory(editPost.category || "community");
      setAnonymous((editPost.author || "") === "Anonymous");
      setNewImages(editPost.images || []);
      setNewPhone(editPost?.contact?.phone || "");
      setNewWhatsApp(editPost?.contact?.whatsapp || "");
      setNewAddress(editPost?.location?.label || "");
      if (editPost.eventAt) {
        const d = new Date(editPost.eventAt);
        try {
          setEventDate(d.toISOString().split('T')[0]);
          setEventTime(d.toTimeString().slice(0,5));
        } catch {}
      } else {
        setEventDate("");
        setEventTime("");
      }
    } else {
        setNewTitle("");
        setNewMsg("");
        setNewCategory("community");
        setAnonymous(false);
        setNewImages([]);
        setNewPhone("");
        setNewWhatsApp("");
        setNewAddress("");
        setEventDate("");
        setEventTime("");
    }
    setValidationErrors({});
  }, [editPost]);
  
  const pickImages = async () => {
    if (newImages.length >= 3) {
      showToast("You can add a maximum of 3 images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1, // Start with high quality for manipulation
        selectionLimit: 3 - newImages.length,
    });

    if (!result.canceled) {
        setProcessingImages(true);
        const compressedImages = [];
        for (const asset of result.assets) {
            try {
                const manipResult = await ImageManipulator.manipulateAsync(
                    asset.uri,
                    [{ resize: { width: 1024 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );
                compressedImages.push({ uri: manipResult.uri });
            } catch (e) {
                console.warn("Image compression failed:", e);
                compressedImages.push({ uri: asset.uri }); // fallback to original
            }
        }
        setNewImages(prev => [...prev, ...compressedImages.slice(0, 3 - prev.length)]);
        setProcessingImages(false);
    }
  };

  const createPost = async () => {
    const tL = newTitle.trim(); const m = newMsg.trim();
    const errors = {};
    if (tL.length < 3) errors.title = "Heading must be at least 3 characters.";
    if (m.length < 10) errors.message = "Message must be at least 10 characters.";

    const postingAs = anonymous ? "Anonymous" : activeIdentity.name;
    if (newCategory === "alert" && !isVerifiedAuthor(postingAs) && activeIdentity.role !== 'government') {
      errors.category = "Only verified authorities can post Alerts.";
    }

    if (newCategory === 'market' && !editPost) {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentMarketPosts = posts.filter(p => 
            p.authorId === activeIdentity.id &&
            p.category === 'market' &&
            p.createdAt > sevenDaysAgo
        ).length;

        if (recentMarketPosts >= 2) {
            errors.category = "You can only create 2 Marketplace posts per week.";
        }
    }

    let eventTimestamp = null;
    if (newCategory === 'event') {
        if (!eventDate || !eventTime) {
            errors.eventDate = "Events require a date and time.";
        } else {
            const combined = `${eventDate}T${eventTime}:00`;
            const parsed = Date.parse(combined);
            if (!isNaN(parsed)) {
                eventTimestamp = parsed;
            } else {
                errors.eventDate = "Invalid date/time format. Use YYYY-MM-DD and HH:MM.";
            }
        }
    }

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCreating(true);
    try {
      const contact = {}; if (newPhone.trim()) contact.phone = newPhone.trim(); if (newWhatsApp.trim()) contact.whatsapp = newWhatsApp.trim();
      const location = { label: (newAddress.trim() || (newCategory === "alert" ? (currentTown) : "Bothaville • Town")) };
      
      const newPostData = { category: newCategory, title: tL, message: m, author: postingAs, authorId: activeIdentity.id, images: newImages, contact, location, ...( eventTimestamp && {eventAt: eventTimestamp})};

      if (editPost) {
        setPosts(prev => prev.map(p => p.id === editPost.id ? { ...p, ...newPostData } : p));
        showToast("Post updated successfully!");
      } else {
        const defaultExpiryDays = newCategory === "ad" ? 10 : (newCategory === "event" ? 3 : 21);
        const post = { id: Date.now().toString(), timestamp: Date.now(), createdAt: Date.now(), expiryDate: Date.now() + defaultExpiryDays * 24 * 60 * 60 * 1000, reactions: { helpful: 0 }, isVerified: activeIdentity.verified, communityId: "bothaville", ...newPostData };
        setPosts(prev => [post, ...prev]);
        showToast("Post created successfully!");
      }
      navigation.goBack();
    } finally {
      setCreating(false);
    }
  };

  const allowedCategories = ["alert", "event", "opportunity", "community", "lostfound", "ad", "market"].filter(cat => canPost(activeIdentity.role, cat));

  return (
    <SafeAreaView style={[styles.container, { paddingHorizontal: 16, backgroundColor: C.bg }]}>
        <View style={[styles.headerRow, { marginBottom: 8, paddingTop: 8 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Close post editor" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, { flex: 1, textAlign: "center" }]}>{editPost ? t.editPost : t.createPost}</Text>
            <View style={{ width: 24 }} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">
          <TextInput style={styles.input} placeholder={t.heading} value={newTitle} onChangeText={setNewTitle} placeholderTextColor={C.subtext} />
          {validationErrors.title && <Text style={styles.errorText}>{validationErrors.title}</Text>}
          <TextInput style={[styles.input, { height: 120, textAlignVertical: "top" }]} placeholder={t.message} multiline value={newMsg} onChangeText={setNewMsg} placeholderTextColor={C.subtext} />
          {validationErrors.message && <Text style={styles.errorText}>{validationErrors.message}</Text>}
          
          {newCategory === 'event' && (
            <>
                <View style={{flexDirection: 'row', gap: 8}}>
                    <TextInput style={[styles.input, {flex: 1, marginTop: 8}]} placeholder={t.eventDate} value={eventDate} onChangeText={setEventDate} placeholderTextColor={C.subtext} />
                    <TextInput style={[styles.input, {flex: 1, marginTop: 8}]} placeholder={t.eventTime} value={eventTime} onChangeText={setEventTime} placeholderTextColor={C.subtext} />
                </View>
                {validationErrors.eventDate && <Text style={styles.errorText}>{validationErrors.eventDate}</Text>}
            </>
          )}

          {['event', 'market', 'lostfound', 'ad', 'opportunity'].includes(newCategory) && (
            <>
              <TextInput style={styles.input} placeholder={t.phoneOpt} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" placeholderTextColor={C.subtext} />
              <TextInput style={styles.input} placeholder={t.whatsappOpt} value={newWhatsApp} onChangeText={setNewWhatsApp} keyboardType="phone-pad" placeholderTextColor={C.subtext} />
            </>
          )}

          {['event', 'market'].includes(newCategory) && (
            <TextInput style={styles.input} placeholder={t.addressOpt} value={newAddress} onChangeText={setNewAddress} placeholderTextColor={C.subtext} />
          )}

          <View style={styles.catRow}>
            {allowedCategories.map(cat => (<TouchableOpacity key={cat} style={[styles.catPill, newCategory === cat && styles.catPillActive]} onPress={() => setNewCategory(cat)}><Text style={[styles.catPillText, newCategory === cat && styles.catPillTextActive]}>{prettyCategory(cat)}</Text></TouchableOpacity>))}
          </View>
          {validationErrors.category && <Text style={styles.errorText}>{validationErrors.category}</Text>}
          <TouchableOpacity onPress={pickImages} disabled={processingImages} style={[styles.secondaryBtn, { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", marginTop: 8 }, processingImages && { opacity: 0.7 }]}>
            {processingImages ? <ActivityIndicator size="small" color={C.primary} style={{marginRight: 6}} /> : <Ionicons name="image-outline" size={16} color={C.text} />}
            <Text style={[styles.catPillText, { marginLeft: 6 }]}>{processingImages ? "Processing..." : `Add Image (${newImages.length}/3)`}</Text>
          </TouchableOpacity>
          {newImages.length > 0 && (<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>{newImages.map((img, idx) => (<RNImage key={idx} source={{ uri: img.uri }} style={{ width: 64, height: 64, borderRadius: 8, marginRight: 8 }} />))}</ScrollView>)}
          <View style={styles.anonRow}><Text style={{ color: C.text }}>{t.postAnon}</Text><Switch value={anonymous} onValueChange={setAnonymous} accessibilityLabel={t.postAnon} /></View>
          <View style={[styles.modalActions, { marginBottom: 12 }]}><TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel={t.cancel}><Text style={styles.cancel}>{t.cancel}</Text></TouchableOpacity><TouchableOpacity onPress={createPost} style={styles.primaryBtn} disabled={creating} accessibilityLabel={editPost ? t.save : t.post}><Text style={styles.primaryBtnText}>{creating ? "Posting…" : (editPost ? t.save : t.post)}</Text></TouchableOpacity></View>
        </ScrollView>
    </SafeAreaView>
  );
}