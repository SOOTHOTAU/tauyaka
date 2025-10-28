// src/screens/Messages/InboxScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
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
const PIN_KEY = 'yaka_pins_v1';

export default function InboxScreen() {
  const { C, styles, t } = usePrefs();
  const dataCtx = useData() || {};
  const { messages = {}, setMessages } = dataCtx;
  const navigation = useNavigation();

  const [threads, setThreads] = useState([]);              // always an array
  const [refreshing, setRefreshing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeMsg, setComposeMsg] = useState('');
  const [query, setQuery] = useState('');
  const [pinMap, setPinMap] = useState({});               // { [threadId]: true }
  const [actionFor, setActionFor] = useState(null);       // thread object for long-press menu

  const asArray = (val) => Array.isArray(val) ? val : [];

  // Load pins
  useEffect(() => {
    let mounted = true;
    (async () => {
      const rawPins = await AsyncStorage.getItem(PIN_KEY);
      if (!mounted) return;
      setPinMap(rawPins ? JSON.parse(rawPins) : {});
    })();
    return () => { mounted = false; };
  }, []);

  // Load threads from context or AsyncStorage; seed if empty
  useEffect(() => {
    let mounted = true;
    (async () => {
      const ctxThreads = asArray(messages?.threads);
      if (ctxThreads.length) {
        if (mounted) setThreads(ctxThreads);
        return;
      }
      const raw = await AsyncStorage.getItem(THREADS_KEY);
      if (!mounted) return;
      if (raw) {
        const parsed = asArray(JSON.parse(raw));
        setThreads(parsed);
      } else {
        const seed = [
          {
            id: 't-1',
            title: 'Local Plumber',
            participants: ['you','Local Plumber'],
            lastText: 'Sure, I can come at 3pm.',
            lastTs: Date.now() - 1000*60*45,
            unread: 1,
          },
          {
            id: 't-2',
            title: 'Community Watch',
            participants: ['you','Community Watch'],
            lastText: 'Night patrol starts at 9pm.',
            lastTs: Date.now() - 1000*60*60*5,
            unread: 0,
          },
        ];
        setThreads(seed);
        await AsyncStorage.setItem(THREADS_KEY, JSON.stringify(seed));
      }
    })();
    return () => { mounted = false; };
  }, [messages]);

  const persistThreads = useCallback(async (next) => {
    const safe = asArray(next);
    setThreads(safe);
    if (typeof setMessages === 'function') {
      setMessages((prev) => ({ ...(prev || {}), threads: safe }));
    }
    await AsyncStorage.setItem(THREADS_KEY, JSON.stringify(safe));
  }, [setMessages]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 300);
  }, []);

  const togglePin = useCallback(async (id) => {
    const next = { ...(pinMap || {}), [id]: !pinMap?.[id] };
    setPinMap(next);
    await AsyncStorage.setItem(PIN_KEY, JSON.stringify(next));
  }, [pinMap]);

  const openThread = (thread) => {
    if ((thread?.unread || 0) > 0) {
      const next = asArray(threads).map(t => t.id === thread.id ? { ...t, unread: 0 } : t);
      persistThreads(next);
    }
    navigation.navigate('ChatThread', { threadId: thread.id });
  };

  const unreadTotal = useMemo(() => {
    const list = asArray(threads);
    return list.reduce((a,t) => a + (t?.unread || 0), 0);
  }, [threads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = asArray(threads).slice();
    const search = q
      ? base.filter(t =>
          (t?.title || '').toLowerCase().includes(q) ||
          (t?.lastText || '').toLowerCase().includes(q)
        )
      : base;
    // pin first, then newest
    return search.sort((a,b) => {
      const pa = pinMap?.[a.id] ? 1 : 0;
      const pb = pinMap?.[b.id] ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return (b?.lastTs || 0) - (a?.lastTs || 0);
    });
  }, [threads, query, pinMap]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => openThread(item)}
      onLongPress={() => setActionFor(item)}
      delayLongPress={300}
      style={[styles.rowBetween, { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }]}
      accessibilityLabel={`Open chat with ${item?.title || 'contact'}`}
    >
      <View style={{ flexDirection:'row', alignItems:'center' }}>
        <View style={{ width:40, height:40, borderRadius:20, backgroundColor: C.card, alignItems:'center', justifyContent:'center', marginRight:12 }}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={C.text} />
        </View>
        <View style={{ maxWidth: '72%' }}>
          <Text style={[styles.itemTitle]} numberOfLines={1}>{item?.title || 'Chat'}</Text>
          <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>{item?.lastText || ' '}</Text>
        </View>
      </View>

      <View style={{ alignItems:'flex-end' }}>
        <TouchableOpacity onPress={() => togglePin(item.id)} accessibilityLabel={pinMap?.[item.id] ? 'Unpin chat' : 'Pin chat'} style={{ padding: 4 }}>
          <Ionicons name={pinMap?.[item.id] ? 'bookmark' : 'bookmark-outline'} size={18} color={C.muted} />
        </TouchableOpacity>
        <Text style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>
          {timeAgo(item?.lastTs)}
        </Text>
        {(item?.unread || 0) > 0 && (
          <View style={{ marginTop:6, minWidth:20, paddingHorizontal:6, height:20, borderRadius:10, backgroundColor: C.primary, alignItems:'center', justifyContent:'center' }}>
            <Text style={{ color:'#fff', fontSize:11, textAlign:'center', lineHeight:20 }}>{item.unread}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const startCompose = async () => {
    if (!composeTo.trim() || !composeMsg.trim()) return;
    const id = `t-${Date.now()}`;
    const thread = {
      id,
      title: composeTo.trim(),
      participants: ['you', composeTo.trim()],
      lastText: composeMsg.trim(),
      lastTs: Date.now(),
      unread: 0,
    };
    const next = [thread, ...asArray(threads)];
    await persistThreads(next);
    setComposeOpen(false);
    setComposeTo('');
    setComposeMsg('');
    navigation.navigate('ChatThread', { threadId: id, draft: composeMsg.trim() });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header + Search */}
      <View style={{ paddingHorizontal:16, paddingTop:16, paddingBottom:10, borderBottomWidth:1, borderBottomColor:C.border }}>
        <View style={[styles.rowBetween, { alignItems:'center' }]}>
          <Text style={[styles.headerTitle]}>{t?.messages ?? 'Messages'}</Text>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            {unreadTotal > 0 && (
              <View style={{ minWidth:24, height:24, borderRadius:12, backgroundColor: C.primary, alignItems:'center', justifyContent:'center', marginRight:12 }}>
                <Text style={{ color:'#fff', fontSize:12 }}>{unreadTotal}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => setComposeOpen(true)} accessibilityLabel="Compose new message">
              <Ionicons name="create-outline" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search chats"
          placeholderTextColor={C.muted}
          style={[styles.input, { color:C.text, borderColor:C.border, marginTop:10 }]}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.text} />}
        ListEmptyComponent={
          <View style={{ padding: 24 }}>
            <Text style={{ color: C.muted }}>{'No messages yet. Tap compose to start a chat.'}</Text>
          </View>
        }
        removeClippedSubviews
        initialNumToRender={12}
        windowSize={7}
      />

      {/* Compose modal */}
      <Modal visible={composeOpen} animationType="slide" transparent onRequestClose={() => setComposeOpen(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:C.bg, padding:16, borderTopLeftRadius:16, borderTopRightRadius:16 }}>
            <View style={[styles.rowBetween, { marginBottom:12 }]}>
              <Text style={styles.sectionTitle}>{'New Message'}</Text>
              <TouchableOpacity onPress={() => setComposeOpen(false)}><Ionicons name="close" size={22} color={C.text} /></TouchableOpacity>
            </View>
            <TextInput
              placeholder="Recipient name"
              placeholderTextColor={C.muted}
              value={composeTo}
              onChangeText={setComposeTo}
              style={[styles.input, { marginBottom:10, color: C.text, borderColor: C.border }]}
            />
            <TextInput
              placeholder="Message"
              placeholderTextColor={C.muted}
              value={composeMsg}
              onChangeText={setComposeMsg}
              style={[styles.input, { marginBottom:14, color: C.text, borderColor: C.border }]}
            />
            <TouchableOpacity onPress={startCompose} style={[styles.primaryBtn]}>
              <Text style={styles.primaryBtnText}>{'Start Chat'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Long-press actions */}
      <Modal visible={!!actionFor} transparent animationType="fade" onRequestClose={()=>setActionFor(null)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:C.bg, borderTopLeftRadius:16, borderTopRightRadius:16, padding:12 }}>
            <View style={{ alignItems:'center', paddingVertical:6 }}>
              <View style={{ width:36, height:4, borderRadius:2, backgroundColor:C.border }} />
            </View>

            <TouchableOpacity
              onPress={async () => {
                const next = asArray(threads).map(t =>
                  t.id === actionFor.id ? { ...t, unread: Math.max(1, t.unread || 1) } : t
                );
                await persistThreads(next);
                setActionFor(null);
              }}
              style={{ padding:14 }}
            >
              <Text style={{ color: C.text }}>Mark as unread</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                const next = asArray(threads).filter(t => t.id !== actionFor.id);
                await persistThreads(next);
                await AsyncStorage.removeItem('yaka_thread_msgs_' + actionFor.id);
                setActionFor(null);
              }}
              style={{ padding:14 }}
            >
              <Text style={{ color: '#d33', fontWeight:'600' }}>Delete chat</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={()=>setActionFor(null)} style={{ padding:14, alignItems:'center' }}>
              <Text style={{ color: C.muted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function timeAgo(ts){
  if (!ts) return '';
  const s = Math.floor((Date.now()-ts)/1000);
  if (s<60) return 'now';
  const m = Math.floor(s/60); if (m<60) return `${m}m`;
  const h = Math.floor(m/60); if (h<24) return `${h}h`;
  const d = Math.floor(h/24); return `${d}d`;
}
