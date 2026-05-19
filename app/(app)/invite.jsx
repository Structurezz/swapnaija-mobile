import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../../src/store/auth.store';
import { COLORS } from '../../src/utils/currency';
import Button from '../../src/components/ui/Button';
import BackButton from '../../src/components/ui/BackButton';

const HOW_IT_WORKS = [
  { step: '1', title: 'Share your link', desc: 'Send your unique referral link to friends and family.' },
  { step: '2', title: 'They sign up', desc: 'Your friend registers using your referral link.' },
  { step: '3', title: 'You both earn', desc: 'When they complete their first swap, you both get 200 BC credits!' },
];

export default function InviteScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const referralCode = user?.referralCode || user?.id?.slice(-8)?.toUpperCase() || 'SWAP2024';
  const referralLink = `https://swapnaija.com/join?ref=${referralCode}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join SwapNaija — Nigeria's #1 barter marketplace! Trade what you have for what you need. Sign up with my link and we both earn free credits: ${referralLink}`,
        url: referralLink,
        title: 'Join SwapNaija',
      });
    } catch {}
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(referralLink);
    } catch {}
    Toast.show({ type: 'success', text1: 'Link copied!', text2: 'Share it with your friends' });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <BackButton fallback="/profile" />
        <Text style={styles.headerTitle}>Invite Friends</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="people" size={44} color={COLORS.white} />
          </View>
          <Text style={styles.heroTitle}>Invite & Earn</Text>
          <Text style={styles.heroSub}>
            Invite friends to SwapNaija and earn{' '}
            <Text style={styles.highlight}>200 BC credits</Text>
            {' '}for each successful referral!
          </Text>
        </View>

        {/* Referral code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <Text style={styles.code}>{referralCode}</Text>
          <View style={styles.linkRow}>
            <Text style={styles.link} numberOfLines={1}>{referralLink}</Text>
            <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
              <Ionicons name="copy" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <Button
            title="Share Invite Link"
            onPress={handleShare}
            icon={<Ionicons name="share-social" size={16} color={COLORS.white} />}
            style={{ marginTop: 4 }}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{user?.referralCount ?? 0}</Text>
            <Text style={styles.statLabel}>Referrals</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{(user?.referralCount ?? 0) * 200}</Text>
            <Text style={styles.statLabel}>BC Earned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{user?.swapCredits ?? 0}</Text>
            <Text style={styles.statLabel}>Total Credits</Text>
          </View>
        </View>

        {/* How it works */}
        <Text style={styles.sectionTitle}>How It Works</Text>
        {HOW_IT_WORKS.map((item) => (
          <View key={item.step} style={styles.howItem}>
            <View style={styles.howStep}>
              <Text style={styles.howStepText}>{item.step}</Text>
            </View>
            <View style={styles.howContent}>
              <Text style={styles.howTitle}>{item.title}</Text>
              <Text style={styles.howDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}

        {/* Share via */}
        <Text style={styles.sectionTitle}>Share via</Text>
        <View style={styles.shareOptions}>
          {[
            { icon: 'logo-whatsapp', label: 'WhatsApp', color: '#25D366' },
            { icon: 'mail', label: 'Email', color: COLORS.primary },
            { icon: 'copy', label: 'Copy Link', color: COLORS.accent },
            { icon: 'share-social', label: 'More', color: '#8B5CF6' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={styles.shareOpt}
              onPress={opt.label === 'Copy Link' ? handleCopy : handleShare}
            >
              <View style={[styles.shareIcon, { backgroundColor: `${opt.color}20` }]}>
                <Ionicons name={opt.icon} size={22} color={opt.color} />
              </View>
              <Text style={styles.shareOptLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  content: { padding: 20, gap: 16 },

  hero: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  heroSub: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  highlight: { color: COLORS.primary, fontWeight: '700' },

  codeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  code: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 3,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  link: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  copyBtn: { padding: 4 },

  statsRow: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },
  statDivider: { width: 1, height: 32, backgroundColor: COLORS.border },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  howItem: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  howStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howStepText: { fontSize: 15, fontWeight: '800', color: COLORS.white },
  howContent: { flex: 1, gap: 3 },
  howTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  howDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  shareOptions: { flexDirection: 'row', gap: 12 },
  shareOpt: { flex: 1, alignItems: 'center', gap: 6 },
  shareIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareOptLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
});
