import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';

export default function AuthLayout() {
  const { isAuthenticated, initialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (initialized && isAuthenticated()) {
      router.replace('/(app)');
    }
  }, [initialized]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
