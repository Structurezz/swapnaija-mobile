import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, TextInput, Image, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getListing, getMyListings } from '../../../../src/api/listings.api';
import { proposeSwap, getEscrowInfo } from '../../../../src/api/swaps.api';
import { useAuthStore } from '../../../../src/store/auth.store';
import { COLORS, formatBC, getListingPlaceholder } from '../../../../src/utils/currency';
import Button from '../../../../src/components/ui/Button';
import Spinner from '../../../../src/components/ui/Spinner';

const ESCROW_PERCENTS = [10, 25, 50, 100];

export default function SwapProposalScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const [selectedListingId, setSelectedListingId] = useState(null);
  const [escrowPercent, setEscrowPercent] = useState(10);
  const [valuePayer, setValuePayer] = useState('initiator');
  const [note, setNote] = useState('');

  const { data: targetListing, isLoading: targetLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id),
  });

  const { data: myListings, isLoading: myLoading } = useQuery({
    queryKey: ['my-listings', 'active'],
    queryFn: () => getMyListings('active'),
  });

  const { data: escrowInfo } = useQuery({
    queryKey: ['escrow-info'],
    queryFn: getEscrowInfo,
  });

  const proposeMutation = useMutation({
    mutationFn: (data) => proposeSwap(data),
    onSuccess: (swap) => {
      Toast.show({ type: 'success', text1: 'Swap proposed!', text2: 'Waiting for response' });
      router.replace(`/swaps/${swap.id}`);
    },
    onError: (err) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to propose swap',
        text2: err?.response?.data?.error || 'Please try again',
      });
    },
  });

  if (targetLoading) return <Spinner full />;

  const myListing = myListings?.listings?.find?.((l) => l.id === selectedListingId)
    || myListings?.find?.((l) => l.id === selectedListingId);

  const listingsArr = myListings?.listings ?? myListings ?? [];

  const targetValue  = targetListing?.estimatedValue ?? 0;
  const myValue      = myListing?.estimatedValue ?? 0;
  const gap          = Math.abs(targetValue - myValue);
  const hasGap       = gap > 0;
  const walletBalanceKobo = user?.walletBalance ?? 0;
  const walletBalanceBC   = walletBalanceKobo / 100; // 1 BC = ₦1 = 100 kobo

  const escrowAmount = myValue * (escrowPercent / 100); // in naira (= BC)
  const topUpAmount  = hasGap && valuePayer === 'initiator' && myValue < targetValue ? gap : 0;
  const totalCost    = escrowAmount + topUpAmount; // in BC
  const canAfford    = walletBalanceBC >= totalCost;

  const handleSubmit = () => {
    if (!selectedListingId) {
      Toast.show({ type: 'error', text1: 'Select one of your listings' });
      return;
    }
    if (!canAfford) {
      Alert.alert('Insufficient Balance', `You need ${formatBC(totalCost * 100)} but have ${formatBC(walletBalanceKobo)}. Top up your wallet first.`, [
        { text: 'Top Up', onPress: () => router.push(`/wallet?returnTo=/listing/${id}/swap`) },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    proposeMutation.mutate({
      receiverId: targetListing?.userId?.id,
      initiatorListing: selectedListingId,
      receiverListing: id,
      collateralPercent: escrowPercent,
      topUpAmountKobo: hasGap ? Math.round(gap * 100) : 0,
      topUpPayerRole: hasGap ? valuePayer : 'none',
      proposalNote: note.trim() || undefined,
    });
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Propose Swap</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Target listing */}
        <Text style={styles.sectionLabel}>You want</Text>
        <View style={styles.targetCard}>
          <Image
            source={{ uri: targetListing?.images?.[0] || getListingPlaceholder(targetListing) }}
            style={styles.targetImg}
            resizeMode="cover"
          />
          <View style={styles.targetInfo}>
            <Text style={styles.targetTitle} numberOfLines={2}>{targetListing?.title}</Text>
            <Text style={styles.targetValue}>{formatBC((targetListing?.estimatedValue ?? 0) * 100)}</Text>
          </View>
        </View>

        {/* My listings selector */}
        <Text style={styles.sectionLabel}>Offer in exchange</Text>
        {myLoading ? (
          <Spinner size="small" />
        ) : listingsArr.length === 0 ? (
          <View style={styles.emptyListings}>
            <Text style={styles.emptyText}>You have no active listings.</Text>
            <TouchableOpacity onPress={() => router.push('/create-listing')}>
              <Text style={styles.createLink}>Create a listing first</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={listingsArr}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.myListings}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.myListing, selectedListingId === item.id && styles.myListingSelected]}
                onPress={() => setSelectedListingId(item.id)}
              >
                <Image
                  source={{ uri: item.images?.[0] || getListingPlaceholder(item) }}
                  style={styles.myListingImg}
                  resizeMode="cover"
                />
                <Text style={styles.myListingTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.myListingValue}>{formatBC((item.estimatedValue ?? 0) * 100)}</Text>
                {selectedListingId === item.id && (
                  <View style={styles.selectedCheck}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )}

        {/* Value gap */}
        {hasGap && myListing && (
          <View style={styles.gapCard}>
            <View style={styles.gapHeader}>
              <Ionicons name="alert-circle" size={18} color={COLORS.accent} />
              <Text style={styles.gapTitle}>Value Gap: {formatBC(gap * 100)}</Text>
            </View>
            <Text style={styles.gapDesc}>
              {myValue < targetValue
                ? `Your listing is worth ${formatBC(gap * 100)} less. Who pays the difference?`
                : `Your listing is worth ${formatBC(gap * 100)} more. Who receives the difference?`}
            </Text>
            <View style={styles.payerBtns}>
              {['initiator', 'receiver'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.payerBtn, valuePayer === p && styles.payerBtnActive]}
                  onPress={() => setValuePayer(p)}
                >
                  <Text style={[styles.payerBtnText, valuePayer === p && styles.payerBtnTextActive]}>
                    {p === 'initiator' ? 'I pay' : 'They pay'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Escrow */}
        <Text style={styles.sectionLabel}>Escrow Collateral</Text>
        <View style={styles.escrowDesc}>
          <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
          <Text style={styles.escrowDescText}>
            Both parties deposit collateral to ensure the swap completes.
          </Text>
        </View>
        <View style={styles.escrowBtns}>
          {ESCROW_PERCENTS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.escrowBtn, escrowPercent === p && styles.escrowBtnActive]}
              onPress={() => setEscrowPercent(p)}
            >
              <Text style={[styles.escrowBtnText, escrowPercent === p && styles.escrowBtnTextActive]}>
                {p}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cost summary */}
        {myListing && (
          <View style={styles.costCard}>
            <Text style={styles.costTitle}>What you'll need</Text>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Escrow ({escrowPercent}% of your listing)</Text>
              <Text style={styles.costVal}>{formatBC(escrowAmount * 100)}</Text>
            </View>
            {topUpAmount > 0 && (
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Value gap top-up</Text>
                <Text style={styles.costVal}>{formatBC(topUpAmount * 100)}</Text>
              </View>
            )}
            <View style={[styles.costRow, styles.costTotal]}>
              <Text style={styles.costTotalLabel}>Total from wallet</Text>
              <Text style={[styles.costTotalVal, !canAfford && styles.costDanger]}>
                {formatBC(totalCost * 100)}
              </Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Your balance</Text>
              <Text style={[styles.costVal, !canAfford && styles.costDanger]}>
                {formatBC(walletBalanceKobo)}
              </Text>
            </View>
            {!canAfford && (
              <TouchableOpacity style={styles.topupLink} onPress={() => router.push(`/wallet?returnTo=/listing/${id}/swap`)}>
                <Ionicons name="wallet" size={14} color={COLORS.danger} />
                <Text style={styles.topupLinkText}>Top up wallet ({formatBC((totalCost - walletBalanceBC) * 100)} needed)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Note */}
        <Text style={styles.sectionLabel}>Proposal Note (optional)</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Introduce yourself and why you want to swap..."
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={3}
          maxLength={500}
        />
        <Text style={styles.charCount}>{note.length}/500</Text>

        <Button
          title="Submit Proposal"
          onPress={handleSubmit}
          loading={proposeMutation.isPending}
          disabled={!selectedListingId}
          style={styles.submitBtn}
        />
      </ScrollView>
    </View>
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

  content: { padding: 20, gap: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  targetCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  targetImg: { width: 90, height: 90 },
  noImg: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gray100 },
  targetInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  targetTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4, lineHeight: 20 },
  targetValue: { fontSize: 16, fontWeight: '700', color: COLORS.primary },

  emptyListings: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
  createLink: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  myListings: { gap: 10, paddingBottom: 4 },
  myListing: {
    width: 130,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  myListingSelected: { borderColor: COLORS.primary },
  myListingImg: { width: '100%', height: 90, backgroundColor: COLORS.gray100 },
  myListingTitle: { fontSize: 12, fontWeight: '600', color: COLORS.text, padding: 8, paddingBottom: 2 },
  myListingValue: { fontSize: 12, fontWeight: '700', color: COLORS.primary, paddingHorizontal: 8, paddingBottom: 8 },
  selectedCheck: { position: 'absolute', top: 6, right: 6 },

  gapCard: {
    backgroundColor: COLORS.accentLight,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  gapHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  gapTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  gapDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 10 },
  payerBtns: { flexDirection: 'row', gap: 8 },
  payerBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  payerBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  payerBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  payerBtnTextActive: { color: COLORS.white },

  escrowDesc: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  escrowDescText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  escrowBtns: { flexDirection: 'row', gap: 8 },
  escrowBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  escrowBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  escrowBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  escrowBtnTextActive: { color: COLORS.white },

  costCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  costTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costLabel: { fontSize: 13, color: COLORS.textSecondary },
  costVal: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  costTotal: { paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4 },
  costTotalLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  costTotalVal: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  costDanger: { color: COLORS.danger },
  topupLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.dangerLight,
    padding: 10,
    borderRadius: 8,
  },
  topupLinkText: { fontSize: 13, color: COLORS.danger, fontWeight: '600', flex: 1 },

  noteInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    textAlignVertical: 'top',
    minHeight: 90,
  },
  charCount: { fontSize: 11, color: COLORS.textLight, textAlign: 'right', marginTop: 4 },

  submitBtn: { marginTop: 20, marginBottom: 40 },
});
