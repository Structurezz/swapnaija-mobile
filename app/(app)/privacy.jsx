import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/currency';
import BackButton from '../../src/components/ui/BackButton';

// ── Privacy Policy content ────────────────────────────────────────────────────
const PRIVACY_SECTIONS = [
  {
    id: 1,
    title: 'Information We Collect',
    body: 'We collect the following categories of information:\n\n• Registration data: name, email address, phone number.\n• Profile data: profile photo, bio, and location state.\n• Listing data: item photos, descriptions, and category.\n• Transaction data: swap history, escrow records, and payment activity.\n• Device data: device type, operating system, IP address, and app version (collected automatically).\n\nWe do NOT collect your BVN or bank account details directly. All payment processing is handled by Paystack, which is PCI-DSS compliant.',
  },
  {
    id: 2,
    title: 'How We Use Your Information',
    body: 'We use the information we collect to:\n\n• Operate and improve the SwapNaija marketplace.\n• Verify your identity and prevent fraud and abuse.\n• Process payments, escrow deposits, and withdrawals.\n• Send you swap notifications, updates, and alerts.\n• Personalise your experience and provide relevant recommendations.\n• Comply with our legal obligations under Nigerian law, including NDPR and NDPA requirements.',
  },
  {
    id: 3,
    title: 'Legal Basis for Processing (NDPR)',
    body: 'In accordance with the Nigeria Data Protection Regulation (NDPR) 2019 and the Nigeria Data Protection Act (NDPA) 2023, we process your personal data under the following lawful bases:\n\n• Contract performance: to provide and operate the SwapNaija service you have signed up for.\n• Legitimate interests: for fraud prevention, platform security, and improving our services.\n• Legal obligation: to meet our regulatory and compliance requirements under Nigerian law.\n• Consent: for marketing communications and non-essential analytics. You may withdraw your consent at any time via Settings.',
  },
  {
    id: 4,
    title: 'Data Sharing',
    body: 'We share your personal data only in the following limited circumstances:\n\n• Paystack: for secure payment processing (governed by their own privacy policy).\n• Cloud infrastructure providers: AWS and/or Google Cloud for data hosting and storage.\n• Identity verification partners: for processing account verification requests.\n\nWe do NOT sell, rent, or trade your personal data to third parties for marketing or commercial purposes. We may disclose your data to Nigerian law enforcement authorities when we are lawfully required to do so.',
  },
  {
    id: 5,
    title: 'Data Retention',
    body: 'We retain your personal data for as long as your account is active, plus an additional 3 years after account deletion, as required by applicable Nigerian regulations including FIRS requirements.\n\nTransaction and financial records are retained for a minimum of 7 years in accordance with Nigerian financial regulations and CAMA 2020 requirements.\n\nYou may request deletion of your data before these retention periods expire by contacting us. Deletion requests are subject to applicable legal retention obligations.',
  },
  {
    id: 6,
    title: 'Your Rights (NDPR / NDPA)',
    body: 'As a Nigerian data subject, you have the following rights under the NDPR 2019 and NDPA 2023:\n\n• Right to Access: request a copy of the personal data we hold about you.\n• Right to Correction: request that inaccurate or incomplete data be corrected.\n• Right to Deletion: request deletion of your data, subject to legal retention requirements.\n• Right to Object: object to certain types of data processing.\n• Right to Data Portability: receive your data in a structured, machine-readable format.\n• Right to Complain: lodge a complaint with NITDA (National Information Technology Development Agency) at nitda.gov.ng.\n\nTo exercise any of these rights, contact our Data Protection Officer at privacy@swapnaija.com.',
  },
  {
    id: 7,
    title: 'Cookies and Tracking',
    body: 'Our mobile application does not use browser cookies. We use anonymised, aggregated analytics data — including device type, app version, and feature usage — solely to understand how users interact with the app and to improve the user experience.\n\nThis analytics data cannot be used to identify you individually. You can opt out of analytics data collection at any time by visiting Settings → Privacy → Analytics.',
  },
  {
    id: 8,
    title: 'Security',
    body: 'We implement industry-standard security measures to protect your personal data, including:\n\n• TLS (Transport Layer Security) encryption for all data in transit.\n• AES-256 encryption for sensitive data stored at rest.\n• Regular security audits and penetration testing.\n• Strict access controls and employee data handling policies.\n\nWhile we take every reasonable precaution, no digital system is 100% secure. We encourage you to use a strong, unique password for your SwapNaija account and to enable two-factor authentication where available.',
  },
  {
    id: 9,
    title: "Children's Privacy",
    body: 'SwapNaija is intended exclusively for users who are 18 years of age or older. We do not knowingly collect, process, or store personal data from persons under the age of 18.\n\nIf you are a parent or guardian and believe that a minor has created an account on SwapNaija, please contact us immediately at privacy@swapnaija.com. We will investigate and delete any such account and associated data promptly.',
  },
  {
    id: 10,
    title: 'Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.\n\nFor material changes, we will notify you via an in-app notification at least 30 days before the changes take effect, in line with NDPR requirements. Your continued use of SwapNaija after a change takes effect constitutes your acceptance of the updated Policy.\n\nWe encourage you to review this Policy periodically to stay informed about how we protect your data.',
  },
  {
    id: 11,
    title: 'Contact & DPO',
    body: 'For any privacy-related enquiries, data access requests, or complaints, please contact our Data Protection Officer:\n\nEmail: privacy@swapnaija.com\nAddress: SwapNaija Technologies Ltd, Lagos, Nigeria\n\nTo lodge a formal complaint with the Nigerian data protection authority:\nNITDA (National Information Technology Development Agency)\nWebsite: nitda.gov.ng',
  },
];

// ── Section Component ─────────────────────────────────────────────────────────
function PrivacySection({ section, isLast }) {
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
export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <BackButton fallback="/profile" />
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta row */}
        <View style={s.metaRow}>
          <Text style={s.metaDate}>Last updated: 1 January 2025</Text>
          <View style={s.ndprPill}>
            <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
            <Text style={s.ndprPillText}>NDPR Compliant</Text>
          </View>
        </View>

        {/* Intro banner */}
        <View style={s.introBanner}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} style={{ marginRight: 10, marginTop: 1 }} />
          <Text style={s.introText}>
            SwapNaija is committed to protecting your privacy in accordance with the Nigeria Data Protection Regulation (NDPR) 2019 and the Nigeria Data Protection Act (NDPA) 2023. This Policy explains what data we collect, why we collect it, and how it is used.
          </Text>
        </View>

        {/* Trust badges */}
        <View style={s.trustRow}>
          <View style={s.trustBadge}>
            <Ionicons name="shield-outline" size={16} color={COLORS.primary} />
            <Text style={s.trustBadgeText}>NDPR Compliant</Text>
          </View>
          <View style={s.trustBadge}>
            <Ionicons name="card-outline" size={16} color={COLORS.primary} />
            <Text style={s.trustBadgeText}>PCI-DSS Payments</Text>
          </View>
          <View style={s.trustBadge}>
            <Ionicons name="lock-closed-outline" size={16} color={COLORS.primary} />
            <Text style={s.trustBadgeText}>AES-256 Encrypted</Text>
          </View>
        </View>

        {/* Privacy sections */}
        <View style={s.contentCard}>
          {PRIVACY_SECTIONS.map((section, idx) => (
            <PrivacySection
              key={section.id}
              section={section}
              isLast={idx === PRIVACY_SECTIONS.length - 1}
            />
          ))}
        </View>

        {/* Footer note */}
        <View style={s.footerNote}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={s.footerNoteText}>
            This Privacy Policy was prepared in compliance with the NDPR 2019 and NDPA 2023. For complaints, contact NITDA at nitda.gov.ng.
          </Text>
        </View>

        {/* Agree button */}
        <TouchableOpacity style={s.agreeBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={s.agreeBtnText}>I Agree</Text>
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
  ndprPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(29,158,117,0.2)',
    gap: 4,
  },
  ndprPillText: {
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(29,158,117,0.2)',
  },
  introText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 21,
  },

  // Trust badges
  trustRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  trustBadge: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  trustBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
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
    lineHeight: 23,
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
