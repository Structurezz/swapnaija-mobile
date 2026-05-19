import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/currency';

/**
 * Safe back button — goes back if history exists, otherwise replaces to `fallback`.
 * Prevents landing on blank/wrong screens when a screen is opened cold.
 */
export default function BackButton({ fallback = '/', color, size = 20, style, dark = false }) {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  };

  const iconColor = color ?? (dark ? '#fff' : COLORS.text);

  return (
    <TouchableOpacity
      style={[styles.btn, dark ? styles.btnDark : styles.btnLight, style]}
      onPress={handleBack}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="arrow-back" size={size} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLight: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnDark: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
