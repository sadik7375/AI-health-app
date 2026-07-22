import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
  Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Logo } from '../components/Logo';
import { AntDesign, FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { height } = Dimensions.get('window');

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused]   = useState(false);
  const [loading, setLoading]           = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.message || 'Invalid credentials. Please try again.');
    }
    // On success, AuthContext sets isAuthenticated = true → AppNavigator auto-switches to AppStack
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo Header */}
          <View style={styles.headerRow}>
            <View style={styles.logoBadge}><Logo size={36} /></View>
            <Text style={styles.version}>1.0.0</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Welcome back 👋</Text>
          <Text style={styles.subtitle}>Sign in to your AI Health Vault account</Text>

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputWrap, emailFocused && styles.inputFocused]}>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#A0AEC0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputWrap, passFocused && styles.inputFocused]}>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor="#A0AEC0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              onFocus={() => setPassFocused(true)}
              onBlur={() => setPassFocused(false)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
              <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={18} color="#A0AEC0" />
            </TouchableOpacity>
          </View>

          {/* Forgot */}
          <TouchableOpacity style={styles.forgotWrap} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInBtn, loading && { opacity: 0.7 }]}
            disabled={loading}
            onPress={handleLogin}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.signInBtnText}>Sign In</Text>}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.line} />
          </View>

          {/* Social placeholder buttons */}
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
            <AntDesign name="google" size={18} color="#000" style={{ marginRight: 8 }} />
            <Text style={styles.socialText}>Continue with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
            <AntDesign name="apple" size={18} color="#000" style={{ marginRight: 8 }} />
            <Text style={styles.socialText}>Continue with Apple</Text>
          </TouchableOpacity>

          {/* Sign up link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>{"Don't have an account? "}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>© 2026 AI Health Vault Inc</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 32 },
  logoBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F0F4FF', alignItems: 'center', justifyContent: 'center' },
  version: { fontSize: 12, color: '#A0AEC0', fontWeight: '600' },

  title: { fontSize: 28, fontWeight: '800', color: '#1A202C', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#718096', marginBottom: 28 },

  label: { fontSize: 14, fontWeight: '600', color: '#2D3748', marginBottom: 8, marginTop: 16 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F7FAFC', borderRadius: 14, borderWidth: 1.5,
    borderColor: '#E2E8F0', paddingHorizontal: 16, height: 54,
  },
  inputFocused: { borderColor: '#4F46E5', backgroundColor: '#FAFFFE' },
  input: { flex: 1, fontSize: 15, color: '#1A202C' },

  forgotWrap: { alignSelf: 'flex-end', marginTop: 10, marginBottom: 4 },
  forgotText: { fontSize: 13, color: '#4F46E5', fontWeight: '600' },

  signInBtn: {
    backgroundColor: '#4F46E5', borderRadius: 28, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  signInBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  orText: { marginHorizontal: 12, color: '#A0AEC0', fontSize: 13, fontWeight: '600' },

  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 28, height: 52, marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  socialText: { fontSize: 14, fontWeight: '600', color: '#1A202C' },

  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  signupText: { fontSize: 14, color: '#718096' },
  signupLink: { fontSize: 14, color: '#4F46E5', fontWeight: '700' },

  footer: { textAlign: 'center', color: '#CBD5E0', fontSize: 11, marginTop: 24 },
});
