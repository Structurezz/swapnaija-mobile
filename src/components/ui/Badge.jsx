import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, STATUS_COLORS, STATUS_LABELS } from '../../utils/currency';

export default function Badge({ status, label, bg, color, size = 'sm' }) {
  const colors = STATUS_COLORS[status] || { bg: COLORS.gray100, text: COLORS.gray600 };
  const displayLabel = label ?? STATUS_LABELS[status] ?? status;

  return (
    <View style={[styles.container, { backgroundColor: bg ?? colors.bg }, size === 'md' && styles.md]}>
      <Text style={[styles.text, { color: color ?? colors.text }, size === 'md' && styles.textMd]}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  md: { paddingHorizontal: 12, paddingVertical: 5 },
  text: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  textMd: { fontSize: 13 },
});
