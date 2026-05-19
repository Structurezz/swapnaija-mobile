import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, formatCurrency, getListingPlaceholder, resolveImageUrl } from '../../utils/currency';
import Avatar from './Avatar';

export default function ListingCard({ listing, style, compact = false }) {
  const router = useRouter();

  if (!listing) return null;

  const image = resolveImageUrl(listing.images?.[0]) || getListingPlaceholder(listing);
  const ownerName = listing.userId?.fullName || listing.userId?.email || 'Unknown';

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.compact, style]}
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.9}
    >
      <View style={[styles.imageWrap, compact && styles.imageWrapCompact]}>
        <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        {listing.status === 'active' && !compact && (
          <View style={styles.activeDot} />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
        <Text style={styles.value}>{formatCurrency(listing.estimatedValue)}</Text>

        {!compact && (
          <>
            <View style={styles.meta}>
              <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {listing.locationState || 'Nigeria'}
              </Text>
            </View>
            <View style={styles.ownerRow}>
              <Avatar
                uri={listing.userId?.avatarUrl}
                name={ownerName}
                size={20}
              />
              <Text style={styles.ownerName} numberOfLines={1}>{ownerName}</Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    width: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  compact: { width: 140 },
  imageWrap: { height: 130, backgroundColor: COLORS.gray100, position: 'relative' },
  imageWrapCompact: { height: 100 },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  activeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  info: { padding: 10 },
  title: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 4, lineHeight: 18 },
  value: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  metaText: { fontSize: 11, color: COLORS.textSecondary, flex: 1 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ownerName: { fontSize: 11, color: COLORS.textSecondary, flex: 1 },
});
