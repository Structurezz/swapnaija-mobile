import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth.store';
import { useChatStore } from '../../src/store/chat.store';
import { useSocket } from '../../src/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../../src/utils/currency';

function TabBarIcon({ name, color, size, badge }) {
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

function AppSocketInit() {
  const queryClient = useQueryClient();
  useSocket(queryClient);
  return null;
}

export default function AppLayout() {
  const { isAuthenticated, initialized } = useAuthStore();
  const router = useRouter();
  const totalUnread = useChatStore((s) => s.getTotalUnread());

  useEffect(() => {
    if (initialized && !isAuthenticated()) {
      router.replace('/(auth)/onboarding');
    }
  }, [initialized]);

  return (
    <>
      <AppSocketInit />
      <Tabs
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.gray400,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIconStyle: { marginTop: 2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size, focused }) => (
              <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, size, focused }) => (
              <TabBarIcon name={focused ? 'search' : 'search-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="swaps"
          options={{
            title: 'Swaps',
            href: '/swaps',
            tabBarIcon: ({ color, size, focused }) => (
              <TabBarIcon name={focused ? 'swap-horizontal' : 'swap-horizontal-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            href: '/chat',
            tabBarIcon: ({ color, size, focused }) => (
              <TabBarIcon
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                color={color}
                size={size}
                badge={totalUnread}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            href: '/profile',
            tabBarIcon: ({ color, size, focused }) => (
              <TabBarIcon name={focused ? 'person' : 'person-outline'} color={color} size={size} />
            ),
          }}
        />

        {/* Hidden screens - not in tabs */}
        <Tabs.Screen name="listing" options={{ href: null }} />
        <Tabs.Screen name="wallet" options={{ href: null }} />
        <Tabs.Screen name="create-listing" options={{ href: null }} />
        <Tabs.Screen name="verify-account" options={{ href: null }} />
        <Tabs.Screen name="invite" options={{ href: null }} />
        <Tabs.Screen name="featured" options={{ href: null }} />
        <Tabs.Screen name="fresh-drops" options={{ href: null }} />
        <Tabs.Screen name="suggested" options={{ href: null }} />
        <Tabs.Screen name="dispute" options={{ href: null }} />
        <Tabs.Screen name="boost" options={{ href: null }} />
        <Tabs.Screen name="help" options={{ href: null }} />
        <Tabs.Screen name="terms" options={{ href: null }} />
        <Tabs.Screen name="privacy" options={{ href: null }} />
        <Tabs.Screen name="contact" options={{ href: null }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 10,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  tabLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  badgeText: { fontSize: 9, color: COLORS.white, fontWeight: '700' },
});
