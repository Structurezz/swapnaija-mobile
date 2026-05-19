import React, { useState, useRef } from 'react';
import { useScrollToTop } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, RefreshControl, Platform, StatusBar,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMySwaps } from '../../../src/api/swaps.api';
import { useAuthStore } from '../../../src/store/auth.store';
import { COLORS } from '../../../src/utils/currency';
import SwapCard from '../../../src/components/ui/SwapCard';
import Spinner from '../../../src/components/ui/Spinner';

const FILTERS = [
  { label: 'All',       value: '',           color: COLORS.primary, bg: '#E8F8F2' },
  { label: 'Pending',   value: 'proposed',   color: '#92400E',      bg: '#FEF3C7' },
  { label: 'Accepted',  value: 'accepted',   color: '#1D4ED8',      bg: '#DBEAFE' },
  { label: 'In Escrow', value: 'in_escrow',  color: '#5B21B6',      bg: '#EDE9FE' },
  { label: 'Shipped',   value: 'shipped',    color: '#854D0E',      bg: '#FEF9C3' },
  { label: 'Disputed',  value: 'disputed',   color: '#991B1B',      bg: '#FEE2E2' },
  { label: 'Done',      value: 'completed',  color: '#065F46',      bg: '#D1FAE5' },
];

const STATUS_ICON = {
  proposed:  'time-outline',
  accepted:  'checkmark-circle-outline',
  in_escrow: 'shield-checkmark-outline',
  shipped:   'cube-outline',
  completed: 'checkmark-done-circle',
  disputed:  'alert-circle-outline',
  cancelled: 'close-circle-outline',
};

export default function SwapsScreen() {
  const [filter, setFilter] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);
  const listRef = useRef(null);
  useScrollToTop(listRef);
  const { user } = useAuthStore();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['swaps', filter],
    queryFn: () => getMySwaps(filter || undefined),
  });

  const allSwaps = data?.swaps ?? (Array.isArray(data) ? data : []);
  const swaps = searchQuery.trim()
    ? allSwaps.filter(sw => {
        const q = searchQuery.toLowerCase();
        return (
          sw.initiatorListing?.title?.toLowerCase().includes(q) ||
          sw.receiverListing?.title?.toLowerCase().includes(q) ||
          sw.initiatorId?.fullName?.toLowerCase().includes(q) ||
          sw.receiverId?.fullName?.toLowerCase().includes(q)
        );
      })
    : allSwaps;
  const active = FILTERS.find(f => f.value === filter) || FILTERS[0];

  // compute mini stats from all swaps (unfiltered would be ideal but we use available)
  const total    = swaps.length;
  const pending  = swaps.filter(s => s.status === 'proposed').length;
  const active_  = swaps.filter(s => ['accepted','in_escrow','shipped'].includes(s.status)).length;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* ── Header ── */}
      <View style={s.header}>
        {searchOpen ? (
          <View style={s.searchRow}>
            <View style={s.searchInputWrap}>
              <Ionicons name="search-outline" size={16} color={COLORS.textLight} style={s.searchIcon} />
              <TextInput
                ref={searchRef}
                style={s.searchInput}
                placeholder="Search swaps, items, people…"
                placeholderTextColor={COLORS.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => { setSearchOpen(false); setSearchQuery(''); }}
              style={s.cancelBtn}
              activeOpacity={0.7}
            >
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View>
              <Text style={s.headerTitle}>My Swaps</Text>
              <Text style={s.headerSub}>Track all your trades in one place</Text>
            </View>
            <TouchableOpacity
              style={s.searchBtn}
              onPress={() => setSearchOpen(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Stats strip ── */}
      {!isLoading && swaps.length > 0 && (
        <View style={s.statsRow}>
          {[
            { label: 'Total',   value: total,   color: COLORS.primary },
            { label: 'Pending', value: pending,  color: '#D97706' },
            { label: 'Active',  value: active_,  color: '#2563EB' },
          ].map(({ label, value, color }) => (
            <View key={label} style={s.statCell}>
              <Text style={[s.statVal, { color }]}>{value}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Filter tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtersContent}
        style={s.filtersScroll}
      >
        {FILTERS.map((f) => {
          const isActive = filter === f.value;
          const count = f.value === ''
            ? swaps.length
            : swaps.filter(sw => sw.status === f.value).length;
          return (
            <TouchableOpacity
              key={f.value}
              style={[s.tab, isActive && { backgroundColor: f.bg, borderColor: f.color }]}
              onPress={() => setFilter(f.value)}
              activeOpacity={0.75}
            >
              {f.value !== '' && (
                <View style={[s.tabDot, { backgroundColor: isActive ? f.color : COLORS.gray300 }]} />
              )}
              <Text style={[s.tabLabel, isActive && { color: f.color, fontWeight: '700' }]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[s.tabBadge, isActive && { backgroundColor: f.color }]}>
                  <Text style={[s.tabBadgeText, isActive && { color: '#fff' }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── List ── */}
      {isLoading ? (
        <View style={s.centered}><Spinner /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={swaps}
          keyExtractor={item => item.id || item._id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="swap-horizontal-outline" size={36} color={COLORS.textLight} />
              </View>
              <Text style={s.emptyTitle}>
                {filter ? `No ${active.label.toLowerCase()} swaps` : 'No swaps yet'}
              </Text>
              <Text style={s.emptySub}>
                {filter
                  ? 'Try a different filter above.'
                  : 'Browse listings and propose your first swap!'}
              </Text>
              {!filter && (
                <TouchableOpacity
                  style={s.emptyAction}
                  onPress={() => router.push('/(app)')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="search-outline" size={15} color={COLORS.primary} />
                  <Text style={s.emptyActionText}>Browse Listings</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <SwapCard swap={item} currentUserId={user?.id} />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6F9' },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: 20, paddingBottom: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  searchBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.gray100,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border, marginTop: 4,
  },

  searchRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 12, paddingHorizontal: 10, height: 40,
    borderWidth: 1, borderColor: COLORS.border, gap: 6,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 0,
  },
  cancelBtn: { paddingVertical: 6 },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  statsRow: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: 0,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },

  filtersScroll: { backgroundColor: COLORS.white, maxHeight: 58 },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },

  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, height: 36, borderRadius: 18,
    backgroundColor: COLORS.gray100,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  tabDot: { width: 6, height: 6, borderRadius: 3 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.gray200,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary },

  listContent: { padding: 14, gap: 10, paddingBottom: 32 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: COLORS.gray100,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryLight, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 11,
    borderWidth: 1, borderColor: `${COLORS.primary}30`, marginTop: 4,
  },
  emptyActionText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
});
