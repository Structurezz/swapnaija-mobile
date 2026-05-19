import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
  Animated, Modal, Image, Linking, Pressable, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import {
  getDisputeRoom, sendDisputeMessage, uploadEvidenceFile,
  findLawyers, requestCounsel,
} from '../../../src/api/dispute.api';
import { BASE_URL } from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/auth.store';
import { getSocket } from '../../../src/hooks/useSocket';
import { formatBC } from '../../../src/utils/currency';
import BackButton from '../../../src/components/ui/BackButton';

// ── Nigerian Court Palette ────────────────────────────────────────────────────
const C = {
  // Greens — Nigerian flag
  bgDeep:    '#001208',
  bgCard:    '#001f0e',
  bgSurface: '#002d14',
  green700:  '#004d1f',
  green600:  '#006629',
  naija:     '#008751',   // official Nigerian green
  green400:  '#22c55e',
  green300:  '#4ade80',
  greenGlow: 'rgba(0,135,81,0.35)',

  // Gold accents
  gold:      '#C9A84C',
  goldLight: '#E8C97A',
  goldFaint: 'rgba(201,168,76,0.1)',
  goldBorder:'rgba(201,168,76,0.3)',

  // White
  white:     '#FFFFFF',
  cream:     '#F5F0E0',
  offWhite:  'rgba(255,255,255,0.85)',

  // Text
  textPrimary:   '#FFFFFF',
  textSecondary: '#86EFAC',
  textMuted:     '#4ade80',
  textFaint:     'rgba(255,255,255,0.35)',

  // Semantic
  rose:      '#fb7185',
  sky:       '#38bdf8',
  teal:      '#2dd4bf',
  emerald:   '#34d399',
  amber:     '#f59e0b',
};

// ── Constants ─────────────────────────────────────────────────────────────────
const STAGE_ORDER = ['opening', 'evidence', 'deliberation', 'ruling', 'closed'];

const STAGE_META = {
  opening:      { label: 'Opening',      num: 1, icon: '📋', desc: 'Parties present their opening accounts' },
  evidence:     { label: 'Evidence',     num: 2, icon: '🔍', desc: 'Documentary evidence is submitted' },
  deliberation: { label: 'Deliberation', num: 3, icon: '⚖️', desc: 'ARIA deliberates on the evidence' },
  ruling:       { label: 'Ruling',       num: 4, icon: '🔨', desc: 'The binding judgment is issued' },
  closed:       { label: 'Closed',       num: 5, icon: '✅', desc: 'Proceedings are concluded' },
};

const COURT_RULES = [
  { article: 'I',    title: 'Jurisdiction',       body: 'This court holds exclusive jurisdiction over all disputes arising from SwapNaija barter transactions.' },
  { article: 'II',   title: 'Opening Statements', body: 'The Claimant presents first. The Respondent responds. Statements must be factual, direct, and candid.' },
  { article: 'III',  title: 'Evidence',            body: 'Evidence is admissible only in the Evidence stage. Late submissions require judicial leave from ARIA.' },
  { article: 'IV',   title: 'ARIA Authority',      body: 'ARIA is the presiding AI judge with full autonomous authority to advance proceedings and issue rulings.' },
  { article: 'V',    title: 'Legal Counsel',       body: 'Either party may retain a certified practitioner from the SwapNaija Legal Registry at any stage.' },
  { article: 'VI',   title: 'Rulings',             body: 'All rulings are final and binding. Escrow funds are disbursed within 24 hours. No appeals permitted.' },
  { article: 'VII',  title: 'Conduct',             body: 'False or misleading submissions are punishable by full escrow forfeiture. Conduct yourself with decorum.' },
  { article: 'VIII', title: 'Escrow Protection',   body: 'All funds are frozen from the moment this court is convened until a ruling or mutual release is issued.' },
];

const MSG_TYPES = [
  { value: 'text',     label: 'Statement', icon: 'chatbubble-outline' },
  { value: 'evidence', label: 'Evidence',  icon: 'camera-outline' },
  { value: 'question', label: 'Question',  icon: 'help-circle-outline' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <Text key={i} style={{ fontWeight: '800', color: C.goldLight }}>{part.slice(2, -2)}</Text>
      : part
  );
}

function computeMyOutcome(room, userId) {
  const ruling = room?.ruling;
  if (!ruling?.decision) return null;
  const snap       = room.swapSnapshot || {};
  const escrowKobo = snap.escrowDepositKobo || 0;
  const refundKobo = Math.round(escrowKobo * 0.98);
  const imInitiator = (room.initiatorId?.id ?? room.initiatorId) === userId;
  const { decision, compensationAmountKobo = 0, penaltyAmountKobo = 0 } = ruling;
  switch (decision) {
    case 'mutual_release': return { icon: '↩️', label: 'Your escrow is released back to you', color: C.sky, amount: refundKobo };
    case 'split':          return { icon: '✂️', label: 'Escrow split equally between parties', color: C.sky, amount: Math.round(refundKobo / 2) };
    case 'compensate_initiator': return imInitiator
      ? { icon: '💰', label: 'You receive compensation', color: C.green400, amount: compensationAmountKobo }
      : { icon: '📤', label: 'Compensation awarded to initiator', color: C.rose, amount: compensationAmountKobo };
    case 'compensate_receiver': return imInitiator
      ? { icon: '📤', label: 'Compensation awarded to receiver', color: C.rose, amount: compensationAmountKobo }
      : { icon: '💰', label: 'You receive compensation', color: C.green400, amount: compensationAmountKobo };
    case 'penalty_initiator': return imInitiator
      ? { icon: '⚠️', label: 'A penalty has been levied against you', color: C.rose, amount: penaltyAmountKobo }
      : { icon: '↩️', label: 'Initiator penalised — escrow released', color: C.green400, amount: refundKobo };
    case 'penalty_receiver': return imInitiator
      ? { icon: '↩️', label: 'Receiver penalised — escrow released', color: C.green400, amount: refundKobo }
      : { icon: '⚠️', label: 'A penalty has been levied against you', color: C.rose, amount: penaltyAmountKobo };
    default: return null;
  }
}

// ── Animated Nigerian Court Seal ──────────────────────────────────────────────
function CourtSeal({ size = 52 }) {
  const spin1 = useRef(new Animated.Value(0)).current;
  const spin2 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spin1, { toValue: 1, duration: 18000, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(spin2, { toValue: 1, duration: 10000, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.7, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);

  const r1 = spin1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const r2 = spin2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer rotating ring — Nigerian green dashes */}
      <Animated.View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: 1.5, borderColor: C.naija, borderStyle: 'dashed',
        transform: [{ rotate: r1 }],
      }} />
      {/* Inner rotating ring — gold dashes */}
      <Animated.View style={{
        position: 'absolute', width: size * 0.72, height: size * 0.72,
        borderRadius: size * 0.36,
        borderWidth: 1, borderColor: C.gold, borderStyle: 'dashed',
        transform: [{ rotate: r2 }],
      }} />
      {/* Static green ring */}
      <View style={{
        position: 'absolute', width: size * 0.5, height: size * 0.5,
        borderRadius: size * 0.25, borderWidth: 1, borderColor: C.green600,
      }} />
      {/* Glowing core */}
      <Animated.View style={{
        width: size * 0.44, height: size * 0.44, borderRadius: size * 0.22,
        backgroundColor: C.naija, borderWidth: 1.5, borderColor: C.gold,
        alignItems: 'center', justifyContent: 'center', opacity: pulse,
        shadowColor: C.naija, shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
        elevation: 8,
      }}>
        <Ionicons name="scale-outline" size={size * 0.22} color={C.goldLight} />
      </Animated.View>
    </View>
  );
}

// ── Pulsing live dot ──────────────────────────────────────────────────────────
function LiveDot() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 0.15, duration: 500, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={[s.liveDot, { opacity: anim }]} />;
}

// ── Resolve relative file URLs against the backend origin ────────────────────
const BACKEND_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');
function resolveFileUrl(url) {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  return `${BACKEND_ORIGIN}${url}`;
}

// ── Attachment renderer ───────────────────────────────────────────────────────
function MsgAttachment({ attachment }) {
  if (!attachment?.url) return null;
  const url = resolveFileUrl(attachment.url);
  if (attachment.isPdf) {
    return (
      <TouchableOpacity style={s.attachLink} onPress={() => Linking.openURL(url).catch(() => {})}>
        <Ionicons name="document-text-outline" size={12} color={C.goldLight} />
        <Text style={s.attachLinkText} numberOfLines={1}>{attachment.filename || 'attachment.pdf'}</Text>
        <Ionicons name="open-outline" size={10} color={C.gold} />
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={() => Linking.openURL(url).catch(() => {})}>
      <Image source={{ uri: url }} style={s.attachImage} resizeMode="cover" />
    </TouchableOpacity>
  );
}

// ── Message components ────────────────────────────────────────────────────────

function SystemMsg({ msg }) {
  return (
    <View style={s.sysRow}>
      <View style={s.sysLine} />
      <Text style={s.sysText}>{msg.content}</Text>
      <View style={s.sysLine} />
    </View>
  );
}

function AriaMsg({ msg, isFinal }) {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1400, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 1400, useNativeDriver: false }),
    ])).start();
  }, []);

  const shadowRadius = glow.interpolate({ inputRange: [0, 1], outputRange: [4, 18] });
  const borderColor  = isFinal
    ? glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(201,168,76,0.4)', 'rgba(201,168,76,0.9)'] })
    : glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,135,81,0.3)', 'rgba(0,135,81,0.7)'] });

  return (
    <View style={s.ariaWrap}>
      {/* ARIA avatar — green glowing seal */}
      <Animated.View style={[s.ariaAvatar, isFinal && s.ariaAvatarFinal, {
        shadowColor: isFinal ? C.gold : C.naija,
        shadowOpacity: 0.9, shadowRadius, elevation: 8,
        shadowOffset: { width: 0, height: 0 },
      }]}>
        <Ionicons name="hammer-outline" size={14} color={isFinal ? C.goldLight : C.white} />
      </Animated.View>

      <View style={{ flex: 1 }}>
        <View style={s.ariaHeaderRow}>
          <Text style={[s.ariaName, isFinal && { color: C.goldLight }]}>ARIA</Text>
          <View style={[s.ariaTag, isFinal && s.ariaTagFinal]}>
            <Text style={[s.ariaTagText, isFinal && { color: C.goldLight }]}>
              {isFinal ? 'Final Ruling' : 'Presiding Judge'}
            </Text>
          </View>
          <Text style={s.timeText}>{format(new Date(msg.createdAt), 'HH:mm')}</Text>
        </View>
        <Animated.View style={[s.ariaBubble, isFinal && s.ariaBubbleFinal, { borderColor }]}>
          {msg.content.split('\n').map((line, i) => (
            <Text key={i} style={[s.ariaText, isFinal && { color: C.cream }]}>
              {parseBold(line)}
            </Text>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

function RulingMsg({ msg }) {
  return (
    <View style={s.rulingCard}>
      {/* Corner ornaments */}
      <View style={[s.corner, { top: 6, left: 6, borderTopWidth: 2, borderLeftWidth: 2 }]} />
      <View style={[s.corner, { top: 6, right: 6, borderTopWidth: 2, borderRightWidth: 2 }]} />
      <View style={[s.corner, { bottom: 6, left: 6, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
      <View style={[s.corner, { bottom: 6, right: 6, borderBottomWidth: 2, borderRightWidth: 2 }]} />

      <View style={s.rulingHeaderRow}>
        <View style={s.rulingGavel}>
          <Ionicons name="hammer-outline" size={16} color={C.goldLight} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rulingTitle}>FORMAL RULING</Text>
          <Text style={s.rulingMeta}>{format(new Date(msg.createdAt), 'dd MMM yyyy · HH:mm')} · {msg.senderName}</Text>
        </View>
      </View>
      <View style={s.rulingDivider} />
      <Text style={s.rulingContent}>{msg.content}</Text>
    </View>
  );
}

function AdminMsg({ msg }) {
  const att = msg.metadata?.attachment;
  return (
    <View style={s.bubbleRow}>
      <View style={s.adminBadge}><Text style={s.adminBadgeText}>A</Text></View>
      <View style={{ flex: 1 }}>
        <View style={s.nameRow}>
          <Text style={[s.senderName, { color: '#93c5fd' }]}>{msg.senderName}</Text>
          <View style={[s.chip, { backgroundColor: 'rgba(37,99,235,0.15)', borderColor: 'rgba(37,99,235,0.35)' }]}>
            <Text style={[s.chipText, { color: '#60a5fa' }]}>Admin</Text>
          </View>
          <Text style={s.timeText}>{format(new Date(msg.createdAt), 'HH:mm')}</Text>
        </View>
        <View style={[s.bubble, { backgroundColor: 'rgba(37,99,235,0.12)', borderColor: 'rgba(37,99,235,0.3)' }]}>
          <Text style={[s.bubbleText, { color: '#bfdbfe' }]}>{msg.content}</Text>
          {att && <MsgAttachment attachment={att} />}
        </View>
      </View>
    </View>
  );
}

function CounselMsg({ msg }) {
  const isClaim = msg.senderRole === 'counsel_claimant';
  const color   = isClaim ? C.teal : C.emerald;
  const att     = msg.metadata?.attachment;
  return (
    <View style={s.bubbleRow}>
      <View style={[s.counselBadge, { borderColor: color }]}>
        <Ionicons name="briefcase-outline" size={12} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.nameRow}>
          <Text style={[s.senderName, { color }]}>{msg.senderName}</Text>
          <View style={[s.chip, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
            <Text style={[s.chipText, { color }]}>{isClaim ? "Claimant's Counsel" : "Respondent's Counsel"}</Text>
          </View>
          <Text style={s.timeText}>{format(new Date(msg.createdAt), 'HH:mm')}</Text>
        </View>
        <View style={[s.bubble, { backgroundColor: `${color}10`, borderColor: `${color}30` }]}>
          <Text style={[s.bubbleText, { color: C.offWhite }]}>{msg.content}</Text>
          {att && <MsgAttachment attachment={att} />}
        </View>
      </View>
    </View>
  );
}

function MyMsg({ msg }) {
  const bgMap = { evidence: C.green700, question: '#4c1d95', text: C.naija };
  const label = msg.messageType !== 'text'
    ? msg.messageType.charAt(0).toUpperCase() + msg.messageType.slice(1)
    : null;
  const att = msg.metadata?.attachment;
  return (
    <View style={s.myWrap}>
      {label && (
        <View style={s.myLabelRow}>
          {att && <Ionicons name="attach-outline" size={9} color={C.gold} style={{ marginRight: 2 }} />}
          <Text style={s.myLabel}>{label}</Text>
        </View>
      )}
      <View style={[s.myBubble, { backgroundColor: bgMap[msg.messageType] || C.naija }]}>
        {msg.content ? <Text style={s.myText}>{msg.content}</Text> : null}
        {att && <MsgAttachment attachment={att} />}
        <Text style={s.myTime}>{format(new Date(msg.createdAt), 'HH:mm')}</Text>
      </View>
    </View>
  );
}

function OtherMsg({ msg, isClaimant }) {
  const color   = isClaimant ? C.rose : C.sky;
  const initial = (msg.senderName || '?').charAt(0).toUpperCase();
  const att     = msg.metadata?.attachment;
  return (
    <View style={s.bubbleRow}>
      <View style={[s.otherBadge, { borderColor: color }]}>
        <Text style={[s.otherBadgeText, { color }]}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.nameRow}>
          <Text style={[s.senderName, { color }]}>{msg.senderName}</Text>
          <View style={[s.chip, { backgroundColor: `${color}15`, borderColor: `${color}35` }]}>
            <Text style={[s.chipText, { color }]}>{isClaimant ? 'Claimant' : 'Respondent'}</Text>
          </View>
          <Text style={s.timeText}>{format(new Date(msg.createdAt), 'HH:mm')}</Text>
        </View>
        <View style={[s.bubble, { backgroundColor: C.bgCard, borderColor: C.green700 }]}>
          <Text style={[s.bubbleText, { color: C.offWhite }]}>{msg.content}</Text>
          {att && <MsgAttachment attachment={att} />}
        </View>
      </View>
    </View>
  );
}

// ── Court Info bottom sheet ───────────────────────────────────────────────────
function CourtInfoModal({ visible, onClose, stage, room }) {
  const currentIdx = STAGE_ORDER.indexOf(stage);
  const snap = room?.swapSnapshot || {};
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Seal header */}
          <View style={s.sheetSealRow}>
            <CourtSeal size={60} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.sheetCourtName}>SwapNaija Dispute Court</Text>
              {room && (
                <Text style={s.sheetCaseNo}>
                  Case #{(room.swapId?.toString?.() || '').slice(-8).toUpperCase()}
                </Text>
              )}
              {/* Nigerian flag strip */}
              <View style={s.flagStrip}>
                <View style={[s.flagBlock, { backgroundColor: C.naija }]} />
                <View style={[s.flagBlock, { backgroundColor: C.white }]} />
                <View style={[s.flagBlock, { backgroundColor: C.naija }]} />
              </View>
            </View>
          </View>

          {/* Stage tracker */}
          <Text style={s.sectionLabel}>Proceedings</Text>
          <View style={{ paddingHorizontal: 20 }}>
            {STAGE_ORDER.map((stg, i) => {
              const meta   = STAGE_META[stg];
              const isDone = i < currentIdx;
              const isNow  = i === currentIdx;
              const isLast = i === STAGE_ORDER.length - 1;
              return (
                <View key={stg} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ alignItems: 'center', width: 24 }}>
                    <View style={[s.stageNode,
                      isDone && s.stageNodeDone,
                      isNow  && s.stageNodeActive,
                    ]}>
                      {isDone
                        ? <Ionicons name="checkmark" size={11} color={C.bgDeep} />
                        : <Text style={[s.stageNum, isNow && { color: C.goldLight }]}>{meta.num}</Text>
                      }
                    </View>
                    {!isLast && <View style={[s.stageLine, isDone && { backgroundColor: C.naija }]} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: isLast ? 0 : 20, paddingTop: 2 }}>
                    <Text style={[s.stageLabel,
                      isNow  && { color: C.goldLight, fontWeight: '700' },
                      isDone && { color: C.green400 },
                    ]}>{meta.label}</Text>
                    {isNow && <Text style={s.stageDesc}>{meta.desc}</Text>}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Parties */}
          {room && (
            <>
              <Text style={s.sectionLabel}>Parties</Text>
              <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20 }}>
                <View style={[s.partyCard, { borderColor: `${C.rose}35` }]}>
                  <Text style={[s.partyCardRole, { color: C.rose }]}>Claimant</Text>
                  <Text style={s.partyCardName}>{snap.claimantName || 'Claimant'}</Text>
                </View>
                <View style={[s.partyCard, { borderColor: `${C.sky}35` }]}>
                  <Text style={[s.partyCardRole, { color: C.sky }]}>Respondent</Text>
                  <Text style={s.partyCardName}>{snap.respondentName || 'Respondent'}</Text>
                </View>
              </View>
            </>
          )}

          {/* Constitution */}
          <Text style={s.sectionLabel}>Court Constitution</Text>
          <View style={s.constitutionCard}>
            <View style={s.constitutionHeader}>
              {/* Mini Nigerian flag */}
              <View style={s.miniFlagRow}>
                <View style={[s.miniFlagBlock, { backgroundColor: C.naija }]} />
                <View style={[s.miniFlagBlock, { backgroundColor: C.white }]} />
                <View style={[s.miniFlagBlock, { backgroundColor: C.naija }]} />
              </View>
              <Text style={s.constitutionTitle}>Rules &amp; Governing Articles</Text>
            </View>
            {COURT_RULES.map(rule => (
              <View key={rule.article} style={s.ruleRow}>
                <View style={s.ruleAccent} />
                <View style={{ flex: 1 }}>
                  <Text style={s.ruleTitle}>Art. {rule.article} · {rule.title}</Text>
                  <Text style={s.ruleBody}>{rule.body}</Text>
                </View>
              </View>
            ))}
            <Text style={s.constitutionFooter}>Effective upon room convening · ARIA presides</Text>
          </View>
        </ScrollView>

        <TouchableOpacity style={s.closeSheetBtn} onPress={onClose}>
          <Text style={s.closeSheetText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Lawyer Directory Modal ─────────────────────────────────────────────────────
function LawyerModal({ visible, roomId, onClose }) {
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [fee, setFee]           = useState('');

  const { data: lawyersData, isLoading } = useQuery({
    queryKey: ['lawyers'],
    queryFn:  () => findLawyers({ limit: 50 }),
    enabled:  visible,
  });
  const lawyers  = Array.isArray(lawyersData) ? lawyersData : (lawyersData?.lawyers ?? []);
  const filtered = lawyers.filter(l => !search || l.fullName?.toLowerCase().includes(search.toLowerCase()));

  const hireMutation = useMutation({
    mutationFn: () => requestCounsel(roomId, selected.id, Math.round(parseFloat(fee || '0') * 100)),
    onSuccess: () => { Alert.alert('Request Sent', `Retainer request sent to ${selected.fullName}`); onClose(); },
    onError:   (err) => Alert.alert('Error', err.response?.data?.error ?? 'Failed to request counsel'),
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <View style={s.lawyerModalHeader}>
          <View style={s.lawyerModalIcon}>
            <Ionicons name="book-outline" size={16} color={C.goldLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.lawyerModalTitle}>Legal Counsel Registry</Text>
            <Text style={s.lawyerModalSub}>Certified SwapNaija practitioners</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
            <Ionicons name="close" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {!selected ? (
          <>
            <View style={s.searchBox}>
              <Ionicons name="search-outline" size={14} color={C.green400} />
              <TextInput
                style={s.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name…"
                placeholderTextColor={C.green600}
              />
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
              {isLoading && <ActivityIndicator color={C.naija} />}
              {!isLoading && filtered.length === 0 && (
                <Text style={{ textAlign: 'center', fontSize: 13, color: C.textFaint, paddingVertical: 20 }}>
                  No practitioners found
                </Text>
              )}
              {filtered.map(lawyer => (
                <TouchableOpacity key={lawyer.id} style={s.lawyerRow} onPress={() => setSelected(lawyer)}>
                  <View style={s.lawyerAvatar}>
                    <Text style={s.lawyerAvatarText}>{lawyer.fullName?.charAt(0) || '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.lawyerName}>{lawyer.fullName}</Text>
                    {lawyer.legalSpecialization && <Text style={s.lawyerSpec}>{lawyer.legalSpecialization}</Text>}
                    {lawyer.legalBio && <Text style={s.lawyerBio} numberOfLines={1}>{lawyer.legalBio}</Text>}
                    {lawyer.legalFeePerCaseKobo > 0 && (
                      <Text style={s.lawyerFee}>{formatBC(lawyer.legalFeePerCaseKobo)} / case</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={C.green600} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => setSelected(null)}>
              <Ionicons name="arrow-back" size={14} color={C.textMuted} />
              <Text style={{ fontSize: 12, color: C.textMuted }}>Back to registry</Text>
            </TouchableOpacity>
            <View style={s.lawyerRow}>
              <View style={s.lawyerAvatar}>
                <Text style={s.lawyerAvatarText}>{selected.fullName?.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.lawyerName}>{selected.fullName}</Text>
                {selected.legalSpecialization && <Text style={s.lawyerSpec}>{selected.legalSpecialization}</Text>}
                {selected.legalBio && <Text style={s.lawyerBio}>{selected.legalBio}</Text>}
              </View>
            </View>
            <View>
              <Text style={s.feeLabel}>Proposed retainer fee (BC)</Text>
              <TextInput
                style={s.feeInput}
                value={fee}
                onChangeText={setFee}
                keyboardType="decimal-pad"
                placeholder={selected.legalFeePerCaseKobo ? `Suggested: ${(selected.legalFeePerCaseKobo / 100).toFixed(2)}` : '0.00'}
                placeholderTextColor={C.green600}
              />
              <Text style={[s.feeLabel, { fontWeight: '400', textTransform: 'none', letterSpacing: 0, marginTop: 6 }]}>
                Lawyer may counter-propose. Fee deducted on acceptance.
              </Text>
            </View>
            <TouchableOpacity
              style={[s.hireBtn, hireMutation.isPending && { opacity: 0.5 }]}
              onPress={() => hireMutation.mutate()}
              disabled={hireMutation.isPending}
            >
              {hireMutation.isPending
                ? <ActivityIndicator size="small" color={C.goldLight} />
                : <><Ionicons name="briefcase-outline" size={14} color={C.goldLight} /><Text style={s.hireBtnText}>Submit Retainer Request</Text></>
              }
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DisputeRoomScreen() {
  const { swapId }  = useLocalSearchParams();
  const router      = useRouter();
  const { user }    = useAuthStore();
  const queryClient = useQueryClient();

  const [messages, setMessages]       = useState([]);
  const [stage, setStage]             = useState('opening');
  const [roomId, setRoomId]           = useState(null);
  const [input, setInput]             = useState('');
  const [msgType, setMsgType]         = useState('text');
  const [showInfo, setShowInfo]       = useState(false);
  const [showLawyers, setShowLawyers] = useState(false);
  const [attachment, setAttachment]   = useState(null);
  const flatRef = useRef(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dispute-room', swapId],
    queryFn:  () => getDisputeRoom(swapId),
    retry: 2,
  });

  useEffect(() => {
    if (data) {
      setMessages(data.messages || []);
      setStage(data.room?.stage || 'opening');
      setRoomId(data.room?.id);
    }
  }, [data]);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('dispute:join', roomId);
    const onMsg   = (msg) => {
      const id = msg.id || msg._id;
      setMessages(prev => prev.some(m => (m.id || m._id) === id) ? prev : [...prev, msg]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    };
    const onStage   = ({ stage: st }) => { setStage(st); queryClient.invalidateQueries({ queryKey: ['dispute-room', swapId] }); };
    const onRuled   = () => queryClient.invalidateQueries({ queryKey: ['dispute-room', swapId] });
    const onCounsel = () => queryClient.invalidateQueries({ queryKey: ['dispute-room', swapId] });

    socket.on('dispute:message',           onMsg);
    socket.on('dispute:stage_changed',     onStage);
    socket.on('dispute:ruled',             onRuled);
    socket.on('dispute:counsel_joined',    onCounsel);
    socket.on('dispute:counsel_requested', onCounsel);
    return () => {
      socket.emit('dispute:leave', roomId);
      socket.off('dispute:message',           onMsg);
      socket.off('dispute:stage_changed',     onStage);
      socket.off('dispute:ruled',             onRuled);
      socket.off('dispute:counsel_joined',    onCounsel);
      socket.off('dispute:counsel_requested', onCounsel);
    };
  }, [roomId, swapId, queryClient]);

  const uploadMutation = useMutation({
    mutationFn: (att) => uploadEvidenceFile(roomId, att.uri, att.name, att.mimeType),
    onError: (err) => Alert.alert('Upload Failed', err.response?.data?.error ?? 'Could not upload file'),
  });

  const sendMutation = useMutation({
    mutationFn: (attachmentMeta) => sendDisputeMessage(roomId, input.trim(), msgType, attachmentMeta),
    onSuccess: (msg) => {
      setInput(''); setAttachment(null);
      const id = msg.id || msg._id;
      setMessages(prev => prev.some(m => (m.id || m._id) === id) ? prev : [...prev, msg]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: (err) => Alert.alert('Send Failed', err.response?.data?.error ?? 'Could not send message'),
  });

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access to attach evidence.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() || 'jpg';
      setAttachment({ uri: asset.uri, name: `evidence_${Date.now()}.${ext}`, mimeType: asset.mimeType || `image/${ext}`, isPdf: false });
    }
  }, []);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && !attachment) || !roomId || sendMutation.isPending || uploadMutation.isPending) return;
    let attachmentMeta = null;
    if (attachment) {
      try {
        const result = await uploadMutation.mutateAsync(attachment);
        attachmentMeta = { attachmentUrl: result.url, attachmentFilename: result.filename, attachmentIsPdf: result.isPdf };
      } catch { return; }
    }
    sendMutation.mutate(attachmentMeta);
  }, [input, attachment, roomId, sendMutation, uploadMutation]);

  const room           = data?.room;
  const isClosed       = room?.status !== 'active';
  const claimantUserId = room?.claimantId?.id ?? room?.claimantId;
  const myRole         = room ? ((room.claimantId?.id ?? room.claimantId) === user?.id ? 'Claimant' : 'Respondent') : null;
  const stageMeta      = STAGE_META[stage] || STAGE_META.opening;
  const myOutcome      = room ? computeMyOutcome(room, user?.id) : null;
  const snap           = room?.swapSnapshot || {};
  const canHire        = !isClosed && (myRole === 'Claimant' ? !snap.claimantCounselName : !snap.respondentCounselName);

  const renderMessage = ({ item: msg }) => {
    const id = msg.id || msg._id;
    if (msg.messageType === 'system' || msg.senderRole === 'system') return <SystemMsg key={id} msg={msg} />;
    if (msg.messageType === 'ruling')  return <RulingMsg key={id} msg={msg} />;
    if (msg.senderRole === 'bot')      return <AriaMsg key={id} msg={msg} isFinal={msg.messageType === 'decision'} />;
    if (msg.senderRole === 'admin')    return <AdminMsg key={id} msg={msg} />;
    if (msg.senderRole === 'counsel_claimant' || msg.senderRole === 'counsel_respondent') {
      const sid = msg.senderId?.id || msg.senderId?._id || msg.senderId;
      if (sid === user?.id) return <MyMsg key={id} msg={msg} />;
      return <CounselMsg key={id} msg={msg} />;
    }
    const senderId = msg.senderId?.id || msg.senderId?._id || msg.senderId;
    if (senderId === user?.id) return <MyMsg key={id} msg={msg} />;
    return <OtherMsg key={id} msg={msg} isClaimant={senderId === claimantUserId} />;
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={s.screen}>
        <View style={s.header}>
          <BackButton fallback="/swaps" color={C.green400} />
          <Text style={s.headerTitle}>Dispute Court</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <CourtSeal size={80} />
          <Text style={s.conveneText}>Convening court…</Text>
        </View>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (isError || !room) {
    const is404 = error?.response?.status === 404;
    return (
      <View style={s.screen}>
        <View style={s.header}>
          <BackButton fallback="/swaps" color={C.green400} />
          <Text style={s.headerTitle}>Dispute Court</Text>
        </View>
        <View style={s.errorState}>
          <Ionicons name={is404 ? 'time-outline' : 'warning-outline'} size={52} color={C.gold} />
          <Text style={s.errorTitle}>{is404 ? 'Court not yet convened' : 'Failed to load'}</Text>
          <Text style={s.errorSub}>{is404 ? 'The room will open shortly.' : 'Check your connection.'}</Text>
          {!is404 && (
            <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
              <Ionicons name="refresh-outline" size={14} color={C.goldLight} />
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
          <BackButton fallback="/swaps" color={C.green400} />
        </View>
      </View>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── Header ── */}
      <View style={s.header}>
        <BackButton fallback="/swaps" color={C.green400} />
        <CourtSeal size={38} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.headerTitle}>{stageMeta.icon} {stageMeta.label}</Text>
            {!isClosed && (
              <View style={s.liveChip}>
                <LiveDot />
                <Text style={s.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          <Text style={s.headerSub}>
            Case #{swapId?.slice(-8).toUpperCase()}{myRole ? `  ·  ${myRole}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={s.infoBtn} onPress={() => setShowInfo(true)}>
          <Ionicons name="information-circle-outline" size={22} color={C.gold} />
        </TouchableOpacity>
      </View>

      {/* Nigerian flag divider under header */}
      <View style={s.flagDivider}>
        <View style={[s.flagDividerBlock, { backgroundColor: C.naija }]} />
        <View style={[s.flagDividerBlock, { backgroundColor: C.white }]} />
        <View style={[s.flagDividerBlock, { backgroundColor: C.naija }]} />
      </View>

      {/* Ruling outcome banner */}
      {isClosed && myOutcome && (
        <View style={[s.outcomeBanner, { borderColor: `${myOutcome.color}40` }]}>
          <Text style={s.outcomeIcon}>{myOutcome.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.outcomeLabel, { color: myOutcome.color }]}>{myOutcome.label}</Text>
            {myOutcome.amount > 0 && <Text style={[s.outcomeAmt, { color: myOutcome.color }]}>{formatBC(myOutcome.amount)}</Text>}
          </View>
          <Ionicons name="shield-checkmark-outline" size={18} color={myOutcome.color} />
        </View>
      )}

      {/* Dispute reason strip */}
      {snap.disputeReason ? (
        <View style={s.reasonStrip}>
          <Ionicons name="warning-outline" size={12} color={C.gold} />
          <Text style={s.reasonText} numberOfLines={1}>"{snap.disputeReason}"</Text>
        </View>
      ) : null}

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={s.emptyState}>
          <CourtSeal size={80} />
          <Text style={s.emptyTitle}>Court is convening</Text>
          <Text style={s.emptySub}>ARIA is preparing the opening statement</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={item => item.id || item._id}
          renderItem={renderMessage}
          contentContainerStyle={s.msgList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            (sendMutation.isPending || uploadMutation.isPending) ? (
              <View style={s.sendingRow}>
                <ActivityIndicator size="small" color={C.naija} />
                <Text style={s.sendingText}>{uploadMutation.isPending ? 'Uploading evidence…' : 'Recording submission…'}</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Input area */}
      {!isClosed ? (
        <View style={s.inputArea}>
          {/* Type pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillsRow}>
            {MSG_TYPES.map(({ value, label, icon }) => (
              <TouchableOpacity
                key={value}
                style={[s.pill, msgType === value && s.pillActive]}
                onPress={() => setMsgType(value)}
              >
                <Ionicons name={icon} size={11} color={msgType === value ? C.white : C.green400} />
                <Text style={[s.pillText, msgType === value && s.pillTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
            {canHire && (
              <TouchableOpacity style={s.counselPill} onPress={() => setShowLawyers(true)}>
                <Ionicons name="briefcase-outline" size={11} color={C.goldLight} />
                <Text style={s.counselPillText}>Hire Counsel</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Attachment preview */}
          {attachment && (
            <View style={s.attachPreview}>
              <Ionicons name="image-outline" size={14} color={C.naija} />
              <Text style={s.attachPreviewName} numberOfLines={1}>{attachment.name}</Text>
              {uploadMutation.isPending
                ? <ActivityIndicator size="small" color={C.naija} />
                : <TouchableOpacity onPress={() => setAttachment(null)}>
                    <Ionicons name="close-circle" size={16} color={C.green600} />
                  </TouchableOpacity>
              }
            </View>
          )}

          {/* Input row */}
          <View style={s.inputRow}>
            <TouchableOpacity style={[s.attachBtn, attachment && s.attachBtnActive]} onPress={handlePickImage}>
              <Ionicons name="attach-outline" size={18} color={attachment ? C.naija : C.green600} />
            </TouchableOpacity>
            <TextInput
              style={s.textInput}
              value={input}
              onChangeText={setInput}
              placeholder={
                msgType === 'evidence' ? 'Describe your evidence…' :
                msgType === 'question' ? 'Direct your question to the court…' :
                'Address the court with candour…'
              }
              placeholderTextColor={C.green700}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[s.sendBtn, ((!input.trim() && !attachment) || sendMutation.isPending || uploadMutation.isPending) && s.sendBtnOff]}
              onPress={handleSend}
              disabled={(!input.trim() && !attachment) || sendMutation.isPending || uploadMutation.isPending}
            >
              <Ionicons name="send" size={17} color={C.white} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={s.closedBar}>
          <Ionicons name="lock-closed-outline" size={14} color={C.gold} />
          <Text style={s.closedText}>
            {room.status === 'resolved' ? 'Ruling issued — proceedings closed' : 'Proceedings closed'}
          </Text>
          <BackButton fallback="/swaps" color={C.green400} />
        </View>
      )}

      <CourtInfoModal visible={showInfo} onClose={() => setShowInfo(false)} stage={stage} room={room} />
      <LawyerModal visible={showLawyers} roomId={roomId} onClose={() => setShowLawyers(false)} />
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bgDeep },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingHorizontal: 14, paddingBottom: 12,
    backgroundColor: C.bgSurface,
    borderBottomWidth: 1, borderBottomColor: C.green700,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 14, fontWeight: '800', color: C.white, letterSpacing: 0.4 },
  headerSub: { fontSize: 10, color: C.textMuted, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  infoBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  liveDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: '#ef4444' },
  liveText: { fontSize: 9, fontWeight: '800', color: '#f87171', letterSpacing: 0.6 },

  // Nigerian flag divider
  flagDivider: { flexDirection: 'row', height: 3 },
  flagDividerBlock: { flex: 1 },

  conveneText: { fontSize: 11, color: C.naija, letterSpacing: 3, textTransform: 'uppercase', fontWeight: '600' },

  // Banners
  outcomeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.bgCard, borderBottomWidth: 1,
  },
  outcomeIcon:  { fontSize: 18 },
  outcomeLabel: { fontSize: 12, fontWeight: '600' },
  outcomeAmt:   { fontSize: 11, fontWeight: '700', marginTop: 1 },

  reasonStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: 'rgba(201,168,76,0.07)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,76,0.15)',
  },
  reasonText: { flex: 1, fontSize: 11, color: C.gold, fontStyle: 'italic' },

  // Empty / error
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: C.white, textAlign: 'center' },
  errorSub:   { fontSize: 13, color: C.textSecondary, textAlign: 'center' },
  retryBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.naija, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 22, marginTop: 4 },
  retryText:  { color: C.white, fontWeight: '700', fontSize: 14 },
  backLink:   { fontSize: 13, color: C.green400, fontWeight: '600', marginTop: 8 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.white },
  emptySub:   { fontSize: 12, color: C.textMuted },

  // Messages
  msgList: { padding: 14, gap: 14, paddingBottom: 10 },

  // System
  sysRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  sysLine: { flex: 1, height: 1, backgroundColor: C.green700 },
  sysText: { fontSize: 10, color: C.naija, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },

  // ARIA
  ariaWrap: { flexDirection: 'row', gap: 8 },
  ariaAvatar: {
    width: 30, height: 30, borderRadius: 15, flexShrink: 0, marginTop: 2,
    backgroundColor: C.naija, borderWidth: 1.5, borderColor: C.green400,
    alignItems: 'center', justifyContent: 'center',
  },
  ariaAvatarFinal: { backgroundColor: C.green700, borderColor: C.gold },
  ariaHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  ariaName: { fontSize: 11, fontWeight: '800', color: C.naija, letterSpacing: 1.5, textTransform: 'uppercase' },
  ariaTag: {
    backgroundColor: 'rgba(0,135,81,0.2)', borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(0,135,81,0.4)',
  },
  ariaTagFinal: { backgroundColor: C.goldFaint, borderColor: C.goldBorder },
  ariaTagText: { fontSize: 9, color: C.naija, fontWeight: '600', letterSpacing: 0.4 },
  ariaBubble: {
    backgroundColor: C.bgCard, borderRadius: 14, borderBottomLeftRadius: 4,
    padding: 12, borderWidth: 1, borderColor: 'rgba(0,135,81,0.35)', gap: 3,
  },
  ariaBubbleFinal: { backgroundColor: 'rgba(0,77,31,0.5)', borderColor: C.goldBorder },
  ariaText: { fontSize: 13, color: C.offWhite, lineHeight: 19 },

  // Ruling card
  rulingCard: {
    backgroundColor: 'rgba(0,77,31,0.6)',
    borderRadius: 14, borderWidth: 2, borderColor: C.gold,
    padding: 16, gap: 10, marginVertical: 4,
  },
  corner: { position: 'absolute', width: 12, height: 12, borderColor: C.gold, borderRadius: 3 },
  rulingHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rulingGavel: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.naija, borderWidth: 1.5, borderColor: C.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  rulingTitle: { fontSize: 12, fontWeight: '800', color: C.goldLight, letterSpacing: 1.5, textTransform: 'uppercase' },
  rulingMeta:  { fontSize: 9, color: C.gold, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  rulingDivider: { height: 1, backgroundColor: C.goldBorder },
  rulingContent: { fontSize: 13, color: C.cream, lineHeight: 19 },

  // Bubble rows
  bubbleRow: { flexDirection: 'row', gap: 8 },
  adminBadge: {
    width: 28, height: 28, borderRadius: 14, flexShrink: 0, marginTop: 2,
    backgroundColor: 'rgba(37,99,235,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  adminBadgeText: { fontSize: 12, fontWeight: '700', color: '#93c5fd' },
  counselBadge: {
    width: 28, height: 28, borderRadius: 14, flexShrink: 0, marginTop: 2,
    backgroundColor: C.bgCard, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  otherBadge: {
    width: 28, height: 28, borderRadius: 14, flexShrink: 0, marginTop: 2,
    backgroundColor: C.bgCard, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  otherBadgeText: { fontSize: 12, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  senderName: { fontSize: 12, fontWeight: '700' },
  chip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  chipText: { fontSize: 9, fontWeight: '600', letterSpacing: 0.4 },
  timeText: { fontSize: 10, color: C.green700, marginLeft: 'auto', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  bubble: { borderRadius: 14, borderBottomLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, gap: 5 },
  bubbleText: { fontSize: 13, lineHeight: 18 },

  // My message
  myWrap:    { alignItems: 'flex-end', gap: 3 },
  myLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  myLabel:   { fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  myBubble:  { maxWidth: '82%', borderRadius: 16, borderBottomRightRadius: 4, padding: 12, gap: 5 },
  myText:    { fontSize: 13, color: C.white, lineHeight: 18 },
  myTime:    { fontSize: 10, color: 'rgba(255,255,255,0.45)', textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  // Attachment in bubble
  attachImage: { width: 180, height: 130, borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: C.green700 },
  attachLink:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: C.goldFaint, borderRadius: 8, borderWidth: 1, borderColor: C.goldBorder },
  attachLinkText: { flex: 1, fontSize: 11, color: C.goldLight },

  // Sending indicator
  sendingRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end', padding: 4 },
  sendingText: { fontSize: 11, color: C.textMuted, fontStyle: 'italic' },

  // Input area
  inputArea: {
    backgroundColor: C.bgSurface,
    borderTopWidth: 1, borderTopColor: C.green700,
    paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  pillsRow: { paddingHorizontal: 12, gap: 6, paddingBottom: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
    backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.green700,
  },
  pillActive:     { backgroundColor: C.naija, borderColor: C.green400 },
  pillText:       { fontSize: 11, fontWeight: '600', color: C.green400 },
  pillTextActive: { color: C.white },
  counselPill:    {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
    backgroundColor: C.goldFaint, borderWidth: 1, borderColor: C.goldBorder,
  },
  counselPillText: { fontSize: 11, fontWeight: '600', color: C.goldLight },

  attachPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 6,
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: 'rgba(0,135,81,0.1)', borderRadius: 10, borderWidth: 1, borderColor: C.green700,
  },
  attachPreviewName: { flex: 1, fontSize: 11, color: C.green400 },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, gap: 8 },
  attachBtn: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.green700,
  },
  attachBtnActive: { backgroundColor: 'rgba(0,135,81,0.2)', borderColor: C.naija },
  textInput: {
    flex: 1, backgroundColor: C.bgCard,
    borderRadius: 18, borderWidth: 1.5, borderColor: C.green700,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, color: C.white, maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    backgroundColor: C.naija, borderWidth: 1.5, borderColor: C.green400,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.3 },

  // Closed bar
  closedBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14, paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    backgroundColor: C.bgSurface, borderTopWidth: 1, borderTopColor: C.green700,
  },
  closedText: { flex: 1, fontSize: 12, color: C.textMuted },
  closedLink: { fontSize: 12, color: C.green400, fontWeight: '600' },

  // Modal / sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: {
    backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 2, borderTopColor: C.naija, maxHeight: '88%',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.green700, alignSelf: 'center', marginTop: 10, marginBottom: 4 },

  sheetSealRow: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  sheetCourtName: { fontSize: 15, fontWeight: '800', color: C.white },
  sheetCaseNo: { fontSize: 11, color: C.gold, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 3 },
  flagStrip: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 8, width: 60 },
  flagBlock: { flex: 1 },

  sectionLabel: {
    fontSize: 9, fontWeight: '800', color: C.naija, letterSpacing: 2, textTransform: 'uppercase',
    marginHorizontal: 20, marginTop: 16, marginBottom: 10,
  },

  // Stage tracker
  stageNode: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bgSurface, borderWidth: 1.5, borderColor: C.green700,
  },
  stageNodeDone:   { backgroundColor: C.naija, borderColor: C.green400 },
  stageNodeActive: { backgroundColor: C.bgSurface, borderColor: C.gold, borderWidth: 2 },
  stageNum:        { fontSize: 10, fontWeight: '700', color: C.green600 },
  stageLine:       { width: 2, flex: 1, minHeight: 12, backgroundColor: C.green700, marginVertical: 2 },
  stageLabel:      { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  stageDesc:       { fontSize: 10, color: C.green600, marginTop: 2, lineHeight: 14 },

  // Parties
  partyCard: {
    flex: 1, backgroundColor: C.bgSurface, borderRadius: 12, borderWidth: 1, padding: 10,
  },
  partyCardRole: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  partyCardName: { fontSize: 13, fontWeight: '600', color: C.white, marginTop: 4 },

  // Constitution
  constitutionCard: {
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: C.bgSurface, borderRadius: 14,
    borderWidth: 1, borderColor: C.green700, overflow: 'hidden',
  },
  constitutionHeader: {
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: C.green700,
    alignItems: 'center', gap: 8,
  },
  miniFlagRow:   { flexDirection: 'row', height: 6, width: 40, borderRadius: 2, overflow: 'hidden' },
  miniFlagBlock: { flex: 1 },
  constitutionTitle: { fontSize: 10, fontWeight: '800', color: C.naija, letterSpacing: 1.5, textTransform: 'uppercase' },
  ruleRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,102,41,0.3)',
  },
  ruleAccent: { width: 2, borderRadius: 1, backgroundColor: C.naija },
  ruleTitle:  { fontSize: 9, color: C.naija, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  ruleBody:   { fontSize: 10, color: C.textSecondary, lineHeight: 14, marginTop: 2 },
  constitutionFooter: {
    fontSize: 9, color: C.green700, textAlign: 'center', padding: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  closeSheetBtn: {
    marginHorizontal: 20, marginVertical: 12,
    backgroundColor: C.naija, borderRadius: 16, paddingVertical: 13,
    alignItems: 'center', borderWidth: 1.5, borderColor: C.green400,
  },
  closeSheetText: { fontSize: 14, fontWeight: '700', color: C.white },

  // Lawyer modal
  lawyerModalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.green700,
  },
  lawyerModalIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.bgSurface, borderWidth: 1, borderColor: C.goldBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  lawyerModalTitle: { fontSize: 13, fontWeight: '700', color: C.goldLight },
  lawyerModalSub:   { fontSize: 10, color: C.textMuted },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginVertical: 10,
    backgroundColor: C.bgSurface, borderRadius: 12,
    borderWidth: 1, borderColor: C.green700,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.white },

  lawyerRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: C.bgSurface, borderRadius: 12,
    borderWidth: 1, borderColor: C.green700, padding: 12,
  },
  lawyerAvatar: {
    width: 36, height: 36, borderRadius: 18, flexShrink: 0,
    backgroundColor: C.naija, borderWidth: 1.5, borderColor: C.green400,
    alignItems: 'center', justifyContent: 'center',
  },
  lawyerAvatarText: { fontSize: 14, fontWeight: '800', color: C.white },
  lawyerName: { fontSize: 13, fontWeight: '700', color: C.white },
  lawyerSpec: { fontSize: 10, color: C.gold, marginTop: 2 },
  lawyerBio:  { fontSize: 11, color: C.textMuted, marginTop: 3, lineHeight: 15 },
  lawyerFee:  { fontSize: 11, color: C.green400, fontWeight: '700', marginTop: 4 },

  feeLabel: { fontSize: 9, color: C.naija, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: '700' },
  feeInput: {
    backgroundColor: C.bgSurface, borderRadius: 12,
    borderWidth: 1, borderColor: C.green700,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: C.white,
  },
  hireBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.naija, borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: C.green400,
  },
  hireBtnText: { fontSize: 14, fontWeight: '700', color: C.white },
});
