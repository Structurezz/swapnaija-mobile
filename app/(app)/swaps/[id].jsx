import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, TextInput, Modal,
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
import Badge from '../../../src/components/ui/Badge';
import Spinner from '../../../src/components/ui/Spinner';

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

const EMPTY_ADDRESS = {
  fullName: '', phone: '', addressLine1: '', addressLine2: '',
  city: '', state: '', landmark: '',
};

const EMPTY_SHIPMENT = {
  provider: '', providerLabel: '', trackingNumber: '',
  trackingUrl: '', notes: '',
};

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ListingPreview({ listing, label }) {
  const imgUri = resolveImageUrl(listing?.images?.[0]) || getListingPlaceholder(listing);
  return (
    <View style={styles.listingPreview}>
      <Text style={styles.previewLabel}>{label}</Text>
      <View style={styles.previewCard}>
        <Image source={{ uri: imgUri }} style={styles.previewImg} resizeMode="cover" />
        <View style={styles.previewInfo}>
          <Text style={styles.previewTitle} numberOfLines={2}>{listing?.title}</Text>
          <Text style={styles.previewValue}>{formatBC((listing?.estimatedValue ?? 0) * 100)}</Text>
        </View>
      </View>
    </View>
  );
}

function AddressDisplay({ address, label }) {
  if (!address) return null;
  return (
    <View style={styles.addressCard}>
      <Text style={styles.addressLabel}>{label}</Text>
      <Text style={styles.addressName}>{address.fullName} · {address.phone}</Text>
      <Text style={styles.addressLine}>{address.addressLine1}</Text>
      {address.addressLine2 ? <Text style={styles.addressLine}>{address.addressLine2}</Text> : null}
      <Text style={styles.addressLine}>{address.city}, {address.state}</Text>
      {address.landmark ? (
        <Text style={styles.addressLandmark}>Landmark: {address.landmark}</Text>
      ) : null}
    </View>
  );
}

function ShipmentDisplay({ shipment, label }) {
  if (!shipment?.trackingNumber) return null;
  return (
    <View style={styles.shipmentCard}>
      <View style={styles.shipmentRow}>
        <Ionicons name="cube-outline" size={16} color={COLORS.primary} />
        <Text style={styles.shipmentLabel}>{label}</Text>
      </View>
      <Text style={styles.shipmentProvider}>{shipment.providerLabel}</Text>
      <Text style={styles.shipmentTracking}>Tracking: {shipment.trackingNumber}</Text>
      {shipment.shippedAt && (
        <Text style={styles.shipmentMeta}>
          Shipped {format(new Date(shipment.shippedAt), 'MMM d, yyyy')}
        </Text>
      )}
      {shipment.estimatedDelivery && (
        <Text style={styles.shipmentMeta}>
          Est. delivery {format(new Date(shipment.estimatedDelivery), 'MMM d, yyyy')}
        </Text>
      )}
      {shipment.notes ? <Text style={styles.shipmentNotes}>{shipment.notes}</Text> : null}
    </View>
  );
}

function FieldInput({ label, value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize, autoCorrect }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.modalInput, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor={COLORS.textLight}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
        autoCorrect={autoCorrect ?? true}
      />
    </View>
  );
}

export default function SwapDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [address, setAddress]   = useState(EMPTY_ADDRESS);
  const [shipment, setShipment] = useState(EMPTY_SHIPMENT);
  const [showAddressModal,  setShowAddressModal]  = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [showCourierPicker, setShowCourierPicker] = useState(false);
  const [showStatePicker,   setShowStatePicker]   = useState(false);
  const [showDisputeModal,  setShowDisputeModal]  = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating]   = useState(5);
  const [reviewComment, setReviewComment] = useState('');

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
    onSuccess: () => { Toast.show({ type: 'success', text1: 'Done!' }); invalidate(); },
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
    onSuccess: () => { Toast.show({ type: 'success', text1: 'Escrow deposit paid!' }); invalidate(); },
    onError: (err) => Toast.show({ type: 'error', text1: err?.response?.data?.error || 'Insufficient balance' }),
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmSwap(id),
    onSuccess: () => { Toast.show({ type: 'success', text1: 'Receipt confirmed!' }); invalidate(); },
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
    onSuccess: () => { Toast.show({ type: 'success', text1: 'Top-up paid!' }); invalidate(); },
    onError: (err) => Toast.show({ type: 'error', text1: err?.response?.data?.error || 'Error' }),
  });

  const reviewMutation = useMutation({
    mutationFn: () => createReview({ swapId: id, revieweeId: otherUser?.id, rating: reviewRating, comment: reviewComment }),
    onSuccess: () => {
      setShowReviewModal(false);
      Toast.show({ type: 'success', text1: 'Review submitted!' });
    },
    onError: (err) => Toast.show({ type: 'error', text1: err?.response?.data?.error || 'Error' }),
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

  const isInitiator   = swap.initiatorId?.id === user?.id;
  const myParty       = isInitiator ? 'initiator' : 'receiver';
  const otherUser     = isInitiator ? swap.receiverId : swap.initiatorId;
  const status        = swap.status;

  const iHavePaidEscrow  = swap[`${myParty}DepositPaid`];
  const iHaveConfirmed   = swap[`${myParty}Confirmed`];
  const iHaveSetAddress  = swap[`${myParty}AddressSet`];
  const iHaveShipped     = swap[`${myParty}Shipped`];
  const myAddress        = swap[`${myParty}Address`];
  const myShipment       = swap[`${myParty}Shipment`];
  const otherParty       = isInitiator ? 'receiver' : 'initiator';
  const otherAddress     = swap[`${otherParty}Address`];
  const otherShipment    = swap[`${otherParty}Shipment`];

  const selectedCourier = COURIERS.find(c => c.value === shipment.provider);

  const addressValid = address.fullName && address.phone && address.addressLine1 &&
                       address.city && address.state;
  const shipmentValid = shipment.provider && shipment.trackingNumber;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Swap Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View style={styles.statusRow}>
          <Badge status={status} size="md" />
          <Text style={styles.swapDate}>
            {swap.createdAt ? format(new Date(swap.createdAt), 'MMM d, yyyy') : ''}
          </Text>
        </View>

        {/* Listings */}
        <View style={styles.listingsRow}>
          <ListingPreview listing={swap.initiatorListing} label="Initiator's item" />
          <View style={styles.swapIcon}>
            <Ionicons name="swap-horizontal" size={24} color={COLORS.primary} />
          </View>
          <ListingPreview listing={swap.receiverListing} label="Receiver's item" />
        </View>

        {/* Parties */}
        <Section title="Parties">
          <View style={styles.partiesRow}>
            <View style={styles.partyCard}>
              <Avatar uri={swap.initiatorId?.avatarUrl} name={swap.initiatorId?.fullName} size={44} />
              <Text style={styles.partyName} numberOfLines={1}>{swap.initiatorId?.fullName || swap.initiatorId?.email}</Text>
              <Text style={styles.partyRole}>Initiator</Text>
            </View>
            <Ionicons name="swap-horizontal" size={20} color={COLORS.gray400} />
            <View style={styles.partyCard}>
              <Avatar uri={swap.receiverId?.avatarUrl} name={swap.receiverId?.fullName} size={44} />
              <Text style={styles.partyName} numberOfLines={1}>{swap.receiverId?.fullName || swap.receiverId?.email}</Text>
              <Text style={styles.partyRole}>Receiver</Text>
            </View>
          </View>
        </Section>

        {/* Escrow */}
        {['accepted', 'in_escrow', 'shipped'].includes(status) && (
          <Section title="Escrow Deposit">
            <View style={styles.escrowRow}>
              <Text style={styles.escrowLabel}>Collateral</Text>
              <Text style={styles.escrowVal}>{swap.collateralPercent}% · {formatBC(swap.escrowDepositKobo)}</Text>
            </View>
            <View style={styles.escrowRow}>
              <View style={styles.escrowParty}>
                <Ionicons
                  name={swap.initiatorDepositPaid ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={swap.initiatorDepositPaid ? COLORS.success : COLORS.gray400}
                />
                <Text style={styles.escrowPartyName}>{swap.initiatorId?.fullName?.split(' ')[0] || 'Initiator'}</Text>
              </View>
              <View style={styles.escrowParty}>
                <Ionicons
                  name={swap.receiverDepositPaid ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={swap.receiverDepositPaid ? COLORS.success : COLORS.gray400}
                />
                <Text style={styles.escrowPartyName}>{swap.receiverId?.fullName?.split(' ')[0] || 'Receiver'}</Text>
              </View>
            </View>
            {!iHavePaidEscrow && status === 'accepted' && (
              <Button
                title={`Pay Escrow Deposit (${formatBC(swap.escrowDepositKobo)})`}
                onPress={() => escrowMutation.mutate()}
                loading={escrowMutation.isPending}
                style={{ marginTop: 12 }}
              />
            )}
          </Section>
        )}

        {/* Value gap */}
        {swap.topUpAmountKobo > 0 && (
          <Section title="Value Gap Top-Up">
            <Text style={styles.escrowLabel}>
              Gap: {formatBC(swap.topUpAmountKobo)} · paid by {swap.topUpPayerRole}
            </Text>
            {swap.topUpPayerRole === myParty && !swap.topUpPaid && (
              <Button
                title={`Pay Top-Up (${formatBC(swap.topUpAmountKobo)})`}
                onPress={() => topupMutation.mutate()}
                loading={topupMutation.isPending}
                style={{ marginTop: 12 }}
              />
            )}
            {swap.topUpPaid && (
              <View style={styles.paidBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.paidText}>Top-up paid</Text>
              </View>
            )}
          </Section>
        )}

        {/* Delivery Addresses */}
        {['accepted', 'in_escrow', 'shipped', 'completed'].includes(status) && (
          <Section title="Delivery Addresses">
            <Text style={styles.deliveryNote}>
              Both parties set their receiving address so items can be shipped safely.
            </Text>
            <View style={styles.addressRow}>
              <View style={styles.addressStatusItem}>
                <Ionicons
                  name={swap.initiatorAddressSet ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={swap.initiatorAddressSet ? COLORS.success : COLORS.gray400}
                />
                <Text style={styles.escrowPartyName}>{swap.initiatorId?.fullName?.split(' ')[0] || 'Initiator'}</Text>
              </View>
              <View style={styles.addressStatusItem}>
                <Ionicons
                  name={swap.receiverAddressSet ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={swap.receiverAddressSet ? COLORS.success : COLORS.gray400}
                />
                <Text style={styles.escrowPartyName}>{swap.receiverId?.fullName?.split(' ')[0] || 'Receiver'}</Text>
              </View>
            </View>
            {myAddress && <AddressDisplay address={myAddress} label="Your address" />}
            {otherAddress && <AddressDisplay address={otherAddress} label="Their address" />}
            {!iHaveSetAddress && ['accepted', 'in_escrow'].includes(status) && (
              <Button
                title="Set My Delivery Address"
                onPress={() => { setAddress(EMPTY_ADDRESS); setShowAddressModal(true); }}
                icon={<Ionicons name="location-outline" size={16} color={COLORS.white} />}
                style={{ marginTop: 12 }}
              />
            )}
          </Section>
        )}

        {/* Shipment Tracking */}
        {['in_escrow', 'shipped', 'completed'].includes(status) && (
          <Section title="Shipment Tracking">
            <Text style={styles.deliveryNote}>
              Both parties must ship their items and submit tracking info. When both have shipped, funds move to escrow release.
            </Text>
            <View style={styles.addressRow}>
              <View style={styles.addressStatusItem}>
                <Ionicons
                  name={swap.initiatorShipped ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={swap.initiatorShipped ? COLORS.success : COLORS.gray400}
                />
                <Text style={styles.escrowPartyName}>{swap.initiatorId?.fullName?.split(' ')[0] || 'Initiator'} shipped</Text>
              </View>
              <View style={styles.addressStatusItem}>
                <Ionicons
                  name={swap.receiverShipped ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={swap.receiverShipped ? COLORS.success : COLORS.gray400}
                />
                <Text style={styles.escrowPartyName}>{swap.receiverId?.fullName?.split(' ')[0] || 'Receiver'} shipped</Text>
              </View>
            </View>
            {myShipment?.trackingNumber && (
              <ShipmentDisplay shipment={myShipment} label="Your shipment" />
            )}
            {otherShipment?.trackingNumber && (
              <ShipmentDisplay shipment={otherShipment} label="Their shipment" />
            )}
            {!iHaveShipped && status === 'in_escrow' && (
              <Button
                title="Submit Shipment Info"
                onPress={() => { setShipment(EMPTY_SHIPMENT); setShowShipmentModal(true); }}
                icon={<Ionicons name="cube-outline" size={16} color={COLORS.white} />}
                style={{ marginTop: 12 }}
              />
            )}
          </Section>
        )}

        {/* Confirm Receipt */}
        {['shipped', 'in_escrow'].includes(status) && (
          <Section title="Confirm Receipt">
            <Text style={styles.deliveryNote}>
              Confirm when you receive the item. Both confirmations release escrow.
            </Text>
            <View style={styles.addressRow}>
              <View style={styles.addressStatusItem}>
                <Ionicons
                  name={swap.initiatorConfirmed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={swap.initiatorConfirmed ? COLORS.success : COLORS.gray400}
                />
                <Text style={styles.escrowPartyName}>{swap.initiatorId?.fullName?.split(' ')[0]} received</Text>
              </View>
              <View style={styles.addressStatusItem}>
                <Ionicons
                  name={swap.receiverConfirmed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={swap.receiverConfirmed ? COLORS.success : COLORS.gray400}
                />
                <Text style={styles.escrowPartyName}>{swap.receiverId?.fullName?.split(' ')[0]} received</Text>
              </View>
            </View>
          </Section>
        )}

        {/* Proposal Note */}
        {swap.proposalNote && (
          <Section title="Proposal Note">
            <Text style={styles.noteText}>{swap.proposalNote}</Text>
          </Section>
        )}

        {/* Dispute Court Room — shown when swap is disputed */}
        {status === 'disputed' && (
          <Section title="⚖️ Dispute Court">
            <View style={styles.disputeBox}>
              <View style={styles.disputeRow}>
                <Ionicons name="warning-outline" size={16} color={COLORS.danger} />
                <Text style={styles.disputeTitle}>Dispute under mediation</Text>
              </View>
              {swap.disputeReason ? (
                <Text style={styles.disputeReason}>"{swap.disputeReason}"</Text>
              ) : null}
              <Text style={styles.disputeNote}>
                Escrow funds are frozen. ARIA AI mediator is presiding over this case.
              </Text>
              <Button
                title="⚖️ Enter Court Room"
                variant="danger"
                onPress={() => router.push(`/dispute/${id}`)}
                icon={<Ionicons name="scale-outline" size={16} color={COLORS.white} />}
                style={{ marginTop: 4 }}
              />
            </View>
          </Section>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {/* Accept / Decline for receiver */}
          {swap.receiverId?.id === user?.id && status === 'proposed' && (
            <>
              <Button
                title="Accept Swap"
                onPress={() => respondMutation.mutate('accept')}
                loading={respondMutation.isPending}
              />
              <Button
                title="Decline Swap"
                variant="danger"
                onPress={() => Alert.alert('Decline Swap', 'Are you sure?', [
                  { text: 'Keep', style: 'cancel' },
                  { text: 'Decline', style: 'destructive', onPress: () => respondMutation.mutate('decline') },
                ])}
              />
            </>
          )}

          {/* Cancel for initiator */}
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

          {/* Chat */}
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
            <Button
              title="Raise Dispute"
              variant="ghost"
              onPress={() => setShowDisputeModal(true)}
              icon={<Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />}
              textStyle={{ color: COLORS.danger }}
            />
          )}

          {/* Review */}
          {status === 'completed' && (
            <Button
              title="Leave a Review"
              variant="secondary"
              onPress={() => setShowReviewModal(true)}
              icon={<Ionicons name="star-outline" size={16} color={COLORS.primary} />}
            />
          )}
        </View>
      </ScrollView>

      {/* Delivery Address Modal */}
      <Modal visible={showAddressModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Your Delivery Address</Text>
              <TouchableOpacity onPress={() => { setShowAddressModal(false); setShowStatePicker(false); }}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              The other party will ship your item to this address.
            </Text>
            <FieldInput label="Full Name" value={address.fullName} onChangeText={v => setAddress(a => ({ ...a, fullName: v }))} placeholder="John Doe" />
            <FieldInput label="Phone" value={address.phone} onChangeText={v => setAddress(a => ({ ...a, phone: v }))} placeholder="+2348000000000" keyboardType="phone-pad" />
            <FieldInput label="Address Line 1" value={address.addressLine1} onChangeText={v => setAddress(a => ({ ...a, addressLine1: v }))} placeholder="12 Adeola Odeku Street" />
            <FieldInput label="Address Line 2 (optional)" value={address.addressLine2} onChangeText={v => setAddress(a => ({ ...a, addressLine2: v }))} placeholder="Flat 4B" />
            <FieldInput label="City / Town" value={address.city} onChangeText={v => setAddress(a => ({ ...a, city: v }))} placeholder="Lagos Island" />

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>State</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, showStatePicker && { borderColor: COLORS.primary }]}
                onPress={() => setShowStatePicker(v => !v)}
              >
                <Text style={address.state ? styles.pickerVal : styles.pickerPlaceholder}>
                  {address.state || 'Select state...'}
                </Text>
                <Ionicons name={showStatePicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {showStatePicker && (
                <View style={styles.stateDropdown}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ maxHeight: 220 }}>
                    {NIGERIAN_STATES.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={styles.pickerItem}
                        onPress={() => { setAddress(a => ({ ...a, state: s })); setShowStatePicker(false); }}
                      >
                        <Text style={[styles.pickerItemText, address.state === s && { color: COLORS.primary, fontWeight: '700' }]}>{s}</Text>
                        {address.state === s && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <FieldInput label="Landmark (optional)" value={address.landmark} onChangeText={v => setAddress(a => ({ ...a, landmark: v }))} placeholder="Near Shoprite" />

            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => { setShowAddressModal(false); setShowStatePicker(false); }} style={{ flex: 1 }} />
              <Button
                title="Save Address"
                onPress={() => addressMutation.mutate()}
                loading={addressMutation.isPending}
                disabled={!addressValid}
                style={{ flex: 1 }}
              />
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Shipment Modal */}
      <Modal visible={showShipmentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Submit Shipment Info</Text>
              <TouchableOpacity onPress={() => setShowShipmentModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Enter your courier and tracking details so the other party can track their delivery.
            </Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Courier / Delivery Company</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, showCourierPicker && { borderColor: COLORS.primary }]}
                onPress={() => setShowCourierPicker(v => !v)}
              >
                <Text style={shipment.provider ? styles.pickerVal : styles.pickerPlaceholder}>
                  {selectedCourier?.label || 'Select courier...'}
                </Text>
                <Ionicons name={showCourierPicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {showCourierPicker && (
                <View style={styles.stateDropdown}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ maxHeight: 220 }}>
                    {COURIERS.map(c => (
                      <TouchableOpacity
                        key={c.value}
                        style={styles.pickerItem}
                        onPress={() => {
                          setShipment(s => ({ ...s, provider: c.value, providerLabel: c.label }));
                          setShowCourierPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerItemText, shipment.provider === c.value && { color: COLORS.primary, fontWeight: '700' }]}>
                          {c.label}
                        </Text>
                        {shipment.provider === c.value && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <FieldInput
              label="Tracking Number"
              value={shipment.trackingNumber}
              onChangeText={v => setShipment(s => ({ ...s, trackingNumber: v }))}
              placeholder="e.g. GIG-1234567890"
            />
            <FieldInput
              label="Tracking URL (optional)"
              value={shipment.trackingUrl}
              onChangeText={v => setShipment(s => ({ ...s, trackingUrl: v }))}
              placeholder="e.g. track.gigl.com/abc123"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FieldInput
              label="Notes (optional)"
              value={shipment.notes}
              onChangeText={v => setShipment(s => ({ ...s, notes: v }))}
              placeholder="Fragile — handle with care"
              multiline
            />

            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setShowShipmentModal(false)} style={{ flex: 1 }} />
              <Button
                title="Submit"
                onPress={() => shipmentMutation.mutate()}
                loading={shipmentMutation.isPending}
                disabled={!shipmentValid}
                style={{ flex: 1 }}
              />
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Dispute Modal */}
      <Modal visible={showDisputeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Raise Dispute</Text>
              <TouchableOpacity onPress={() => setShowDisputeModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Describe the issue clearly. Our team will review within 24 hours and your escrow funds are safe.
            </Text>
            <TextInput
              style={[styles.modalInput, { height: 120, textAlignVertical: 'top' }]}
              value={disputeReason}
              onChangeText={setDisputeReason}
              placeholder="e.g. Item not received after 10 days, tracking shows delivered but I got nothing..."
              placeholderTextColor={COLORS.textLight}
              multiline
            />
            <View style={styles.modalBtns}>
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

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Leave a Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>How was your swap with {otherUser?.fullName}?</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
                  <Ionicons
                    name={s <= reviewRating ? 'star' : 'star-outline'}
                    size={32}
                    color={s <= reviewRating ? COLORS.accent : COLORS.gray300}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Share your experience (optional)..."
              placeholderTextColor={COLORS.textLight}
              multiline
            />
            <View style={styles.modalBtns}>
              <Button title="Skip" variant="outline" onPress={() => setShowReviewModal(false)} style={{ flex: 1 }} />
              <Button
                title="Submit"
                onPress={() => reviewMutation.mutate()}
                loading={reviewMutation.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  swapDate: { fontSize: 13, color: COLORS.textSecondary },

  listingsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  listingPreview: { flex: 1 },
  previewLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 4 },
  previewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewImg: { width: '100%', height: 70, backgroundColor: COLORS.gray100 },
  previewInfo: { padding: 8 },
  previewTitle: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  previewValue: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  swapIcon: { paddingHorizontal: 4, paddingTop: 16 },

  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },

  partiesRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partyCard: { flex: 1, alignItems: 'center', gap: 6 },
  partyName: { fontSize: 13, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  partyRole: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },

  escrowRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  escrowLabel: { fontSize: 13, color: COLORS.textSecondary },
  escrowVal: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  escrowParty: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  escrowPartyName: { fontSize: 13, color: COLORS.text },

  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  paidText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },

  deliveryNote: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 12 },
  addressRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  addressStatusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    gap: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addressLabel: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  addressName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  addressLine: { fontSize: 13, color: COLORS.textSecondary },
  addressLandmark: { fontSize: 12, color: COLORS.textLight, fontStyle: 'italic' },

  shipmentCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  shipmentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  shipmentLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  shipmentProvider: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  shipmentTracking: { fontSize: 13, color: COLORS.text, fontFamily: 'monospace' },
  shipmentMeta: { fontSize: 12, color: COLORS.textSecondary },
  shipmentNotes: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 2 },

  noteText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },

  disputeBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    gap: 6,
  },
  disputeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  disputeTitle: { fontSize: 13, fontWeight: '700', color: '#991B1B' },
  disputeReason: { fontSize: 12, color: '#DC2626', fontStyle: 'italic' },
  disputeNote: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },

  actions: { gap: 10, marginTop: 8, marginBottom: 40 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 20,
    gap: 12,
    maxHeight: '90%',
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  modalInput: {
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },

  stateDropdown: {
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  pickerVal: { fontSize: 14, color: COLORS.text, flex: 1 },
  pickerPlaceholder: { fontSize: 14, color: COLORS.textLight, flex: 1 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerItemText: { fontSize: 15, color: COLORS.text },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  ratingRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 8 },
});
