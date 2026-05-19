import React, { useState, useRef, useEffect } from 'react';
import { useScrollToTop } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, RefreshControl, Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getHomeFeed, getSuggested } from '../../src/api/listings.api';
import { useAuthStore } from '../../src/store/auth.store';
import { COLORS } from '../../src/utils/currency';
import ListingCard from '../../src/components/ui/ListingCard';
import Avatar from '../../src/components/ui/Avatar';
import Spinner from '../../src/components/ui/Spinner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Banner data ───────────────────────────────────────────────────────────────
const BANNERS = [
  {
    id: '1',
    tag:   'Welcome to SwapNaija',
    badge: '🔥 Trending now',
    title: 'Swap Smarter,\nNot Harder',
    subtitle: "Nigeria's #1 peer-to-peer barter marketplace. List your item in 60 seconds and find your perfect trade today.",
    cta: 'Start Swapping',
    ctaRoute: '/(app)/create-listing',
    ctaSecondary: 'Browse Items',
    ctaSecondaryRoute: '/(app)/search',
    bg: '#0f7a5a', overlay: '#1db87d',
    stats: [
      { value: '10,000+', label: 'Active Swappers' },
      { value: '50,000+', label: 'Items Listed' },
      { value: '₦0',      label: 'Listing Fee' },
    ],
    emoji: '🔄',
  },
  {
    id: '2',
    tag:   'Discover New Items',
    badge: '⚡ 500+ new today',
    title: 'Fresh Drops\nEvery Day',
    subtitle: 'Electronics, fashion, furniture, phones, and more — hundreds of new listings added daily by verified swappers.',
    cta: 'Browse All Items',
    ctaRoute: '/(app)/search',
    ctaSecondary: 'Fresh Drops',
    ctaSecondaryRoute: '/(app)/fresh-drops',
    bg: '#D97706', overlay: '#EF4444',
    stats: [
      { value: '500+', label: 'New Today' },
      { value: '20+',  label: 'Categories' },
      { value: '4.8★', label: 'Avg Rating' },
    ],
    emoji: '🛍️',
  },
  {
    id: '3',
    tag:   'Trade With Confidence',
    badge: '🔒 Bank-grade security',
    title: 'Escrow Protection\nFor Every Swap',
    subtitle: "SwapNaija holds both parties' deposits in secure escrow until the deal is confirmed — zero risk, maximum trust.",
    cta: 'How It Works',
    ctaRoute: '/(app)/wallet',
    ctaSecondary: 'Top Up Wallet',
    ctaSecondaryRoute: '/(app)/wallet',
    bg: '#4338CA', overlay: '#7C3AED',
    stats: [
      { value: '100%',  label: 'Secure Escrow' },
      { value: '< 24h', label: 'Dispute Resolution' },
      { value: '99.2%', label: 'Success Rate' },
    ],
    emoji: '🛡️',
  },
  {
    id: '4',
    tag:   'Build Your Reputation',
    badge: '✅ Permanent badge',
    title: 'Get Verified\n& Stand Out',
    subtitle: 'A verified badge boosts your swap acceptance rate by 3×. One-time fee of ₦1,000 from your wallet — badge is permanent.',
    cta: 'Get Verified',
    ctaRoute: '/(app)/verify-account',
    ctaSecondary: 'See Benefits',
    ctaSecondaryRoute: '/(app)/verify-account',
    bg: '#1D4ED8', overlay: '#0891B2',
    stats: [
      { value: '3×',    label: 'More Swap Offers' },
      { value: 'Top',   label: 'Search Ranking' },
      { value: '₦1,000',label: 'One-Time Only' },
    ],
    emoji: '🏅',
  },
  {
    id: '5',
    tag:   'Grow Your Reach',
    badge: '🚀 Instant activation',
    title: 'Boost & Get\n10× More Views',
    subtitle: 'Boosted listings appear at the top of search and on the Featured homepage section — seen by thousands of active swappers.',
    cta: 'Boost a Listing',
    ctaRoute: '/(app)/boost',
    ctaSecondary: 'View Plans',
    ctaSecondaryRoute: '/(app)/boost',
    bg: '#E11D48', overlay: '#C026D3',
    stats: [
      { value: '10×',  label: 'More Visibility' },
      { value: 'From', label: '₦500 only' },
      { value: '7–30', label: 'Day Plans' },
    ],
    emoji: '⚡',
  },
];

// ─── Campaign widgets ──────────────────────────────────────────────────────────
const CAMPAIGNS = [
  {
    icon: 'shield-checkmark',
    bg: '#EFF6FF',
    color: '#2563EB',
    title: 'Verify Account',
    desc: 'Get a verified badge and build trust.',
    route: '/verify-account',
  },
  {
    icon: 'gift',
    bg: '#F5F3FF',
    color: '#7C3AED',
    title: 'Invite & Earn',
    desc: 'Invite friends and earn swap credits.',
    route: '/invite',
  },
  {
    icon: 'flash',
    bg: '#FFFBEB',
    color: '#D97706',
    title: 'Boost Listing',
    desc: 'Get 10× more visibility today.',
    route: '/swaps',
  },
];

// ─── Hero Carousel ─────────────────────────────────────────────────────────────
function HeroCarousel({ router }) {
  const [active, setActive] = useState(0);
  const listRef = useRef(null);
  const timerRef = useRef(null);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setActive(prev => {
        const next = (prev + 1) % BANNERS.length;
        listRef.current?.scrollToOffset({ offset: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, 5000);
  };

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const onDotPress = (i) => {
    clearInterval(timerRef.current);
    setActive(i);
    listRef.current?.scrollToOffset({ offset: i * SCREEN_WIDTH, animated: true });
    startTimer();
  };

  return (
    <View>
      <FlatList
        ref={listRef}
        data={BANNERS}
        keyExtractor={(b) => b.id}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActive(idx);
        }}
        renderItem={({ item: b }) => (
          <View style={[bn.slide, { backgroundColor: b.bg }]}>
            {/* Gradient overlay (right half fade) */}
            <View style={[bn.overlay, { backgroundColor: b.overlay }]} />

            {/* Decorative circles */}
            <View style={[bn.circle, { top: -30, right: -30, width: 160, height: 160 }]} />
            <View style={[bn.circle, { bottom: -50, left: -20, width: 110, height: 110 }]} />

            {/* Large background emoji */}
            <Text style={bn.bigEmoji}>{b.emoji}</Text>

            {/* Content */}
            <View style={bn.content}>
              {/* Badge */}
              <View style={bn.badge}>
                <Text style={bn.badgeText}>{b.badge}</Text>
              </View>

              {/* Tag label */}
              <Text style={bn.tag}>{b.tag}</Text>

              {/* Title */}
              <Text style={bn.title}>{b.title}</Text>

              {/* Subtitle */}
              <Text style={bn.subtitle} numberOfLines={3}>{b.subtitle}</Text>

              {/* CTAs */}
              <View style={bn.ctaRow}>
                <TouchableOpacity
                  style={bn.ctaPrimary}
                  onPress={() => router.push(b.ctaRoute)}
                  activeOpacity={0.85}
                >
                  <Text style={bn.ctaPrimaryText}>{b.cta}</Text>
                  <Ionicons name="arrow-forward" size={12} color={COLORS.text} />
                </TouchableOpacity>
                {b.ctaSecondary && (
                  <TouchableOpacity
                    style={bn.ctaGhost}
                    onPress={() => router.push(b.ctaSecondaryRoute)}
                    activeOpacity={0.85}
                  >
                    <Text style={bn.ctaGhostText}>{b.ctaSecondary}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Stats strip */}
              <View style={bn.statsRow}>
                {b.stats.map((st) => (
                  <View key={st.label} style={bn.statItem}>
                    <Text style={bn.statVal}>{st.value}</Text>
                    <Text style={bn.statLabel}>{st.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      />

      {/* Dot indicators */}
      <View style={bn.dots}>
        {BANNERS.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => onDotPress(i)}>
            <View style={[bn.dot, i === active && bn.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, onSeeAll }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{icon ? `${icon} ` : ''}{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn}>
          <Text style={styles.seeAll}>See all</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Horizontal listing row ────────────────────────────────────────────────────
function HorizontalListings({ data, loading }) {
  if (loading) return <Spinner size="small" />;
  if (!data?.length) return <Text style={styles.empty}>Nothing here yet</Text>;
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.hList}
      renderItem={({ item }) => <ListingCard listing={item} />}
    />
  );
}

// ─── Home screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const { data: feed, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['home-feed'],
    queryFn: getHomeFeed,
    staleTime: 2 * 60 * 1000,
  });

  const { data: suggested, isLoading: suggestLoading } = useQuery({
    queryKey: ['suggested'],
    queryFn: () => getSuggested({ limit: 10 }),
  });

  const firstName = user?.fullName?.split(' ')[0] || 'there';
  const suggestedListings = suggested?.matches ?? [];

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
          <Text style={styles.subGreeting}>What will you swap today?</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.walletPill} onPress={() => router.push('/wallet')} activeOpacity={0.75}>
            <Ionicons name="wallet-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <Avatar uri={user?.avatarUrl} name={user?.fullName} size={44} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search bar (tappable, goes to search) ── */}
      <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/search')} activeOpacity={0.7}>
        <Ionicons name="search-outline" size={18} color={COLORS.textLight} />
        <Text style={styles.searchPlaceholder}>Search listings, services...</Text>
      </TouchableOpacity>

      {/* ── Hero carousel ── */}
      <HeroCarousel router={router} />

      {/* ── Category pills ── */}
      {feed?.categories?.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPills}
          style={styles.categoryList}
        >
          <TouchableOpacity style={styles.categoryPill} onPress={() => router.push('/search')}>
            <Text style={styles.categoryIcon}>🔍</Text>
            <Text style={[styles.categoryName, { color: COLORS.primary }]}>All</Text>
          </TouchableOpacity>
          {feed.categories.map(({ category }) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryPill}
              onPress={() => router.push(`/search?categoryId=${category.id}`)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={styles.categoryName}>{category.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Quick links ── */}
      <View style={styles.quickLinks}>
        {[
          { emoji: '⚡', label: 'Fresh Drops', route: '/fresh-drops', bg: '#FFFBEB', color: '#92400E' },
          { emoji: '⭐', label: 'Featured',    route: '/featured',    bg: '#FEF3C7', color: '#92400E' },
          { emoji: '✨', label: 'For You',     route: '/suggested',   bg: '#F5F3FF', color: '#5B21B6' },
          { emoji: '➕', label: 'List Item',   route: '/create-listing', bg: '#E8F8F2', color: '#065F46' },
        ].map((q) => (
          <TouchableOpacity
            key={q.label}
            style={[styles.quickLink, { backgroundColor: q.bg }]}
            onPress={() => router.push(q.route)}
            activeOpacity={0.75}
          >
            <Text style={styles.quickEmoji}>{q.emoji}</Text>
            <Text style={[styles.quickLabel, { color: q.color }]}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sections}>

        {/* ── Campaign widgets ── */}
        <View>
          <SectionHeader icon="✨" title="For You" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.campaigns}>
            {CAMPAIGNS.map((c) => (
              <TouchableOpacity
                key={c.title}
                style={styles.campaignCard}
                onPress={() => router.push(c.route)}
                activeOpacity={0.85}
              >
                <View style={[styles.campaignIcon, { backgroundColor: c.bg }]}>
                  <Ionicons name={c.icon} size={20} color={c.color} />
                </View>
                <View style={styles.campaignText}>
                  <Text style={styles.campaignTitle}>{c.title}</Text>
                  <Text style={styles.campaignDesc}>{c.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Suggested for you ── */}
        {(suggestLoading || suggestedListings.length > 0) && (
          <View>
            <SectionHeader icon="🎯" title="Suggested for You" onSeeAll={() => router.push('/suggested')} />
            <HorizontalListings data={suggestedListings} loading={suggestLoading} />
          </View>
        )}

        {/* ── Featured ── */}
        <View>
          <SectionHeader icon="⭐" title="Featured Listings" onSeeAll={() => router.push('/featured')} />
          <HorizontalListings data={feed?.boosted} loading={isLoading} />
        </View>

        {/* ── Fresh Drops ── */}
        <View>
          <SectionHeader icon="⚡" title="Fresh Drops" onSeeAll={() => router.push('/fresh-drops')} />
          <HorizontalListings data={feed?.fresh} loading={isLoading} />
        </View>

        {/* ── Promo banner ── */}
        <View style={styles.promoBanner}>
          <Text style={styles.promoFlag}>🇳🇬</Text>
          <View style={styles.promoText}>
            <Text style={styles.promoTitle}>Made for Nigeria</Text>
            <Text style={styles.promoDesc}>Swap goods and services with people near you — Lagos, Abuja, Kano and everywhere.</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/search')} style={styles.promoLink}>
            <Text style={styles.promoLinkText}>Explore</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        {/* ── Per-category sections ── */}
        {feed?.categories?.map(({ category, listings }) =>
          listings.length > 0 ? (
            <View key={category.id}>
              <SectionHeader
                icon={category.icon}
                title={category.name}
                onSeeAll={() => router.push(`/search?categoryId=${category.id}`)}
              />
              <HorizontalListings data={listings} loading={false} />
            </View>
          ) : null
        )}

        {/* ── Bottom CTA ── */}
        <View style={styles.bottomCta}>
          <Text style={styles.ctaEmoji}>🤝</Text>
          <Text style={styles.ctaTitle}>Have something to swap?</Text>
          <Text style={styles.ctaDesc}>List your item for free and reach thousands of traders across Nigeria.</Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push('/create-listing')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>List an Item</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </View>
    </ScrollView>
  );
}

// ─── Banner styles ─────────────────────────────────────────────────────────────
const bn = StyleSheet.create({
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0,
    width: SCREEN_WIDTH * 0.55,
    opacity: 0.45,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bigEmoji: {
    position: 'absolute',
    right: 16,
    top: 28,
    fontSize: 88,
    opacity: 0.28,
  },
  content: { position: 'relative' },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 7,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  tag: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 28,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    marginBottom: 14,
    maxWidth: SCREEN_WIDTH * 0.62,
  },

  ctaRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  ctaPrimaryText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  ctaGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  ctaGhostText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  statsRow: {
    flexDirection: 'row',
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 12,
  },
  statItem: {},
  statVal: { fontSize: 13, fontWeight: '800', color: '#fff', lineHeight: 16 },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.gray300 },
  dotActive: { width: 20, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingTop: 56 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  greeting: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  subGreeting: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletPill: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.gray100,
    borderWidth: 1, borderColor: COLORS.border,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: COLORS.gray100,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchPlaceholder: { fontSize: 14, color: COLORS.textLight },


  // Category pills
  categoryList: { marginTop: 16, flexGrow: 0 },
  categoryPills: { paddingHorizontal: 20, gap: 8 },
  categoryPill: { alignItems: 'center', gap: 4, backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, minWidth: 60 },
  categoryIcon: { fontSize: 20 },
  categoryName: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },

  // Quick links
  quickLinks: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16 },
  quickLink: { flex: 1, alignItems: 'center', gap: 4, borderRadius: 14, paddingVertical: 10 },
  quickEmoji: { fontSize: 20 },
  quickLabel: { fontSize: 10, fontWeight: '700' },

  // Sections
  sections: { marginTop: 20, gap: 24 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  hList: { paddingLeft: 20, paddingRight: 8, gap: 12 },
  empty: { paddingHorizontal: 20, fontSize: 13, color: COLORS.textLight, marginBottom: 8 },

  // Campaigns
  campaigns: { paddingHorizontal: 20, gap: 12 },
  campaignCard: {
    width: 200,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  campaignIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  campaignText: { flex: 1 },
  campaignTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  campaignDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, lineHeight: 15 },

  // Promo banner
  promoBanner: {
    marginHorizontal: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promoFlag: { fontSize: 32 },
  promoText: { flex: 1 },
  promoTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  promoDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, lineHeight: 15 },
  promoLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  promoLinkText: { fontSize: 12, fontWeight: '700', color: COLORS.accent },

  // Bottom CTA
  bottomCta: {
    marginHorizontal: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  ctaEmoji: { fontSize: 40, marginBottom: 8 },
  ctaTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 6 },
  ctaDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  ctaBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
});
