// src/navigation/RootStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AppTabs from './AppTabs.js';
import ChatThreadScreen from '../screens/Messages/ChatThreadScreen.js';
import NotificationsScreen from '../screens/NotificationsScreen.js'; // ⬅️ add this

const Stack = createNativeStackNavigator();

/**
 * Root stack:
 * - "Main" hosts your bottom tabs
 * - "ChatThread" is a global modal
 * - "Notifications" is a global screen for in-app activity
 */
export default function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={AppTabs} />
      <Stack.Screen
        name="ChatThread"
        component={ChatThreadScreen}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ presentation: 'card', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
