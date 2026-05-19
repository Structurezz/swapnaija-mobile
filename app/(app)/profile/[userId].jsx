import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getUser } from '../../../src/api/auth.api';
import { searchListings } from '../../../src/api/listings.api';
import { getUserReviews } from '../../../src/api/reviews.api';
import { startConversation } from '../../../src/api/messages.api';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { COLORS, formatCurrency } from '../../../src/utils/currency';
import Avatar from '../../../src/components/ui/Avatar';
import ReviewStars from '../../../src/components/ui/ReviewStars';
import ListingCard from '../../../src/components/ui/ListingCard';
import Button from '../../../src/components/ui/Button';
import Spinner from '../../../src/components/ui/Spinner';
import BackButton from '../../../src/components/ui/BackButton';
import { format } from 'date-fns';

export default function PublicProfileScreen() {
  const { userId, fromListingId } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    // Reset the profile stack to only this screen so the native swipe-back
    // gesture doesn't land on a stale profile or profile/index.
    const state = navigation.getState();
    if (state?.index > 0) {
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: state.routes.slice(-1) })
      );
    }
  }, [userId]);

  const handleBack = () => {
    if (fromListingId) {
      router.replace(`/listing/${fromListingId}`);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const { data: userData, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
  });

  const { data: listingsData } = useQuery({
    queryKey: ['user-listings', userId],
    queryFn: () => searchListings({ userId, status: 'active', limit: 12 }),
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['user-reviews', userId],
    queryFn: () => getUserReviews(userId),
  });

  const messageMutation = useMutation({
    mutationFn: () => startConversation(userId),
    onSuccess: (conv) => router.push(`/chat/${conv.id}`),
    onError: () => Toast.show({ type: 'error', text1: 'Could not start chat' }),
  });

  if (isLoading) return <Spinner full />;

  const profile = userData?.user ?? userData;
  const listings = listingsData?.listings ?? listingsData ?? [];
  const reviews  = reviewsData?.reviews  ?? reviewsData  ?? [];

  if (!profile) return null;

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Profile card */}
      <View style={styles.profileCard}>
        <Avatar uri={profile.avatarUrl} name={profile.fullName} size={80} />
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile.fullName || profile.email}</Text>
          {profile.verification === 'verified' && (
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
          )}
        </View>
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        <ReviewStars rating={profile.ratingAvg ?? 0} count={profile.ratingCount} size={15} />

        {profile.locationState && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.locationText}>{profile.locationState}</Text>
          </View>
        )}

        <Text style={styles.joinDate}>
          Member since {profile.createdAt ? format(new Date(profile.createdAt), 'MMMM yyyy') : 'N/A'}
        </Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{profile.swapCount ?? 0}</Text>
            <Text style={styles.statLabel}>Swaps</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{listings.length}</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{Number(profile.ratingAvg ?? 0).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <Button
          title="Send Message"
          onPress={() => messageMutation.mutate()}
          loading={messageMutation.isPending}
          icon={<Ionicons name="chatbubble-outline" size={16} color={COLORS.white} />}
          style={styles.msgBtn}
        />
      </View>

      {/* Listings */}
      {listings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Listings</Text>
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listingsRow}
            renderItem={({ item }) => <ListingCard listing={item} />}
          />
        </View>
      )}

      {/* Reviews */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
        {reviews.length === 0 ? (
          <Text style={styles.noReviews}>No reviews yet</Text>
        ) : (
          reviews.slice(0, 5).map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Avatar
                  uri={review.reviewerId?.avatarUrl}
                  name={review.reviewerId?.fullName}
                  size={36}
                />
                <View style={styles.reviewInfo}>
                  <Text style={styles.reviewerName}>{review.reviewerId?.fullName || 'User'}</Text>
                  <ReviewStars rating={review.rating} showNumber={false} size={13} />
                </View>
                <Text style={styles.reviewDate}>
                  {review.createdAt ? format(new Date(review.createdAt), 'MMM d') : ''}
                </Text>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
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

  profileCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  bio: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 13, color: COLORS.textSecondary },
  joinDate: { fontSize: 12, color: COLORS.textLight },

  stats: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  msgBtn: { width: '100%', marginTop: 4 },

  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  listingsRow: { gap: 10 },

  noReviews: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewInfo: { flex: 1, gap: 3 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  reviewDate: { fontSize: 12, color: COLORS.textLight },
  reviewComment: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
});
