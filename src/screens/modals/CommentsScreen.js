import React, { useState, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { usePrefs } from '../../context/PreferencesContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { useData } from '../../context/DataContext.js';
import { useToast } from '../../context/ToastContext.js';
import { relTime } from '../../utils/time.js';

export default function CommentsScreen({ route, navigation }) {
  const { postId } = route.params;
  const { C, styles, t } = usePrefs();
  const { username } = useAuth();
  const { comments, setComments, setReports } = useData();
  const { showToast } = useToast();
  
  const [newComment, setNewComment] = useState("");
  const commentsListRef = useRef(null);

  const list = comments[postId] || [];

  const addComment = () => {
    const text = newComment.trim();
    if (!text || !postId) return;
    const entry = { id: Date.now().toString(), author: username || "Guest", content: text, timestamp: Date.now() };
    setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), entry] }));
    setNewComment("");
    setTimeout(() => commentsListRef.current?.scrollToEnd?.({ animated: true }), 100);
  };
  
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={[styles.modalFull, { paddingTop: 16 }]}>
        <View style={[styles.headerRow, { marginBottom: 8 }]}>
          <Text style={[styles.modalTitle, { flex: 1, color: C.text }]} numberOfLines={1}>{t.comments}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Close comments">
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
        </View>
        {list.length === 0 && <Text style={{ color: C.subtext, marginBottom: 10 }}>{t.noComments}</Text>}
        <ScrollView ref={commentsListRef} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {list.map((c) => (
            <View key={c.id} style={[styles.commentItem, { borderBottomColor: C.border }]}>
              <View style={styles.commentHeader}>
                <Text style={[styles.commentAuthor, { color: C.text }]}>{c.author}</Text>
                <Text style={[styles.commentTime, { color: C.subtext }]}>{relTime(c.timestamp)}</Text>
              </View>
              <Text style={[styles.commentContent, { color: C.text }]}>{c.content}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={t.addComment}
            placeholderTextColor={C.subtext}
            value={newComment}
            onChangeText={setNewComment}
            blurOnSubmit={false}
          />
          <TouchableOpacity onPress={addComment} style={styles.primaryBtn} accessibilityLabel={t.postComment}>
            <Text style={styles.primaryBtnText}>{t.postComment}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}