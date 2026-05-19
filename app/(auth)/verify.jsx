import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useMutation } from '@tanstack/react-query';
import {
  verifyOtp, sendOtp,
  verifyEmailOtp, sendEmailOtp,
  forgotPassword, resetPassword,
} from '../../src/api/auth.api';
import { useAuthStore } from '../../src/store/auth.store';
import Button from '../../src/components/ui/Button';
import { COLORS } from '../../src/utils/currency';

const OTP_LEN = 6;
const RESEND_TIMEOUT = 60;

// params: { mode:'email', email:'...', devCode:'' }      → email OTP sign-in
//         { mode:'phone', phone:'+234...', devCode:'' }  → phone OTP login
//         {}                                              → forgot password

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login: storeLogin } = useAuthStore();

  const isEmailMode = params.mode === 'email';
  const isPhoneMode = params.mode === 'phone';
  const isForgotMode = !isEmailMode && !isPhoneMode;

  // ── OTP state ─────────────────────────────────────────────────────────────
  const [otp, setOtp] = useState(Array(OTP_LEN).fill(''));
  const [resendTimer, setResendTimer] = useState(
    isPhoneMode || isEmailMode ? RESEND_TIMEOUT : 0,
  );
  const inputRefs = useRef([]);

  // ── Forgot password state ─────────────────────────────────────────────────
  const [fpStep, setFpStep]           = useState('email');
  const [fpEmail, setFpEmail]         = useState('');
  const [fpOtp, setFpOtp]             = useState(Array(OTP_LEN).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fpResendTimer, setFpResendTimer] = useState(0);

  // ── Timers ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if ((!isPhoneMode && !isEmailMode) || resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer, isPhoneMode, isEmailMode]);

  useEffect(() => {
    if (!isForgotMode || fpResendTimer <= 0) return;
    const t = setInterval(() => setFpResendTimer((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [fpResendTimer, isForgotMode]);

  // ── Phone OTP mutations ───────────────────────────────────────────────────
  const verifyPhoneMutation = useMutation({
    mutationFn: () => verifyOtp(params.phone, otp.join('')),
    onSuccess: async (data) => {
      await storeLogin({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
      router.replace(data.isNewUser ? '/(app)/profile/edit' : '/(app)');
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Incorrect code', text2: err?.response?.data?.error || 'Try again' });
      setOtp(Array(OTP_LEN).fill(''));
      inputRefs.current[0]?.focus();
    },
  });

  const resendPhoneMutation = useMutation({
    mutationFn: () => sendOtp(params.phone),
    onSuccess: (data) => {
      setResendTimer(RESEND_TIMEOUT);
      setOtp(Array(OTP_LEN).fill(''));
      inputRefs.current[0]?.focus();
      if (__DEV__ && data?.code) {
        Toast.show({ type: 'info', text1: 'Dev OTP', text2: `Code: ${data.code}` });
      } else {
        Toast.show({ type: 'success', text1: 'Code sent!', text2: `Check SMS for ${params.phone}` });
      }
    },
    onError: (err) =>
      Toast.show({ type: 'error', text1: 'Failed to resend', text2: err?.response?.data?.error }),
  });

  // ── Email OTP mutations (main sign-in flow) ───────────────────────────────
  const verifyEmailMutation = useMutation({
    mutationFn: () => verifyEmailOtp(params.email, otp.join('')),
    onSuccess: async (data) => {
      await storeLogin({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
      router.replace('/(app)');
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Incorrect code', text2: err?.response?.data?.error || 'Try again' });
      setOtp(Array(OTP_LEN).fill(''));
      inputRefs.current[0]?.focus();
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: () => sendEmailOtp(params.email),
    onSuccess: (data) => {
      setResendTimer(RESEND_TIMEOUT);
      setOtp(Array(OTP_LEN).fill(''));
      inputRefs.current[0]?.focus();
      if (__DEV__ && data?.code) {
        Toast.show({ type: 'info', text1: 'Dev OTP', text2: `Code: ${data.code}` });
      } else {
        Toast.show({ type: 'success', text1: 'Code resent!', text2: `Check your email inbox` });
      }
    },
    onError: (err) =>
      Toast.show({ type: 'error', text1: 'Failed to resend', text2: err?.response?.data?.error }),
  });

  // ── Forgot password mutations ─────────────────────────────────────────────
  const fpSendMutation = useMutation({
    mutationFn: () => forgotPassword(fpEmail.trim().toLowerCase()),
    onSuccess: (data) => {
      if (__DEV__ && data?.code)
        Toast.show({ type: 'info', text1: 'Dev code', text2: `Code: ${data.code}` });
      Toast.show({ type: 'success', text1: 'Code sent!', text2: 'Check your email' });
      setFpStep('code');
      setFpResendTimer(RESEND_TIMEOUT);
    },
    onError: (err) =>
      Toast.show({ type: 'error', text1: 'Failed', text2: err?.response?.data?.error }),
  });

  const fpResetMutation = useMutation({
    mutationFn: () =>
      resetPassword({ email: fpEmail.trim().toLowerCase(), code: fpOtp.join(''), newPassword }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Password reset!', text2: 'Sign in with your new password' });
      router.replace('/(auth)/onboarding');
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Reset failed', text2: err?.response?.data?.error });
      setFpOtp(Array(OTP_LEN).fill(''));
      inputRefs.current[0]?.focus();
    },
  });

  // ── OTP helpers ───────────────────────────────────────────────────────────
  const handleDigit = (setter, currentOtp, autoSubmit) => (val, idx) => {
    const d = val.replace(/\D/g, '').slice(-1);
    setter((prev) => {
      const next = [...prev];
      next[idx] = d;
      if (autoSubmit && d && next.every((c) => c) && next.join('').length === OTP_LEN) {
        setTimeout(() => autoSubmit(next.join('')), 80);
      }
      return next;
    });
    if (d && idx < OTP_LEN - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleKey = (current) => (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !current[idx] && idx > 0)
      inputRefs.current[idx - 1]?.focus();
  };

  // Auto-submit for phone OTP
  const autoSubmitPhone = (code) => {
    verifyPhoneMutation.mutate(undefined, {
      context: { overrideCode: code },
    });
    // actually just call with joined otp — workaround: pass code directly
  };

  const handlePhoneVerify = () => {
    if (otp.join('').length < OTP_LEN) {
      Toast.show({ type: 'error', text1: 'Enter the 6-digit code' }); return;
    }
    verifyPhoneMutation.mutate();
  };

  const handleEmailVerify = () => {
    if (otp.join('').length < OTP_LEN) {
      Toast.show({ type: 'error', text1: 'Enter the 6-digit code' }); return;
    }
    verifyEmailMutation.mutate();
  };

  const handleFpReset = () => {
    if (fpOtp.join('').length < OTP_LEN) {
      Toast.show({ type: 'error', text1: 'Enter the 6-digit code' }); return;
    }
    if (newPassword.length < 8) {
      Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' }); return;
    }
    fpResetMutation.mutate();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Green top bar (mirrors frontend mobile top bar) ── */}
          <View style={styles.topBar}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={[styles.circle, { top: -50, right: -50, width: 180, height: 180 }]} />
              <View style={[styles.circle, { bottom: -60, left: -40, width: 160, height: 160 }]} />
            </View>

            {/* Back button */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <View style={styles.backCircle}>
                <Ionicons name="arrow-back" size={18} color={COLORS.white} />
              </View>
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}>
                <Ionicons name="swap-horizontal" size={16} color={COLORS.white} />
              </View>
              <Text style={styles.logoText}>SwapNaija</Text>
            </View>

            {/* Context icon */}
            <View style={styles.topIcon}>
              <Ionicons
                name={
                  isEmailMode
                    ? 'mail-outline'
                    : isPhoneMode
                    ? 'phone-portrait-outline'
                    : fpStep === 'email' ? 'lock-open-outline' : 'mail-open-outline'
                }
                size={28}
                color={COLORS.white}
              />
            </View>
          </View>

          {/* ── White form card ── */}
          <View style={styles.card}>

            {/* ═══════════ EMAIL OTP (main sign-in) ═══════════ */}
            {isEmailMode && (
              <>
                <Text style={styles.title}>Check your email</Text>
                <Text style={styles.subtitle}>
                  We sent a 6-digit code to{'\n'}
                  <Text style={styles.highlight}>{params.email}</Text>
                </Text>

                <OtpRow
                  otp={otp}
                  inputRefs={inputRefs}
                  onChange={handleDigit(setOtp, otp, null)}
                  onKey={handleKey(otp)}
                />

                <Button
                  title="Verify & Sign In"
                  onPress={handleEmailVerify}
                  loading={verifyEmailMutation.isPending}
                  disabled={otp.join('').length < OTP_LEN}
                  style={styles.btn}
                />

                <View style={styles.resendRow}>
                  <Text style={styles.resendText}>Didn't get the code? </Text>
                  {resendTimer > 0 ? (
                    <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
                  ) : (
                    <TouchableOpacity
                      onPress={() => resendEmailMutation.mutate()}
                      disabled={resendEmailMutation.isPending}
                    >
                      <Text style={styles.resendLink}>
                        {resendEmailMutation.isPending ? 'Sending…' : 'Resend code'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity onPress={() => router.back()} style={styles.altAction}>
                  <Ionicons name="arrow-back-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.altActionText}>Back to sign in</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ═══════════ PHONE OTP ═══════════ */}
            {isPhoneMode && (
              <>
                <Text style={styles.title}>Check your phone</Text>
                <Text style={styles.subtitle}>
                  We sent a 6-digit code to{'\n'}
                  <Text style={styles.highlight}>{params.phone}</Text>
                </Text>

                <OtpRow
                  otp={otp}
                  inputRefs={inputRefs}
                  onChange={handleDigit(setOtp, otp, null)}
                  onKey={handleKey(otp)}
                />

                <Button
                  title="Verify & Sign In"
                  onPress={handlePhoneVerify}
                  loading={verifyPhoneMutation.isPending}
                  disabled={otp.join('').length < OTP_LEN}
                  style={styles.btn}
                />

                <View style={styles.resendRow}>
                  <Text style={styles.resendText}>Didn't get the code? </Text>
                  {resendTimer > 0 ? (
                    <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
                  ) : (
                    <TouchableOpacity
                      onPress={() => resendPhoneMutation.mutate()}
                      disabled={resendPhoneMutation.isPending}
                    >
                      <Text style={styles.resendLink}>
                        {resendPhoneMutation.isPending ? 'Sending…' : 'Resend code'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity onPress={() => router.back()} style={styles.altAction}>
                  <Ionicons name="arrow-back-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.altActionText}>Back to sign in</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ═══════════ FORGOT PASSWORD ═══════════ */}
            {isForgotMode && (
              <>
                {fpStep === 'email' ? (
                  <>
                    <Text style={styles.title}>Forgot password?</Text>
                    <Text style={styles.subtitle}>
                      Enter the email on your account and we'll send a reset code.
                    </Text>

                    <View style={styles.field}>
                      <Text style={styles.label}>Email Address</Text>
                      <TextInput
                        style={styles.input}
                        value={fpEmail}
                        onChangeText={setFpEmail}
                        placeholder="you@example.com"
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => fpSendMutation.mutate()}
                      />
                    </View>

                    <Button
                      title="Send Reset Code"
                      onPress={() => {
                        if (!fpEmail.trim() || !/\S+@\S+\.\S+/.test(fpEmail)) {
                          Toast.show({ type: 'error', text1: 'Enter a valid email' }); return;
                        }
                        fpSendMutation.mutate();
                      }}
                      loading={fpSendMutation.isPending}
                      style={styles.btn}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.title}>Enter the code</Text>
                    <Text style={styles.subtitle}>
                      We sent a 6-digit code to{'\n'}
                      <Text style={styles.highlight}>{fpEmail}</Text>
                    </Text>

                    <OtpRow
                      otp={fpOtp}
                      inputRefs={inputRefs}
                      onChange={handleDigit(setFpOtp, fpOtp, null)}
                      onKey={handleKey(fpOtp)}
                    />

                    <View style={styles.field}>
                      <Text style={styles.label}>New Password</Text>
                      <View style={styles.passRow}>
                        <TextInput
                          style={styles.passInput}
                          value={newPassword}
                          onChangeText={setNewPassword}
                          placeholder="Min. 8 characters"
                          placeholderTextColor={COLORS.textLight}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          style={styles.eyeBtn}
                          onPress={() => setShowPassword((v) => !v)}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={COLORS.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Button
                      title="Reset Password"
                      onPress={handleFpReset}
                      loading={fpResetMutation.isPending}
                      style={styles.btn}
                    />

                    <View style={styles.resendRow}>
                      <Text style={styles.resendText}>Didn't get the code? </Text>
                      {fpResendTimer > 0 ? (
                        <Text style={styles.resendTimer}>Resend in {fpResendTimer}s</Text>
                      ) : (
                        <TouchableOpacity onPress={() => fpSendMutation.mutate()} disabled={fpSendMutation.isPending}>
                          <Text style={styles.resendLink}>
                            {fpSendMutation.isPending ? 'Sending…' : 'Resend code'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </>
            )}

            {/* Terms */}
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

// ── OTP boxes (auto-focus, backspace nav) ────────────────────────────────────
function OtpRow({ otp, inputRefs, onChange, onKey }) {
  return (
    <View style={otpStyles.row}>
      {otp.map((digit, idx) => (
        <TextInput
          key={idx}
          ref={(r) => (inputRefs.current[idx] = r)}
          style={[otpStyles.box, digit ? otpStyles.boxFilled : null]}
          value={digit}
          onChangeText={(v) => onChange(v, idx)}
          onKeyPress={(e) => onKey(e, idx)}
          keyboardType="number-pad"
          maxLength={1}
          autoFocus={idx === 0}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const otpStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: 9,
    marginBottom: 28, justifyContent: 'center',
  },
  box: {
    width: 46, height: 56, borderRadius: 14, borderWidth: 2,
    borderColor: COLORS.border, textAlign: 'center',
    fontSize: 22, fontWeight: '700', color: COLORS.text,
    backgroundColor: COLORS.gray50,
  },
  boxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    color: COLORS.primaryDark,
  },
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // ── Top bar (mirrors frontend mobile OTP top bar) ─────────────────────────
  topBar: {
    backgroundColor: COLORS.primary,
    paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute', borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { position: 'absolute', top: 56, left: 20, zIndex: 10 },
  backCircle: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center', marginBottom: 24,
  },
  logoIcon: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  topIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16,
  },

  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 28 },
  highlight: { color: COLORS.primary, fontWeight: '700' },

  btn: { marginBottom: 20, marginTop: 4 },

  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  resendText: { fontSize: 14, color: COLORS.textSecondary },
  resendTimer: { fontSize: 14, color: COLORS.textLight, fontWeight: '600' },
  resendLink: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },

  altAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8,
  },
  altActionText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 15,
    color: COLORS.text, backgroundColor: COLORS.gray50, width: '100%',
  },
  passRow: {
    flexDirection: 'row', borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, backgroundColor: COLORS.gray50, alignItems: 'center',
  },
  passInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: COLORS.text },
  eyeBtn: { paddingHorizontal: 14 },

  terms: { fontSize: 12, color: COLORS.textLight, textAlign: 'center', marginTop: 12, lineHeight: 18 },
  termsLink: { color: COLORS.primary, fontWeight: '600' },
});
