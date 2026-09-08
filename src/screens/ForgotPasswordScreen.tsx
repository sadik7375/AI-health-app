import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { apiAuth } from '../api/apiClient';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
interface Props {
  navigation: Nav;
}

type Step = 'EMAIL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS';

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('EMAIL');
  const [loading, setLoading] = useState(false);

  // Step 1: Email
  const [email, setEmail] = useState('');

  // Step 2: OTP (4 digits)
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpInputRefs = useRef<Array<TextInput | null>>([]);
  const [timer, setTimer] = useState(600);
  const [canResend, setCanResend] = useState(false);

  // Step 3: Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfPw, setShowConfPw] = useState(false);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: any;
    if (step === 'OTP' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Handle OTP Input Change
  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto focus next box
    if (text && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSendOtp = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiAuth.forgotPassword(email.trim());
      if (res.success) {
        setTimer(600);
        setCanResend(false);
        setOtp(['', '', '', '']);
        setStep('OTP');
        Alert.alert('OTP Sent', 'A verification OTP has been sent to your email.');
      } else {
        Alert.alert('Error', res.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiAuth.forgotPassword(email.trim());
      if (res.success) {
        setTimer(600);
        setCanResend(false);
        setOtp(['', '', '', '']);
        Alert.alert('OTP Sent', 'A verification OTP has been sent to your email.');
      } else {
        Alert.alert('Error', res.message || 'Failed to resend OTP');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const code = otp.join('');
      const res = await apiAuth.verifyOtp(email.trim(), code);
      if (res.success) {
        setStep('NEW_PASSWORD');
      } else {
        Alert.alert('Error', res.message || 'Invalid or expired OTP code');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiAuth.resetPassword({
        email: email.trim(),
        newPassword: newPassword,
      });
      if (res.success) {
        setStep('SUCCESS');
      } else {
        Alert.alert('Error', res.message || 'Failed to reset password');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  // Password validation rules
  const hasMinLength = newPassword.length >= 6;
  const isPasswordValid = hasMinLength;
  const isMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />

      {/* Top Header */}
      <View style={styles.header}>
        {step !== 'SUCCESS' && (
          <TouchableOpacity style={styles.backBtn} onPress={() => {
            if (step === 'EMAIL') navigation.goBack();
            else if (step === 'OTP') setStep('EMAIL');
            else if (step === 'NEW_PASSWORD') setStep('OTP');
          }}>
            <Feather name="arrow-left" size={22} color="#1A202C" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Progress Step Indicator */}
          {step !== 'SUCCESS' && (
            <View style={styles.progressRow}>
              <View style={[styles.progressDot, styles.progressDotActive]}>
                <Text style={styles.progressDotText}>1</Text>
              </View>
              <View style={[styles.progressLine, (step === 'OTP' || step === 'NEW_PASSWORD') && styles.progressLineActive]} />
              <View style={[styles.progressDot, (step === 'OTP' || step === 'NEW_PASSWORD') && styles.progressDotActive]}>
                <Text style={[styles.progressDotText, (step === 'OTP' || step === 'NEW_PASSWORD') && styles.progressDotTextActive]}>2</Text>
              </View>
              <View style={[styles.progressLine, step === 'NEW_PASSWORD' && styles.progressLineActive]} />
              <View style={[styles.progressDot, step === 'NEW_PASSWORD' && styles.progressDotActive]}>
                <Text style={[styles.progressDotText, step === 'NEW_PASSWORD' && styles.progressDotTextActive]}>3</Text>
              </View>
            </View>
          )}

          {/* ════════════════════════════════════════════════════════
              STEP 1: ENTER EMAIL
             ════════════════════════════════════════════════════════ */}
          {step === 'EMAIL' && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Feather name="lock" size={36} color="#4F46E5" />
              </View>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                {"Don't worry! It happens. Please enter the email address linked with your account."}
              </Text>

              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={18} color="#A0AEC0" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholderTextColor="#A0AEC0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, (!email.includes('@') || loading) && styles.disabledBtn]}
                disabled={!email.includes('@') || loading}
                onPress={handleSendOtp}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Send Verification Code</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkLabel}>Remember Password? </Text>
                <Text style={styles.linkBold}>Log In</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ════════════════════════════════════════════════════════
              STEP 2: OTP VERIFICATION
             ════════════════════════════════════════════════════════ */}
          {step === 'OTP' && (
            <View style={styles.stepContainer}>
              <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                <MaterialCommunityIcons name="shield-check-outline" size={40} color="#059669" />
              </View>
              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.subtitle}>
                We have sent a 4-digit code to <Text style={{ fontWeight: '700', color: '#1A202C' }}>{email}</Text>
              </Text>

              {/* 4 Digit Boxes */}
              <View style={styles.otpRow}>
                {otp.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(ref) => { otpInputRefs.current[idx] = ref; }}
                    style={[styles.otpBox, digit.length > 0 && styles.otpBoxFilled]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(t) => handleOtpChange(t, idx)}
                    onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                  />
                ))}
              </View>

              {/* Resend Timer */}
              <View style={styles.resendRow}>
                <Text style={styles.resendText}>{"Didn't receive code? "}</Text>
                {canResend ? (
                  <TouchableOpacity onPress={resendOtp}>
                    <Text style={styles.resendBtnText}>Resend Code</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.timerText}>{`Resend in ${Math.floor(timer / 60)}m ${timer % 60}s`}</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, (otp.some((d) => !d) || loading) && styles.disabledBtn]}
                disabled={otp.some((d) => !d) || loading}
                onPress={handleVerifyOtp}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify Code</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ════════════════════════════════════════════════════════
              STEP 3: CREATE NEW PASSWORD
             ════════════════════════════════════════════════════════ */}
          {step === 'NEW_PASSWORD' && (
            <View style={styles.stepContainer}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="key" size={36} color="#D97706" />
              </View>
              <Text style={styles.title}>Create New Password</Text>
              <Text style={styles.subtitle}>
                Your new password must be unique from previously used passwords.
              </Text>

              {/* New Password Input */}
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color="#A0AEC0" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#A0AEC0"
                  secureTextEntry={!showNewPw}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)}>
                  <Feather name={showNewPw ? 'eye-off' : 'eye'} size={18} color="#A0AEC0" />
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input */}
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color="#A0AEC0" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#A0AEC0"
                  secureTextEntry={!showConfPw}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfPw(!showConfPw)}>
                  <Feather name={showConfPw ? 'eye-off' : 'eye'} size={18} color="#A0AEC0" />
                </TouchableOpacity>
              </View>

              {/* Password Rules Checklist */}
              <View style={styles.checklistCard}>
                <RuleItem label="At least 6 characters long" valid={hasMinLength} />
                <RuleItem label="Passwords match" valid={isMatch} />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, (!isPasswordValid || !isMatch || loading) && styles.disabledBtn]}
                disabled={!isPasswordValid || !isMatch || loading}
                onPress={handleResetPassword}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ════════════════════════════════════════════════════════
              STEP 4: SUCCESS CONFIRMATION
             ════════════════════════════════════════════════════════ */}
          {step === 'SUCCESS' && (
            <View style={styles.stepContainer}>
              <View style={styles.successIconOuter}>
                <View style={styles.successIconInner}>
                  <Feather name="check" size={48} color="#059669" />
                </View>
              </View>

              <Text style={styles.title}>Password Changed!</Text>
              <Text style={styles.subtitle}>
                Your password has been reset successfully. You can now log in with your new password.
              </Text>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Back to Log In</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RuleItem({ label, valid }: { label: string; valid: boolean }) {
  return (
    <View style={styles.ruleRow}>
      <Feather
        name={valid ? 'check-circle' : 'circle'}
        size={14}
        color={valid ? '#059669' : '#A0AEC0'}
        style={{ marginRight: 8 }}
      />
      <Text style={[styles.ruleText, valid && styles.ruleTextValid]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F8',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F7F7FF',
    alignItems: 'center',
    justifyContent: 'center', // Fixed typo: justifyContent
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C' },
  scroll: { paddingHorizontal: 22, paddingTop: 20 },

  // Progress Bar
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: { backgroundColor: '#4F46E5' },
  progressDotText: { fontSize: 12, fontWeight: '700', color: '#718096' },
  progressDotTextActive: { color: '#FFFFFF' },
  progressLine: { flex: 1, height: 3, backgroundColor: '#E2E8F0', marginHorizontal: 6 },
  progressLineActive: { backgroundColor: '#4F46E5' },

  stepContainer: { alignItems: 'center' },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1A202C', textAlign: 'center', marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 10,
  },

  // Input
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    color: '#4A5568',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8E5FF',
    paddingHorizontal: 14,
    height: 52,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  input: { flex: 1, fontSize: 14, color: '#1A202C' },

  // OTP Boxes
  otpRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  otpBox: {
    width: 56,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#1A202C',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  otpBoxFilled: { borderColor: '#4F46E5', backgroundColor: '#F5F3FF' },

  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  resendText: { fontSize: 13, color: '#718096' },
  resendBtnText: { fontSize: 13, fontWeight: '700', color: '#4F46E5' },
  timerText: { fontSize: 13, fontWeight: '700', color: '#D97706' },

  // Password Rules Checklist
  checklistCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  ruleText: { fontSize: 12, color: '#718096', fontWeight: '500' },
  ruleTextValid: { color: '#059669', fontWeight: '600' },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    height: 54,
    width: '100%',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  disabledBtn: { backgroundColor: '#A5B4FC', shadowOpacity: 0.1 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  linkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  linkLabel: { fontSize: 14, color: '#718096' },
  linkBold: { fontSize: 14, fontWeight: '700', color: '#4F46E5' },

  // Success
  successIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successIconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
