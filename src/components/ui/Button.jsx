import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { COLORS } from '../../utils/currency';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = true,
}) {
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    isDisabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? COLORS.white : COLORS.primary}
          size="small"
        />
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={labelStyle}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: { marginRight: 4 },

  // Variants
  primary: { backgroundColor: COLORS.primary },
  secondary: { backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primary },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.primary },
  danger: { backgroundColor: COLORS.danger },
  ghost: { backgroundColor: 'transparent' },
  accent: { backgroundColor: COLORS.accent },

  disabled: { opacity: 0.5 },

  // Sizes
  size_sm: { paddingVertical: 8, paddingHorizontal: 16 },
  size_md: { paddingVertical: 14, paddingHorizontal: 20 },
  size_lg: { paddingVertical: 16, paddingHorizontal: 24 },

  // Text
  text: { fontWeight: '600', textAlign: 'center' },
  text_primary: { color: COLORS.white },
  text_secondary: { color: COLORS.primary },
  text_outline: { color: COLORS.primary },
  text_danger: { color: COLORS.white },
  text_ghost: { color: COLORS.primary },
  text_accent: { color: COLORS.white },
  textDisabled: {},

  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 16 },
});
