import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/currency';

export default function ReviewStars({
  rating = 0, count, size = 14, showNumber = true,
  interactive = false, onChange,
}) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={styles.row}>
      {stars.map((star) => {
        const filled = star <= Math.round(rating);
        const icon   = filled ? 'star' : 'star-outline';
        const color  = filled ? COLORS.accent : COLORS.gray300;
        if (interactive) {
          return (
            <TouchableOpacity key={star} onPress={() => onChange?.(star)} activeOpacity={0.7} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name={icon} size={size} color={color} />
            </TouchableOpacity>
          );
        }
        return <Ionicons key={star} name={icon} size={size} color={color} />;
      })}
      {showNumber && !interactive && (
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
