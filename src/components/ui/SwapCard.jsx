import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  COLORS, STATUS_COLORS, STATUS_LABELS,
  resolveImageUrl, getListingPlaceholder, formatCurrency,
} from '../../utils/currency';
import Avatar from './Avatar';
import { format } from 'date-fns';

const STATUS_HINT = {
  proposed:  { icon: 'time-outline',              text: "Awaiting the other party's response" },
  accepted:  { icon: 'checkmark-circle-outline',  text: 'Accepted — deposit collateral to continue' },
  in_escrow: { icon: 'shield-checkmark-outline',  text: 'Collateral secured — ready to ship items' },
  shipped:   { icon: 'cube-outline',              text: 'Items in transit — confirm when received' },
  completed: { icon: 'checkmark-done-circle',     text: 'Swap completed successfully' },
  disputed:  { icon: 'alert-circle-outline',      text: 'Under dispute — awaiting resolution' },
  cancelled: { icon: 'close-circle-outline',      text: 'This swap was cancelled' },
};

const STATUS_LEFT = {
  proposed:  '#D97706',
  accepted:  '#2563EB',
  in_escrow: '#7C3AED',
  shipped:   '#B45309',
  completed: '#059669',
  disputed:  '#DC2626',
  cancelled: '#9CA3AF',
};

export default function SwapCard({ swap, currentUserId }) {
  const router = useRouter();
  if (!swap) return null;

  const initId = swap.initiatorId?.id || swap.initiatorId?._id;
  const isInitiator = currentUserId ? currentUserId === initId : true;

  const myListing    = isInitiator ? swap.initiatorListing : swap.receiverListing;
  const theirListing = isInitiator ? swap.receiverListing  : swap.initiatorListing;
  const partner      = isInitiator ? swap.receiverId       : swap.initiatorId;
  const partnerName  = partner?.fullName || partner?.email || 'User';

  const myImg    = myListing?.images?.[0]
    ? resolveImageUrl(myListing.images[0])    : getListingPlaceholder(myListing);
  const theirImg = theirListing?.images?.[0]
    ? resolveImageUrl(theirListing.images[0]) : getListingPlaceholder(theirListing);

  const sc     = STATUS_COLORS[swap.status] || { bg: COLORS.gray100, text: COLORS.textSecondary };
  const hint   = STATUS_HINT[swap.status];
  const accent = STATUS_LEFT[swap.status] || COLORS.gray300;

  const myValue    = myListing?.estimatedValue    ? formatCurrency(myListing.estimatedValue)    : null;
  const theirValue = theirListing?.estimatedValue ? formatCurrency(theirListing.estimatedValue) : null;

  return (
    <TouchableOpacity
      style={[s.card, { borderLeftColor: accent }]}
      onPress={() => router.push(`/(app)/swaps/${swap.id || swap._id}`)}
      activeOpacity={0.88}
    >
      {/* Status + date */}
      <View style={s.topRow}>
        <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
          <View style={[s.statusDot, { backgroundColor: sc.text }]} />
          <Text style={[s.statusLabel, { color: sc.text }]}>
            {STATUS_LABELS[swap.status] || swap.status}
          </Text>
        </View>
        <Text style={s.date}>
          {swap.createdAt ? format(new Date(swap.createdAt), 'MMM d') : ''}
        </Text>
      </View>

      {/* Listing images */}
      <View style={s.listings}>
        <View style={s.listing}>
          <View style={s.imgWrap}>
            <Image source={{ uri: myImg }} style={s.img} resizeMode="cover" />
            <View style={s.youBadge}>
              <Text style={s.youText}>You</Text>
            </View>
          </View>
          <Text style={s.listTitle} numberOfLines={2}>{myListing?.title || 'Your item'}</Text>
          {myValue && <Text style={s.listVal}>{myValue}</Text>}
        </View>

        <View style={s.arrowWrap}>
          <View style={s.arrowCircle}>
            <Ionicons name="swap-horizontal" size={18} color={COLORS.primary} />
          </View>
        </View>

        <View style={s.listing}>
          <View style={s.imgWrap}>
            <Image source={{ uri: theirImg }} style={s.img} resizeMode="cover" />
          </View>
          <Text style={s.listTitle} numberOfLines={2}>{theirListing?.title || 'Their item'}</Text>
          {theirValue && <Text style={s.listVal}>{theirValue}</Text>}
        </View>
      </View>

      {/* Contextual hint */}
      {hint && (
        <View style={[s.hintRow, { backgroundColor: sc.bg }]}>
          <Ionicons name={hint.icon} size={13} color={sc.text} />
          <Text style={[s.hintText, { color: sc.text }]}>{hint.text}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={s.footer}>
        <Avatar uri={partner?.avatarUrl} name={partnerName} size={26} />
        <Text style={s.withLabel}>With </Text>
        <Text style={s.partnerName} numberOfLines={1}>{partnerName}</Text>
        <Ionicons name="chevron-forward" size={14} color={COLORS.textLight} style={s.chevron} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 12, fontWeight: '700' },
  date: { fontSize: 12, color: COLORS.textLight },

  listings: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  listing: { flex: 1, gap: 5 },
  imgWrap: { position: 'relative' },
  img: {
    width: '100%',
    height: 86,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
  },
  youBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  listTitle: { fontSize: 12, fontWeight: '600', color: COLORS.text, lineHeight: 16 },
  listVal: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  arrowWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 26 },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  hintText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 17 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  withLabel: { fontSize: 12, color: COLORS.textLight },
  partnerName: { fontSize: 12, fontWeight: '600', color: COLORS.text, flex: 1 },
  chevron: { marginLeft: 'auto' },
});
