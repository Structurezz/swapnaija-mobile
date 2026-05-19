import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { initiateVerify } from '../../src/api/payments.api';
import { useAuthStore } from '../../src/store/auth.store';
import { COLORS, formatBC } from '../../src/utils/currency';
import Button from '../../src/components/ui/Button';
import BackButton from '../../src/components/ui/BackButton';

const BENEFITS = [
  { icon: 'checkmark-shield', text: 'Verified badge on your profile' },
  { icon: 'trending-up', text: 'Higher trust from other traders' },
  { icon: 'search', text: 'Priority in search results' },
  { icon: 'gift', text: '500 bonus Barter Credits' },
];

export default function VerifyAccountScreen() {
  const { user, updateUser } = useAuthStore();
  const router = useRouter();

  const verifyMutation = useMutation({
    mutationFn: initiateVerify,
    onSuccess: (data) => {
      updateUser({ verification: 'verified', walletBalance: data?.walletBalance ?? user?.walletBalance });
      Toast.show({ type: 'success', text1: 'Account verified!', text2: 'You now have a verified badge' });
      router.back();
    },
    onError: (err) => {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: err?.response?.data?.error || 'Please try again',
      });
    },
  });

  const VERIFY_COST_KOBO = 100000; // 1,000 BC

  const handleVerify = () => {
    if ((user?.walletBalance ?? 0) < VERIFY_COST_KOBO) {
      Alert.alert(
        'Insufficient Balance',
        `You need 1,000 BC to verify. Top up your wallet first.`,
        [
          { text: 'Top Up', onPress: () => router.push('/wallet') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    Alert.alert(
      'Verify Account',
      'This will deduct 1,000 BC from your wallet. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Verify', onPress: () => verifyMutation.mutate() },
      ]
    );
  };

  if (user?.verification === 'verified') {
    return (
      <View style={styles.screen}>
        <BackButton fallback="/profile" style={styles.backBtn} />
        <View style={styles.alreadyVerified}>
          <View style={styles.verifiedIcon}>
            <Ionicons name="checkmark-circle" size={60} color={COLORS.primary} />
          </View>
          <Text style={styles.verifiedTitle}>Already Verified!</Text>
          <Text style={styles.verifiedSub}>Your account has a verified badge.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <BackButton fallback="/profile" />
        <Text style={styles.headerTitle}>Verify Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={48} color={COLORS.white} />
          </View>
          <Text style={styles.heroTitle}>Get Verified</Text>
          <Text style={styles.heroSub}>
            Build trust in the SwapNaija community with a verified badge on your profile.
          </Text>
        </View>

        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Benefits of Verification</Text>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.costCard}>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Verification Fee</Text>
            <Text style={styles.costValue}>1,000 BC</Text>
          </View>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Your Balance</Text>
            <Text style={[
              styles.costValue,
              (user?.walletBalance ?? 0) < VERIFY_COST_KOBO && styles.insufficient,
            ]}>
              {formatBC(user?.walletBalance ?? 0)}
            </Text>
          </View>
          {(user?.walletBalance ?? 0) < VERIFY_COST_KOBO && (
            <TouchableOpacity
              style={styles.topupHint}
              onPress={() => router.push('/wallet')}
            >
              <Ionicons name="wallet" size={14} color={COLORS.danger} />
              <Text style={styles.topupHintText}>
                Top up {formatBC(VERIFY_COST_KOBO - (user?.walletBalance ?? 0))} more to verify
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Button
          title="Verify My Account"
          onPress={handleVerify}
          loading={verifyMutation.isPending}
          icon={<Ionicons name="shield-checkmark" size={16} color={COLORS.white} />}
          style={styles.verifyBtn}
        />

        <Text style={styles.note}>
          Verification is a one-time fee and cannot be refunded. Your account will be manually reviewed within 24 hours.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtnRow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 56, left: 16, zIndex: 10, padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  content: { padding: 20, gap: 16 },

  hero: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  heroIcon: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  heroSub: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  benefitsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  benefitsTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { fontSize: 14, color: COLORS.text, flex: 1 },

  costCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  costRow: { flexDirection: 'row', justifyContent: 'space-between' },
  costLabel: { fontSize: 14, color: COLORS.textSecondary },
  costValue: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  insufficient: { color: COLORS.danger },
  topupHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.dangerLight,
    padding: 10,
    borderRadius: 8,
  },
  topupHintText: { fontSize: 13, color: COLORS.danger, fontWeight: '600' },

  verifyBtn: {},
  note: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 40,
  },

  alreadyVerified: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40 },
  verifiedIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  verifiedSub: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
});
