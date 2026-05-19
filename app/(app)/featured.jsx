import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions, Platform, StatusBar, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { searchListings, getCategories } from '../../src/api/listings.api';
import {
  COLORS, resolveImageUrl, getListingPlaceholder, formatCurrency,
} from '../../src/utils/currency';
import Avatar from '../../src/components/ui/Avatar';
import Spinner from '../../src/components/ui/Spinner';
import BackButton from '../../src/components/ui/BackButton';

const { width: SW } = Dimensions.get('window');
const LIMIT = 20;
const CARD_W = (SW - 42) / 2;

const SORT_OPTIONS = [
  { value: 'popular',    label: 'Most Popular'  },
  { value: 'newest',     label: 'Newest First'  },
  { value: 'value_desc', label: 'Highest Value' },
  { value: 'value_asc',  label: 'Lowest Value'  },
];

const SIGNALS = [
  { icon: 'star',           label: 'Featured Now',     color: '#D97706', bg: '#FFFBEB' },
  { icon: 'shield-checkmark',label: 'Verified Sellers', color: '#059669', bg: '#ECFDF5', value: '89%' },
  { icon: 'cash-outline',   label: 'Avg Value',         color: '#2563EB', bg: '#EFF6FF', value: '₦120k' },
  { icon: 'trending-up',    label: 'Swap Success',      color: '#7C3AED', bg: '#F5F3FF', value: '91%' },
];

const STEPS = [
  { icon: 'ribbon',           color: '#D97706', bg: '#FFFBEB', num: '01', title: 'Boosted by the Trader',  desc: 'Traders pay a small boost fee to get their listing elevated into the Featured feed for maximum visibility.' },
  { icon: 'shield-checkmark', color: '#059669', bg: '#ECFDF5', num: '02', title: 'Quality Reviewed',        desc: 'Boosted listings are checked for accurate descriptions, clear photos, and fair value before going live.' },
  { icon: 'flash',            color: '#2563EB', bg: '#EFF6FF', num: '03', title: 'Higher Visibility',        desc: 'Featured items appear at the top of search results and in the dedicated Featured feed for 7–30 days.' },
  { icon: 'flame',            color: '#7C3AED', bg: '#F5F3FF', num: '04', title: 'Faster Swaps',             desc: 'Featured listings receive up to 5× more proposals than standard listings in the same category.' },
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
        <View style={lc.featBadge}>
          <Ionicons name="star" size={9} color="#fff" />
          <Text style={lc.featText}>Featured</Text>
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
      <Text style={h.bigIcon}>⭐</Text>

      <View style={h.badge}>
        <Ionicons name="star" size={11} color="#93C5FD" />
        <Text style={h.badgeText}>Hand-picked & boosted · Highest quality on SwapNaija</Text>
      </View>
      <Text style={h.title}>Featured{'\n'}Listings</Text>
      <Text style={h.sub}>The best of SwapNaija — boosted by traders, quality-reviewed, and optimised for fast, successful swaps.</Text>
      <View style={h.statsRow}>
        {[
          { val: total ? `${total}` : '—', label: 'Featured' },
          { val: 'Quality',               label: 'Reviewed' },
          { val: '5×',                    label: 'More Proposals' },
          { val: '91%',                   label: 'Swap Success' },
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

export default function FeaturedScreen() {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState('popular');
  const [page, setPage] = useState(1);
  const [showSort, setShowSort] = useState(false);
  const [allListings, setAllListings] = useState([]);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories, staleTime: Infinity });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['featured', page, categoryId, sort],
    queryFn: () => searchListings({ isBoosted: true, sort, page, limit: LIMIT, categoryId: categoryId || undefined }),
    keepPreviousData: true,
  });

  useEffect(() => {
    if (data?.listings) setAllListings(prev => page === 1 ? data.listings : [...prev, ...data.listings]);
  }, [data]);

  const total = data?.total ?? 0;
  const totalPages = total ? Math.ceil(total / LIMIT) : 1;
  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label || 'Sort';

  const handleCat = (id) => { setCategoryId(id); setPage(1); setAllListings([]); };
  const handleSort = (v) => { setSort(v); setPage(1); setAllListings([]); setShowSort(false); };

  const signals = [
    { ...SIGNALS[0], value: total ? String(total) : '—' },
    ...SIGNALS.slice(1),
  ];

  const ListHeader = () => (
    <View style={s.listHeader}>
      {/* Hero */}
      <Hero total={total} />

      {/* Signal cards */}
      <View style={s.signalGrid}>
        {signals.map((sig) => (
          <View key={sig.label} style={[s.sigCard, { backgroundColor: sig.bg }]}>
            <View style={s.sigTop}>
              <Ionicons name={sig.icon} size={14} color={sig.color} />
              <Text style={[s.sigLabel, { color: COLORS.textLight }]}>{sig.label.toUpperCase()}</Text>
            </View>
            <Text style={[s.sigVal, { color: sig.color }]}>{sig.value}</Text>
          </View>
        ))}
      </View>

      {/* What featured means */}
      <View style={s.howCard}>
        <View style={s.howHead}>
          <View style={[s.howIconWrap, { backgroundColor: '#FFFBEB' }]}>
            <Ionicons name="star" size={16} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.howTitle}>What Makes a Listing "Featured"?</Text>
            <Text style={s.howSub}>Quality-reviewed · Trader-boosted · High swap success</Text>
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
          <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
          <Text style={s.howFooterText}>All featured listings are backed by SwapNaija's escrow protection.</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <View>
          <Text style={s.controlsTitle}>Featured Listings</Text>
          {!isLoading && <Text style={s.controlsSub}>{total} featured listings</Text>}
        </View>
        <View style={s.controlsRight}>
          <TouchableOpacity style={s.sortBtn} onPress={() => setShowSort(v => !v)} activeOpacity={0.75}>
            <Ionicons name="swap-vertical" size={13} color="#D97706" />
            <Text style={s.sortBtnText}>{activeSortLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.refreshBtn} onPress={() => { setPage(1); setAllListings([]); refetch(); }} activeOpacity={0.75}>
            <Ionicons name="refresh" size={14} color="#D97706" />
          </TouchableOpacity>
        </View>
      </View>
      {showSort && (
        <View style={s.sortDropdown}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.value} style={[s.sortOpt, sort === opt.value && s.sortOptActive]} onPress={() => handleSort(opt.value)}>
              <Text style={[s.sortOptText, sort === opt.value && { color: COLORS.primary, fontWeight: '700' }]}>{opt.label}</Text>
              {sort === opt.value && <Ionicons name="checkmark" size={14} color={COLORS.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {[{ id: '', name: 'All', icon: '⭐' }, ...categories].map(cat => {
          const active = categoryId === cat.id;
          return (
            <TouchableOpacity key={cat.id} style={[s.chip, active && s.chipActive]} onPress={() => handleCat(cat.id)}>
              <Text style={[s.chipText, active && s.chipTextActive]}>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <BackButton fallback="/" />
        <Text style={s.headerTitle}>Featured Listings</Text>
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
                <Ionicons name="star" size={18} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={s.tipTitle}>Want your listing to appear here?</Text>
                  <Text style={s.tipDesc}>Boost any listing to get it featured in this feed. Boosts start from just ₦500.</Text>
                </View>
                <TouchableOpacity style={s.tipBtn} onPress={() => router.push('/(app)/boost')} activeOpacity={0.8}>
                  <Text style={s.tipBtnText}>Boost →</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 32 }} />
            </View>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}><Ionicons name="star-outline" size={32} color={COLORS.textLight} /></View>
              <Text style={s.emptyTitle}>No featured listings yet</Text>
              <Text style={s.emptySub}>Boost your listing to get it featured here!</Text>
              <TouchableOpacity style={s.emptyAction} onPress={() => router.push('/(app)/boost')} activeOpacity={0.8}>
                <Text style={s.emptyActionText}>Boost a Listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const h = StyleSheet.create({
  card: { backgroundColor: '#04091f', padding: 20, overflow: 'hidden', marginBottom: 14 },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(59,130,246,0.18)' },
  bigIcon: { position: 'absolute', right: 20, top: 24, fontSize: 80, opacity: 0.12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 14 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 34, marginBottom: 8 },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 19, marginBottom: 18, maxWidth: SW * 0.7 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 14, gap: 0 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 14, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
});

const lc = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  imgWrap: { height: 120, backgroundColor: COLORS.gray100, position: 'relative' },
  img: { width: '100%', height: '100%' },
  featBadge: { position: 'absolute', top: 7, left: 7, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F59E0B', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  featText: { fontSize: 9, fontWeight: '800', color: '#fff' },
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
  sigLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
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

  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
  controlsTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  controlsSub: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  controlsRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#FDE68A' },
  sortBtnText: { fontSize: 12, fontWeight: '700', color: '#D97706' },
  refreshBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FDE68A' },
  sortDropdown: { marginHorizontal: 16, backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, overflow: 'hidden' },
  sortOpt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  sortOptActive: { backgroundColor: COLORS.primaryLight },
  sortOptText: { fontSize: 14, fontWeight: '500', color: COLORS.text },

  chips: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#fff' },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 16, marginTop: 8, marginBottom: 14 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.white, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  pageBtnOff: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  pageInfo: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },

  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FFFBEB', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#FDE68A' },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 3 },
  tipDesc: { fontSize: 11, color: '#B45309', lineHeight: 16 },
  tipBtn: { backgroundColor: '#FDE68A', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  tipBtnText: { fontSize: 12, fontWeight: '800', color: '#92400E' },

  empty: { alignItems: 'center', paddingTop: 48, gap: 10, paddingHorizontal: 24 },
  emptyIcon: { width: 68, height: 68, borderRadius: 20, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  emptyAction: { backgroundColor: '#FFFBEB', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: '#FDE68A', marginTop: 4 },
  emptyActionText: { fontSize: 14, fontWeight: '700', color: '#D97706' },
});
