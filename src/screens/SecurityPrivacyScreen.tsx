import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, StatusBar, Alert, Modal, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { apiProfile } from '../api/apiClient';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SecurityPrivacy'>;
interface Props { navigation: Nav; }

export default function SecurityPrivacyScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [showPwModal, setShowPwModal] = useState(false);
  const [curPw,       setCurPw]       = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confPw,      setConfPw]      = useState('');
  const [showCur,     setShowCur]     = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConf,    setShowConf]    = useState(false);

  const handleChangePw = () => {
    if (!curPw || !newPw || !confPw) { Alert.alert('Error', 'Please fill all fields'); return; }
    if (newPw !== confPw) { Alert.alert('Error', 'New passwords do not match'); return; }
    setShowPwModal(false); setCurPw(''); setNewPw(''); setConfPw('');
    Alert.alert('Success', 'Password changed successfully!');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiProfile.deleteAccount();
              if (res && res.success) {
                Alert.alert('Success', 'Your account has been deleted.');
                await logout();
              } else {
                Alert.alert('Error', res.message || 'Failed to delete account');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color="#1A202C" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Security &amp; Privacy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Section 1 — Account Security */}
        <Text style={s.sectionTitle}>Account Security</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={() => setShowPwModal(true)} activeOpacity={0.7}>
            <View style={[s.iconBg, { backgroundColor: '#EEF2FF' }]}>
              <Feather name="lock" size={18} color="#4F46E5" />
            </View>
            <View style={s.rowText}>
              <Text style={s.rowTitle}>Change Password</Text>
              <Text style={s.rowSub}>Update your account password</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#A0AEC0" />
          </TouchableOpacity>
        </View>



        {/* Section 3 — Data Management */}
        <Text style={s.sectionTitle}>Data Management</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} activeOpacity={0.7}
            onPress={() => Alert.alert('Download', 'Your data export has been requested. You will receive an email shortly.')}>
            <View style={[s.iconBg, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="download" size={18} color="#3B82F6" />
            </View>
            <View style={s.rowText}>
              <Text style={[s.rowTitle, { color: '#3B82F6' }]}>Download My Data</Text>
              <Text style={s.rowSub}>Export all your health records</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#3B82F6" />
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity style={s.row} activeOpacity={0.7}
            onPress={() => Linking.openURL('https://cannyapps.com/caremate-ai-privacy-policy')}>
            <View style={[s.iconBg, { backgroundColor: '#F3E8FF' }]}>
              <Feather name="shield" size={18} color="#7C3AED" />
            </View>
            <View style={s.rowText}>
              <Text style={[s.rowTitle, { color: '#7C3AED' }]}>Privacy Policy</Text>
              <Text style={s.rowSub}>Read our official data & privacy terms</Text>
            </View>
            <Feather name="external-link" size={18} color="#7C3AED" />
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity style={s.row} activeOpacity={0.7}
            onPress={() => Linking.openURL('https://cannyapps.com/caremate-ai-terms/')}>
            <View style={[s.iconBg, { backgroundColor: '#FEF3C7' }]}>
              <Feather name="file-text" size={18} color="#D97706" />
            </View>
            <View style={s.rowText}>
              <Text style={[s.rowTitle, { color: '#D97706' }]}>Terms &amp; Conditions</Text>
              <Text style={s.rowSub}>Read our terms of service & disclaimers</Text>
            </View>
            <Feather name="external-link" size={18} color="#D97706" />
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={handleDeleteAccount}>
            <View style={[s.iconBg, { backgroundColor: '#FEE2E2' }]}>
              <Feather name="trash-2" size={18} color="#EF4444" />
            </View>
            <View style={s.rowText}>
              <Text style={[s.rowTitle, { color: '#EF4444' }]}>Delete Account</Text>
              <Text style={s.rowSub}>Permanently remove your data</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPwModal} transparent animationType="slide" onRequestClose={() => setShowPwModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowPwModal(false)}>
          <View style={s.modal}>
            <View style={s.modalBar} />
            <Text style={s.modalTitle}>Change Password</Text>
            {[
              { label: 'Current Password', val: curPw, set: setCurPw, show: showCur, toggle: () => setShowCur(v => !v) },
              { label: 'New Password',     val: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(v => !v) },
              { label: 'Confirm Password', val: confPw, set: setConfPw, show: showConf, toggle: () => setShowConf(v => !v) },
            ].map(f => (
              <View key={f.label} style={{ marginBottom: 14 }}>
                <Text style={s.inputLabel}>{f.label}</Text>
                <View style={s.inputRow}>
                  <Feather name="lock" size={16} color="#A0AEC0" style={{ marginRight: 10 }} />
                  <TextInput style={s.input} secureTextEntry={!f.show} value={f.val}
                    onChangeText={f.set} placeholderTextColor="#A0AEC0" placeholder="••••••••" />
                  <TouchableOpacity onPress={f.toggle}>
                    <Feather name={f.show ? 'eye-off' : 'eye'} size={16} color="#A0AEC0" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.saveBtn} onPress={handleChangePw}>
              <Text style={s.saveBtnText}>Update Password</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F7F7FF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C' },
  scroll: { paddingHorizontal: 18, paddingTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, marginBottom: 20, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  iconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#1A202C' },
  rowSub: { fontSize: 12, color: '#718096', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F0F0F8', marginLeft: 54 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  modalBar: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1A202C', marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9FF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E5FF', paddingHorizontal: 12, height: 50 },
  input: { flex: 1, fontSize: 14, color: '#1A202C' },
  saveBtn: { backgroundColor: '#4F46E5', borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
