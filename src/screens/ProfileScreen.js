// src/screens/ProfileScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { usePrefs } from '../context/PreferencesContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useData } from '../context/DataContext.js';

const PROFILE_KEY = 'yaka_profile_v1';
const CLEAR_KEYS = [
  'yaka_threads_v1',
  'yaka_pins_v1',
  'yaka_profile_v1',
  // per-thread message keys (yaka_thread_msgs_*) omitted on purpose
];

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

export default function ProfileScreen({ navigation }) {
  const { C, styles, t, setLang } = usePrefs();
  const { isLoggedIn, activeIdentity, logout } = useAuth();
  const { saved = {} } = useData() || {};

  // Base identity
  const baseName = activeIdentity?.displayName || activeIdentity?.name || t?.guest || 'Guest';
  const baseTown = activeIdentity?.town || activeIdentity?.location || 'Bothaville';

  // Edit profile (local)
  const [editOpen, setEditOpen] = useState(false);
  const [nameInput, setNameInput] = useState(baseName);
  const [townInput, setTownInput] = useState(baseTown);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) {
          const { name, town } = JSON.parse(raw) || {};
          if (name) setNameInput(name);
          if (town) setTownInput(town);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const localName = (nameInput || '').trim() || baseName;
  const localTown = (townInput || '').trim() || baseTown;

  const saveProfile = async () => {
    const payload = { name: (nameInput || '').trim(), town: (townInput || '').trim() };
    try { await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(payload)); } catch {}
    setEditOpen(false);
  };

  // Saved count (array or map)
  const savedCount = useMemo(() => {
    if (Array.isArray(saved)) return saved.length;
    if (saved && typeof saved === 'object') return Object.values(saved).filter(Boolean).length;
    return 0;
  }, [saved]);

  const Row = ({ icon, label, right, onPress, disabled }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Open ${label}`}
      style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}
    >
      <Ionicons name={icon} size={20} color={disabled ? C.subtext : C.text} style={{ width: 26 }} />
      <Text style={[styles.itemTitle, { flex: 1, marginLeft: 10, color: disabled ? C.subtext : C.text }]}>{label}</Text>
      {right}
      <Ionicons name="chevron-forward" size={18} color={C.subtext} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );

  const Chip = ({ label, code, active }) => (
    <TouchableOpacity
      onPress={() => typeof setLang === 'function' && setLang(code)}
      style={{
        height: 36, paddingHorizontal: 14, borderRadius: 18,
        backgroundColor: active ? C.primary : 'transparent',
        borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginRight: 10
      }}
      accessibilityLabel={`Switch language to ${label}`}
    >
      <Text style={{ color: active ? '#fff' : C.text, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );

  const clearDemoData = async () => {
    for (const k of CLEAR_KEYS) { try { await AsyncStorage.removeItem(k); } catch {} }
    alert('Demo data cleared');
  };

  const onGoNotifications = () => navigation.navigate('Notifications');

  // Robust open Archive (works from anywhere)
  const openArchive = () => {
    try {
      navigation.navigate('Archive');
    } catch {
      navigation.navigate('Main', { screen: 'Profile', params: { screen: 'Archive' } });
    }
  };

  // Rich “Help & About” payload (screen should read route.params?.sections)
  const openHelpAbout = () => {
    navigation.navigate('HelpAbout', {
      sections: [
        {
          title: 'Welcome to Yaka',
          body: 'Yaka is offline-friendly community app. Browse posts, translate, and message neighbors—no account required for the demo.'
        },
        {
          title: 'Safety & Reporting',
          body: 'Be kind and cautious. Long-press content to report if needed. Your reports are stored locally in this demo.'
        },
        {
          title: 'Messaging',
          body: 'Conversations are stored on your device only. Drafts auto-save. Delivery ticks are simulated (✓ then ✓✓).'
        },
        {
          title: 'Marketplace Tips',
          body: 'Look for the verified badge on Storefronts. Sponsored listings are clearly labeled and time-bounded.'
        },
        {
          title: 'Payments (Demo)',
          body: 'Card validation and OTP are simulated. Receipts are local. Do not enter real card details.'
        },
        {
          title: 'Troubleshooting',
          body: 'If something looks odd, try “Clear demo data” below to reset local state.'
        }
      ]
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.headerRow, { paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onGoNotifications} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle]}>{t?.profile ?? 'Profile'}</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Hero card */}
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <View style={[styles.card, { padding: 16, flexDirection: 'row', alignItems: 'center' }]}>
          <View style={{
            width: 56, height: 56, borderRadius: 28, overflow: 'hidden',
            backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginRight: 12
          }}>
            <Text style={{ color: C.subtext, fontWeight: '800', fontSize: 20 }}>
              {String(localName || '?').slice(0,1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.h3}>{localName}</Text>
            <Text style={{ color: C.subtext }}>{localTown}</Text>
          </View>
          <TouchableOpacity onPress={() => setEditOpen(true)} accessibilityLabel="Edit profile" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="create-outline" size={18} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu (Messages row removed) */}
      <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
        <Row icon="list" label={t?.myPosts ?? 'My Posts'} onPress={() => navigation.navigate('MyPosts')} />
        <Row icon="download-outline" label={t?.myArchive ?? 'My Archive'} onPress={openArchive} />
        <Row
          icon="bookmark-outline"
          label={`${t?.saved ?? 'Saved'}${savedCount ? ` (${savedCount})` : ''}`}
          onPress={() => navigation.navigate('SavedPosts')}
        />
        <Row
          icon="settings-outline"
          label={t?.settingsAndPrefs ?? 'Settings & Preferences'}
          onPress={() => navigation.navigate('Settings', { hideLanguage: true })}
        />
        <Row icon="help-circle-outline" label={t?.helpAbout ?? 'Help & About'} onPress={openHelpAbout} />
      </View>

      {/* Language row (kept here; do not duplicate in Settings) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Text style={{ color: C.subtext, marginBottom: 8 }}>{t?.language ?? 'Language'}</Text>
        <View style={{ flexDirection: 'row' }}>
          <Chip label="EN" code="en" active={t?.lang === 'en'} />
          <Chip label="ST" code="st" active={t?.lang === 'st'} />
          <Chip label="AF" code="af" active={t?.lang === 'af'} />
        </View>

        {/* Clear demo data */}
        <TouchableOpacity onPress={clearDemoData} style={{ marginTop: 12 }} accessibilityLabel="Clear demo data">
          <Text style={{ color: C.subtext }}>{'Clear demo data'}</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      {isLoggedIn && (
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 8 : 24 }}>
          <TouchableOpacity
            onPress={() => logout?.()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            accessibilityLabel="Log out"
          >
            <Ionicons name="log-out-outline" size={20} color={C.text} />
            <Text style={{ color: C.text }}>{t?.logout ?? 'Log out'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit profile modal */}
      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.bg, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={styles.sectionTitle}>{'Edit profile'}</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Display name"
              placeholderTextColor={C.subtext}
              style={[styles.input, { color: C.text, borderColor: C.border, marginTop: 12 }]}
            />
            <TextInput
              value={townInput}
              onChangeText={setTownInput}
              placeholder="Town"
              placeholderTextColor={C.subtext}
              style={[styles.input, { color: C.text, borderColor: C.border, marginTop: 10 }]}
            />
            <View style={[styles.rowBetween, { marginTop: 12 }]}>
              <TouchableOpacity onPress={() => setEditOpen(false)} accessibilityLabel="Cancel edit">
                <Text style={{ color: C.subtext }}>{'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveProfile}
                accessibilityLabel="Save profile"
                style={[styles.primaryBtn, { height: 40, paddingHorizontal: 16 }]}
              >
                <Text style={styles.primaryBtnText}>{'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
