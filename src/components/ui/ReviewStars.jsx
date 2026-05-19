import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/currency';

export default function ReviewStars({ rating = 0, count, size = 14, showNumber = true }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={styles.row}>
      {stars.map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={s <= Math.round(rating) ? COLORS.accent : COLORS.gray300}
        />
      ))}
      {showNumber && (
        <Text style={[styles.label, { fontSize: size - 2 }]}>
          {Number(rating).toFixed(1)}{count != null ? ` (${count})` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  label: { color: COLORS.textSecondary, marginLeft: 4, fontWeight: '500' },
});
