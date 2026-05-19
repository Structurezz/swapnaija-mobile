import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  TextInput, Modal, Animated, Platform, StatusBar, Pressable, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, Link } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';
import { format, isToday, isYesterday } from 'date-fns';
import { topupWallet, getPaymentHistory, verifyPayment } from '../../src/api/payments.api';
import { getMySwaps } from '../../src/api/swaps.api';
import { getMe } from '../../src/api/auth.api';
import { useAuthStore } from '../../src/store/auth.store';
import { formatBC, resolveImageUrl, COLORS } from '../../src/utils/currency';
import Spinner from '../../src/components/ui/Spinner';
import BackButton from '../../src/components/ui/BackButton';

// ── Palette ───────────────────────────────────────────────────────────────────
const W = {
  bg:          '#F4F6F9',
  bgCard:      '#FFFFFF',
  bgSurface:   '#F0F2F5',
  bgElevated:  '#E8EBF0',
  bgInput:     '#F7F8FA',

  green:       '#1D9E75',
  greenDark:   '#157A5A',
  greenLight:  '#E8F8F2',
  greenBorder: 'rgba(29,158,117,0.2)',
  greenGlow:   'rgba(29,158,117,0.18)',

  gold:        '#D97706',
  goldLight:   '#FEF3C7',

  blue:        '#2563EB',
  blueLight:   '#EFF6FF',
  purple:      '#7C3AED',
  purpleLight: '#F5F3FF',
  rose:        '#E11D48',
  roseLight:   '#FFF1F2',

  cardDark:    '#0A0F1E',
  cardMid:     '#141B35',
  cardAccent:  '#0d1a2e',

  white:       '#FFFFFF',
  text:        '#0F172A',
  textSub:     '#475569',
  textMuted:   '#94A3B8',
  border:      '#E2E8F0',
  borderSoft:  '#CBD5E1',
};

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

// ── Transaction meta ──────────────────────────────────────────────────────────
const TX_META = {
  topup:        { label: 'Barter Credit Top-up',  icon: 'arrow-down-circle',  color: W.green,    credit: true  },
  refund:       { label: 'Refund',                icon: 'arrow-up-circle',    color: W.green,    credit: true  },
  boost:        { label: 'Listing Boost',          icon: 'flash',              color: W.gold,     credit: false },
  verification: { label: 'Account Verification',  icon: 'shield-checkmark',   color: W.blue,     credit: false },
  fee:          { label: 'Platform Fee',           icon: 'receipt',            color: W.textMuted,credit: false },
  escrow:       { label: 'Escrow Lock',            icon: 'lock-closed',        color: W.purple,   credit: false },
  dispute_refund:           { label: 'Escrow Refund',        icon: 'arrow-up-circle',  color: W.green, credit: true },
  dispute_compensation_won: { label: 'Dispute Won',          icon: 'trophy',           color: W.gold,  credit: true },
  dispute_topup_refunded:   { label: 'Top-up Refunded',      icon: 'arrow-up-circle',  color: W.green, credit: true },
  counsel_fee:              { label: 'Counsel Fee',          icon: 'briefcase',        color: W.textMuted, credit: false },
  counsel_fee_received:     { label: 'Counsel Payment',      icon: 'briefcase',        color: W.green, credit: true  },
};

function getTxMeta(tx) {
  const metaType = tx.meta?.type || '';
  const baseType = tx.paymentType || tx.type || '';
  const key = (metaType && TX_META[metaType]) ? metaType : baseType;
  const found = TX_META[key];
  if (found) return found;
  if (baseType === 'escrow' && tx.status === 'refunded')
    return { label: 'Escrow Refund', icon: 'arrow-up-circle', color: W.green, credit: true };
  return { label: key || 'Transaction', icon: 'ellipse-outline', color: W.textMuted, credit: false };
}

function groupByDate(txs) {
  const groups = {};
  for (const tx of txs) {
    const d = tx.createdAt ? new Date(tx.createdAt) : new Date();
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMM d, yyyy');
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }
  return Object.entries(groups);
}

// ── Swap status config ────────────────────────────────────────────────────────
const SWAP_CFG = {
  proposed:  { label: 'Proposed',  dot: '#94a3b8', icon: 'time-outline',           textColor: '#64748b' },
  accepted:  { label: 'Accepted',  dot: '#7c3aed', icon: 'checkmark-circle-outline',textColor: '#7c3aed' },
  in_escrow: { label: 'In Escrow', dot: '#2563eb', icon: 'shield-checkmark-outline',textColor: '#2563eb' },
  shipped:   { label: 'Shipped',   dot: '#d97706', icon: 'cube-outline',            textColor: '#d97706' },
  completed: { label: 'Completed', dot: '#10b981', icon: 'checkmark-circle',        textColor: '#10b981' },
  cancelled: { label: 'Cancelled', dot: '#94a3b8', icon: 'close-circle-outline',    textColor: '#94a3b8' },
  disputed:  { label: 'Disputed',  dot: '#ef4444', icon: 'alert-circle-outline',    textColor: '#ef4444' },
};

// ── Virtual Card (dark theme) ─────────────────────────────────────────────────
function VirtualCard({ balance, user, hidden, onToggleHide }) {
  const bc = (balance ?? 0) / 100;
  const formatted = bc.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isVerified = user?.verification === 'verified';

  return (
    <View style={s.vCard}>
      {/* Decorative rings */}
      <View style={[s.vRing, { top: -50, right: -50, width: 160, height: 160 }]} />
      <View style={[s.vRing, { top: -20, right: -20, width: 90, height: 90 }]} />
      <View style={[s.vRing, { bottom: -50, left: -30, width: 140, height: 140 }]} />

      {/* Top row */}
      <View style={s.vTopRow}>
        <View>
          <Text style={s.vBrandSub}>SwapNaija</Text>
          <Text style={s.vBrandTiny}>Virtual Wallet</Text>
        </View>
        {/* Chip */}
        <View style={s.chip}>
          <View style={s.chipV} />
          <View style={s.chipH} />
          <View style={s.chipCenter} />
        </View>
      </View>

      {/* Balance */}
      <View style={s.vBalSection}>
        <Text style={s.vBalLabel}>Available Balance</Text>
        <View style={s.vBalRow}>
          {hidden ? (
            <Text style={s.vBalDots}>● ● ● ●</Text>
          ) : (
            <>
              <Text style={s.vBalAmt}>{formatted}</Text>
              <Text style={s.vBalCur}>BC</Text>
            </>
          )}
          <TouchableOpacity style={s.vEyeBtn} onPress={onToggleHide} activeOpacity={0.7}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={13} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
        <Text style={s.vRate}>1 BC = ₦1</Text>
      </View>

      {/* Bottom row */}
      <View style={s.vBottomRow}>
        <View>
          <Text style={s.vMetaLabel}>Holder</Text>
          <Text style={s.vMetaVal} numberOfLines={1}>{user?.fullName || 'SwapNaija User'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.vMetaLabel}>Status</Text>
          <View style={s.vStatusRow}>
            <View style={[s.vStatusDot, { backgroundColor: isVerified ? '#34d399' : '#fbbf24' }]} />
            <Text style={s.vMetaVal}>{isVerified ? 'Verified' : 'Unverified'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Stat Strip (4-col from user profile) ─────────────────────────────────────
function StatStrip({ user }) {
  const stats = [
    { label: 'Swaps',    value: user?.swapCount    ?? 0 },
    { label: 'Rating',   value: user?.ratingAvg    ? `${Number(user.ratingAvg).toFixed(1)}★` : '—' },
    { label: 'Listings', value: user?.listingCount ?? 0 },
    { label: 'Credits',  value: (user?.swapCredits ?? 0).toLocaleString() },
  ];
  return (
    <View style={s.statStrip}>
      {stats.map(({ label, value }, i) => (
        <React.Fragment key={label}>
          {i > 0 && <View style={s.statDivider} />}
          <View style={s.statCell}>
            <Text style={s.statVal}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

// ── Swap Activity Scroll ──────────────────────────────────────────────────────
function SwapActivityScroll({ userId, onSwapPress }) {
  const { data, isLoading } = useQuery({
    queryKey: ['wallet-swaps-highlight'],
    queryFn:  () => getMySwaps(undefined, 1, 10),
    staleTime: 60_000,
  });

  const swaps = data?.swaps ?? [];

  if (isLoading) {
    return (
      <View style={s.swapScrollSection}>
        <View style={s.swapScrollHeader}>
          <Ionicons name="trending-up" size={13} color={W.green} />
          <Text style={s.swapScrollTitle}>Swap Activity</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.swapCard, { opacity: 0.5 }]}>
              <View style={[s.swapCardHeader, { backgroundColor: W.bgElevated }]} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (!swaps.length) return null;

  return (
    <View style={s.swapScrollSection}>
      <View style={s.swapScrollHeader}>
        <Ionicons name="trending-up" size={13} color={W.green} />
        <Text style={s.swapScrollTitle}>Swap Activity</Text>
        <TouchableOpacity onPress={() => onSwapPress()} style={s.swapSeeAll}>
          <Text style={s.swapSeeAllText}>See all</Text>
          <Ionicons name="arrow-forward" size={11} color={W.green} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}
      >
        {swaps.map((swap) => (
          <SwapCard key={swap.id || swap._id} swap={swap} userId={userId} onPress={() => onSwapPress(swap.id || swap._id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function SwapCard({ swap, userId, onPress }) {
  const isInit     = (swap.initiatorId?.id || swap.initiatorId) === userId;
  const myListing  = isInit ? swap.initiatorListing : swap.receiverListing;
  const theirList  = isInit ? swap.receiverListing  : swap.initiatorListing;
  const partner    = isInit ? swap.receiverId       : swap.initiatorId;
  const cfg        = SWAP_CFG[swap.status] || SWAP_CFG.proposed;
  const myImg      = myListing?.images?.[0]   ? resolveImageUrl(myListing.images[0])   : null;
  const theirImg   = theirList?.images?.[0]   ? resolveImageUrl(theirList.images[0])   : null;
  const bgImg      = myImg || theirImg;
  const topVal     = Math.max(myListing?.estimatedValue || 0, theirList?.estimatedValue || 0);
  const valLabel   = topVal >= 1000 ? `${(topVal / 1000).toFixed(topVal % 1000 === 0 ? 0 : 1)}k` : topVal > 0 ? String(topVal) : null;
  const partnerName = (typeof partner === 'object' ? partner?.fullName : null) || 'User';

  return (
    <TouchableOpacity style={s.swapCard} onPress={onPress} activeOpacity={0.85}>
      {/* Blurred header */}
      <View style={s.swapCardHeader}>
        {bgImg && (
          <Image source={{ uri: bgImg }} style={s.swapCardBg} blurRadius={8} />
        )}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' }} />
        </View>
        {/* Status dot + label */}
        <View style={s.swapStatusRow}>
          <View style={[s.swapDot, { backgroundColor: cfg.dot }]} />
          <Text style={s.swapStatusLabel}>{cfg.label.toUpperCase()}</Text>
        </View>
        {/* Thumbnails */}
        <View style={s.swapThumbRow}>
          <View style={s.swapThumb}>
            {myImg
              ? <Image source={{ uri: myImg }} style={s.swapThumbImg} />
              : <Ionicons name="cube-outline" size={14} color="rgba(255,255,255,0.3)" />
            }
          </View>
          <View style={s.swapArrow}>
            <Ionicons name="swap-horizontal" size={9} color="#555" />
          </View>
          <View style={s.swapThumb}>
            {theirImg
              ? <Image source={{ uri: theirImg }} style={s.swapThumbImg} />
              : <Ionicons name="cube-outline" size={14} color="rgba(255,255,255,0.3)" />
            }
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={s.swapCardBody}>
        <Text style={s.swapMyTitle} numberOfLines={1}>{myListing?.title || 'Open offer'}</Text>
        <View style={s.swapForRow}>
          <Ionicons name="swap-horizontal" size={8} color={W.textMuted} />
          <Text style={s.swapTheirTitle} numberOfLines={1}>{theirList?.title || 'Any item'}</Text>
        </View>

        {/* Partner */}
        <View style={s.swapPartnerRow}>
          <View style={s.swapAvatar}>
            <Text style={s.swapAvatarText}>{partnerName[0]?.toUpperCase() || '?'}</Text>
          </View>
          <Text style={s.swapPartnerName} numberOfLines={1}>{partnerName.split(' ')[0]}</Text>
          {(typeof partner === 'object' && (partner?.ratingAvg || 0) > 0) && (
            <View style={s.swapRatingRow}>
              <Ionicons name="star" size={9} color="#fbbf24" />
              <Text style={s.swapRating}>{Number(partner.ratingAvg).toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Status badge + value */}
        <View style={s.swapFooter}>
          <View style={[s.swapBadge, { backgroundColor: `${cfg.dot}18`, borderColor: `${cfg.dot}40` }]}>
            <Ionicons name={cfg.icon} size={8} color={cfg.textColor} />
            <Text style={[s.swapBadgeText, { color: cfg.textColor }]}>{cfg.label}</Text>
          </View>
          {valLabel && <Text style={s.swapVal}>{valLabel} BC</Text>}
        </View>

        <Text style={s.swapDate}>{format(new Date(swap.createdAt), 'dd MMM yyyy')}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Quick Action Button ───────────────────────────────────────────────────────
function QuickAction({ icon, label, color = W.green, onPress }) {
  return (
    <TouchableOpacity style={s.quickAction} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.quickIconWrap, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={s.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Numpad Add Money Modal ────────────────────────────────────────────────────
function AddMoneyModal({ visible, onClose, onPay, loading }) {
  const [raw, setRaw] = useState('');
  const amount = parseInt(raw) || 0;

  const press = (key) => {
    if (key === 'del') { setRaw(r => r.slice(0, -1)); return; }
    if (key === '00')  { setRaw(r => (r ? r + '00' : r)); return; }
    if (raw.length >= 7) return;
    setRaw(r => r + key);
  };

  const onQuick = (a) => setRaw(String(a));
  const display = amount > 0 ? amount.toLocaleString('en-NG') : '0';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} />
      <View style={s.numSheet}>
        <View style={s.sheetHandle} />

        {/* Header */}
        <View style={s.numHeader}>
          <Text style={s.numTitle}>Add Money</Text>
          <TouchableOpacity style={s.sheetClose} onPress={onClose}>
            <Ionicons name="close" size={20} color={W.textSub} />
          </TouchableOpacity>
        </View>

        {/* Amount display */}
        <View style={s.numDisplay}>
          <Text style={s.numDisplayLabel}>Enter Amount (BC)</Text>
          <View style={s.numDisplayRow}>
            <Text style={s.numCur}>BC</Text>
            <Text style={[s.numAmt, { color: amount > 0 ? W.text : W.textMuted }]}>{display}</Text>
          </View>
          {amount > 0 && (
            <Text style={s.numRate}>= ₦{amount.toLocaleString('en-NG')} via Paystack</Text>
          )}
          {amount > 0 && amount < 100 && (
            <Text style={s.numMin}>Minimum is 100 BC</Text>
          )}
        </View>

        {/* Quick amounts */}
        <View style={s.numQuicks}>
          {PRESET_AMOUNTS.map(a => (
            <TouchableOpacity
              key={a}
              style={[s.numQuick, amount === a && s.numQuickActive]}
              onPress={() => onQuick(a)}
              activeOpacity={0.7}
            >
              <Text style={[s.numQuickText, amount === a && s.numQuickTextActive]}>
                {a >= 1000 ? `${a / 1000}k` : a} BC
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Numpad */}
        <View style={s.numpad}>
          {['1','2','3','4','5','6','7','8','9','00','0','del'].map(k => (
            <TouchableOpacity
              key={k}
              style={[s.numKey, k === 'del' && s.numKeyDel]}
              onPress={() => press(k)}
              activeOpacity={0.65}
            >
              {k === 'del'
                ? <Ionicons name="backspace-outline" size={20} color={W.textSub} />
                : <Text style={s.numKeyText}>{k}</Text>
              }
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[s.fundBtn, (amount < 100 || loading) && s.fundBtnOff]}
          onPress={() => onPay(amount)}
          disabled={amount < 100 || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <Spinner size="small" color={W.white} />
            : <Text style={s.fundBtnText}>Pay ₦{amount > 0 ? amount.toLocaleString('en-NG') : '—'}</Text>
          }
        </TouchableOpacity>
        <Text style={s.secureNoteText}>🔒 Paystack · SSL Encrypted · Instant</Text>

        <View style={{ height: Platform.OS === 'ios' ? 24 : 10 }} />
      </View>
    </Modal>
  );
}

// ── Transaction Row ───────────────────────────────────────────────────────────
function TxRow({ tx }) {
  const meta   = getTxMeta(tx);
  const bc     = (tx.amountKobo ?? 0) / 100;
  const time   = tx.createdAt ? format(new Date(tx.createdAt), 'h:mm a') : '';
  const status = tx.status || 'success';
  const statusColor = status === 'success' || status === 'refunded' ? W.green
                    : status === 'pending' ? W.gold : W.rose;
  return (
    <View style={s.txRow}>
      <View style={[s.txIconBox, { backgroundColor: `${meta.color}14`, borderColor: `${meta.color}25` }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={s.txBody}>
        <Text style={s.txLabel} numberOfLines={1}>{meta.label}</Text>
        <View style={s.txSubRow}>
          <View style={[s.statusPill, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}30` }]}>
            <Text style={[s.statusText, { color: statusColor }]}>{status}</Text>
          </View>
          <Text style={s.txTime}>{time}</Text>
        </View>
      </View>
      <Text style={[s.txAmount, { color: meta.credit ? W.green : W.rose }]}>
        {meta.credit ? '+' : '−'}{bc.toLocaleString('en-NG', { minimumFractionDigits: 2 })} BC
      </Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function WalletScreen() {
  const { user, updateUser } = useAuthStore();
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { returnTo } = useLocalSearchParams();

  const [hidden,      setHidden]      = useState(false);
  const [showFund,    setShowFund]    = useState(false);
  const [paystackUrl, setPaystackUrl] = useState(null);
  const [txFilter,    setTxFilter]    = useState('All');
  const [amount,      setAmount]      = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);
  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  const { data: history, isLoading, isError, refetch } = useQuery({
    queryKey: ['payment-history'],
    queryFn:  () => getPaymentHistory({ limit: 50 }),
    retry: 1,
  });

  const initMutation = useMutation({
    mutationFn: (amt) => topupWallet({ amountKobo: amt * 100, email: user?.email }),
    onSuccess: (data) => {
      const url = data?.authorizationUrl || data?.authorization_url;
      if (url) { setShowFund(false); setTimeout(() => setPaystackUrl(url), 300); }
    },
    onError: (err) =>
      Toast.show({ type: 'error', text1: 'Could not initialise payment', text2: err?.response?.data?.error || '' }),
  });

  const handleWebViewNav = useCallback(async (navState) => {
    const url = navState.url || '';
    if (url.includes('reference=') || url.includes('/callback') || url.includes('trxref=')) {
      const match = url.match(/reference=([^&]+)/) || url.match(/trxref=([^&]+)/);
      const ref = match?.[1];
      setPaystackUrl(null);
      if (ref) {
        try {
          const result = await verifyPayment(ref);
          if (result?.status === 'success' || result?.paid) {
            const me = await getMe();
            updateUser({ walletBalance: me.walletBalance });
            queryClient.invalidateQueries({ queryKey: ['payment-history'] });
            queryClient.invalidateQueries({ queryKey: ['wallet-swaps-highlight'] });
            Toast.show({ type: 'success', text1: '🎉 Top-up successful!' });
            setAmount('');
            setShowFund(false);
            if (returnTo) setTimeout(() => router.replace(returnTo), 400);
          } else {
            Toast.show({ type: 'error', text1: 'Payment not confirmed' });
          }
        } catch {
          Toast.show({ type: 'info', text1: 'Payment processed', text2: 'Balance will update shortly' });
        }
      }
    }
  }, []);

  const allTx   = history?.payments ?? [];
  const balance = history?.walletBalance ?? user?.walletBalance ?? 0;

  const filtered = allTx.filter(tx => {
    if (txFilter === 'All') return true;
    const meta = getTxMeta(tx);
    return txFilter === 'Credits' ? meta.credit : !meta.credit;
  });
  const grouped = groupByDate(filtered);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={W.white} />

      {/* Header */}
      <View style={s.header}>
        <BackButton fallback="/profile" style={s.headerBtn} />
        <Text style={s.headerTitle}>My Wallet</Text>
        <TouchableOpacity style={s.headerBtn} onPress={() => refetch()} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={20} color={W.textSub} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} bounces>
        <Animated.View style={{ opacity: slideAnim, transform: [{ translateY }] }}>

          {/* Dark virtual card */}
          <VirtualCard
            balance={balance}
            user={user}
            hidden={hidden}
            onToggleHide={() => setHidden(h => !h)}
          />

          {/* Quick Actions */}
          <View style={s.quickRow}>
            <QuickAction icon="add-circle"       label="Add Money" color={W.green}  onPress={() => setShowFund(true)} />
            <QuickAction icon="shield-checkmark" label="Verify"    color={W.blue}   onPress={() => router.push('/(app)/verify-account')} />
            <QuickAction icon="flash"            label="Boost"     color={W.gold}   onPress={() => router.push('/(app)/boost')} />
            <QuickAction icon="gift"             label="Invite"    color={W.purple} onPress={() => Toast.show({ type: 'info', text1: 'Coming soon' })} />
          </View>

          {/* Stat Strip */}
          <StatStrip user={user} />

          {/* Swap Activity Scroll */}
          <SwapActivityScroll
            userId={user?.id}
            onSwapPress={(id) => id ? router.push(`/(app)/swaps/${id}`) : router.push('/(app)/swaps')}
          />

          {/* Transaction History */}
          <View style={s.txSection}>
            {/* Section header */}
            <View style={s.txHeader}>
              <Text style={s.txTitle}>Transactions</Text>
              <Text style={s.txCount}>{allTx.length} total</Text>
            </View>

            {/* Filter tabs */}
            <View style={s.filterRow}>
              {['All', 'Credits', 'Debits'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[s.filterTab, txFilter === f && s.filterTabActive]}
                  onPress={() => setTxFilter(f)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.filterTabText, txFilter === f && s.filterTabTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {isLoading ? (
              <View style={s.centered}><Spinner size="small" /></View>
            ) : isError ? (
              <View style={s.centered}>
                <Ionicons name="cloud-offline-outline" size={36} color={W.textMuted} />
                <Text style={s.emptyTitle}>Could not load</Text>
                <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
                  <Text style={s.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : filtered.length === 0 ? (
              <View style={s.centered}>
                <View style={s.emptyIcon}>
                  <Ionicons name="receipt-outline" size={32} color={W.textMuted} />
                </View>
                <Text style={s.emptyTitle}>No transactions</Text>
                <Text style={s.emptySub}>{txFilter === 'All' ? 'Fund your wallet to get started.' : `No ${txFilter.toLowerCase()} yet.`}</Text>
                {txFilter === 'All' && (
                  <TouchableOpacity style={s.emptyAction} onPress={() => setShowFund(true)}>
                    <Ionicons name="add" size={14} color={W.green} />
                    <Text style={s.emptyActionText}>Add Money</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              grouped.map(([dateLabel, txs]) => (
                <View key={dateLabel} style={s.txGroup}>
                  <View style={s.txGroupLabelRow}>
                    <Text style={s.txGroupLabel}>{dateLabel}</Text>
                  </View>
                  <View style={s.txGroupCard}>
                    {txs.map((tx, i) => (
                      <View key={tx.id || tx._id || i}>
                        <TxRow tx={tx} />
                        {i < txs.length - 1 && <View style={s.txDivider} />}
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      {/* Add Money Modal (numpad) */}
      <AddMoneyModal
        visible={showFund}
        onClose={() => setShowFund(false)}
        onPay={(amt) => initMutation.mutate(amt)}
        loading={initMutation.isPending}
      />

      {/* Paystack WebView */}
      <Modal visible={!!paystackUrl} animationType="slide">
        <View style={s.webviewContainer}>
          <View style={s.webviewHeader}>
            <TouchableOpacity style={s.headerBtn} onPress={() => setPaystackUrl(null)} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={W.text} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={s.webviewTitle}>Secure Payment</Text>
              <View style={s.webviewBadge}>
                <Ionicons name="shield-checkmark" size={10} color={W.green} />
                <Text style={s.webviewBadgeText}>Paystack</Text>
              </View>
            </View>
            <View style={{ width: 44 }} />
          </View>
          {paystackUrl && (
            <WebView source={{ uri: paystackUrl }} onNavigationStateChange={handleWebViewNav} style={{ flex: 1 }} />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: W.white,
    borderBottomWidth: 1, borderBottomColor: W.border,
  },
  headerBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, backgroundColor: W.bgSurface,
    borderWidth: 1, borderColor: W.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: W.text },

  content: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  // ── Virtual Card ──────────────────────────────────────────────────────────
  vCard: {
    borderRadius: 24, overflow: 'hidden',
    backgroundColor: W.cardDark,
    padding: 22, minHeight: 200,
  },
  vRing: {
    position: 'absolute', borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  vTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  vBrandSub: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase' },
  vBrandTiny: { fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 2 },

  // Chip
  chip: { width: 38, height: 28, borderRadius: 4, backgroundColor: '#D4AF37', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  chipV: { position: 'absolute', width: 12, top: 0, bottom: 0, left: 13, backgroundColor: '#C9A227' },
  chipH: { position: 'absolute', left: 0, right: 0, height: 10, top: 9, backgroundColor: '#C9A227' },
  chipCenter: { width: 12, height: 10, backgroundColor: '#B8962E', borderRadius: 1 },

  vBalSection: { flex: 1, marginBottom: 18 },
  vBalLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  vBalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  vBalAmt: { fontSize: 34, fontWeight: '800', color: W.white, letterSpacing: -1, lineHeight: 40 },
  vBalCur: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.45)', marginBottom: 4 },
  vBalDots: { fontSize: 28, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 4, lineHeight: 40 },
  vEyeBtn: {
    width: 28, height: 28, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4, marginLeft: 4,
  },
  vRate: { fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 },

  vBottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 14,
  },
  vMetaLabel: { fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  vMetaVal: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)', maxWidth: 140 },
  vStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  vStatusDot: { width: 6, height: 6, borderRadius: 3 },

  // ── Quick Actions ─────────────────────────────────────────────────────────
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickAction: { alignItems: 'center', gap: 7, flex: 1 },
  quickIconWrap: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  quickLabel: { fontSize: 11, color: W.textSub, fontWeight: '600', textAlign: 'center' },

  // ── Stat Strip ────────────────────────────────────────────────────────────
  statStrip: {
    backgroundColor: W.white, borderRadius: 18,
    borderWidth: 1, borderColor: W.border,
    flexDirection: 'row',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statDivider: { width: 1, backgroundColor: W.border, marginVertical: 10 },
  statVal: { fontSize: 15, fontWeight: '800', color: W.text },
  statLabel: { fontSize: 11, color: W.textMuted, marginTop: 2 },

  // ── Swap Scroll ───────────────────────────────────────────────────────────
  swapScrollSection: { marginHorizontal: -16, gap: 10 },
  swapScrollHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16,
  },
  swapScrollTitle: { fontSize: 11, fontWeight: '800', color: W.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, flex: 1 },
  swapSeeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  swapSeeAllText: { fontSize: 12, color: W.green, fontWeight: '700' },

  swapCard: {
    width: 178, backgroundColor: W.white,
    borderRadius: 18, borderWidth: 1, borderColor: W.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  swapCardHeader: { height: 66, backgroundColor: '#CBD5E1', overflow: 'hidden', position: 'relative' },
  swapCardBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  swapStatusRow: { position: 'absolute', top: 7, left: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  swapDot: { width: 6, height: 6, borderRadius: 3 },
  swapStatusLabel: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  swapThumbRow: { position: 'absolute', inset: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  swapThumb: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(100,100,100,0.5)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  swapThumbImg: { width: '100%', height: '100%' },
  swapArrow: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  swapCardBody: { padding: 10, gap: 5 },
  swapMyTitle: { fontSize: 12, fontWeight: '700', color: W.text },
  swapForRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swapTheirTitle: { fontSize: 10, color: W.textMuted, flex: 1 },
  swapPartnerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swapAvatar: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: `${W.green}22`,
    alignItems: 'center', justifyContent: 'center',
  },
  swapAvatarText: { fontSize: 8, fontWeight: '800', color: W.green },
  swapPartnerName: { fontSize: 11, color: W.textSub, fontWeight: '500', flex: 1 },
  swapRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  swapRating: { fontSize: 10, color: W.textMuted, fontWeight: '600' },
  swapFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  swapBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
  },
  swapBadgeText: { fontSize: 8, fontWeight: '800' },
  swapVal: { fontSize: 11, fontWeight: '800', color: W.text },
  swapDate: { fontSize: 10, color: W.textMuted },

  // ── Transaction Section ───────────────────────────────────────────────────
  txSection: {
    backgroundColor: W.white, borderRadius: 20,
    borderWidth: 1, borderColor: W.border, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  txHeader: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
  },
  txTitle: { fontSize: 16, fontWeight: '800', color: W.text },
  txCount: { fontSize: 11, color: W.textMuted },

  filterRow: {
    flexDirection: 'row', backgroundColor: W.bgSurface,
    borderRadius: 12, margin: 12, padding: 3, gap: 2,
  },
  filterTab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  filterTabActive: { backgroundColor: W.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  filterTabText: { fontSize: 12, fontWeight: '600', color: W.textMuted },
  filterTabTextActive: { color: W.text },

  txGroup: { gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  txGroupLabelRow: { paddingVertical: 6, paddingHorizontal: 4 },
  txGroupLabel: { fontSize: 11, color: W.textMuted, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  txGroupCard: {
    backgroundColor: W.white, borderRadius: 16,
    borderWidth: 1, borderColor: W.border, overflow: 'hidden',
  },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  txDivider: { height: 1, backgroundColor: W.border, marginHorizontal: 14 },
  txIconBox: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  txBody: { flex: 1, gap: 4 },
  txLabel: { fontSize: 14, fontWeight: '600', color: W.text },
  txSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  txTime: { fontSize: 11, color: W.textMuted },
  txAmount: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },

  centered: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: W.bgSurface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: W.border,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: W.text },
  emptySub: { fontSize: 13, color: W.textMuted, textAlign: 'center' },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: W.greenLight, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 9,
    borderWidth: 1, borderColor: W.greenBorder, marginTop: 4,
  },
  emptyActionText: { fontSize: 14, color: W.green, fontWeight: '700' },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: W.bgSurface, borderRadius: 12,
    borderWidth: 1, borderColor: W.border,
  },
  retryText: { fontSize: 13, color: W.text, fontWeight: '600' },

  // ── Numpad Modal ──────────────────────────────────────────────────────────
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)' },
  numSheet: {
    backgroundColor: W.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20,
    borderTopWidth: 1, borderColor: W.border,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: W.bgElevated, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  numHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  numTitle: { fontSize: 20, fontWeight: '800', color: W.text },
  sheetClose: {
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
    backgroundColor: W.bgSurface, borderRadius: 10, borderWidth: 1, borderColor: W.border,
  },

  numDisplay: { alignItems: 'center', borderBottomWidth: 1, borderBottomColor: W.border, paddingBottom: 16, marginBottom: 12 },
  numDisplayLabel: { fontSize: 11, fontWeight: '600', color: W.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  numDisplayRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  numCur: { fontSize: 18, fontWeight: '700', color: W.textMuted, marginBottom: 6 },
  numAmt: { fontSize: 44, fontWeight: '800', letterSpacing: -2 },
  numRate: { fontSize: 12, color: W.textMuted, marginTop: 4 },
  numMin: { fontSize: 12, color: W.rose, marginTop: 2 },

  numQuicks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  numQuick: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: W.bgSurface, borderWidth: 1.5, borderColor: W.border,
  },
  numQuickActive: { backgroundColor: W.greenLight, borderColor: W.green },
  numQuickText: { fontSize: 13, fontWeight: '700', color: W.textSub },
  numQuickTextActive: { color: W.green },

  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 14 },
  numKey: {
    width: '31%', aspectRatio: 1.9, backgroundColor: W.bgSurface,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  numKeyDel: { backgroundColor: W.bgElevated },
  numKeyText: { fontSize: 20, fontWeight: '700', color: W.text },

  fundBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: W.green, borderRadius: 18, paddingVertical: 16,
    marginBottom: 12,
    shadowColor: W.green, shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fundBtnOff: { backgroundColor: W.bgElevated, shadowOpacity: 0 },
  fundBtnText: { fontSize: 16, fontWeight: '800', color: W.white },
  secureNoteText: { fontSize: 11, color: W.textMuted, textAlign: 'center', marginBottom: 8 },

  // ── WebView ───────────────────────────────────────────────────────────────
  webviewContainer: { flex: 1, backgroundColor: W.white },
  webviewHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingHorizontal: 12, paddingBottom: 14,
    backgroundColor: W.white, borderBottomWidth: 1, borderBottomColor: W.border,
  },
  webviewTitle: { fontSize: 15, fontWeight: '700', color: W.text },
  webviewBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  webviewBadgeText: { fontSize: 11, color: W.green, fontWeight: '600' },
});
