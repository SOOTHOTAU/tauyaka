// src/screens/modals/SettingsAndPreferencesScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import { usePrefs } from '../../context/PreferencesContext.js';

const STORAGE_KEYS = {
  notifications: 'yaka_pref_notifications',
  compactCards: 'yaka_pref_compact_cards',
  autoTranslate: 'yaka_pref_auto_translate',
  ttsRate: 'yaka_pref_tts_rate',
  theme: 'yaka_theme',
};

let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  const mem = {};
  AsyncStorage = {
    async getItem(k){ return mem[k] ?? null; },
    async setItem(k,v){ mem[k] = v; },
    async removeItem(k){ delete mem[k]; },
  };
}

export default function SettingsAndPreferencesScreen() {
  const navigation = useNavigation();
  const { C, styles } = usePrefs();

  const [darkMode, setDarkMode] = useState(C.theme === 'dark');
  const [notifications, setNotifications] = useState(true);
  const [compactCards, setCompactCards] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [ttsRate, setTtsRate] = useState(1.0);

  useEffect(() => {
    (async () => {
      try {
        const n = await AsyncStorage.getItem(STORAGE_KEYS.notifications);
        const c = await AsyncStorage.getItem(STORAGE_KEYS.compactCards);
        const a = await AsyncStorage.getItem(STORAGE_KEYS.autoTranslate);
        const r = await AsyncStorage.getItem(STORAGE_KEYS.ttsRate);
        const th = await AsyncStorage.getItem(STORAGE_KEYS.theme);

        if (n !== null) setNotifications(n === '1');
        if (c !== null) setCompactCards(c === '1');
        if (a !== null) setAutoTranslate(a === '1');
        if (r !== null) setTtsRate(Number(r) || 1.0);
        if (th === 'dark' || th === 'light') setDarkMode(th === 'dark');
      } catch {}
    })();
  }, []);

  const persist = async (key, val) => {
    try { await AsyncStorage.setItem(key, val); } catch {}
  };

  const Row = ({ icon, label, right, onPress, disabled }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: C.border,
        backgroundColor: C.bg,
      }}
    >
      <Ionicons name={icon} size={20} color={disabled ? C.subtext : C.text} style={{ width: 26 }} />
      <Text style={[styles.itemTitle, { flex: 1, marginLeft: 10, color: disabled ? C.subtext : C.text }]}>{label}</Text>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={C.subtext} style={{ marginLeft: 8 }} /> : null}
    </TouchableOpacity>
  );

  const RowSwitch = ({ icon, label, value, onValueChange }) => (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: C.border,
        backgroundColor: C.bg,
      }}
    >
      <Ionicons name={icon} size={20} color={C.text} style={{ width: 26 }} />
      <Text style={[styles.itemTitle, { flex: 1, marginLeft: 10, color: C.text }]}>{label}</Text>
      <Switch
        value={!!value}
        onValueChange={onValueChange}
        trackColor={{ false: C.border, true: C.primary }}
        thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
      />
    </View>
  );

  const TtsControl = () => (
    <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="volume-high-outline" size={20} color={C.text} style={{ width: 26 }} />
        <Text style={[styles.itemTitle, { flex: 1, marginLeft: 10, color: C.text }]}>Reading speed</Text>
        <Text style={{ color: C.subtext, marginRight: 10 }}>{ttsRate.toFixed(1)}×</Text>
        <TouchableOpacity
          onPress={() => {
            const next = Math.max(0.8, parseFloat((ttsRate - 0.1).toFixed(1)));
            setTtsRate(next); persist(STORAGE_KEYS.ttsRate, String(next));
          }}
          accessibilityLabel="Decrease reading speed"
          style={{ paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.border, borderRadius: 8 }}
        >
          <Text style={{ color: C.text }}>–</Text>
        </TouchableOpacity>
        <View style={{ width: 8 }} />
        <TouchableOpacity
          onPress={() => {
            const next = Math.min(1.4, parseFloat((ttsRate + 0.1).toFixed(1)));
            setTtsRate(next); persist(STORAGE_KEYS.ttsRate, String(next));
          }}
          accessibilityLabel="Increase reading speed"
          style={{ paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.border, borderRadius: 8 }}
        >
          <Text style={{ color: C.text }}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ color: C.subtext, marginTop: 8, fontSize: 12 }}>
        Adjust Text-to-Speech speed used by the Home feed reader.
      </Text>
    </View>
  );

  const applyTheme = async (v) => {
    const mode = v ? 'dark' : 'light';
    setDarkMode(v);
    if (typeof C?.setTheme === 'function') C.setTheme(mode);
    // (styles.setTheme also exists, but C.setTheme is enough)
    persist(STORAGE_KEYS.theme, mode);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.headerRow, { paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Close">
          <Ionicons name="close" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle]}>Settings & Preferences</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Main card */}
      <View style={{ marginHorizontal: 12, marginTop: 12 }}>
        <View style={[styles.card, { overflow: 'hidden' }]}>
          {/* Dark Mode */}
          <RowSwitch
            icon="moon-outline"
            label="Dark mode"
            value={darkMode}
            onValueChange={applyTheme}
          />

          {/* Notifications (demo) */}
          <RowSwitch
            icon="notifications-outline"
            label="Notifications (demo)"
            value={notifications}
            onValueChange={(v) => { setNotifications(v); persist(STORAGE_KEYS.notifications, v ? '1' : '0'); }}
          />

          {/* Compact cards */}
          <RowSwitch
            icon="swap-vertical-outline"
            label="Compact feed cards"
            value={compactCards}
            onValueChange={(v) => { setCompactCards(v); persist(STORAGE_KEYS.compactCards, v ? '1' : '0'); }}
          />

          {/* Auto translate */}
          <RowSwitch
            icon="language-outline"
            label="Auto-translate posts"
            value={autoTranslate}
            onValueChange={(v) => { setAutoTranslate(v); persist(STORAGE_KEYS.autoTranslate, v ? '1' : '0'); }}
          />

          {/* TTS rate */}
          <TtsControl />
        </View>
      </View>

      {/* About / Diagnostics */}
      <View style={{ marginHorizontal: 12, marginTop: 12, marginBottom: 18 }}>
        <View style={[styles.card, { overflow: 'hidden' }]}>
          <Row
            icon="information-circle-outline"
            label="What’s in this demo?"
            onPress={() => navigation.navigate('HelpAbout')}
          />
          <Row
            icon="bug-outline"
            label="Report an issue (local)"
            onPress={() => {
              alert('Thanks! In this demo, logs are local only. You can also use “Clear demo data” from Profile.');
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
