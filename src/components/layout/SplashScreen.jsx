import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/currency';

const { width } = Dimensions.get('window');

export default function SplashScreenView() {
  const barAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(barAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Logo */}
        <View style={styles.logoBox}>
          <Ionicons name="swap-horizontal" size={40} color={COLORS.primary} />
        </View>

        <Text style={styles.brand}>SwapNaija</Text>
        <Text style={styles.tagline}>Modernizing trade by barter</Text>

        {/* Loading bar */}
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              {
                width: barAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </Animated.View>

      <Text style={styles.powered}>Powered by Structurezz Technologies</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  content: { alignItems: 'center', width: '100%' },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 48,
    fontWeight: '400',
  },
  barTrack: {
    width: width * 0.55,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 2,
  },
  powered: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
});
