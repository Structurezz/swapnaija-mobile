import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useMutation } from '@tanstack/react-query';
import { loginOtp, register } from '../../src/api/auth.api';
import { useAuthStore } from '../../src/store/auth.store';
import Button from '../../src/components/ui/Button';
import { COLORS } from '../../src/utils/currency';

// ── Feature slides (mirrors frontend left panel) ──────────────────────────────
const SLIDES = [
  {
    icon: 'swap-horizontal',
    title: 'What is Barter?',
    body: 'Trade what you have for what you need — no cash required. List it, match it, swap it.',
  },
  {
    icon: 'shield-checkmark',
    title: 'Escrow Protection',
    body: 'Every swap is protected by escrow. Items held until both parties confirm — no scams, ever.',
  },
  {
    icon: 'flash',
    title: 'Smart Matching',
    body: 'Our algorithm finds the best swap matches for your listings automatically — saving you time.',
  },
  {
    icon: 'people',
    title: 'Verified Community',
    body: 'Ratings, reviews, and KYC checks ensure you trade only with trusted Nigerians.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { login: storeLogin } = useAuthStore();

  // ── Slide animation ──────────────────────────────────────────────────────────
  const [slide, setSlide] = useState(0);
  const slideRef = useRef(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const changeSlide = (next) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setSlide(next);
      slideRef.current = next;
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    });
  };

  useEffect(() => {
    const t = setInterval(() => {
      const next = (slideRef.current + 1) % SLIDES.length;
      changeSlide(next);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('login');

  // Sign In
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPass, setLoginPass]         = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register
  const [fullName, setFullName]               = useState('');
  const [regEmail, setRegEmail]               = useState('');
  const [regPass, setRegPass]                 = useState('');
  const [confirmPass, setConfirmPass]         = useState('');
  const [regPhone, setRegPhone]               = useState('');
  const [showRegPass, setShowRegPass]         = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // ── Mutations ────────────────────────────────────────────────────────────────
  // Verify credentials → OTP sent to email (matches frontend flow exactly)
  const loginOtpMutation = useMutation({
    mutationFn: () =>
      loginOtp({ email: loginEmail.trim().toLowerCase(), password: loginPass }),
    onSuccess: (data) => {
      router.push({
        pathname: '/(auth)/verify',
        params: {
          mode: 'email',
          email: loginEmail.trim().toLowerCase(),
          devCode: data?.code ?? '',
        },
      });
    },
    onError: (err) =>
      Toast.show({
        type: 'error',
        text1: 'Login failed',
        text2: err?.response?.data?.error || 'Invalid email or password',
      }),
  });

  const registerMutation = useMutation({
    mutationFn: () => {
      const payload = {
        fullName: fullName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPass,
      };
      const p = regPhone.replace(/\D/g, '').replace(/^0/, '');
      if (p.length === 10) payload.phone = `+234${p}`;
      return register(payload);
    },
    onSuccess: async (data) => {
      await storeLogin({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
      router.replace('/(app)');
    },
    onError: (err) =>
      Toast.show({
        type: 'error',
        text1: 'Registration failed',
        text2: err?.response?.data?.error || 'Please try again',
      }),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleLogin = () => {
    if (!loginEmail.trim() || !/\S+@\S+\.\S+/.test(loginEmail)) {
      Toast.show({ type: 'error', text1: 'Enter a valid email address' }); return;
    }
    if (!loginPass) {
      Toast.show({ type: 'error', text1: 'Enter your password' }); return;
    }
    loginOtpMutation.mutate();
  };

  const handleRegister = () => {
    if (!fullName.trim()) { Toast.show({ type: 'error', text1: 'Enter your full name' }); return; }
    if (!regEmail.trim() || !/\S+@\S+\.\S+/.test(regEmail)) {
      Toast.show({ type: 'error', text1: 'Enter a valid email address' }); return;
    }
    if (regPass.length < 8) { Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' }); return; }
    if (regPass !== confirmPass) { Toast.show({ type: 'error', text1: 'Passwords do not match' }); return; }
    registerMutation.mutate();
  };

  const switchTab = (t) => {
    setTab(t);
    setLoginEmail(''); setLoginPass(''); setShowLoginPass(false);
    setFullName(''); setRegEmail(''); setRegPass(''); setConfirmPass('');
    setRegPhone(''); setShowRegPass(false); setShowConfirmPass(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >

          {/* ─── HERO SLIDES ─────────────────────────────────────────────────── */}
          <View style={styles.hero}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={[styles.circle, { top: -60,  left: -60,  width: 220, height: 220 }]} />
              <View style={[styles.circle, { bottom: -80, right: -50, width: 260, height: 260 }]} />
              <View style={[styles.circle, { top: '40%', right: -30, width: 120, height: 120 }]} />
            </View>

            {/* Logo */}
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}>
                <Ionicons name="swap-horizontal" size={18} color={COLORS.white} />
              </View>
              <Text style={styles.logoText}>SwapNaija</Text>
            </View>

            {/* Animated slide */}
            <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
              <View style={styles.slideIcon}>
                <Ionicons name={SLIDES[slide].icon} size={32} color={COLORS.white} />
              </View>
              <Text style={styles.slideTitle}>{SLIDES[slide].title}</Text>
              <Text style={styles.slideBody}>{SLIDES[slide].body}</Text>
            </Animated.View>

            {/* Dots */}
            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => changeSlide(i)} activeOpacity={0.7}>
                  <View style={[styles.dot, i === slide && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.tagline}>Nigeria's #1 Barter & Trade Marketplace</Text>
          </View>

          {/* ─── FORM CARD ──────────────────────────────────────────────────── */}
          <View style={styles.card}>

            {/* Tab switcher */}
            <View style={styles.tabs}>
              {['login', 'register'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                  onPress={() => switchTab(t)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                    {t === 'login' ? 'Sign In' : 'Register'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── SIGN IN ── */}
            {tab === 'login' && (
              <View>
                <Text style={styles.formTitle}>Welcome back</Text>
                <Text style={styles.formSubtitle}>Sign in to continue swapping</Text>

                <Field label="Email Address">
                  <TextInput
                    style={styles.input}
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="next"
                  />
                </Field>

                <Field label="Password">
                  <View style={styles.passRow}>
                    <TextInput
                      style={styles.passInput}
                      value={loginPass}
                      onChangeText={setLoginPass}
                      placeholder="Your password"
                      placeholderTextColor={COLORS.textLight}
                      secureTextEntry={!showLoginPass}
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowLoginPass((v) => !v)}>
                      <Ionicons
                        name={showLoginPass ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </Field>

                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={() => router.push('/(auth)/verify')}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>

                <Button
                  title="Continue"
                  onPress={handleLogin}
                  loading={loginOtpMutation.isPending}
                  disabled={!loginEmail.trim() || !loginPass}
                  style={styles.btn}
                />

                <Text style={styles.hint}>
                  We'll verify your credentials then send a 6-digit code to your email.
                </Text>
              </View>
            )}

            {/* ── REGISTER ── */}
            {tab === 'register' && (
              <View>
                <Text style={styles.formTitle}>Create account</Text>
                <Text style={styles.formSubtitle}>Join thousands of swappers across Nigeria</Text>

                <Field label="Full Name">
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Amaka Okafor"
                    placeholderTextColor={COLORS.textLight}
                    autoCapitalize="words"
                  />
                </Field>

                <Field label="Email Address">
                  <TextInput
                    style={styles.input}
                    value={regEmail}
                    onChangeText={setRegEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </Field>

                <Field label="Password">
                  <View style={styles.passRow}>
                    <TextInput
                      style={styles.passInput}
                      value={regPass}
                      onChangeText={setRegPass}
                      placeholder="Min. 8 characters"
                      placeholderTextColor={COLORS.textLight}
                      secureTextEntry={!showRegPass}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowRegPass((v) => !v)}>
                      <Ionicons
                        name={showRegPass ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </Field>

                <Field label="Confirm Password">
                  <View style={styles.passRow}>
                    <TextInput
                      style={styles.passInput}
                      value={confirmPass}
                      onChangeText={setConfirmPass}
                      placeholder="Repeat password"
                      placeholderTextColor={COLORS.textLight}
                      secureTextEntry={!showConfirmPass}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPass((v) => !v)}>
                      <Ionicons
                        name={showConfirmPass ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </Field>

                <Field label="Phone Number">
                  <View style={styles.phoneRow}>
                    <View style={styles.prefixBox}>
                      <Text style={styles.flag}>🇳🇬</Text>
                      <Text style={styles.dialCode}>+234</Text>
                    </View>
                    <View style={styles.phoneDivider} />
                    <TextInput
                      style={styles.phoneInput}
                      value={regPhone}
                      onChangeText={(t) => setRegPhone(t.replace(/\D/g, ''))}
                      placeholder="8012345678"
                      placeholderTextColor={COLORS.textLight}
                      keyboardType="number-pad"
                      maxLength={11}
                    />
                  </View>
                </Field>

                <Button
                  title="Create Account"
                  onPress={handleRegister}
                  loading={registerMutation.isPending}
                  style={styles.btn}
                />

                <TouchableOpacity onPress={() => switchTab('login')} style={styles.switchRow}>
                  <Text style={styles.switchText}>
                    Already have an account?{' '}
                    <Text style={styles.switchLink}>Sign in</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.terms}>
              By continuing you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' & '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Labelled field wrapper ────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Hero
  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: 60, paddingBottom: 28, paddingHorizontal: 28,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute', borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 18, fontWeight: '700', color: COLORS.white, letterSpacing: -0.3 },

  slideContent: { minHeight: 130, marginBottom: 20 },
  slideIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  slideTitle: {
    fontSize: 26, fontWeight: '800', color: COLORS.white,
    letterSpacing: -0.5, marginBottom: 8, lineHeight: 32,
  },
  slideBody: {
    fontSize: 15, color: 'rgba(255,255,255,0.70)', lineHeight: 22, maxWidth: 320,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { height: 8, width: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.30)' },
  dotActive: { width: 28, backgroundColor: COLORS.white },
  tagline: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 16,
  },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: COLORS.gray100,
    borderRadius: 16, padding: 4, marginBottom: 24,
  },
  tabBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.text },

  // Form
  formTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 7 },

  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15,
    color: COLORS.text, backgroundColor: COLORS.gray50,
  },
  passRow: {
    flexDirection: 'row', borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, backgroundColor: COLORS.gray50, alignItems: 'center',
  },
  passInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: COLORS.text },
  eyeBtn: { paddingHorizontal: 14 },

  // Phone (register only)
  phoneRow: {
    flexDirection: 'row', borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, backgroundColor: COLORS.gray50,
    alignItems: 'center', overflow: 'hidden',
  },
  prefixBox: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 13,
    backgroundColor: COLORS.gray100,
  },
  flag: { fontSize: 18 },
  dialCode: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  phoneDivider: { width: 1, height: '65%', backgroundColor: COLORS.border },
  phoneInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, color: COLORS.text, letterSpacing: 0.5,
  },

  forgotBtn: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -6 },
  forgotText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  btn: { marginBottom: 12, marginTop: 4 },
  hint: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 4 },

  switchRow: { alignItems: 'center', marginTop: 4 },
  switchText: { fontSize: 13, color: COLORS.textSecondary },
  switchLink: { color: COLORS.primary, fontWeight: '600' },

  terms: {
    fontSize: 12, color: COLORS.textLight, textAlign: 'center',
    marginTop: 16, lineHeight: 18,
  },
  termsLink: { color: COLORS.primary, fontWeight: '600' },
});
