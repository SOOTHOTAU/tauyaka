// src/screens/Messages/ChatThreadScreen.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { usePrefs } from '../../context/PreferencesContext.js';
import { useData } from '../../context/DataContext.js';

let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  const mem = {};
  AsyncStorage = {
    async getItem(k){return mem[k] ?? null;},
    async setItem(k,v){mem[k]=v;},
    async removeItem(k){delete mem[k];},
  };
}

const THREADS_KEY = 'yaka_threads_v1';
const MSGS_PREFIX = 'yaka_thread_msgs_';
const DRAFT_KEY = (id) => `yaka_draft_${id}`;

export default function ChatThreadScreen() {
  const { C, styles } = usePrefs();
  const { params } = useRoute();
  const navigation = useNavigation();
  const threadId = params?.threadId;
  const draft = params?.draft || '';
  const dataCtx = useData() || {};
  const { messages = {}, setMessages } = dataCtx;

  const [thread, setThread] = useState(null);
  const [items, setItems] = useState([]);
  const [value, setValue] = useState(draft);
  const listRef = useRef(null);

  const asArray = (val) => Array.isArray(val) ? val : [];

  // Load thread + messages
  useEffect(() => {
    let mounted = true;
    (async () => {
      // Load threads to get title
      let threads = asArray(messages?.threads);
      if (!threads.length) {
        const raw = await AsyncStorage.getItem(THREADS_KEY);
        threads = asArray(raw ? JSON.parse(raw) : []);
      }
      const t = threads.find(x => x.id === threadId) || { id: threadId, title: 'Chat' };
      if (mounted) {
        setThread(t);
        navigation.setOptions?.({ headerShown: false });
      }

      // Load messages
      const rawMsgs = await AsyncStorage.getItem(MSGS_PREFIX + threadId);
      if (!mounted) return;
      const parsed = asArray(rawMsgs ? JSON.parse(rawMsgs) : []);
      setItems(parsed);
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: false }), 0);
    })();
    return () => { mounted = false; };
  }, [messages, threadId, navigation]);

  // Draft autosave/restore
  useEffect(() => {
    let mounted = true;
    (async () => {
      // if no draft provided from navigation, try stored draft
      if (!draft) {
        const raw = await AsyncStorage.getItem(DRAFT_KEY(threadId));
        if (mounted && typeof raw === 'string' && raw.length && !value) setValue(raw);
      }
    })();
    return () => { mounted = false; };
  }, [threadId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    AsyncStorage.setItem(DRAFT_KEY(threadId), value || '');
  }, [threadId, value]);

  const persistMessages = async (next) => {
    const safe = asArray(next);
    setItems(safe);
    if (typeof setMessages === 'function') {
      setMessages((prev) => ({ ...(prev || {}), byThread: { ...(prev?.byThread || {}), [threadId]: safe }}));
    }
    await AsyncStorage.setItem(MSGS_PREFIX + threadId, JSON.stringify(safe));
  };

  const send = async () => {
    const txt = value.trim();
    if (!txt) return;

    const msg = { id: String(Date.now()), text: txt, ts: Date.now(), author: 'you', state: 'sent' };
    const next = [...asArray(items), msg];
    await persistMessages(next);

    await AsyncStorage.setItem(DRAFT_KEY(threadId), '');
    setValue('');

    // update thread preview
    let threads = asArray(messages?.threads);
    if (!threads.length) {
      const raw = await AsyncStorage.getItem(THREADS_KEY);
      threads = asArray(raw ? JSON.parse(raw) : []);
    }
    const updated = upsertThreadPreview(threads, threadId, thread?.title || 'Chat', txt);
    await AsyncStorage.setItem(THREADS_KEY, JSON.stringify(updated));
    if (typeof setMessages === 'function') {
      setMessages((prev) => ({ ...(prev || {}), threads: updated }));
    }

    // simulate delivered ✓✓
    setTimeout(async () => {
      const delivered = asArray(next).map(m => m.id === msg.id ? { ...m, state: 'delivered' } : m);
      await persistMessages(delivered);
    }, 800);

    setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 10);
  };

  const headerTitle = thread?.title || 'Chat';

  const renderItem = ({ item }) => {
    const mine = item.author === 'you';
    return (
      <View style={{ paddingHorizontal: 12, marginVertical: 6, flexDirection:'row', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
        <View style={{
          maxWidth: '78%',
          backgroundColor: mine ? C.primary : C.card,
          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12
        }}>
          <Text style={{ color: mine ? '#fff' : C.text }}>{item.text}</Text>
          <Text style={{ color: mine ? 'rgba(255,255,255,0.75)' : C.muted, fontSize: 10, marginTop: 4 }}>
            {timeShort(item.ts)} {mine ? (item.state === 'delivered' ? '✓✓' : '✓') : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.headerRow, { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth:1, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex:1, alignItems:'center' }}>
          <Text style={[styles.headerTitle]} numberOfLines={1}>{headerTitle}</Text>
        </View>
        <View style={{ width:24 }} />
      </View>

      <FlatList
        ref={listRef}
        data={asArray(items)}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
        removeClippedSubviews
        initialNumToRender={16}
        windowSize={9}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection:'row', alignItems:'center', padding:10, borderTopWidth:1, borderTopColor:C.border }}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Type a message"
            placeholderTextColor={C.muted}
            style={[styles.input, { flex:1, color: C.text, borderColor: C.border, marginRight:8 }]}
            multiline
          />
          <TouchableOpacity onPress={send} accessibilityLabel="Send message" style={[styles.primaryBtn, { paddingHorizontal:14, height:44, alignItems:'center', justifyContent:'center' }]}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function upsertThreadPreview(list, id, title, lastText){
  const safe = Array.isArray(list) ? list.slice() : [];
  const now = Date.now();
  const idx = safe.findIndex(t => t.id === id);
  if (idx >= 0) {
    safe[idx] = { ...safe[idx], title, lastText, lastTs: now, unread: 0 };
  } else {
    safe.unshift({ id, title, participants: ['you', title], lastText, lastTs: now, unread: 0 });
  }
  return safe.sort((a,b)=> (b?.lastTs||0) - (a?.lastTs||0));
}

function timeShort(ts){
  if (!ts) return '';
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${hh}:${mm}`;
}
