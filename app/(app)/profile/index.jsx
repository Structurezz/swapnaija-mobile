import React, { useRef } from 'react';
import { useScrollToTop } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/auth.store';
import { getMyListings } from '../../../src/api/listings.api';
import { logoutApi, getMe } from '../../../src/api/auth.api';
import { disconnectSocket } from '../../../src/hooks/useSocket';
import { COLORS, formatBC } from '../../../src/utils/currency';
import Avatar from '../../../src/components/ui/Avatar';
import ReviewStars from '../../../src/components/ui/ReviewStars';
import ListingCard from '../../../src/components/ui/ListingCard';

function SettingRow({ icon, label, sublabel, onPress, danger = false, rightEl }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.danger : COLORS.primary} />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
        {sublabel && <Text style={styles.settingSub}>{sublabel}</Text>}
      </View>
      {rightEl ?? <Ionicons name="chevron-forward" size={18} color={COLORS.gray400} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout, refreshToken, updateUser } = useAuthStore();
  const router = useRouter();
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const { data: freshUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => getMe(),
    onSuccess: (data) => updateUser(data),
  });

  const profile = freshUser ?? user;

  const { data: myListings } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => getMyListings(),
  });

  const listings = myListings?.listings ?? myListings ?? [];

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try { await logoutApi(refreshToken); } catch {}
          disconnectSocket();
          await logout();
          router.replace('/(auth)/onboarding');
        },
      },
    ]);
  };

  return (
    <ScrollView ref={scrollRef} style={styles.screen} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity onPress={() => router.push('/profile/edit')}>
            <Ionicons name="create-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* User card */}
        <View style={styles.userCard}>
          <Avatar uri={profile?.avatarUrl} name={profile?.fullName} size={72} />
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{profile?.fullName || profile?.email}</Text>
              {profile?.verification === 'verified' && (
                <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
              )}
            </View>
            {profile?.bio && <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>}
            <ReviewStars rating={profile?.ratingAvg ?? 0} count={profile?.ratingCount} size={14} />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          {[
            { label: 'Swaps', value: profile?.swapCount ?? 0 },
            { label: 'Listings', value: listings.length },
            { label: 'Wallet', value: formatBC(profile?.walletBalance ?? 0) },
            { label: 'Credits', value: profile?.swapCredits ?? 0 },
          ].map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* My listings */}
      {listings.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Listings</Text>
            <TouchableOpacity onPress={() => router.push('/create-listing')}>
              <Ionicons name="add-circle" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={listings.slice(0, 6)}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listingsScroll}
            renderItem={({ item }) => <ListingCard listing={item} compact />}
          />
        </View>
      )}

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingsGroup}>
          <SettingRow
            icon="person-outline"
            label="Edit Profile"
            onPress={() => router.push('/profile/edit')}
          />
          <SettingRow
            icon="wallet-outline"
            label="Wallet"
            sublabel={formatBC(user?.walletBalance ?? 0)}
            onPress={() => router.push('/wallet')}
          />
          <SettingRow
            icon="checkmark-shield-outline"
            label="Verify Account"
            sublabel={user?.verification === 'verified' ? 'Verified' : 'Get verified badge'}
            onPress={() => router.push('/verify-account')}
            rightEl={user?.verification === 'verified' ? <Ionicons name="checkmark-circle" size={18} color={COLORS.success} /> : null}
          />
          <SettingRow
            icon="people-outline"
            label="Invite Friends"
            sublabel="Earn credits for referrals"
            onPress={() => router.push('/invite')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.settingsGroup}>
          <SettingRow icon="help-circle-outline" label="Help & FAQ" onPress={() => router.push('/(app)/help')} />
          <SettingRow icon="chatbubble-outline" label="Contact Support" onPress={() => router.push('/(app)/contact')} />
          <SettingRow icon="document-text-outline" label="Terms of Service" onPress={() => router.push('/(app)/terms')} />
          <SettingRow icon="shield-outline" label="Privacy Policy" onPress={() => router.push('/(app)/privacy')} />
        </View>
      </View>

      <View style={[styles.section, { marginBottom: 40 }]}>
        <View style={styles.settingsGroup}>
          <SettingRow
            icon="log-out-outline"
            label="Log Out"
            onPress={handleLogout}
            danger
            rightEl={null}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },

  userCard: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', marginBottom: 16 },
  userInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  bio: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  stats: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray50,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },

  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  listingsScroll: { gap: 10 },

  settingsGroup: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDanger: { backgroundColor: COLORS.dangerLight },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  settingLabelDanger: { color: COLORS.danger },
  settingSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
});
