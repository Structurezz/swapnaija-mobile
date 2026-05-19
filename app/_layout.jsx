import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/auth.store';
import SplashScreenView from '../src/components/layout/SplashScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const { init, initialized } = useAuthStore();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    init().then(() => {
      // Keep splash up for at least 2.5s
      setTimeout(() => setSplashDone(true), 2500);
    });
  }, []);

  if (!initialized || !splashDone) {
    return <SplashScreenView />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </QueryClientProvider>
  );
}
