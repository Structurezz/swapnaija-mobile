import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar, TextInput, Alert, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/currency';
import BackButton from '../../src/components/ui/BackButton';

// ── Contact Methods ───────────────────────────────────────────────────────────
const CONTACT_METHODS = [
  {
    id: 'email',
    icon: 'mail-outline',
    iconColor: COLORS.primary,
    iconBg: COLORS.primaryLight,
    label: 'Email Support',
    value: 'hello@swapnaija.com',
    action: () => Linking.openURL('mailto:hello@swapnaija.com'),
  },
  {
    id: 'whatsapp',
    icon: 'logo-whatsapp',
    iconColor: '#25D366',
    iconBg: '#F0FDF4',
    label: 'WhatsApp Chat',
    value: 'Chat with us on WhatsApp',
    action: () => Linking.openURL('https://wa.me/2348000000000'),
  },
  {
    id: 'twitter',
    icon: 'logo-twitter',
    iconColor: '#1DA1F2',
    iconBg: '#EFF6FF',
    label: 'Twitter / X',
    value: '@SwapNaija',
    action: () => Linking.openURL('https://twitter.com/SwapNaija'),
  },
  {
    id: 'phone',
    icon: 'call-outline',
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    label: 'Call Support',
    value: '+234 800 000 0000',
    action: () => Linking.openURL('tel:+2348000000000'),
  },
];

// ── Contact Card ──────────────────────────────────────────────────────────────
function ContactCard({ item }) {
  return (
    <TouchableOpacity style={s.contactCard} onPress={item.action} activeOpacity={0.75}>
      <View style={[s.contactIconWrap, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={22} color={item.iconColor} />
      </View>
      <View style={s.contactInfo}>
        <Text style={s.contactLabel}>{item.label}</Text>
        <Text style={s.contactValue}>{item.value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ContactScreen() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = () => {
    if (!subject.trim()) {
      Alert.alert('Subject required', 'Please enter a subject for your message.');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      Alert.alert('Message too short', 'Please enter a message with at least 10 characters.');
      return;
    }
    setSending(true);
    // Simulate network delay then show confirmation
    setTimeout(() => {
      setSending(false);
      setSubject('');
      setMessage('');
      Alert.alert(
        'Message Sent!',
        "We'll get back to you within 4 hours.",
        [{ text: 'OK', style: 'default' }]
      );
    }, 800);
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <BackButton fallback="/profile" />
        <Text style={s.headerTitle}>Contact Support</Text>
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
            <Ionicons name="headset" size={32} color="#fff" />
          </View>
          <Text style={s.heroTitle}>We're here to help</Text>
          <Text style={s.heroSub}>
            Our team typically responds within 2–4 hours during business hours (8am–6pm WAT, Monday–Friday).
          </Text>
        </View>

        {/* Contact Methods */}
        <Text style={s.sectionLabel}>REACH US ON</Text>
        <View style={s.contactGroup}>
          {CONTACT_METHODS.map((item, idx) => (
            <View key={item.id}>
              <ContactCard item={item} />
              {idx < CONTACT_METHODS.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>

        {/* Send a Message Form */}
        <Text style={s.sectionLabel}>SEND A MESSAGE</Text>
        <View style={s.formCard}>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Subject</Text>
            <TextInput
              style={s.textInput}
              placeholder="e.g. Issue with my swap"
              placeholderTextColor={COLORS.textLight}
              value={subject}
              onChangeText={setSubject}
              returnKeyType="next"
              maxLength={120}
            />
          </View>

          <View style={[s.fieldWrap, { marginBottom: 0 }]}>
            <Text style={s.fieldLabel}>Message</Text>
            <TextInput
              style={[s.textInput, s.textArea]}
              placeholder="Describe your issue or question in detail…"
              placeholderTextColor={COLORS.textLight}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={s.charCount}>{message.length}/1000</Text>
          </View>

          <TouchableOpacity
            style={[s.sendBtn, sending && s.sendBtnDisabled]}
            onPress={handleSend}
            activeOpacity={0.8}
            disabled={sending}
          >
            {sending ? (
              <Text style={s.sendBtnText}>Sending…</Text>
            ) : (
              <>
                <Text style={s.sendBtnText}>Send Message</Text>
                <Ionicons name="send" size={16} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Business Hours */}
        <View style={s.hoursCard}>
          <View style={s.hoursHeader}>
            <Ionicons name="time-outline" size={18} color={COLORS.primary} />
            <Text style={s.hoursTitle}>Business Hours</Text>
          </View>
          <View style={s.hoursRow}>
            <Text style={s.hoursDay}>Monday – Friday</Text>
            <Text style={s.hoursTime}>8:00am – 6:00pm WAT</Text>
          </View>
          <View style={s.hoursDivider} />
          <View style={s.hoursRow}>
            <Text style={s.hoursDay}>Saturday</Text>
            <Text style={s.hoursTime}>9:00am – 2:00pm WAT</Text>
          </View>
          <View style={s.hoursDivider} />
          <View style={s.hoursRow}>
            <Text style={s.hoursDay}>Response Time</Text>
            <View style={s.responsePill}>
              <Text style={s.responsePillText}>2–4 hours</Text>
            </View>
          </View>
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
    marginBottom: 24,
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
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },

  // Contact methods
  contactGroup: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 24,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  contactIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },

  // Form
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 20,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F4F6F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    height: 110,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: 4,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
    gap: 8,
  },
  sendBtnDisabled: {
    opacity: 0.65,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Business hours
  hoursCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  hoursTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  hoursDay: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  hoursTime: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  hoursDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  responsePill: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  responsePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
