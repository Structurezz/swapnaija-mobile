import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, FlatList, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getListing } from '../../../src/api/listings.api';
import { startConversation } from '../../../src/api/messages.api';
import { useAuthStore } from '../../../src/store/auth.store';
import { COLORS, formatBC, CONDITIONS, getListingPlaceholder, resolveImageUrl } from '../../../src/utils/currency';
import Button from '../../../src/components/ui/Button';
import Avatar from '../../../src/components/ui/Avatar';
import Badge from '../../../src/components/ui/Badge';
import ReviewStars from '../../../src/components/ui/ReviewStars';
import Spinner from '../../../src/components/ui/Spinner';
import BackButton from '../../../src/components/ui/BackButton';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [imgIdx, setImgIdx] = useState(0);
  const navigation = useNavigation();

  useEffect(() => {
    // Reset the listing Stack to only this screen so pressing back always
    // returns to the originating tab, never to a previously-viewed listing.
    const state = navigation.getState();
    if (state?.index > 0) {
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: state.routes.slice(-1) })
      );
    }
  }, []);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id),
  });

  const messageMutation = useMutation({
    mutationFn: () => startConversation(listing.userId?.id),
    onSuccess: (conv) => {
      router.push(`/chat/${conv.id}`);
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: err?.response?.data?.error || 'Error starting chat' });
    },
  });

  if (isLoading) return <Spinner full />;
  if (!listing) return null;

  const isOwner = listing.userId?.id === user?.id;
  const images = listing.images?.length
    ? listing.images.map(resolveImageUrl)
    : [getListingPlaceholder(listing)];
  const ownerName = listing.userId?.fullName || listing.userId?.email || 'Unknown';

  const conditionColor = {
    'New': COLORS.success,
    'Like New': COLORS.primary,
    'Good': COLORS.accent,
    'Fair': '#F97316',
    'Poor': COLORS.danger,
  }[listing.condition] || COLORS.gray400;

  return (
    <View style={styles.screen}>
      {/* Back button */}
      <BackButton fallback="/" style={styles.backBtn} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image carousel */}
        <View style={styles.carousel}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setImgIdx(idx);
            }}
            scrollEventThrottle={16}
          >
            {images.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={styles.carouselImg} resizeMode="cover" />
            ))}
          </ScrollView>
          {images.length > 1 && (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === imgIdx && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Status + condition */}
          <View style={styles.badges}>
            <Badge status={listing.status} />
            {listing.condition && (
              <View style={[styles.conditionBadge, { backgroundColor: `${conditionColor}20` }]}>
                <Text style={[styles.conditionText, { color: conditionColor }]}>
                  {listing.condition}
                </Text>
              </View>
            )}
            {listing.boosted && (
              <View style={styles.boostedBadge}>
                <Ionicons name="flash" size={12} color={COLORS.accent} />
                <Text style={styles.boostedText}>Boosted</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.value}>{formatBC((listing.estimatedValue ?? 0) * 100)}</Text>

          <View style={styles.location}>
            <Ionicons name="location-outline" size={15} color={COLORS.textSecondary} />
            <Text style={styles.locationText}>
              {listing.location?.city || listing.location || 'Nigeria'}
            </Text>
          </View>

          {listing.categoryId && (
            <View style={styles.categoryRow}>
              <Ionicons name="grid-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.categoryText}>
                {listing.categoryId?.icon ? `${listing.categoryId.icon} ` : ''}{listing.categoryId?.name || ''}
              </Text>
            </View>
          )}

          {/* Description */}
          {listing.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </View>
          )}

          {/* Looking for */}
          {listing.wantsDescription && (
            <View style={styles.wantsCard}>
              <View style={styles.wantsHeader}>
                <Ionicons name="search" size={16} color={COLORS.primary} />
                <Text style={styles.wantsTitle}>Looking For</Text>
              </View>
              <Text style={styles.wantsText}>{listing.wantsDescription}</Text>
              {listing.wantsCategories?.length > 0 && (
                <View style={styles.wantsTags}>
                  {listing.wantsCategories.map((cat) => (
                    <View key={cat} style={styles.wantsTag}>
                      <Text style={styles.wantsTagText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Owner */}
          <View style={styles.ownerCard}>
            <Text style={styles.sectionTitle}>Listed by</Text>
            <TouchableOpacity
              style={styles.ownerRow}
              onPress={() => router.push({ pathname: `/profile/${listing.userId?.id}`, params: { fromListingId: id } })}
            >
              <Avatar uri={listing.userId?.avatarUrl} name={ownerName} size={48} />
              <View style={styles.ownerInfo}>
                <View style={styles.ownerNameRow}>
                  <Text style={styles.ownerName}>{ownerName}</Text>
                  {listing.userId?.verification === 'verified' && (
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                  )}
                </View>
                <ReviewStars
                  rating={listing.userId?.ratingAvg ?? 0}
                  count={listing.userId?.ratingCount}
                  size={13}
                />
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.gray400} />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {isOwner ? (
              <Button
                title="Boost Listing"
                variant="outline"
                icon={<Ionicons name="flash" size={16} color={COLORS.primary} />}
                onPress={() => router.push(`/listing/${id}/boost`)}
              />
            ) : (
              <>
                <Button
                  title="Propose Swap"
                  onPress={() => router.push(`/listing/${id}/swap`)}
                  style={styles.primaryBtn}
                />
                <Button
                  title="Message Owner"
                  variant="outline"
                  loading={messageMutation.isPending}
                  onPress={() => messageMutation.mutate()}
                  icon={<Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />}
                  style={styles.secondaryBtn}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carousel: { height: 300, backgroundColor: COLORS.gray200 },
  carouselImg: { width, height: 300 },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  dots: {
    position: 'absolute',
    bottom: 14,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: COLORS.white, width: 16 },

  body: { padding: 20 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  conditionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  conditionText: { fontSize: 11, fontWeight: '600' },
  boostedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  boostedText: { fontSize: 11, fontWeight: '600', color: COLORS.accent },

  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8, lineHeight: 28 },
  value: { fontSize: 24, fontWeight: '800', color: COLORS.primary, marginBottom: 10 },

  location: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  locationText: { fontSize: 14, color: COLORS.textSecondary },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  categoryText: { fontSize: 13, color: COLORS.textSecondary },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },

  wantsCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  wantsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  wantsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  wantsText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  wantsTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  wantsTag: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  wantsTagText: { fontSize: 12, color: COLORS.white, fontWeight: '500' },

  ownerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  ownerInfo: { flex: 1, gap: 4 },
  ownerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ownerName: { fontSize: 15, fontWeight: '600', color: COLORS.text },

  actions: { gap: 10 },
  primaryBtn: {},
  secondaryBtn: {},
});
