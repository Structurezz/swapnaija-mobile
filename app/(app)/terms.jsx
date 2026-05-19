import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/currency';
import BackButton from '../../src/components/ui/BackButton';

// ── Terms content ─────────────────────────────────────────────────────────────
const TERMS_SECTIONS = [
  {
    id: 1,
    title: 'Agreement to Terms',
    body: 'By accessing or using SwapNaija, you agree to be bound by these Terms of Service and all applicable Nigerian laws and regulations. SwapNaija is operated by SwapNaija Technologies Ltd, a company registered in Nigeria. If you do not agree with any part of these Terms, you may not access or use the platform.',
  },
  {
    id: 2,
    title: 'Eligibility',
    body: 'You must be at least 18 years old and a resident of Nigeria to use SwapNaija. By using the platform, you represent and confirm that you have the legal capacity to enter into binding agreements under Nigerian law. SwapNaija reserves the right to verify your eligibility at any time.',
  },
  {
    id: 3,
    title: 'User Accounts',
    body: 'You are solely responsible for maintaining the confidentiality of your account credentials, including your password and OTP codes. You must provide accurate, current, and complete information during registration and keep your profile up to date. Sharing or transferring accounts to another person is strictly prohibited. SwapNaija reserves the right to suspend or permanently terminate accounts that violate these Terms, without prior notice.',
  },
  {
    id: 4,
    title: 'Listings and Swaps',
    body: 'All listings must be accurate, honest, and not misleading. You must own or have the legal right to swap any item or service you list. Prohibited items include weapons, illegal substances, counterfeit goods, stolen property, and any items that violate Nigerian law including the Companies and Allied Matters Act (CAMA) 2020 and the Consumer Protection Act. SwapNaija is a marketplace platform and is not a party to any swap transaction between users.',
  },
  {
    id: 5,
    title: 'Escrow Service',
    body: 'The SwapNaija escrow service is provided to facilitate secure swaps between users. When a swap is accepted, both parties are required to deposit a collateral amount into escrow. SwapNaija holds these deposits until both parties confirm successful delivery and receipt. In the event of a dispute, SwapNaija\'s resolution team will review evidence submitted by both parties. SwapNaija\'s decision on dispute outcomes is final and binding.',
  },
  {
    id: 6,
    title: 'Fees and Payments',
    body: 'Creating an account and listing items on SwapNaija is free of charge. Platform fees apply to premium features: Boost listings start from ₦500 per 7-day period; Account Verification is a one-time fee of ₦1,000. All payments are processed in Nigerian Naira (NGN) via Paystack, a PCI-DSS compliant payment processor. Refunds are processed subject to our Refund Policy, available on our website.',
  },
  {
    id: 7,
    title: 'Prohibited Conduct',
    body: 'When using SwapNaija, you must not: engage in or facilitate fraud or deception of any kind; post false, misleading, or inaccurate listings; harass, threaten, or abuse other users on the platform; attempt to circumvent or abuse the escrow system; use automated tools, bots, or scripts to scrape data or send unsolicited messages; impersonate any person or entity; or engage in any conduct that disrupts or damages the SwapNaija platform or its users.',
  },
  {
    id: 8,
    title: 'Intellectual Property',
    body: 'SwapNaija, its name, logo, and all platform design elements are owned by SwapNaija Technologies Ltd and are protected under Nigerian intellectual property law. User-generated content — including listing photos, descriptions, and reviews — remains the property of the respective users. However, by posting content on SwapNaija, you grant SwapNaija Technologies Ltd a non-exclusive, royalty-free, worldwide licence to display and use that content on the platform.',
  },
  {
    id: 9,
    title: 'Limitation of Liability',
    body: 'To the maximum extent permitted under applicable Nigerian law, SwapNaija shall not be liable for any indirect, incidental, special, or consequential losses arising from swap transactions between users, including but not limited to loss of goods, financial loss, or personal injury. Our total aggregate liability for any claim shall not exceed the total fees paid by you to SwapNaija in the three (3) calendar months immediately preceding the event giving rise to the claim.',
  },
  {
    id: 10,
    title: 'Governing Law',
    body: 'These Terms of Service are governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising from or in connection with these Terms shall first be attempted to be resolved amicably. If unresolved, disputes shall be submitted to the courts of Lagos State, Nigeria, or resolved via arbitration under the Arbitration and Conciliation Act (Cap A18), Laws of the Federation of Nigeria.',
  },
  {
    id: 11,
    title: 'Contact',
    body: 'If you have any questions, concerns, or feedback about these Terms of Service, please contact our legal team at legal@swapnaija.com. We aim to respond to all legal enquiries within 5 business days.',
  },
];

// ── Section Component ─────────────────────────────────────────────────────────
function TermsSection({ section, isLast }) {
  return (
    <View>
      <View style={s.section}>
        <View style={s.sectionNumWrap}>
          <Text style={s.sectionNum}>{section.id}</Text>
        </View>
        <View style={s.sectionContent}>
          <Text style={s.sectionTitle}>{section.title}</Text>
          <Text style={s.sectionBody}>{section.body}</Text>
        </View>
      </View>
      {!isLast && <View style={s.sectionDivider} />}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <BackButton fallback="/profile" />
        <Text style={s.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta info */}
        <View style={s.metaRow}>
          <Text style={s.metaDate}>Last updated: 1 January 2025</Text>
          <View style={s.versionPill}>
            <Text style={s.versionPillText}>Version 1.0</Text>
          </View>
        </View>

        {/* Intro banner */}
        <View style={s.introBanner}>
          <Ionicons name="document-text-outline" size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
          <Text style={s.introText}>
            Please read these Terms carefully before using SwapNaija. Your continued use of the platform constitutes acceptance.
          </Text>
        </View>

        {/* Terms sections */}
        <View style={s.contentCard}>
          {TERMS_SECTIONS.map((section, idx) => (
            <TermsSection
              key={section.id}
              section={section}
              isLast={idx === TERMS_SECTIONS.length - 1}
            />
          ))}
        </View>

        {/* Legal footer note */}
        <View style={s.footerNote}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={s.footerNoteText}>
            These Terms were prepared in accordance with Nigerian law. SwapNaija Technologies Ltd is registered in Nigeria.
          </Text>
        </View>

        {/* Acknowledge button */}
        <TouchableOpacity style={s.agreeBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={s.agreeBtnText}>I Understand</Text>
        </TouchableOpacity>

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

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metaDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  versionPill: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(29,158,117,0.2)',
  },
  versionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Intro banner
  introBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(29,158,117,0.2)',
  },
  introText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },

  // Content card
  contentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 16,
  },

  // Section
  section: {
    flexDirection: 'row',
    padding: 18,
  },
  sectionNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
    flexShrink: 0,
  },
  sectionNum: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  sectionBody: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },

  // Footer note
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Agree button
  agreeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
  },
  agreeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
