import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MINT   = '#62C6A0';
const WHITE  = '#FFFFFF';
const INK    = '#111827';

export default function SplashScreenView() {
  // Box: scale from 0 → 1 (spring pop)
  const boxScale   = useRef(new Animated.Value(0)).current;
  // Arrows: opacity 0 → 1
  const arrowOpacity = useRef(new Animated.Value(0)).current;
  // Text: opacity 0 → 1 + translateX 20 → 0
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textX        = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    // 1. Box pops in
    Animated.spring(boxScale, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();

    // 2. Arrows fade in after box
    Animated.timing(arrowOpacity, {
      toValue: 1,
      duration: 350,
      delay: 320,
      useNativeDriver: true,
    }).start();

    // 3. Text slides + fades in
    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        delay: 480,
        useNativeDriver: true,
      }),
      Animated.timing(textX, {
        toValue: 0,
        duration: 400,
        delay: 480,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>

        {/* Green rounded box */}
        <Animated.View style={[styles.box, { transform: [{ scale: boxScale }] }]}>
          <Animated.View style={{ opacity: arrowOpacity }}>
            <Ionicons name="swap-horizontal" size={34} color={WHITE} />
          </Animated.View>
        </Animated.View>

        {/* "SwapNaija" wordmark */}
        <Animated.Text
          style={[
            styles.brand,
            { opacity: textOpacity, transform: [{ translateX: textX }] },
          ]}
        >
          SwapNaija
        </Animated.Text>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  box: {
    width: 64,
    height: 64,
    borderRadius: 15,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MINT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  brand: {
    fontSize: 34,
    fontWeight: '800',
    color: INK,
    letterSpacing: -0.5,
  },
});
