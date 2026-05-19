import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/currency';

// ── FAQ Data ──────────────────────────────────────────────────────────────────
const FAQ_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'rocket-outline',
    items: [
      {
        id: 'gs-1',
        q: 'How do I create an account?',
        a: 'Download the SwapNaija app, tap \'Get Started\', enter your phone number or email, verify with OTP, and complete your profile. It takes less than 2 minutes.',
      },
      {
        id: 'gs-2',
        q: 'Is SwapNaija free to use?',
        a: 'Yes! Creating an account and listing items is completely free. We only charge for optional premium features like Boost (from ₦500) and Account Verification (₦1,000 one-time).',
      },
      {
        id: 'gs-3',
        q: 'What can I swap on SwapNaija?',
        a: 'You can swap goods (electronics, fashion, furniture, phones, household items) and services (tutorials, repairs, design work). Almost anything legal is allowed.',
      },
    ],
  },
  {
    id: 'making-swap',
    title: 'Making a Swap',
    icon: 'swap-horizontal-outline',
    items: [
      {
        id: 'ms-1',
        q: 'How do I propose a swap?',
        a: 'Find a listing you like, tap \'Propose Swap\', select your listing to offer in exchange, add a note if needed, then send the proposal. The other party will be notified instantly.',
      },
      {
        id: 'ms-2',
        q: 'What happens after my swap is accepted?',
        a: 'Once accepted, both parties deposit a collateral amount into escrow via their SwapNaija wallet. This protects both sides. Once shipped and confirmed, collateral is released back.',
      },
      {
        id: 'ms-3',
        q: 'Can I swap without listing anything?',
        a: 'You need at least one active listing to propose a swap. Create a free listing first — it only takes 60 seconds.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments & Escrow',
    icon: 'card-outline',
    items: [
      {
        id: 'pay-1',
        q: 'What is escrow and how does it work?',
        a: 'Escrow is a secure holding service. When a swap is accepted, both parties deposit a small collateral (percentage of item value) into escrow. SwapNaija holds this until both parties confirm delivery. If anything goes wrong, the deposit protects you.',
      },
      {
        id: 'pay-2',
        q: 'How do I fund my wallet?',
        a: 'Go to Wallet → Add Money. We accept bank transfers and cards via Paystack. Funds reflect instantly after payment confirmation.',
      },
      {
        id: 'pay-3',
        q: 'What payment methods are supported?',
        a: 'We support all Nigerian bank cards (Visa, Mastercard, Verve), bank transfers (USSD), and mobile money via Paystack — Nigeria\'s most trusted payment processor.',
      },
      {
        id: 'pay-4',
        q: 'How long does a withdrawal take?',
        a: 'Withdrawals to Nigerian bank accounts typically process within 1–3 business days. We support all major Nigerian banks.',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety & Trust',
    icon: 'shield-checkmark-outline',
    items: [
      {
        id: 'sf-1',
        q: 'How do I know if a trader is trustworthy?',
        a: 'Look for the green ✓ Verified badge, check their rating and review count, and read past swap reviews. Verified users have completed identity verification.',
      },
      {
        id: 'sf-2',
        q: 'What do I do if I receive a wrong or damaged item?',
        a: 'Open a dispute within 48 hours of delivery confirmation. Go to the swap detail → \'Raise Dispute\'. Our team reviews evidence from both parties and resolves within 24 hours.',
      },
      {
        id: 'sf-3',
        q: 'Is my personal information safe?',
        a: 'Yes. We follow NDPR (Nigeria Data Protection Regulation) guidelines. Your data is encrypted, never sold to third parties, and you can request deletion at any time.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & Profile',
    icon: 'person-outline',
    items: [
      {
        id: 'ac-1',
        q: 'How do I get a verified badge?',
        a: 'Go to Profile → Verify Account. Pay a one-time fee of ₦1,000 from your wallet, submit a valid Nigerian ID (NIN slip, voter\'s card, or international passport), and we verify within 24 hours.',
      },
      {
        id: 'ac-2',
        q: 'Can I delete my account?',
        a: 'Yes. Contact our support team via the Contact screen or email hello@swapnaija.com. We\'ll process your deletion request within 7 business days per NDPR requirements.',
      },
      {
        id: 'ac-3',
        q: 'What is the Boost feature?',
        a: 'Boost puts your listing at the top of search results and in the Featured section on the home page. Plans start from ₦500 for 7 days. Boosted listings get up to 10× more views.',
      },
    ],
  },
];

// ── FAQ Item Component ────────────────────────────────────────────────────────
function FaqItem({ item, isOpen, onToggle }) {
  return (
    <View style={s.faqItem}>
      <TouchableOpacity
        style={s.faqQuestion}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={s.faqQuestionText}>{item.q}</Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={isOpen ? COLORS.primary : COLORS.textSecondary}
        />
      </TouchableOpacity>
      {isOpen && (
        <View style={s.faqAnswer}>
          <Text style={s.faqAnswerText}>{item.a}</Text>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HelpScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_SECTIONS;
    return FAQ_SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      ),
    })).filter((sec) => sec.items.length > 0);
  }, [query]);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Help & FAQ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Banner */}
        <View style={s.hero}>
          <View style={s.heroIconWrap}>
            <Ionicons name="help-buoy" size={32} color="#fff" />
          </View>
          <Text style={s.heroTitle}>How can we help you?</Text>
          <Text style={s.heroSub}>Find answers to common questions below.</Text>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Search questions…"
            placeholderTextColor={COLORS.textLight}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results count when searching */}
        {query.trim().length > 0 && (
          <Text style={s.resultCount}>
            {filtered.reduce((acc, s) => acc + s.items.length, 0)} result
            {filtered.reduce((acc, s) => acc + s.items.length, 0) !== 1 ? 's' : ''} for "{query}"
          </Text>
        )}

        {/* FAQ Sections */}
        {filtered.length === 0 ? (
          <View style={s.emptyWrap}>
            <Ionicons name="search-outline" size={40} color={COLORS.textLight} />
            <Text style={s.emptyTitle}>No results found</Text>
            <Text style={s.emptySub}>Try different keywords or browse all topics below.</Text>
          </View>
        ) : (
          filtered.map((section) => (
            <View key={section.id} style={s.section}>
              <View style={s.sectionHeader}>
                <View style={s.sectionIconWrap}>
                  <Ionicons name={section.icon} size={16} color={COLORS.primary} />
                </View>
                <Text style={s.sectionTitle}>{section.title}</Text>
              </View>
              <View style={s.sectionCard}>
                {section.items.map((item, idx) => (
                  <View key={item.id}>
                    <FaqItem
                      item={item}
                      isOpen={openId === item.id}
                      onToggle={() => toggle(item.id)}
                    />
                    {idx < section.items.length - 1 && <View style={s.divider} />}
                  </View>
                ))}
              </View>
            </View>
          ))
        )}

        {/* Contact CTA */}
        <View style={s.ctaCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.primary} />
          <Text style={s.ctaTitle}>Still need help?</Text>
          <Text style={s.ctaSub}>Our support team is ready to assist you.</Text>
          <TouchableOpacity
            style={s.ctaBtn}
            onPress={() => router.push('/contact')}
            activeOpacity={0.8}
          >
            <Text style={s.ctaBtnText}>Contact Support</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // Hero
  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  resultCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  // FAQ item
  faqItem: {
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 20,
    paddingRight: 12,
  },
  faqAnswer: {
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  faqAnswerText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },

  // Contact CTA
  ctaCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 4,
  },
  ctaSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 18,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
