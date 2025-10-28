// src/components/HeaderBell.js
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../context/DataContext.js';
import { usePrefs } from '../context/PreferencesContext.js';

export default function HeaderBell() {
  const navigation = useNavigation();
  const { C, styles } = usePrefs();
  const { notifications = [] } = useData();

  const unseenCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  return (
    <TouchableOpacity
      style={styles.headerBell}
      onPress={() => navigation.navigate('Notifications')} // ⬅️ matches RootStack route
      accessibilityLabel="View notifications"
    >
      <Ionicons name="notifications-outline" size={24} color={C.text} />
      {unseenCount > 0 && (
        <View style={styles.headerBellBadge}>
          <Text style={styles.headerBellBadgeText}>{unseenCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
