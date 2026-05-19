import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getListing } from '../../../../src/api/listings.api';
import { getBoostPlans, initiateBoost } from '../../../../src/api/payments.api';
import { getMe } from '../../../../src/api/auth.api';
import { useAuthStore } from '../../../../src/store/auth.store';
import { COLORS, formatBC, resolveImageUrl, getListingPlaceholder } from '../../../../src/utils/currency';
import Spinner from '../../../../src/components/ui/Spinner';
import BackButton from '../../../../src/components/ui/BackButton';

const AMBER       = '#F59E0B';
const AMBER_LIGHT = '#FFFBEB';
const AMBER_BORDER= '#FDE68A';
const ORANGE      = '#EA580C';

const FALLBACK_PLANS = [
  { id: '7d',  amountKobo: 50000,  days: 7,  label: '7 Days' },
  { id: '30d', amountKobo: 150000, days: 30, label: '30 Days' },
];

const BENEFITS = [
  { icon: 'trending-up',  label: '10× more visibility',       desc: 'Boosted listings appear at the top of search results.' },
  { icon: 'eye',          label: 'Featured on Home page',      desc: 'Your listing shows in the Featured section seen by all users.' },
  { icon: 'search',       label: 'Priority in category feeds', desc: 'Ranked first when people browse your category.' },
];

export default function BoostScreen() {
  const { id } = useLocalSearchParams();
  const router  = useRouter();
  const { user, updateUser } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState('7d');

  const { data: listing, isLoading: listingLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn:  () => getListing(id),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['boost-plans'],
    queryFn:  getBoostPlans,
    staleTime: Infinity,
  });

  const activePlans   = plans.length ? plans : FALLBACK_PLANS;
  const currentPlan   = activePlans.find(p => p.id === selectedPlan) || activePlans[0];
  const walletBalance = user?.walletBalance ?? 0;
  const canAfford     = walletBalance >= (currentPlan?.amountKobo ?? 0);

  const isBoosted = listing?.isBoosted &&
    listing?.boostExpires &&
    new Date(listing.boostExpires) > new Date();

  const boostMutation = useMutation({
    mutationFn: () => initiateBoost(id, { plan: selectedPlan }),
    onSuccess: async () => {
      try { const me = await getMe(); updateUser({ walletBalance: me.walletBalance }); } catch (_) {}
      Toast.show({ type: 'success', text1: '🚀 Listing Boosted!', text2: 'Your listing is now featured.' });
      router.back();
    },
    onError: (err) =>
      Toast.show({ type: 'error', text1: err?.response?.data?.error || 'Boost failed' }),
  });

  if (listingLoading) return (
    <View style={s.fullCenter}><Spinner /></View>
  );
  if (!listing) return (
    <View style={s.fullCenter}>
      <Text style={s.errorText}>Listing not found</Text>
    </View>
  );

  const imgUri = listing.images?.[0]
    ? resolveImageUrl(listing.images[0])
    : getListingPlaceholder(listing);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <BackButton fallback="/" />
        <Text style={s.headerTitle}>Boost Listing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Listing preview card ── */}
        <View style={s.listingCard}>
          <Image source={{ uri: imgUri }} style={s.listingImg} resizeMode="cover" />
          <View style={s.listingInfo}>
            <Text style={s.listingTitle} numberOfLines={2}>{listing.title}</Text>
            {listing.estimatedValue ? (
              <Text style={s.listingValue}>₦{listing.estimatedValue.toLocaleString()}</Text>
            ) : null}
            {listing.description ? (
              <Text style={s.listingDesc} numberOfLines={2}>{listing.description}</Text>
            ) : null}
            {isBoosted && (
              <View style={s.boostedBadge}>
                <Ionicons name="flash" size={11} color={AMBER} />
                <Text style={s.boostedBadgeText}>
                  Boosted until {new Date(listing.boostExpires).toLocaleDateString('en-NG')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {isBoosted ? (
          /* ── Already boosted state ── */
          <View style={s.alreadyBoosted}>
            <Ionicons name="checkmark-circle" size={52} color={AMBER} />
            <Text style={s.alreadyTitle}>Already Boosted!</Text>
            <Text style={s.alreadyDesc}>
              Active until{' '}
              {new Date(listing.boostExpires).toLocaleDateString('en-NG', { day: 'numeric', month: 'long' })}.
            </Text>
            <TouchableOpacity onPress={() => router.replace('/')} style={s.viewListingBtn}>
              <Text style={s.viewListingText}>View listing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Amber hero banner ── */}
            <View style={s.heroBanner}>
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <View style={[s.heroCircle, { top: -20, right: -20, width: 100, height: 100 }]} />
                <View style={[s.heroCircle, { bottom: -30, left: 10, width: 70, height: 70 }]} />
              </View>
              <View style={s.heroTop}>
                <View style={s.heroIconWrap}>
                  <Ionicons name="flash" size={22} color="#fff" />
                </View>
                <View>
                  <Text style={s.heroTitle}>Boost This Listing</Text>
                  <Text style={s.heroSub}>Get seen by more swappers</Text>
                </View>
              </View>
              <Text style={s.heroBody}>
                Boosted listings get up to{' '}
                <Text style={{ fontWeight: '800' }}>10× more views</Text>
                {' '}and appear at the top of search results and the Featured section on the Home page.
              </Text>
            </View>

            {/* ── Benefits ── */}
            <View style={s.benefitsWrap}>
              {BENEFITS.map((b) => (
                <View key={b.label} style={s.benefitRow}>
                  <View style={s.benefitIcon}>
                    <Ionicons name={b.icon} size={16} color={AMBER} />
                  </View>
                  <View style={s.benefitText}>
                    <Text style={s.benefitLabel}>{b.label}</Text>
                    <Text style={s.benefitDesc}>{b.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* ── Choose a plan ── */}
            <Text style={s.planHeading}>Choose a plan</Text>
            {activePlans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[s.planCard, isSelected && s.planCardActive]}
                  onPress={() => setSelectedPlan(plan.id)}
                  activeOpacity={0.8}
                >
                  <View style={s.planLeft}>
                    {isSelected && (
                      <View style={s.planRadioFilled}>
                        <View style={s.planRadioInner} />
                      </View>
                    )}
                    {!isSelected && <View style={s.planRadio} />}
                    <View>
                      <Text style={[s.planDays, isSelected && s.planDaysActive]}>{plan.days} Days</Text>
                      <Text style={s.planSubtitle}>Top placement for {plan.days} days</Text>
                    </View>
                  </View>
                  <View style={s.planRight}>
                    <Text style={[s.planPrice, isSelected && s.planPriceActive]}>
                      ₦{(plan.amountKobo / 100).toLocaleString()}
                    </Text>
                    <Text style={s.planFrom}>from wallet</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* ── Wallet balance check ── */}
            <View style={[s.balanceCard, canAfford ? s.balanceOk : s.balanceLow]}>
              <Ionicons
                name="wallet-outline"
                size={20}
                color={canAfford ? '#065F46' : '#991B1B'}
              />
              <View style={s.balanceInfo}>
                <Text style={[s.balanceStatus, canAfford ? s.balanceStatusOk : s.balanceStatusLow]}>
                  {canAfford ? 'Sufficient balance' : 'Insufficient balance'}
                </Text>
                <Text style={s.balanceLine}>
                  Wallet: {formatBC(walletBalance)} · Cost: {formatBC(currentPlan?.amountKobo ?? 0)}
                </Text>
              </View>
              {!canAfford && (
                <TouchableOpacity
                  style={s.topUpBtn}
                  onPress={() => router.push(`/(app)/wallet?returnTo=/(app)/listing/${id}/boost`)}
                  activeOpacity={0.8}
                >
                  <Text style={s.topUpBtnText}>Top Up</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Lock note ── */}
            <View style={s.lockNote}>
              <Ionicons name="lock-closed-outline" size={12} color={COLORS.textLight} />
              <Text style={s.lockText}>Deducted instantly from your SwapNaija wallet balance.</Text>
            </View>

            {/* ── CTA ── */}
            {canAfford ? (
              <TouchableOpacity
                style={[s.ctaBtn, boostMutation.isPending && s.ctaBtnLoading]}
                onPress={() => boostMutation.mutate()}
                disabled={boostMutation.isPending}
                activeOpacity={0.85}
              >
                {boostMutation.isPending ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="flash" size={18} color="#fff" />
                    <Text style={s.ctaBtnText}>
                      Boost for {currentPlan?.days} Days — ₦{((currentPlan?.amountKobo ?? 0) / 100).toLocaleString()}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={s.ctaBtnOutline}
                onPress={() => router.push(`/(app)/wallet?returnTo=/(app)/listing/${id}/boost`)}
                activeOpacity={0.85}
              >
                <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
                <Text style={s.ctaBtnOutlineText}>Top Up Wallet First</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6F9' },
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.textSecondary, fontSize: 15 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  headerBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, backgroundColor: '#F0F2F5',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  content: { padding: 16, gap: 14 },

  // ── Listing preview ───────────────────────────────────────────────────────
  listingCard: {
    backgroundColor: '#fff', borderRadius: 18,
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  listingImg: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#E2E8F0', flexShrink: 0 },
  listingInfo: { flex: 1 },
  listingTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 21 },
  listingValue: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginTop: 3 },
  listingDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 17 },
  boostedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
  boostedBadgeText: { fontSize: 11, fontWeight: '600', color: AMBER },

  // ── Already boosted ───────────────────────────────────────────────────────
  alreadyBoosted: {
    backgroundColor: AMBER_LIGHT, borderRadius: 22,
    padding: 36, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: AMBER_BORDER,
  },
  alreadyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  alreadyDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  viewListingBtn: { marginTop: 4 },
  viewListingText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  // ── Hero banner ───────────────────────────────────────────────────────────
  heroBanner: {
    borderRadius: 22, padding: 20, gap: 12, overflow: 'hidden',
    // amber → orange gradient via layered backgrounds
    backgroundColor: AMBER,
  },
  heroCircle: {
    position: 'absolute', borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIconWrap: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  heroBody: { fontSize: 14, color: 'rgba(255,255,255,0.92)', lineHeight: 21 },

  // ── Benefits ──────────────────────────────────────────────────────────────
  benefitsWrap: {
    backgroundColor: '#fff', borderRadius: 18,
    padding: 16, gap: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  benefitIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: AMBER_LIGHT,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 1, borderColor: AMBER_BORDER,
  },
  benefitText: { flex: 1 },
  benefitLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  benefitDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, lineHeight: 17 },

  // ── Plans ─────────────────────────────────────────────────────────────────
  planHeading: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  planCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 2, borderColor: '#E2E8F0',
  },
  planCardActive: { borderColor: AMBER, backgroundColor: AMBER_LIGHT },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#CBD5E1',
  },
  planRadioFilled: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: AMBER,
    alignItems: 'center', justifyContent: 'center',
  },
  planRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: AMBER },
  planDays: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  planDaysActive: { color: '#92400E' },
  planSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  planRight: { alignItems: 'flex-end' },
  planPrice: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  planPriceActive: { color: '#92400E' },
  planFrom: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // ── Wallet balance ────────────────────────────────────────────────────────
  balanceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 14, borderWidth: 1,
  },
  balanceOk:  { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  balanceLow: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  balanceInfo: { flex: 1 },
  balanceStatus: { fontSize: 13, fontWeight: '700' },
  balanceStatusOk:  { color: '#065F46' },
  balanceStatusLow: { color: '#991B1B' },
  balanceLine: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  topUpBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  topUpBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // ── Lock note ─────────────────────────────────────────────────────────────
  lockNote: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockText: { fontSize: 12, color: COLORS.textLight, flex: 1, lineHeight: 17 },

  // ── CTAs ──────────────────────────────────────────────────────────────────
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: AMBER, borderRadius: 18, paddingVertical: 17,
    shadowColor: AMBER, shadowOpacity: 0.35, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 7,
  },
  ctaBtnLoading: { opacity: 0.75 },
  ctaBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  ctaBtnOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 18, paddingVertical: 17,
    borderWidth: 2, borderColor: COLORS.primary,
  },
  ctaBtnOutlineText: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
});
