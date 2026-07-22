import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { FontAwesome, Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Register'> };

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();

  const [fullName, setFullName]                   = useState('');
  const [email, setEmail]                         = useState('');
  const [password, setPassword]                   = useState('');
  const [confirmPassword, setConfirmPassword]     = useState('');
  const [agreeTerms, setAgreeTerms]               = useState(false);
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirm, setShowConfirm]             = useState(false);
  const [nameFocused, setNameFocused]             = useState(false);
  const [emailFocused, setEmailFocused]           = useState(false);
  const [passwordFocused, setPasswordFocused]     = useState(false);
  const [confirmFocused, setConfirmFocused]       = useState(false);
  const [loading, setLoading]                     = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      Alert.alert('Terms Required', 'Please agree to the Terms & Conditions.');
      return;
    }

    setLoading(true);
    const result = await register(fullName.trim(), email.trim(), password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Registration Failed', result.message || 'Could not create account. Please try again.');
    }
    // On success, AuthContext sets isAuthenticated = true → AppNavigator auto-switches to AppStack
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Text style={styles.subtitle}>Join AI Health Vault to manage your health records intelligently.</Text>

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <View style={[styles.inputWrap, nameFocused && styles.inputFocused]}>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor="#A0AEC0"
              value={fullName}
              onChangeText={setFullName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />
          </View>

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

          {/* Info box */}
          <View style={styles.infoBox}>
            <Feather name="info" size={14} color="#D97706" style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>Please use a secure personal email address.</Text>
          </View>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputWrap, passwordFocused && styles.inputFocused]}>
            <TextInput
              style={styles.input}
              placeholder="Min 8 characters"
              placeholderTextColor="#A0AEC0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
              <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={18} color="#A0AEC0" />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.inputWrap, confirmFocused && styles.inputFocused]}>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor="#A0AEC0"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={{ padding: 8 }}>
              <FontAwesome name={showConfirm ? 'eye' : 'eye-slash'} size={18} color="#A0AEC0" />
            </TouchableOpacity>
          </View>

          {/* Terms checkbox */}
          <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreeTerms(!agreeTerms)} activeOpacity={0.8}>
            <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
              {agreeTerms && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the <Text style={styles.linkText}>Terms & Conditions</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[styles.createBtn, (!agreeTerms || loading) && styles.createBtnDisabled]}
            disabled={!agreeTerms || loading}
            onPress={handleRegister}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.createBtnText}>Create Account</Text>}
          </TouchableOpacity>

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A202C' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: '#718096', marginTop: 16, marginBottom: 8, lineHeight: 20 },

  label: { fontSize: 14, fontWeight: '600', color: '#2D3748', marginBottom: 8, marginTop: 16 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 54 },
  inputFocused: { borderColor: '#4F46E5', backgroundColor: '#FAFFFE' },
  input: { flex: 1, fontSize: 15, color: '#1A202C' },

  infoBox: { flexDirection: 'row', backgroundColor: '#FFF9F2', borderRadius: 8, padding: 12, marginTop: 8, alignItems: 'center' },
  infoText: { fontSize: 12, color: '#D97706', flex: 1, fontWeight: '500' },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkboxActive: { borderColor: '#4F46E5', backgroundColor: '#4F46E5' },
  checkboxLabel: { fontSize: 13, color: '#718096', flex: 1, lineHeight: 18 },
  linkText: { color: '#4F46E5', fontWeight: '600' },

  createBtn: { backgroundColor: '#4F46E5', borderRadius: 28, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 20, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  createBtnDisabled: { backgroundColor: '#A5B4FC', shadowOpacity: 0.05, elevation: 1 },
  createBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  loginText: { fontSize: 14, color: '#718096' },
  loginLink: { fontSize: 14, color: '#4F46E5', fontWeight: '700' },
});
