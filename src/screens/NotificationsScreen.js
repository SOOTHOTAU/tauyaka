// src/screens/NotificationsScreen.js
import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePrefs } from '../context/PreferencesContext.js';
import { useData } from '../context/DataContext.js';

export default function NotificationsScreen({ navigation }) {
  const { C, styles } = usePrefs();
  const { notifications = [], setNotifications } = useData();

  const markAllRead = () =>
    setNotifications?.(notifications.map(n => ({ ...n, read: true })));

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: item.read ? C.card : C.soft, borderColor: C.border }]}
      onPress={() => setNotifications?.(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n))}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={item.icon || 'notifications-outline'} size={20} color={C.primary} />
        <Text style={styles.h4} numberOfLines={1}>{item.title || 'Activity'}</Text>
      </View>
      {!!item.message && <Text style={{ color: C.text, marginTop: 4 }}>{item.message}</Text>}
      {!!item.timestamp && (
        <Text style={{ color: C.subtext, marginTop: 2, fontSize: 12 }}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.headerRow, { paddingHorizontal: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 46, alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.sectionTitle, { flex: 1, textAlign: 'center' }]}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead} style={{ width: 46, alignItems: 'center' }}>
          <Ionicons name="checkmark-done" size={22} color={C.primary} />
        </TouchableOpacity>
      </View>

      {notifications.length ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 10 }}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="notifications-off-outline" size={40} color={C.subtext} />
          <Text style={{ color: C.subtext, marginTop: 10 }}>No notifications yet</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
