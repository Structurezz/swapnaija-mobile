import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Dimensions, Platform, StatusBar, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getSuggested } from '../../src/api/listings.api';
import {
  COLORS, resolveImageUrl, getListingPlaceholder, formatCurrency,
} from '../../src/utils/currency';
import Avatar from '../../src/components/ui/Avatar';
import Spinner from '../../src/components/ui/Spinner';

const { width: SW } = Dimensions.get('window');
const LIMIT = 20;
const CARD_W = (SW - 42) / 2;

const AI_SIGNALS = [
  { icon: 'locate',        label: 'Category Match',   color: '#2563EB', bg: '#EFF6FF', value: '94%' },
  { icon: 'trending-up',   label: 'Value Alignment',  color: '#059669', bg: '#ECFDF5', value: '87%' },
  { icon: 'flash',         label: 'Swap Probability', color: '#D97706', bg: '#FFFBEB', value: '79%' },
  { icon: 'star',          label: 'Trust Score',      color: '#7C3AED', bg: '#F5F3FF', value: '★★★★' },
];

const STEPS = [
  { icon: 'hardware-chip', color: '#7C3AED', bg: '#F5F3FF', num: '01', title: 'Analyses Your Listings',   desc: "Our AI scans everything you've listed — categories, estimated values, condition, and keywords." },
  { icon: 'locate',        color: '#2563EB', bg: '#EFF6FF', num: '02', title: 'Matches Swap Wants',        desc: 'It cross-references what other swappers are looking for against what you offer.' },
  { icon: 'trending-up',   color: '#059669', bg: '#ECFDF5', num: '03', title: 'Ranks by Compatibility',   desc: 'Listings are ranked by value proximity, category alignment, and swap success probability.' },
  { icon: 'refresh',       color: '#D97706', bg: '#FFFBEB', num: '04', title: 'Learns Over Time',          desc: 'Every swap you make, view, or decline trains the model to improve future recommendations.' },
];

function ListingCard({ listing }) {
  const router = useRouter();
  if (!listing) return null;
  const img = listing.images?.[0] ? resolveImageUrl(listing.images[0]) : getListingPlaceholder(listing);
  const owner = listing.userId?.fullName || 'User';
  return (
    <TouchableOpacity
      style={[lc.card, { width: CARD_W }]}
      onPress={() => router.push(`/(app)/listing/${listing.id}`)}
      activeOpacity={0.88}
    >
      <View style={lc.imgWrap}>
        <Image source={{ uri: img }} style={lc.img} resizeMode="cover" />
        <View style={lc.aiBadge}>
          <Ionicons name="sparkles" size={9} color="#fff" />
          <Text style={lc.aiText}>Match</Text>
        </View>
        {listing.condition && (
          <View style={lc.condBadge}><Text style={lc.condText}>{listing.condition}</Text></View>
        )}
      </View>
      <View style={lc.body}>
        <Text style={lc.title} numberOfLines={2}>{listing.title}</Text>
        <Text style={lc.value}>{formatCurrency(listing.estimatedValue)}</Text>
        <View style={lc.meta}>
          <Ionicons name="location-outline" size={10} color={COLORS.textLight} />
          <Text style={lc.loc} numberOfLines={1}>{listing.locationState || 'Nigeria'}</Text>
        </View>
        <View style={lc.ownerRow}>
          <Avatar uri={listing.userId?.avatarUrl} name={owner} size={16} />
          <Text style={lc.owner} numberOfLines={1}>{owner}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Hero({ total }) {
  return (
    <View style={h.card}>
      <View style={[h.ring, { width: 260, height: 260, top: -90, right: -70 }]} />
      <View style={[h.ring, { width: 140, height: 140, bottom: -50, left: -30 }]} />
      <Text style={h.bigIcon}>✨</Text>

      <View style={h.badge}>
        <Ionicons name="hardware-chip" size={11} color="#C4B5FD" />
        <Text style={h.badgeText}>Powered by SwapNaija AI · Smart Match Engine</Text>
      </View>
      <Text style={h.title}>Suggested{'\n'}For You</Text>
      <Text style={h.sub}>Our AI analyses your listings, swap history, and preferences to surface items most likely to result in a successful trade.</Text>
      <View style={h.statsRow}>
        {[
          { val: total ? `${total}` : '—', label: 'Matches Found' },
          { val: 'Real-time',              label: 'Match Updates' },
          { val: '4 Signals',              label: 'AI Factors' },
          { val: 'Personal',               label: 'To Your Profile' },
        ].map(({ val, label }) => (
          <View key={label} style={h.statItem}>
            <Text style={h.statVal}>{val}</Text>
            <Text style={h.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function SuggestedScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [allListings, setAllListings] = useState([]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['suggested-full', page],
    queryFn: () => getSuggested({ page, limit: LIMIT }),
    keepPreviousData: true,
  });

  useEffect(() => {
    const listings = data?.matches ?? data?.listings ?? [];
    if (listings.length > 0 || page === 1) {
      setAllListings(prev => page === 1 ? listings : [...prev, ...listings]);
    }
  }, [data]);

  const total = data?.total ?? 0;
  const totalPages = total ? Math.ceil(total / LIMIT) : 1;

  const ListHeader = () => (
    <View style={s.listHeader}>
      <Hero total={total} />

      {/* AI Signal cards */}
      <View style={s.signalGrid}>
        {AI_SIGNALS.map((sig) => (
          <View key={sig.label} style={[s.sigCard, { backgroundColor: sig.bg }]}>
            <View style={s.sigTop}>
              <Ionicons name={sig.icon} size={14} color={sig.color} />
              <Text style={s.sigLabel}>{sig.label.toUpperCase()}</Text>
            </View>
            <Text style={[s.sigVal, { color: sig.color }]}>{sig.value}</Text>
          </View>
        ))}
      </View>

      {/* How it works */}
      <View style={s.howCard}>
        <View style={s.howHead}>
          <View style={[s.howIconWrap, { backgroundColor: '#F5F3FF' }]}>
            <Ionicons name="hardware-chip" size={16} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.howTitle}>How the AI Match Engine Works</Text>
            <Text style={s.howSub}>4-step personalisation process</Text>
          </View>
        </View>
        <View style={s.steps}>
          {STEPS.map((step) => (
            <View key={step.num} style={s.stepRow}>
              <View style={[s.stepIcon, { backgroundColor: step.bg }]}>
                <Ionicons name={step.icon} size={18} color={step.color} />
              </View>
              <Text style={s.stepNum}>{step.num}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={s.howFooter}>
          <Ionicons name="shield-checkmark" size={13} color={COLORS.success} />
          <Text style={s.howFooterText}>Matches are recalculated every time you post a listing. Your data is never shared with third parties.</Text>
        </View>
      </View>

      {/* Results header */}
      <View style={s.controls}>
        <View>
          <Text style={s.controlsTitle}>Your Matches</Text>
          {!isLoading && (
            <Text style={s.controlsSub}>
              {total > 0 ? `${total} listings the AI thinks you'll love` : 'Post more listings to unlock matches'}
            </Text>
          )}
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => { setPage(1); setAllListings([]); refetch(); }} activeOpacity={0.75}>
          <Ionicons name="refresh" size={14} color="#7C3AED" />
          <Text style={s.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Suggested For You</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading && allListings.length === 0 ? (
        <View style={s.centered}><Spinner /></View>
      ) : (
        <FlatList
          data={allListings}
          keyExtractor={(item) => item.id || item._id}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && page === 1} onRefresh={() => { setPage(1); setAllListings([]); refetch(); }} tintColor={COLORS.primary} />}
          ListHeaderComponent={<ListHeader />}
          renderItem={({ item }) => <ListingCard listing={item} />}
          ListFooterComponent={
            <View>
              {totalPages > 1 && (
                <View style={s.pagination}>
                  <TouchableOpacity style={[s.pageBtn, page === 1 && s.pageBtnOff]} onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <Ionicons name="chevron-back" size={15} color={page === 1 ? COLORS.gray300 : COLORS.text} />
                    <Text style={[s.pageBtnText, page === 1 && { color: COLORS.gray300 }]}>Previous</Text>
                  </TouchableOpacity>
                  <Text style={s.pageInfo}>Page {page} of {totalPages}</Text>
                  <TouchableOpacity style={[s.pageBtn, page === totalPages && s.pageBtnOff]} onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <Text style={[s.pageBtnText, page === totalPages && { color: COLORS.gray300 }]}>Next</Text>
                    <Ionicons name="chevron-forward" size={15} color={page === totalPages ? COLORS.gray300 : COLORS.text} />
                  </TouchableOpacity>
                </View>
              )}
              <View style={s.tipCard}>
                <Ionicons name="sparkles" size={18} color="#7C3AED" />
                <View style={{ flex: 1 }}>
                  <Text style={s.tipTitle}>Improve your matches</Text>
                  <Text style={s.tipDesc}>The more listings you post with detailed descriptions and accurate values, the smarter your AI suggestions become.</Text>
                </View>
              </View>
              <View style={{ height: 32 }} />
            </View>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}><Ionicons name="sparkles-outline" size={32} color={COLORS.textLight} /></View>
              <Text style={s.emptyTitle}>No AI matches yet</Text>
              <Text style={s.emptySub}>Post some listings so the engine can find your perfect swaps!</Text>
              <TouchableOpacity style={s.emptyAction} onPress={() => router.push('/(app)/create-listing')} activeOpacity={0.8}>
                <Text style={s.emptyActionText}>Create a Listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const h = StyleSheet.create({
  card: { backgroundColor: '#1a0533', padding: 20, overflow: 'hidden', marginBottom: 14 },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  bigIcon: { position: 'absolute', right: 20, top: 24, fontSize: 80, opacity: 0.12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 14 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 34, marginBottom: 8 },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 19, marginBottom: 18, maxWidth: SW * 0.7 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 12, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
});

const lc = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  imgWrap: { height: 120, backgroundColor: COLORS.gray100, position: 'relative' },
  img: { width: '100%', height: '100%' },
  aiBadge: { position: 'absolute', top: 7, left: 7, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#7C3AED', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  aiText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  condBadge: { position: 'absolute', bottom: 7, right: 7, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  condText: { fontSize: 9, fontWeight: '600', color: '#fff' },
  body: { padding: 10, gap: 3 },
  title: { fontSize: 12, fontWeight: '600', color: COLORS.text, lineHeight: 17 },
  value: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  loc: { fontSize: 10, color: COLORS.textLight, flex: 1 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  owner: { fontSize: 10, color: COLORS.textSecondary, flex: 1 },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6F9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.gray100, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listHeader: { gap: 0 },
  listContent: { paddingBottom: 16 },
  row: { gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  signalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  sigCard: { width: (SW - 52) / 2, borderRadius: 18, padding: 14, gap: 6 },
  sigTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sigLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textLight },
  sigVal: { fontSize: 20, fontWeight: '800' },
  howCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 16, marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  howHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  howIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  howTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  howSub: { fontSize: 10, color: COLORS.textLight, marginTop: 1 },
  steps: { gap: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNum: { fontSize: 11, fontWeight: '900', color: COLORS.gray200, width: 20, paddingTop: 11 },
  stepTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  stepDesc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  howFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  howFooterText: { fontSize: 11, color: COLORS.textLight, flex: 1, lineHeight: 15 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 14 },
  controlsTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  controlsSub: { fontSize: 11, color: COLORS.textLight, marginTop: 1, maxWidth: SW * 0.55 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F5F3FF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#DDD6FE' },
  refreshText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 16, marginTop: 8, marginBottom: 14 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.white, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  pageBtnOff: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  pageInfo: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#F5F3FF', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#DDD6FE' },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#5B21B6', marginBottom: 3 },
  tipDesc: { fontSize: 11, color: '#7C3AED', lineHeight: 16 },
  empty: { alignItems: 'center', paddingTop: 48, gap: 10, paddingHorizontal: 24 },
  emptyIcon: { width: 68, height: 68, borderRadius: 20, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  emptyAction: { backgroundColor: COLORS.primaryLight, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: `${COLORS.primary}30`, marginTop: 4 },
  emptyActionText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
});
