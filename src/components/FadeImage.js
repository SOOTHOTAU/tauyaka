// src/components/FadeImage.js
import React, { useRef } from "react";
import { Animated, Image as RNImage, StyleSheet, View } from "react-native";

/**
 * Lightweight fade-in <Image> with a built-in placeholder (no assets required).
 * - No external libs
 * - Works when uri is missing (shows placeholder color)
 * - Keeps parent borderRadius via wrapper with overflow: 'hidden'
 *
 * Props:
 *  - uri?: string
 *  - style?: any (width/height/borderRadius usually set on parent wrapper)
 *  - resizeMode?: 'cover' | 'contain' | ...
 */
export default function FadeImage({ uri, style, resizeMode = "cover" }) {
  const opacity = useRef(new Animated.Value(0)).current;

  const onLoad = () => {
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };

  return (
    <View style={[styles.wrap, style]} accessible accessibilityRole="image" accessibilityLabel="listing image">
      {/* Placeholder block (visible under image while it fades in) */}
      <View style={[StyleSheet.absoluteFill, styles.placeholder]} />

      {/* Only render Image if we have a uri */}
      {uri ? (
        <Animated.Image
          source={{ uri }}
          onLoad={onLoad}
          style={[StyleSheet.absoluteFill, { opacity }]}
          resizeMode={resizeMode}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  placeholder: {
    backgroundColor: "#e9eef3", // subtle, works on light/dark themes
  },
});
