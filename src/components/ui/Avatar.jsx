import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, resolveImageUrl } from '../../utils/currency';

export default function Avatar({ uri, name, size = 40, style }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const fontSize = size * 0.38;
  const resolvedUri = resolveImageUrl(uri);

  if (resolvedUri) {
    return (
      <Image
        source={{ uri: resolvedUri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }, style]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: COLORS.gray200 },
  fallback: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: COLORS.white,
    fontWeight: '700',
  },
});
