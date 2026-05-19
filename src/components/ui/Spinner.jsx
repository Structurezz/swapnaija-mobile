import React from 'react';
import { ActivityIndicator } from 'react-native';
import { COLORS } from '../../utils/currency';
import SplashScreenView from '../layout/SplashScreen';

export default function Spinner({ size = 'large', color = COLORS.primary, full = false }) {
  if (full) {
    return <SplashScreenView />;
  }
  return <ActivityIndicator size={size} color={color} />;
}
