import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, StatusBar, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMyListings } from '../../src/api/listings.api';
import { COLORS, resolveImageUrl, getListingPlaceholder } from '../../src/utils/currency';
import Spinner from '../../src/components/ui/Spinner';
import BackButton from '../../src/components/ui/BackButton';

const AMBER  = '#F59E0B';
const ORANGE = '#EA580C';
const AMBER_LIGHT = '#FFFBEB';
const AMBER_BORDER = '#FDE68A';

const BENEFITS = [
  { icon: 'trending-up',  label: '10× more visibility'        },
  { icon: 'eye',          label: 'Featured on Home page'       },
  { icon: 'search',       label: 'Priority in category feeds'  },
];

export default function BoostSelectScreen() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['my-listings-boost'],
    queryFn:  () => getMyListings(),
    staleTime: 30_000,
  });

  const listings = data?.listings ?? (Array.isArray(data) ? data : []);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={AMBER} />

      {/* ── Amber hero header ── */}
      <View style={s.hero}>
        {/* Decorative circles */}
        <View style={[s.circle, { top: -30, right: -30, width: 130, height: 130 }]} />
        <View style={[s.circle, { bottom: -40, left: 20, width: 90, height: 90 }]} />

        {/* Nav */}
        <View style={s.heroNav}>
          <BackButton dark fallback="/" />
          <Text style={s.heroNavTitle}>Boost a Listing</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Pill badge */}
        <View style={s.heroPill}>
          <Ionicons name="flash" size={11} color="#fff" />
          <Text style={s.heroPillText}>Instant Activation · From ₦500</Text>
        </View>

        {/* Headline */}
        <Text style={s.heroTitle}>Boost Your Listing</Text>
        <Text style={s.heroSub}>
          Pick a listing and get up to{' '}
          <Text style={{ fontWeight: '800', color: '#fff' }}>10× more views.</Text>
          {'\n'}Top of search · Featured homepage section.
        </Text>

        {/* Benefit chips */}
        <View style={s.chips}>
          {BENEFITS.map(b => (
            <View key={b.label} style={s.chip}>
              <Ionicons name={b.icon} size={11} color="#fff" />
              <Text style={s.chipText}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Listing grid ── */}
      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionTitle}>Select a Listing to Boost</Text>
          {!isLoading && listings.length > 0 && (
            <Text style={s.sectionCount}>{listings.length} listing{listings.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <TouchableOpacity
          style={s.newBtn}
          onPress={() => router.push('/(app)/create-listing')}
          activeOpacity={0.75}
        >
          <Ionicons name="add" size={14} color={COLORS.primary} />
          <Text style={s.newBtnText}>New Listing</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.centered}><Spinner /></View>
      ) : listings.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <Ionicons name="flash" size={28} color={AMBER} />
          </View>
          <Text style={s.emptyTitle}>No listings yet</Text>
          <Text style={s.emptySub}>
            Create a listing first — then come back here to boost it and get more views.
          </Text>
          <TouchableOpacity
            style={s.emptyAction}
            onPress={() => router.push('/(app)/create-listing')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.emptyActionText}>Create a Listing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id || item._id}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ListingCard listing={item} router={router} />}
        />
      )}
    </View>
  );
}

function ListingCard({ listing, router }) {
  const isBoosted = listing.isBoosted && listing.boostExpires && new Date(listing.boostExpires) > new Date();
  const imgUri = listing.images?.[0]
    ? resolveImageUrl(listing.images[0])
    : getListingPlaceholder(listing);

  return (
    <View style={s.card}>
      {/* Image */}
      <View style={s.cardImgWrap}>
        <Image source={{ uri: imgUri }} style={s.cardImg} resizeMode="cover" />
        {isBoosted && (
          <View style={s.boostBadge}>
            <Ionicons name="flash" size={9} color="#fff" />
            <Text style={s.boostBadgeText}>Boosted</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>{listing.title}</Text>
        {listing.estimatedValue ? (
          <Text style={s.cardValue}>₦{listing.estimatedValue.toLocaleString()}</Text>
        ) : null}
        {listing.category?.name ? (
          <Text style={s.cardCat} numberOfLines={1}>{listing.category.name}</Text>
        ) : null}

        <View style={s.cardAction}>
          {isBoosted ? (
            <View style={s.boostedState}>
              <Ionicons name="checkmark-circle" size={13} color={AMBER} />
              <Text style={s.boostedStateText} numberOfLines={1}>
                Until {new Date(listing.boostExpires).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={s.boostBtn}
              onPress={() => router.push(`/(app)/listing/${listing.id || listing._id}/boost`)}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={13} color="#fff" />
              <Text style={s.boostBtnText}>Boost</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6F9' },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: AMBER,
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute', borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 18,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroNavTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },

  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, marginBottom: 12,
  },
  heroPillText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8, lineHeight: 30 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 21, marginBottom: 16 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: '#fff' },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  sectionCount: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.primary}18`,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  newBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  // ── Grid ──────────────────────────────────────────────────────────────────
  grid: { paddingHorizontal: 12, paddingBottom: 32 },
  row: { gap: 10, marginBottom: 10 },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    flex: 1, backgroundColor: '#fff',
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardImgWrap: { position: 'relative' },
  cardImg: { width: '100%', height: 110 },
  boostBadge: {
    position: 'absolute', top: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: AMBER,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  boostBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  cardBody: { padding: 10, gap: 3 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', lineHeight: 18 },
  cardValue: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  cardCat: { fontSize: 11, color: '#94A3B8' },

  cardAction: { marginTop: 8 },
  boostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: AMBER, borderRadius: 10,
    paddingVertical: 9,
  },
  boostBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  boostedState: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: AMBER_LIGHT, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 7,
    borderWidth: 1, borderColor: AMBER_BORDER,
  },
  boostedStateText: { fontSize: 11, fontWeight: '600', color: AMBER, flex: 1 },

  // ── Empty + loading ───────────────────────────────────────────────────────
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyWrap: {
    margin: 16, backgroundColor: '#fff',
    borderRadius: 24, padding: 32,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: AMBER_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: AMBER_BORDER,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 4,
  },
  emptyActionText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
