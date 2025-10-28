import React from 'react';
import { Animated, Text } from 'react-native';
import { usePrefs } from '../context/PreferencesContext.js';
import { useToast } from '../context/ToastContext.js';

export default function Toast() {
  const { styles } = usePrefs();
  const { toast, toastAnim } = useToast();

  if (!toast.visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }] }]}>
      <Text style={styles.toastText}>{toast.message}</Text>
    </Animated.View>
  );
}
