// src/components/FilterTabs.js
import React, { memo } from 'react';
import { View, TouchableOpacity, Text, ScrollView } from 'react-native';
import { usePrefs } from '../context/PreferencesContext.js';

/**
 * Reusable filter tabs (horizontal). Minimal styling; uses theme in PreferencesContext.
 * Props:
 *  - tabs: string[]             // e.g., ["All", "Trending", "Alerts"]
 *  - active: string             // current tab value (must exist in tabs)
 *  - onChange: (value: string)  // callback when user taps a tab
 */
function FilterTabs({ tabs, active, onChange }) {
  const { styles, C } = usePrefs();

  return (
    <View style={[styles.card, { paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8 }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {tabs.map((t) => {
          const isActive = t === active;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => onChange(t)}
              style={[
                styles.pill,
                {
                  marginRight: 8,
                  backgroundColor: isActive ? C.primarySoft : C.card,
                  borderColor: isActive ? C.primary : C.border,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${t} filter`}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: isActive ? C.primary : C.text },
                ]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default memo(FilterTabs);
