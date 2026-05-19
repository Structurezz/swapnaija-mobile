import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, TextInput, Modal, Platform, StatusBar, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { format } from 'date-fns';
import {
  getSwap, respondToSwap, setDeliveryAddress, submitShipment,
  payEscrowDeposit, confirmSwap, disputeSwap, payTopUp,
} from '../../../src/api/swaps.api';
import { startConversation } from '../../../src/api/messages.api';
import { useAuthStore } from '../../../src/store/auth.store';
import { createReview } from '../../../src/api/reviews.api';
import { COLORS, formatBC, getListingPlaceholder, resolveImageUrl } from '../../../src/utils/currency';
import Button from '../../../src/components/ui/Button';
import Avatar from '../../../src/components/ui/Avatar';
import Spinner from '../../../src/components/ui/Spinner';
import BackButton from '../../../src/components/ui/BackButton';
import ReviewStars from '../../../src/components/ui/ReviewStars';

// ─── Constants ────────────────────────────────────────────────────────────────
const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
  'Yobe','Zamfara',
];

const COURIERS = [
  { value: 'gig',      label: 'GIG Logistics' },
  { value: 'kwik',     label: 'Kwik Delivery' },
  { value: 'sendbox',  label: 'Sendbox' },
  { value: 'dhl',      label: 'DHL Nigeria' },
  { value: 'fedex',    label: 'FedEx Nigeria' },
  { value: 'nipost',   label: 'NIPOST' },
  { value: 'red_star', label: 'Red Star Express' },
  { value: 'chisco',   label: 'Chisco Transport' },
  { value: 'abc',      label: 'ABC Transport' },
  { value: 'other',    label: 'Other Courier' },
];

const SWAP_TYPE_LABELS = {
  goods_for_goods:     { label: 'Goods ↔ Goods',     emoji: '📦' },
  goods_for_service:   { label: 'Goods ↔ Service',   emoji: '🔧' },
  service_for_goods:   { label: 'Service ↔ Goods',   emoji: '🔧' },
  service_for_service: { label: 'Service ↔ Service', emoji: '🤝' },
};

const STATUS_COLOR = {
  proposed:  { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
  accepted:  { bg: '#DBEAFE', text: '#1E40AF', dot: '#2563EB' },
  in_escrow: { bg: '#EDE9FE', text: '#5B21B6', dot: '#7C3AED' },
  shipped:   { bg: '#FFF7ED', text: '#92400E', dot: '#EA580C' },
  completed: { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  disputed:  { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
};

const STATUS_LABEL = {
  proposed: 'Proposed', accepted: 'Accepted', in_escrow: 'In Escrow',
  shipped: 'Shipped', completed: 'Completed', disputed: 'Disputed', cancelled: 'Cancelled',
};

const REVIEW_LABELS = ['', 'Poor experience', 'Fair', 'Good', 'Very good', 'Excellent! 🎉'];

const EMPTY_ADDRESS  = { fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', landmark: '' };
const EMPTY_SHIPMENT = { provider: '', providerLabel: '', trackingNumber: '', trackingUrl: '', notes: '' };

// ─── Small UI helpers ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const c = STATUS_COLOR[status] || STATUS_COLOR.cancelled;
  return (
    <View style={[s.statusBadge, { backgroundColor: c.bg }]}>
      <View style={[s.statusDot, { backgroundColor: c.dot }]} />
      <Text style={[s.statusText, { color: c.text }]}>{STATUS_LABEL[status] || status}</Text>
    </View>
  );
}

function SectionCard({ title, icon, children, tint }) {
  return (
    <View style={[s.card, tint && { borderColor: tint, borderLeftWidth: 3 }]}>
      {title && (
        <View style={s.cardHeader}>
          {icon && <Ionicons name={icon} size={15} color={COLORS.primary} />}
          <Text style={s.cardTitle}>{title}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

function PartyChip({ name, paid, label }) {
  return (
    <View style={[s.partyChip, paid ? s.partyChipDone : s.partyChipPending]}>
      <Ionicons
        name={paid ? 'checkmark-circle' : 'time-outline'}
        size={13}
        color={paid ? COLORS.success : COLORS.gray400}
      />
      <Text style={[s.partyChipText, paid ? { color: '#065F46' } : { color: COLORS.textSecondary }]} numberOfLines={1}>
        {paid ? `✓ ${(name || '').split(' ')[0]}` : `${(name || '').split(' ')[0]}: pending`}
      </Text>
    </View>
  );
}

function FieldInput({ label, value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize, autoCorrect }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 90, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor={COLORS.gray300}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
        autoCorrect={autoCorrect ?? true}
      />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function SwapDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [address,  setAddress]  = useState(EMPTY_ADDRESS);
  const [shipment, setShipment] = useState(EMPTY_SHIPMENT);
  const [showAddressModal,  setShowAddressModal]  = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [showCourierPicker, setShowCourierPicker] = useState(false);
  const [showStatePicker,   setShowStatePicker]   = useState(false);
  const [showDisputeModal,  setShowDisputeModal]  = useState(false);
  const [showReviewModal,   setShowReviewModal]   = useState(false);
  const [disputeReason,  setDisputeReason]  = useState('');
  const [reviewRating,   setReviewRating]   = useState(0);
  const [reviewComment,  setReviewComment]  = useState('');

  const { data: swap, isLoading } = useQuery({
    queryKey: ['swap', id],
    queryFn: () => getSwap(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['swap', id] });
    queryClient.invalidateQueries({ queryKey: ['swaps'] });
  };

  const respondMutation = useMutation({
    mutationFn: (action) => respondToSwap(id, action),
    onSuccess: () => { Toast.show({ type: 'success', text1: 'Updated!' }); invalidate(); },
    onError: (err) => Toast.show({ type: 'error', text1: err?.response?.data?.error || 'Error' }),
  });

  const addressMutation = useMutation({
    mutationFn: () => setDeliveryAddress(id, address),
    onSuccess: () => {
      setShowAddressModal(false);
      setShowStatePicker(false);
      Toast.show({ type: 'success', text1: 'Delivery address saved' });
      invalidate();
    },
    onError: (err) => Toast.show({ type: 'error', text1: err?.response?.data?.error || 'Error' }),
  });

  const shipmentMutation = useMutation({
    mutationFn: () => submitShipment(id, shipment),
    onSuccess: () => {
      setShowShipmentModal(false);
      Toast.show({ type: 'success', text1: 'Shipment submitted!' });
      invalidate();
    },
    onError: (err) => Toast.show({ type: 'error', text1: err?.response?.data?.error || 'Error' }),
  });

  const escrowMutation = useMutation({
    mutationFn: () => payEscrowDeposit(id),
    onSuccess: (updated) => {
      Toast.show({
        type: 'success',
        text1: updated?.status === 'in_escrow'
          ? '🛡️ Escrow active! Both deposits secured.'
          : 'Deposit paid! Waiting for the other party.',
      });
      invalidate();
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Error';
      Toast.show({
        type: 'error',
        text1: msg.toLowerCase().includes('insufficient') ? msg + ' Top up your wallet.' : msg,
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmSwap(id),
    onSuccess: (updated) => {
      Toast.show({
        type: 'success',
        text1: updated?.status === 'completed'
          ? '🎉 Swap completed! Escrow refund added to your Barter Credits.'
          : 'Confirmed! Waiting for the other party.',
      });
      invalidate();
    },
    onError: (err) => Toast.show({ type: 'error', text1: err?.response?.data?.error || 'Error' }),
  });

  const disputeMutation = useMutation({
    mutationFn: () => disputeSwap(id, disputeReason),
    onSuccess: () => {
      setShowDisputeModal(false);
      Toast.show({ type: 'info', text1: 'Dispute raised', text2: 'Our team will review within 24h' });
      invalidate();
    },
    onError: (err) => Toast.show({ type: 'error', text1: err?.response?.data?.error || 'Error' }),
  });

  const topupMutation = useMutation({
    mutationFn: () => payTopUp(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Top-up paid! Held in escrow.' });
      invalidate();
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Error';
      Toast.show({
        type: 'error',
        text1: msg.toLowerCase().includes('insufficient') ? msg + ' Top up your wallet.' : msg,
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () => createReview({
      swapId: id,
      revieweeId: otherUser?.id,
      rating: reviewRating,
      comment: reviewComment,
    }),
    onSuccess: () => {
      setShowReviewModal(false);
      Toast.show({ type: 'success', text1: 'Review submitted! ⭐' });
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Error';
      Toast.show({ type: 'error', text1: msg.includes('already') ? 'You already reviewed this swap.' : msg });
    },
  });

  const chatMutation = useMutation({
    mutationFn: () => {
      const other = swap.initiatorId?.id === user?.id ? swap.receiverId : swap.initiatorId;
      return startConversation(other?.id, id);
    },
    onSuccess: (conv) => router.push(`/chat/${conv.id}`),
    onError: () => Toast.show({ type: 'error', text1: 'Could not start chat' }),
  });

  if (isLoading) return <Spinner full />;
  if (!swap) return null;

  // ── Derived state ─────────────────────────────────────────────────────────
  const isInitiator    = swap.initiatorId?.id === user?.id;
  const myParty        = isInitiator ? 'initiator' : 'receiver';
  const otherParty     = isInitiator ? 'receiver' : 'initiator';
  const otherUser      = isInitiator ? swap.receiverId : swap.initiatorId;
  const status         = swap.status;

  const iHavePaidEscrow = swap[`${myParty}DepositPaid`];
  const theyPaidEscrow  = swap[`${otherParty}DepositPaid`];
  const iHaveConfirmed  = swap[`${myParty}Confirmed`];
  const theyConfirmed   = swap[`${otherParty}Confirmed`];
  const iHaveSetAddress = swap[`${myParty}AddressSet`];
  const iHaveShipped    = swap[`${myParty}Shipped`];
  const myAddress       = swap[`${myParty}Address`];
  const myShipment      = swap[`${myParty}Shipment`];
  const otherAddress    = swap[`${otherParty}Address`];
  const otherShipment   = swap[`${otherParty}Shipment`];

  const depositKobo     = swap.escrowDepositKobo || 100000;
  const platformFeeKobo = Math.round(depositKobo * 0.02);
  const refundKobo      = depositKobo - platformFeeKobo;

  const swapTypeMeta   = SWAP_TYPE_LABELS[swap.swapType] || SWAP_TYPE_LABELS.goods_for_goods;
  const selectedCourier = COURIERS.find(c => c.value === shipment.provider);
  const addressValid   = address.fullName && address.phone && address.addressLine1 && address.city && address.state;
  const shipmentValid  = shipment.provider && shipment.trackingNumber;

  // Count pending actions to show badge
  const pendingActions = [
    status === 'proposed' && !isInitiator,
    ['accepted', 'in_escrow'].includes(status) && !iHaveSetAddress,
    status === 'in_escrow' && !iHaveShipped,
    ['in_escrow', 'shipped'].includes(status) && !iHaveConfirmed,
    status === 'accepted' && !iHavePaidEscrow,
  ].filter(Boolean).length;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" />

      {/* ── Hero Header ── */}
      <View style={s.hero}>
        <View style={s.heroNav}>
          <BackButton dark fallback="/swaps" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.heroTitle}>Swap Details</Text>
            <Text style={s.heroSub} numberOfLines={1}>
              #{(id || '').slice(-8).toUpperCase()}
            </Text>
          </View>
          {pendingActions > 0 && (
            <View style={s.pendingBadge}>
              <Text style={s.pendingBadgeText}>{pendingActions} action{pendingActions > 1 ? 's' : ''} needed</Text>
            </View>
          )}
        </View>

        {/* Status + Type pills */}
        <View style={s.heroPills}>
          <StatusBadge status={status} />
          <View style={s.typePill}>
            <Text style={s.typePillText}>{swapTypeMeta.emoji} {swapTypeMeta.label}</Text>
          </View>
          <Text style={s.heroDate}>
            {swap.updatedAt ? format(new Date(swap.updatedAt), 'MMM d, yyyy') : ''}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Listings side-by-side ── */}
        <SectionCard>
          <View style={s.listingsRow}>
            <ListingCard
              listing={swap.initiatorListing}
              label={isInitiator ? 'Your item' : `${(swap.initiatorId?.fullName || '').split(' ')[0]}'s item`}
              youLabel={isInitiator}
            />
            <View style={s.swapIcon}>
              <Ionicons name="swap-horizontal" size={22} color={COLORS.primary} />
            </View>
            <ListingCard
              listing={swap.receiverListing}
              label={!isInitiator ? 'Your item' : `${(swap.receiverId?.fullName || '').split(' ')[0]}'s item`}
              youLabel={!isInitiator}
            />
          </View>
          {swap.proposalNote ? (
            <Text style={s.proposalNote}>"{swap.proposalNote}"</Text>
          ) : null}
        </SectionCard>

        {/* ── Parties ── */}
        <SectionCard title="Parties" icon="people-outline">
          <View style={s.partiesRow}>
            <PartyUser user={swap.initiatorId} role="Initiator" isYou={isInitiator} />
            <Ionicons name="swap-horizontal" size={18} color={COLORS.gray300} style={{ marginTop: 16 }} />
            <PartyUser user={swap.receiverId} role="Receiver" isYou={!isInitiator} />
          </View>
        </SectionCard>

        {/* ── Escrow ── */}
        {['proposed', 'accepted', 'in_escrow', 'shipped'].includes(status) && (
          <SectionCard
            title="Escrow Protection"
            icon="shield-checkmark-outline"
            tint={status === 'in_escrow' ? COLORS.success : COLORS.primary}
          >
            {status === 'proposed' && (
              <View style={s.escrowInfoBanner}>
                <Ionicons name="information-circle-outline" size={15} color={COLORS.primary} />
                <Text style={s.escrowInfoText}>If accepted, each party deposits this amount as collateral.</Text>
              </View>
            )}
            {status === 'in_escrow' && (
              <View style={s.escrowActiveBanner}>
                <Ionicons name="shield-checkmark" size={15} color={COLORS.success} />
                <Text style={s.escrowActiveText}>Escrow Active — Both deposits secured</Text>
              </View>
            )}

            <View style={s.escrowBreakdown}>
              <EscrowRow label="Deposit per party" value={formatBC(depositKobo)} />
              <EscrowRow label="Platform fee (2%)" value={`-${formatBC(platformFeeKobo)}`} />
              <EscrowRow label="Refund on completion" value={formatBC(refundKobo)} highlight />
            </View>

            {status !== 'proposed' && (
              <View style={s.chipRow}>
                <PartyChip name={swap.initiatorId?.fullName || 'Initiator'} paid={swap.initiatorDepositPaid} />
                <PartyChip name={swap.receiverId?.fullName || 'Receiver'} paid={swap.receiverDepositPaid} />
              </View>
            )}

            {!iHavePaidEscrow && status === 'accepted' && (
              <Button
                title={`Pay ${formatBC(depositKobo)} Escrow Deposit`}
                onPress={() => escrowMutation.mutate()}
                loading={escrowMutation.isPending}
                icon={<Ionicons name="shield-outline" size={16} color={COLORS.white} />}
                style={{ marginTop: 12 }}
              />
            )}
            {iHavePaidEscrow && !theyPaidEscrow && status === 'accepted' && (
              <Text style={s.waitingText}>Waiting for {(otherUser?.fullName || '').split(' ')[0]} to pay their deposit…</Text>
            )}
          </SectionCard>
        )}

        {/* Escrow refund note for completed */}
        {status === 'completed' && swap.escrowActive && (
          <View style={s.escrowRefundNote}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
            <Text style={s.escrowRefundText}>
              Escrow deposit refunded — {formatBC(refundKobo)} returned to your Barter Credits.
            </Text>
          </View>
        )}

        {/* ── Value Gap Top-Up ── */}
        {swap.topUpAmountKobo > 0 && ['proposed', 'accepted', 'in_escrow'].includes(status) && (
          <SectionCard title="Value Gap Top-Up" icon="cash-outline" tint="#D97706">
            {status === 'proposed' ? (
              <View style={s.topUpPaidRow}>
                <Ionicons name="information-circle-outline" size={14} color="#D97706" />
                <Text style={s.topUpPaidText}>
                  There is a value gap of <Text style={s.topUpAmt}>{formatBC(swap.topUpAmountKobo)}</Text>.
                  If accepted, the {swap.topUpPayerRole === myParty ? 'you' : `other party`} will need to pay this to balance the swap.
                </Text>
              </View>
            ) : swap.topUpPaid ? (
              <View style={s.topUpPaidRow}>
                <Ionicons name="checkmark-circle" size={14} color="#D97706" />
                <Text style={s.topUpPaidText}>
                  Value gap of {formatBC(swap.topUpAmountKobo)} paid and held in escrow.
                  Released to the other party on swap completion.
                </Text>
              </View>
            ) : swap.topUpPayerRole === myParty ? (
              <>
                <Text style={s.topUpDesc}>
                  Your item is worth less than the other party's. Pay{' '}
                  <Text style={s.topUpAmt}>{formatBC(swap.topUpAmountKobo)}</Text> from your Barter Credits.
                  This is held in escrow and transferred to them on swap completion.
                </Text>
                <Button
                  title={`Pay ${formatBC(swap.topUpAmountKobo)} Top-Up`}
                  onPress={() => topupMutation.mutate()}
                  loading={topupMutation.isPending}
                  icon={<Ionicons name="cash-outline" size={16} color={COLORS.white} />}
                  style={{ marginTop: 10 }}
                />
              </>
            ) : (
              <View style={s.waitingRow}>
                <Ionicons name="time-outline" size={14} color="#D97706" />
                <Text style={s.topUpWaitText}>
                  Waiting for {(otherUser?.fullName || '').split(' ')[0]} to pay the {formatBC(swap.topUpAmountKobo)} value-gap top-up.
                </Text>
              </View>
            )}
          </SectionCard>
        )}

        {/* ── Delivery Addresses ── */}
        {['accepted', 'in_escrow', 'shipped', 'completed'].includes(status) && (
          <SectionCard title="Delivery Addresses" icon="location-outline">
            <Text style={s.sectionNote}>Both parties set their receiving address so items can be shipped safely.</Text>
            <View style={s.chipRow}>
              <PartyChip name={swap.initiatorId?.fullName || 'Initiator'} paid={swap.initiatorAddressSet} />
              <PartyChip name={swap.receiverId?.fullName || 'Receiver'} paid={swap.receiverAddressSet} />
            </View>
            {myAddress && <AddressCard address={myAddress} label="Your address" />}
            {otherAddress && <AddressCard address={otherAddress} label="Their address" />}
            {!iHaveSetAddress && ['accepted', 'in_escrow'].includes(status) && (
              <Button
                title="Set My Delivery Address"
                onPress={() => { setAddress(EMPTY_ADDRESS); setShowAddressModal(true); }}
                icon={<Ionicons name="location-outline" size={16} color={COLORS.white} />}
                style={{ marginTop: 12 }}
              />
            )}
          </SectionCard>
        )}

        {/* ── Shipment Tracking ── */}
        {['in_escrow', 'shipped', 'completed'].includes(status) && (
          <SectionCard title="Shipment Tracking" icon="cube-outline" tint={COLORS.primary}>
            <Text style={s.sectionNote}>Submit your tracking info after shipping. Escrow releases when both parties confirm receipt.</Text>
            <View style={s.chipRow}>
              <PartyChip name={swap.initiatorId?.fullName || 'Initiator'} paid={swap.initiatorShipped} />
              <PartyChip name={swap.receiverId?.fullName || 'Receiver'} paid={swap.receiverShipped} />
            </View>
            {myShipment?.trackingNumber && <ShipmentCard shipment={myShipment} label="Your shipment" />}
            {otherShipment?.trackingNumber && <ShipmentCard shipment={otherShipment} label="Their shipment" />}
            {!iHaveShipped && status === 'in_escrow' && (
              <Button
                title="Submit Shipment Info"
                onPress={() => { setShipment(EMPTY_SHIPMENT); setShowShipmentModal(true); }}
                icon={<Ionicons name="cube-outline" size={16} color={COLORS.white} />}
                style={{ marginTop: 12 }}
              />
            )}
          </SectionCard>
        )}

        {/* ── Confirm Receipt ── */}
        {['shipped', 'in_escrow'].includes(status) && (
          <SectionCard title="Confirm Receipt" icon="checkmark-circle-outline">
            <Text style={s.sectionNote}>Confirm when you receive the item in good condition. Both confirmations release escrow.</Text>
            <View style={s.chipRow}>
              <PartyChip name={swap.initiatorId?.fullName || 'Initiator'} paid={swap.initiatorConfirmed} />
              <PartyChip name={swap.receiverId?.fullName || 'Receiver'} paid={swap.receiverConfirmed} />
            </View>
          </SectionCard>
        )}

        {/* ── Disputed ── */}
        {status === 'disputed' && (
          <View style={s.disputeCard}>
            <View style={s.disputeHeader}>
              <Ionicons name="warning" size={16} color='#DC2626' />
              <Text style={s.disputeTitle}>Dispute Under Mediation</Text>
            </View>
            {swap.disputeReason ? (
              <Text style={s.disputeReason}>"{swap.disputeReason}"</Text>
            ) : null}
            <Text style={s.disputeNote}>
              Escrow funds are frozen. ARIA AI mediator is presiding over this case.
            </Text>
            <Button
              title="⚖️ Enter Court Room"
              variant="danger"
              onPress={() => router.push(`/dispute/${id}`)}
              icon={<Ionicons name="scale-outline" size={15} color={COLORS.white} />}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {/* ── Actions ── */}
        <View style={s.actions}>
          {/* Accept / Decline for receiver */}
          {swap.receiverId?.id === user?.id && status === 'proposed' && (
            <View style={s.actionRow}>
              <Button
                title="Accept Swap"
                onPress={() => respondMutation.mutate('accept')}
                loading={respondMutation.isPending}
                style={{ flex: 1 }}
                icon={<Ionicons name="checkmark-circle-outline" size={16} color={COLORS.white} />}
              />
              <Button
                title="Decline"
                variant="danger"
                style={{ flex: 1 }}
                onPress={() => Alert.alert('Decline Swap', 'Are you sure?', [
                  { text: 'Keep', style: 'cancel' },
                  { text: 'Decline', style: 'destructive', onPress: () => respondMutation.mutate('decline') },
                ])}
              />
            </View>
          )}

          {/* Cancel for initiator when proposed */}
          {isInitiator && status === 'proposed' && (
            <Button
              title="Cancel Proposal"
              variant="outline"
              onPress={() => Alert.alert('Cancel Proposal', 'This cannot be undone.', [
                { text: 'Keep', style: 'cancel' },
                { text: 'Cancel', style: 'destructive', onPress: () => respondMutation.mutate('cancel') },
              ])}
            />
          )}

          {/* Cancel when accepted */}
          {status === 'accepted' && (
            <Button
              title="Cancel Swap"
              variant="outline"
              onPress={() => Alert.alert('Cancel Swap', 'Cancel this swap?', [
                { text: 'Keep', style: 'cancel' },
                { text: 'Cancel', style: 'destructive', onPress: () => respondMutation.mutate('cancel') },
              ])}
            />
          )}

          {/* Confirm receipt */}
          {['in_escrow', 'shipped'].includes(status) && !iHaveConfirmed && (
            <Button
              title="Confirm I Received My Item"
              onPress={() => Alert.alert('Confirm Receipt', 'Have you received the item in good condition?', [
                { text: 'Not yet', style: 'cancel' },
                { text: 'Yes, confirm', onPress: () => confirmMutation.mutate() },
              ])}
              loading={confirmMutation.isPending}
              icon={<Ionicons name="checkmark-circle-outline" size={16} color={COLORS.white} />}
            />
          )}

          {/* Message */}
          {status !== 'completed' && status !== 'cancelled' && (
            <Button
              title="Message"
              variant="outline"
              loading={chatMutation.isPending}
              onPress={() => chatMutation.mutate()}
              icon={<Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />}
            />
          )}

          {/* Dispute */}
          {['in_escrow', 'shipped'].includes(status) && (
            <TouchableOpacity style={s.ghostBtn} onPress={() => setShowDisputeModal(true)} activeOpacity={0.7}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />
              <Text style={s.ghostBtnText}>Raise a Dispute</Text>
            </TouchableOpacity>
          )}

          {/* Review */}
          {status === 'completed' && (
            <Button
              title="Leave a Review"
              variant="secondary"
              onPress={() => { setReviewRating(0); setReviewComment(''); setShowReviewModal(true); }}
              icon={<Ionicons name="star-outline" size={16} color={COLORS.primary} />}
            />
          )}
        </View>
      </ScrollView>

      {/* ── Delivery Address Modal ── */}
      <Modal visible={showAddressModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <ScrollView style={s.sheet} keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <ModalHeader title="Your Delivery Address" onClose={() => { setShowAddressModal(false); setShowStatePicker(false); }} />
            <Text style={s.sheetNote}>The other party will ship your item to this address.</Text>
            <FieldInput label="Full Name" value={address.fullName} onChangeText={v => setAddress(a => ({ ...a, fullName: v }))} placeholder="John Doe" />
            <FieldInput label="Phone" value={address.phone} onChangeText={v => setAddress(a => ({ ...a, phone: v }))} placeholder="+2348000000000" keyboardType="phone-pad" autoCapitalize="none" />
            <FieldInput label="Address Line 1" value={address.addressLine1} onChangeText={v => setAddress(a => ({ ...a, addressLine1: v }))} placeholder="12 Adeola Odeku Street" />
            <FieldInput label="Address Line 2 (optional)" value={address.addressLine2} onChangeText={v => setAddress(a => ({ ...a, addressLine2: v }))} placeholder="Flat 4B" />
            <FieldInput label="City / Town" value={address.city} onChangeText={v => setAddress(a => ({ ...a, city: v }))} placeholder="Lagos Island" />
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>State</Text>
              <TouchableOpacity style={[s.pickerBtn, showStatePicker && { borderColor: COLORS.primary }]} onPress={() => setShowStatePicker(v => !v)}>
                <Text style={address.state ? s.pickerVal : s.pickerPlaceholder}>{address.state || 'Select state…'}</Text>
                <Ionicons name={showStatePicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {showStatePicker && (
                <View style={s.dropdown}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ maxHeight: 200 }}>
                    {NIGERIAN_STATES.map(st => (
                      <TouchableOpacity key={st} style={s.dropdownItem} onPress={() => { setAddress(a => ({ ...a, state: st })); setShowStatePicker(false); }}>
                        <Text style={[s.dropdownItemText, address.state === st && { color: COLORS.primary, fontWeight: '700' }]}>{st}</Text>
                        {address.state === st && <Ionicons name="checkmark" size={15} color={COLORS.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <FieldInput label="Landmark (optional)" value={address.landmark} onChangeText={v => setAddress(a => ({ ...a, landmark: v }))} placeholder="Near Shoprite" />
            <View style={s.sheetBtns}>
              <Button title="Cancel" variant="outline" onPress={() => { setShowAddressModal(false); setShowStatePicker(false); }} style={{ flex: 1 }} />
              <Button title="Save Address" onPress={() => addressMutation.mutate()} loading={addressMutation.isPending} disabled={!addressValid} style={{ flex: 1 }} />
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ── Shipment Modal ── */}
      <Modal visible={showShipmentModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <ScrollView style={s.sheet} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <ModalHeader title="Submit Shipment Info" onClose={() => setShowShipmentModal(false)} />
            <Text style={s.sheetNote}>Enter your courier and tracking details so the other party can track their delivery.</Text>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Courier / Delivery Company</Text>
              <TouchableOpacity style={[s.pickerBtn, showCourierPicker && { borderColor: COLORS.primary }]} onPress={() => setShowCourierPicker(v => !v)}>
                <Text style={shipment.provider ? s.pickerVal : s.pickerPlaceholder}>{selectedCourier?.label || 'Select courier…'}</Text>
                <Ionicons name={showCourierPicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {showCourierPicker && (
                <View style={s.dropdown}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ maxHeight: 200 }}>
                    {COURIERS.map(c => (
                      <TouchableOpacity key={c.value} style={s.dropdownItem} onPress={() => { setShipment(sh => ({ ...sh, provider: c.value, providerLabel: c.label })); setShowCourierPicker(false); }}>
                        <Text style={[s.dropdownItemText, shipment.provider === c.value && { color: COLORS.primary, fontWeight: '700' }]}>{c.label}</Text>
                        {shipment.provider === c.value && <Ionicons name="checkmark" size={15} color={COLORS.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <FieldInput label="Tracking Number" value={shipment.trackingNumber} onChangeText={v => setShipment(sh => ({ ...sh, trackingNumber: v }))} placeholder="e.g. GIG-1234567890" autoCapitalize="none" autoCorrect={false} />
            <FieldInput label="Tracking URL (optional)" value={shipment.trackingUrl} onChangeText={v => setShipment(sh => ({ ...sh, trackingUrl: v }))} placeholder="e.g. track.gigl.com/abc123" autoCapitalize="none" autoCorrect={false} />
            <FieldInput label="Notes (optional)" value={shipment.notes} onChangeText={v => setShipment(sh => ({ ...sh, notes: v }))} placeholder="Fragile — handle with care" multiline />
            <View style={s.sheetBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setShowShipmentModal(false)} style={{ flex: 1 }} />
              <Button title="Submit" onPress={() => shipmentMutation.mutate()} loading={shipmentMutation.isPending} disabled={!shipmentValid} style={{ flex: 1 }} />
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ── Dispute Modal ── */}
      <Modal visible={showDisputeModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <ModalHeader title="Raise a Dispute" onClose={() => setShowDisputeModal(false)} />
            {/* Warning card */}
            <View style={s.disputeWarn}>
              <View style={s.disputeWarnRow}>
                <Ionicons name="information-circle-outline" size={15} color="#D97706" />
                <Text style={s.disputeWarnTitle}>Before raising a dispute</Text>
              </View>
              <Text style={s.disputeWarnBody}>
                Try messaging the other party first. If you raise a dispute, all escrow funds are frozen and
                SwapNaija will review within 24 hours. The party found at fault may lose their deposit.
              </Text>
            </View>
            <Text style={s.fieldLabel}>Describe the issue</Text>
            <TextInput
              style={[s.input, { height: 120, textAlignVertical: 'top', marginBottom: 4 }]}
              value={disputeReason}
              onChangeText={setDisputeReason}
              placeholder="What went wrong? e.g. Item not as described, other party didn't respond..."
              placeholderTextColor={COLORS.gray300}
              multiline
              maxLength={1000}
            />
            <Text style={s.charCount}>{disputeReason.length}/1000 · min 10 characters</Text>
            <View style={[s.sheetBtns, { marginTop: 12 }]}>
              <Button title="Cancel" variant="outline" onPress={() => setShowDisputeModal(false)} style={{ flex: 1 }} />
              <Button
                title="Submit"
                variant="danger"
                onPress={() => disputeMutation.mutate()}
                loading={disputeMutation.isPending}
                disabled={disputeReason.trim().length < 10}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Review Modal ── */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <ModalHeader title="Leave a Review" onClose={() => setShowReviewModal(false)} />

            {/* Who you're reviewing */}
            <View style={s.reviewTarget}>
              <Avatar uri={otherUser?.avatarUrl} name={otherUser?.fullName} size={44} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.reviewTargetName}>{otherUser?.fullName}</Text>
                <Text style={s.reviewTargetRole}>Your swap partner</Text>
              </View>
            </View>

            <Text style={s.fieldLabel}>How was the swap?</Text>
            <ReviewStars rating={reviewRating} size={34} interactive onChange={setReviewRating} />
            {reviewRating > 0 && (
              <Text style={s.reviewLabel}>{REVIEW_LABELS[reviewRating]}</Text>
            )}

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>Comment <Text style={{ fontWeight: '400', color: COLORS.textSecondary }}>(optional)</Text></Text>
            <TextInput
              style={[s.input, { height: 90, textAlignVertical: 'top', marginBottom: 4 }]}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Describe how the swap went — was the item as described?"
              placeholderTextColor={COLORS.gray300}
              multiline
              maxLength={500}
            />
            <Text style={s.charCount}>{reviewComment.length}/500</Text>

            <View style={[s.sheetBtns, { marginTop: 12 }]}>
              <Button title="Skip" variant="outline" onPress={() => setShowReviewModal(false)} style={{ flex: 1 }} />
              <Button
                title="Submit Review"
                onPress={() => reviewMutation.mutate()}
                loading={reviewMutation.isPending}
                disabled={reviewRating === 0}
                style={{ flex: 1 }}
                icon={<Ionicons name="star-outline" size={15} color={COLORS.white} />}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ListingCard({ listing, label, youLabel }) {
  const imgUri = resolveImageUrl(listing?.images?.[0]) || getListingPlaceholder(listing);
  return (
    <View style={s.listingCard}>
      <Text style={s.listingLabel}>{label}</Text>
      <View style={s.listingCardInner}>
        <Image source={{ uri: imgUri }} style={s.listingImg} resizeMode="cover" />
        {youLabel && (
          <View style={s.youBadge}>
            <Text style={s.youBadgeText}>You</Text>
          </View>
        )}
        <View style={s.listingInfo}>
          <Text style={s.listingTitle} numberOfLines={2}>{listing?.title || '—'}</Text>
          <Text style={s.listingValue}>{formatBC((listing?.estimatedValue ?? 0) * 100)}</Text>
          {listing?.condition && (
            <View style={s.condBadge}>
              <Text style={s.condBadgeText}>{listing.condition}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function PartyUser({ user: u, role, isYou }) {
  return (
    <View style={s.partyUser}>
      <Avatar uri={u?.avatarUrl} name={u?.fullName} size={48} />
      {isYou && <View style={s.youTag}><Text style={s.youTagText}>You</Text></View>}
      <Text style={s.partyName} numberOfLines={1}>{u?.fullName || u?.email || '—'}</Text>
      {u?.locationState ? (
        <View style={s.locationRow}>
          <Ionicons name="location-outline" size={11} color={COLORS.textSecondary} />
          <Text style={s.locationText}>{u.locationState}</Text>
        </View>
      ) : null}
      <Text style={s.partyRole}>{role}</Text>
    </View>
  );
}

function EscrowRow({ label, value, highlight }) {
  return (
    <View style={s.escrowRow}>
      <Text style={s.escrowRowLabel}>{label}</Text>
      <Text style={[s.escrowRowVal, highlight && { color: COLORS.primary, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function AddressCard({ address, label }) {
  return (
    <View style={s.addrCard}>
      <Text style={s.addrCardLabel}>{label}</Text>
      <Text style={s.addrName}>{address.fullName} · {address.phone}</Text>
      <Text style={s.addrLine}>{address.addressLine1}</Text>
      {address.addressLine2 ? <Text style={s.addrLine}>{address.addressLine2}</Text> : null}
      <Text style={s.addrLine}>{address.city}, {address.state}</Text>
      {address.landmark ? <Text style={s.addrLandmark}>Near {address.landmark}</Text> : null}
    </View>
  );
}

function ShipmentCard({ shipment, label }) {
  const [open, setOpen] = React.useState(false);
  if (!shipment?.trackingNumber) return null;

  const hasUrl = !!shipment.trackingUrl;

  const openTracking = () => {
    if (hasUrl) {
      const url = shipment.trackingUrl.startsWith('http')
        ? shipment.trackingUrl
        : `https://${shipment.trackingUrl}`;
      Linking.openURL(url).catch(() =>
        Alert.alert('Cannot open link', 'Copy the tracking number and visit the courier website.')
      );
    }
  };

  return (
    <>
      <TouchableOpacity style={s.shipCard} onPress={() => setOpen(true)} activeOpacity={0.75}>
        <View style={s.shipRow}>
          <Ionicons name="cube-outline" size={14} color={COLORS.primary} />
          <Text style={s.shipLabel}>{label}</Text>
          <View style={{ flex: 1 }} />
          <View style={s.shipViewChip}>
            <Text style={s.shipViewChipText}>View details</Text>
            <Ionicons name="chevron-forward" size={12} color={COLORS.primary} />
          </View>
        </View>
        <Text style={s.shipProvider}>{shipment.providerLabel}</Text>
        <Text style={s.shipTracking} numberOfLines={1}>{shipment.trackingNumber}</Text>
      </TouchableOpacity>

      {/* Shipment detail bottom sheet */}
      <Modal visible={open} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Shipment Details</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Courier */}
            <View style={s.shipDetailRow}>
              <View style={s.shipDetailIcon}>
                <Ionicons name="car-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.shipDetailMeta}>Courier</Text>
                <Text style={s.shipDetailVal}>{shipment.providerLabel || '—'}</Text>
              </View>
            </View>

            {/* Tracking number */}
            <View style={s.shipDetailRow}>
              <View style={s.shipDetailIcon}>
                <Ionicons name="barcode-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.shipDetailMeta}>Tracking Number</Text>
                <Text style={[s.shipDetailVal, s.shipTracking]}>{shipment.trackingNumber}</Text>
              </View>
              <TouchableOpacity
                onPress={() => Alert.alert('Copied', shipment.trackingNumber)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="copy-outline" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Shipped at */}
            {shipment.shippedAt && (
              <View style={s.shipDetailRow}>
                <View style={s.shipDetailIcon}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.shipDetailMeta}>Shipped On</Text>
                  <Text style={s.shipDetailVal}>{format(new Date(shipment.shippedAt), 'MMMM d, yyyy')}</Text>
                </View>
              </View>
            )}

            {/* Est delivery */}
            {shipment.estimatedDelivery && (
              <View style={s.shipDetailRow}>
                <View style={s.shipDetailIcon}>
                  <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.shipDetailMeta}>Estimated Delivery</Text>
                  <Text style={s.shipDetailVal}>{format(new Date(shipment.estimatedDelivery), 'MMMM d, yyyy')}</Text>
                </View>
              </View>
            )}

            {/* Notes */}
            {shipment.notes && (
              <View style={s.shipDetailRow}>
                <View style={s.shipDetailIcon}>
                  <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.shipDetailMeta}>Notes</Text>
                  <Text style={s.shipDetailVal}>{shipment.notes}</Text>
                </View>
              </View>
            )}

            {/* Tracking URL CTA */}
            {hasUrl ? (
              <TouchableOpacity style={s.trackBtn} onPress={openTracking} activeOpacity={0.8}>
                <Ionicons name="open-outline" size={16} color="#fff" />
                <Text style={s.trackBtnText}>Track on {shipment.providerLabel || 'Courier'} Website</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.trackBtnDisabled}>
                <Ionicons name="information-circle-outline" size={15} color={COLORS.textSecondary} />
                <Text style={s.trackBtnDisabledText}>No tracking link provided — use the tracking number on the courier's website.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <View style={s.sheetHeader}>
      <Text style={s.sheetTitle}>{title}</Text>
      <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={22} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const GREEN  = '#059669';
const DARK   = '#0A1628';

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },

  // Hero header
  hero: {
    backgroundColor: DARK,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  heroNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  heroPills: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroDate: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginLeft: 'auto' },

  pendingBadge: {
    backgroundColor: '#D97706',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Status badge
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },

  // Swap type pill
  typePill: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  typePillText: { fontSize: 11, fontWeight: '600', color: '#fff' },

  // Content
  content: { padding: 16, gap: 12, paddingBottom: 60 },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  // Listings
  listingsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  listingCard: { flex: 1 },
  listingLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  listingCardInner: {
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  listingImg: { width: '100%', height: 76, backgroundColor: COLORS.gray100 },
  youBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: GREEN, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  youBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  listingInfo: { padding: 8, gap: 3 },
  listingTitle: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  listingValue: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  condBadge: { backgroundColor: COLORS.gray100, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start' },
  condBadgeText: { fontSize: 9, color: COLORS.textSecondary, fontWeight: '600' },
  swapIcon: { paddingTop: 34, paddingHorizontal: 2 },

  proposalNote: {
    fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic',
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 2,
  },

  // Parties
  partiesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  partyUser: { flex: 1, alignItems: 'center', gap: 4, position: 'relative' },
  partyName: { fontSize: 13, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 11, color: COLORS.textSecondary },
  partyRole: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  youTag: {
    position: 'absolute', top: -4, right: 8,
    backgroundColor: GREEN, borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  youTagText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  // Escrow
  escrowInfoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: COLORS.primaryLight, borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  escrowInfoText: { fontSize: 12, color: COLORS.primary, flex: 1, lineHeight: 17 },
  escrowActiveBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#D1FAE5', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: '#6EE7B7',
  },
  escrowActiveText: { fontSize: 12, fontWeight: '700', color: '#065F46', flex: 1 },
  escrowBreakdown: {
    backgroundColor: COLORS.gray50, borderRadius: 10, padding: 12,
    gap: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  escrowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  escrowRowLabel: { fontSize: 12, color: COLORS.textSecondary },
  escrowRowVal: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  waitingText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', fontStyle: 'italic', marginTop: 4 },

  escrowRefundNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#D1FAE5', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#6EE7B7',
  },
  escrowRefundText: { fontSize: 12, color: '#065F46', flex: 1, lineHeight: 18 },

  // Chip row
  chipRow: { flexDirection: 'row', gap: 8 },
  partyChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 8 },
  partyChipDone: { backgroundColor: '#D1FAE5' },
  partyChipPending: { backgroundColor: COLORS.gray100 },
  partyChipText: { fontSize: 12, fontWeight: '600', flex: 1 },

  // Top-up
  topUpPaidRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  topUpPaidText: { fontSize: 12, color: '#92400E', flex: 1, lineHeight: 18 },
  topUpDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  topUpAmt: { fontWeight: '700', color: '#D97706' },
  waitingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  topUpWaitText: { fontSize: 12, color: '#92400E', flex: 1, lineHeight: 18 },

  // Sections
  sectionNote: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  // Address card
  addrCard: {
    backgroundColor: COLORS.gray50, borderRadius: 10, padding: 12,
    gap: 3, borderWidth: 1, borderColor: COLORS.border, marginTop: 2,
  },
  addrCardLabel: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  addrName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  addrLine: { fontSize: 13, color: COLORS.textSecondary },
  addrLandmark: { fontSize: 12, color: COLORS.gray400, fontStyle: 'italic' },

  // Shipment card
  shipCard: {
    backgroundColor: COLORS.primaryLight, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: `${COLORS.primary}30`, marginTop: 2, gap: 4,
  },
  shipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shipLabel: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  shipProvider: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  shipTracking: { fontSize: 12, color: COLORS.text, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  shipNotes: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
  shipViewChip: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: `${COLORS.primary}18`, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  shipViewChipText: { fontSize: 10, fontWeight: '600', color: COLORS.primary },

  // Shipment detail modal rows
  shipDetailRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  shipDetailIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  shipDetailMeta: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 2 },
  shipDetailVal: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 14, marginTop: 8,
  },
  trackBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  trackBtnDisabled: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.gray50, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, marginTop: 8,
  },
  trackBtnDisabledText: { fontSize: 12, color: COLORS.textSecondary, flex: 1, lineHeight: 18 },

  // Dispute
  disputeCard: {
    backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#FECACA', gap: 8,
  },
  disputeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disputeTitle: { fontSize: 14, fontWeight: '700', color: '#991B1B' },
  disputeReason: { fontSize: 13, color: '#DC2626', fontStyle: 'italic', lineHeight: 18 },
  disputeNote: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  // Actions
  actions: { gap: 10, marginBottom: 20 },
  actionRow: { flexDirection: 'row', gap: 10 },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
  },
  ghostBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.danger },

  // Modal overlay + sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 12, maxHeight: '92%',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  sheetNote: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  sheetBtns: { flexDirection: 'row', gap: 10 },

  // Forms
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.gray50, borderRadius: 12, padding: 14,
    fontSize: 14, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.border,
  },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.gray50, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 13, borderWidth: 1.5, borderColor: COLORS.border,
  },
  pickerVal: { fontSize: 14, color: COLORS.text, flex: 1 },
  pickerPlaceholder: { fontSize: 14, color: COLORS.gray300, flex: 1 },
  dropdown: {
    marginTop: 4, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, backgroundColor: COLORS.white, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dropdownItemText: { fontSize: 14, color: COLORS.text },

  charCount: { fontSize: 11, color: COLORS.gray400 },

  // Dispute warn
  disputeWarn: {
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, gap: 6,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  disputeWarnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  disputeWarnTitle: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  disputeWarnBody: { fontSize: 12, color: '#78350F', lineHeight: 18 },

  // Review
  reviewTarget: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.gray50, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  reviewTargetName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  reviewTargetRole: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  reviewLabel: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
});
