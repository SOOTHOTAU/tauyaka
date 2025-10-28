// src/components/Header.js
import React, { memo } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import Ionicons from "react-native-vector-icons/Ionicons";
import { usePrefs } from '../context/PreferencesContext.js';
import { useAuth } from '../context/AuthContext.js';
import HeaderBell from './HeaderBell.js';

function Header({
  search,
  onSearchChange,
}) {
  const { C, styles, t } = usePrefs();
  const { activeIdentity } = useAuth();

  return (
    <View style={styles.header} accessibilityLabel="App header">
      <View style={styles.headerRow}>
        {/* Keep title exactly as before */}
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t.headerTitle(activeIdentity?.town || 'Yaka')}
        </Text>

        {/* Bell moved to far right */}
        <HeaderBell />
      </View>

      {/* Keep tagline/sub exactly as before */}
      <Text style={styles.headerSub}>{t.headerSub}</Text>

      {/* Keep search exactly as before */}
      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={t.searchPlaceholder}
          placeholderTextColor={C.subtext}
          style={styles.searchInput}
        />
        {!!search && (
          <TouchableOpacity
            onPress={() => onSearchChange("")}
            style={styles.clearBtn}
            accessibilityLabel="Clear search"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={18} color={C.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default memo(Header);
