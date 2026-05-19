import React, { useState, useEffect, useRef } from 'react';
import { useScrollToTop } from '@react-navigation/native';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ScrollView, Platform, StatusBar, Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchListings, getCategories } from '../../src/api/listings.api';
import {
  COLORS, resolveImageUrl, getListingPlaceholder, formatCurrency,
} from '../../src/utils/currency';
import Spinner from '../../src/components/ui/Spinner';
import Avatar from '../../src/components/ui/Avatar';

function useDebounce(value, delay = 400) {
  const [dv, setDv] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

const SORT_OPTIONS = [
  { label: 'Recent',       value: 'recent' },
  { label: 'Price ↑',     value: 'price_asc' },
  { label: 'Price ↓',     value: 'price_desc' },
];

// ─── Hero card (shown when no search active) ──────────────────────────────────
function HeroCard({ totalCats, router }) {
  return (
    <View style={h.card}>
      <View style={[h.ring, { width: 240, height: 240, top: -90, right: -70 }]} />
      <View style={[h.ring, { width: 120, height: 120, bottom: -40, left: -30 }]} />

      <View style={h.pill}>
        <View style={h.pillDot} />
        <Text style={h.pillText}>SwapNaija · Discover</Text>
      </View>

      <Text style={h.headline}>Find Your{'\n'}Next Swap</Text>
      <Text style={h.sub}>Browse thousands of items and services listed by Nigerians near you.</Text>

      <View style={h.statsRow}>
        {[
          { icon: 'layers-outline',   val: '2,500+',  label: 'Listings' },
          { icon: 'people-outline',   val: '1,200+',  label: 'Traders' },
          { icon: 'grid-outline',     val: totalCats ? `${totalCats}` : '12+', label: 'Categories' },
        ].map(({ icon, val, label }, i, arr) => (
          <React.Fragment key={label}>
            <View style={h.statItem}>
              <Ionicons name={icon} size={16} color={COLORS.primary} style={{ marginBottom: 4 }} />
              <Text style={h.statVal}>{val}</Text>
              <Text style={h.statLabel}>{label}</Text>
            </View>
            {i < arr.length - 1 && <View style={h.statDivider} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

// ─── Listing result card ───────────────────────────────────────────────────────
function ResultCard({ listing }) {
  const router = useRouter();
  if (!listing) return null;
  const img = listing.images?.[0]
    ? resolveImageUrl(listing.images[0])
    : getListingPlaceholder(listing);
  const owner = listing.userId?.fullName || 'User';

  return (
    <TouchableOpacity
      style={rc.card}
      onPress={() => router.push(`/(app)/listing/${listing.id}`)}
      activeOpacity={0.88}
    >
      <View style={rc.imgWrap}>
        <Image source={{ uri: img }} style={rc.img} resizeMode="cover" />
        {listing.isBoosted && (
          <View style={rc.featBadge}>
            <Ionicons name="flash" size={9} color="#fff" />
            <Text style={rc.featText}>Featured</Text>
          </View>
        )}
        {listing.condition && (
          <View style={rc.condBadge}>
            <Text style={rc.condText}>{listing.condition}</Text>
          </View>
        )}
      </View>
      <View style={rc.body}>
        <Text style={rc.title} numberOfLines={2}>{listing.title}</Text>
        <Text style={rc.value}>{formatCurrency(listing.estimatedValue)}</Text>
        <View style={rc.meta}>
          <Ionicons name="location-outline" size={10} color={COLORS.textLight} />
          <Text style={rc.loc} numberOfLines={1}>{listing.locationState || 'Nigeria'}</Text>
        </View>
        <View style={rc.ownerRow}>
          <Avatar uri={listing.userId?.avatarUrl} name={owner} size={18} />
          <Text style={rc.ownerName} numberOfLines={1}>{owner}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Search screen ─────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const router = useRouter();
  const { categoryId: paramCategoryId = '' } = useLocalSearchParams();

  const [query, setQuery]           = useState('');
  const [selectedCat, setSelectedCat] = useState(paramCategoryId);
  const [sort, setSort]             = useState('recent');
  const [showSort, setShowSort]     = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  useScrollToTop(listRef);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => { setSelectedCat(paramCategoryId); }, [paramCategoryId]);

  const { data: catData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['listings-search', debouncedQuery, selectedCat, sort],
    queryFn: () => searchListings({
      q: debouncedQuery || undefined,
      categoryId: selectedCat || undefined,
      sort: sort !== 'recent' ? sort : undefined,
      limit: 40,
    }),
    placeholderData: (prev) => prev,
  });

  const listings = data?.listings ?? (Array.isArray(data) ? data : []);
  const isSearching = !!(debouncedQuery || selectedCat);
  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label || 'Recent';

  const clearQuery = () => { setQuery(''); inputRef.current?.focus(); };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.title}>Discover</Text>
          <TouchableOpacity
            style={s.filterBtn}
            onPress={() => setShowSort(v => !v)}
            activeOpacity={0.75}
          >
            <Ionicons name="options-outline" size={18} color={sort !== 'recent' ? COLORS.primary : COLORS.text} />
            {sort !== 'recent' && <View style={s.filterDot} />}
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={17} color={COLORS.textLight} style={s.searchIcon} />
          <TextInput
            ref={inputRef}
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search listings, services…"
            placeholderTextColor={COLORS.textLight}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isFetching && <Spinner size="small" />}
          {query.length > 0 && !isFetching && (
            <TouchableOpacity onPress={clearQuery} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort options (expandable) */}
        {showSort && (
          <View style={s.sortRow}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[s.sortChip, sort === opt.value && s.sortChipActive]}
                onPress={() => { setSort(opt.value); setShowSort(false); }}
                activeOpacity={0.75}
              >
                <Text style={[s.sortChipText, sort === opt.value && s.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── Category chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.catList}
        style={s.catScroll}
      >
        <TouchableOpacity
          style={[s.catChip, !selectedCat && s.catChipActive]}
          onPress={() => setSelectedCat('')}
          activeOpacity={0.75}
        >
          <View style={[s.catIconBox, !selectedCat && s.catIconBoxActive]}>
            <Ionicons name="grid-outline" size={14} color={!selectedCat ? COLORS.primary : COLORS.textSecondary} />
          </View>
          <Text style={[s.catLabel, !selectedCat && s.catLabelActive]}>All</Text>
        </TouchableOpacity>

        {catData.map((cat) => {
          const active = selectedCat === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[s.catChip, active && s.catChipActive]}
              onPress={() => setSelectedCat(active ? '' : cat.id)}
              activeOpacity={0.75}
            >
              <View style={[s.catIconBox, active && s.catIconBoxActive]}>
                <Text style={s.catEmoji}>{cat.icon}</Text>
              </View>
              <Text style={[s.catLabel, active && s.catLabelActive]} numberOfLines={1}>
                {cat.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Main content ── */}
      {isLoading && listings.length === 0 ? (
        <View style={s.centered}><Spinner /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={listings}
          keyExtractor={(item) => item.id || item._id}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Hero card — only when not searching */}
              {!isSearching && (
                <View style={s.heroPad}>
                  <HeroCard totalCats={catData.length} router={router} />
                </View>
              )}

              {/* Result count bar */}
              {isSearching && (
                <View style={s.resultBar}>
                  <Text style={s.resultCount}>
                    <Text style={s.resultNum}>{listings.length}</Text>
                    {' '}result{listings.length !== 1 ? 's' : ''}
                    {selectedCat ? ` in ${catData.find(c => c.id === selectedCat)?.name || 'category'}` : ''}
                    {debouncedQuery ? ` for "${debouncedQuery}"` : ''}
                  </Text>
                  <TouchableOpacity
                    style={s.sortPill}
                    onPress={() => setShowSort(v => !v)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="swap-vertical" size={13} color={COLORS.primary} />
                    <Text style={s.sortPillText}>{activeSortLabel}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => <ResultCard listing={item} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="search-outline" size={32} color={COLORS.textLight} />
              </View>
              <Text style={s.emptyTitle}>No listings found</Text>
              <Text style={s.emptySub}>
                {isSearching
                  ? 'Try a different search term or category.'
                  : 'Be the first to list something amazing!'}
              </Text>
              {isSearching && (
                <TouchableOpacity
                  style={s.emptyAction}
                  onPress={() => { setQuery(''); setSelectedCat(''); }}
                  activeOpacity={0.8}
                >
                  <Text style={s.emptyActionText}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Hero card styles ──────────────────────────────────────────────────────────
const h = StyleSheet.create({
  card: {
    backgroundColor: '#0A1628',
    borderRadius: 26,
    padding: 22,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(29,158,117,0.2)',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(29,158,117,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  pillText: { fontSize: 11, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5 },
  headline: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 36,
    marginBottom: 8,
  },
  sub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 20,
    marginBottom: 22,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 15, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },
});

// ─── Result card styles ────────────────────────────────────────────────────────
const rc = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imgWrap: { height: 128, backgroundColor: COLORS.gray100, position: 'relative' },
  img: { width: '100%', height: '100%' },
  featBadge: {
    position: 'absolute', top: 7, left: 7,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  featText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  condBadge: {
    position: 'absolute', bottom: 7, right: 7,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7,
  },
  condText: { fontSize: 9, fontWeight: '600', color: '#fff' },
  body: { padding: 10, gap: 3 },
  title: { fontSize: 13, fontWeight: '600', color: COLORS.text, lineHeight: 18 },
  value: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  loc: { fontSize: 10, color: COLORS.textLight, flex: 1 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  ownerName: { fontSize: 10, color: COLORS.textSecondary, flex: 1 },
});

// ─── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6F9' },

  // Header
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  filterBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.gray100,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    position: 'relative',
  },
  filterDot: {
    position: 'absolute', top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5, borderColor: COLORS.white,
  },

  // Search bar
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.gray100,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 0,
  },

  // Sort
  sortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  sortChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  sortChipTextActive: { color: COLORS.primary },

  // Category chips
  catScroll: { backgroundColor: COLORS.white, flexShrink: 0 },
  catList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  catChip: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 58,
  },
  catChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  catIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  catIconBoxActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: `${COLORS.primary}40`,
  },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
  catLabelActive: { color: COLORS.primary, fontWeight: '700' },

  // List
  heroPad: { marginBottom: 16 },
  listContent: { padding: 14, paddingTop: 14, gap: 0 },
  row: { gap: 10, marginBottom: 10 },

  // Result bar
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultCount: { fontSize: 13, color: COLORS.textSecondary },
  resultNum: { fontWeight: '700', color: COLORS.text },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  sortPillText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  // States
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 24 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: COLORS.gray100,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyAction: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    marginTop: 4,
  },
  emptyActionText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
});
