import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, StatusBar, Alert,
  ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { apiProfile } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PersonalInfo'>;
interface Props { navigation: Nav; }

const BLOOD_TYPES = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
const GENDERS = ['Male','Female','Other'];

export default function PersonalInfoScreen({ navigation }: Props) {
  const { updateUser } = useAuth();
  const [loading,      setLoading]      = useState(true);
  const [fullName,     setFullName]     = useState('');
  const [dob,          setDob]          = useState('');
  const [gender,       setGender]       = useState('Male');
  const [bloodType,    setBloodType]    = useState('O+');
  const [email,        setEmail]        = useState('');
  const [height,       setHeight]       = useState('');
  const [weight,       setWeight]       = useState('');
  const [allergies,    setAllergies]    = useState('');
  const [conditions,   setConditions]   = useState('');

  // Custom Date Picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selDay, setSelDay] = useState(15);
  const [selMonth, setSelMonth] = useState(3);
  const [selYear, setSelYear] = useState(1961);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiProfile.getProfile();
        if (res && res.success && res.user) {
          const u = res.user;
          setFullName(u.name || '');
          setDob(u.dob || '');
          setGender(u.gender || 'Male');
          setBloodType(u.blood_type || 'O+');
          setEmail(u.email || '');
          setHeight(u.height ? u.height.toString() : '');
          setWeight(u.weight ? u.weight.toString() : '');
          setAllergies(u.allergies || '');
          setConditions(u.medical_conditions || '');

          if (u.dob) {
            const parts = u.dob.split('-');
            if (parts.length === 3) {
              setSelYear(parseInt(parts[0], 10));
              setSelMonth(parseInt(parts[1], 10));
              setSelDay(parseInt(parts[2], 10));
            }
          }
        }
      } catch (err: any) {
        console.warn("Failed to fetch profile:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await apiProfile.updateProfile({
        name: fullName,
        dob,
        gender,
        blood_type: bloodType,
        height,
        weight,
        allergies,
        conditions,
      });

      if (res && res.success && res.user) {
        await updateUser(res.user);
        Alert.alert('Saved', 'Your profile has been updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to update profile.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong while saving.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDatePicker = () => {
    const paddedMonth = selMonth.toString().padStart(2, '0');
    const paddedDay = selDay.toString().padStart(2, '0');
    setDob(`${selYear}-${paddedMonth}-${paddedDay}`);
    setShowDatePicker(false);
  };

  const formatDobDisplay = (dateString: string) => {
    if (!dateString) return 'Select Date';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${monthNames[monthIdx]} ${year}`;
      }
    }
    return dateString;
  };

  if (loading && !fullName) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color="#1A202C" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Personal Information</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={s.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          <View style={{ height: 20 }} />

          {/* Section 1 — Basic Info */}
          <SectionCard title="Basic Information" icon="user">
            <Field label="Full Name" icon={<Feather name="user" size={16} color="#6366F1" />}
              value={fullName} onChange={setFullName} />
            <Text style={s.fieldLabel}>Date of Birth</Text>
            <TouchableOpacity 
              style={[s.inputRow, { marginBottom: 14 }]} 
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Feather name="calendar" size={16} color="#6366F1" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 14, color: dob ? '#1A202C' : '#A0AEC0' }}>
                {formatDobDisplay(dob)}
              </Text>
            </TouchableOpacity>

            <Text style={s.fieldLabel}>Gender</Text>
            <View style={s.chipRow}>
              {GENDERS.map(g => (
                <TouchableOpacity key={g} style={[s.chip, gender === g && s.chipActive]}
                  onPress={() => setGender(g)}>
                  <Text style={[s.chipText, gender === g && s.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Blood Type</Text>
            <View style={s.chipRow}>
              {BLOOD_TYPES.map(b => (
                <TouchableOpacity key={b} style={[s.chip, bloodType === b && s.chipActive]}
                  onPress={() => setBloodType(b)}>
                  <Text style={[s.chipText, bloodType === b && s.chipTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          {/* Section 2 — Contact */}
          <SectionCard title="Contact Information" icon="phone">
            <Field label="Email Address" icon={<Feather name="mail" size={16} color="#6366F1" />}
              value={email} onChange={setEmail} keyboardType="email-address" />
          </SectionCard>

          {/* Section 3 — Medical */}
          <SectionCard title="Medical Information" icon="activity">
            <View style={s.twoCol}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="Height (cm)" icon={<MaterialCommunityIcons name="human-male-height" size={16} color="#6366F1" />}
                  value={height} onChange={setHeight} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Field label="Weight (kg)" icon={<MaterialCommunityIcons name="weight-kilogram" size={16} color="#6366F1" />}
                  value={weight} onChange={setWeight} keyboardType="numeric" />
              </View>
            </View>
            <Field label="Known Allergies" icon={<MaterialCommunityIcons name="alert-circle-outline" size={16} color="#6366F1" />}
              value={allergies} onChange={setAllergies} multiline />
            <Field label="Medical Conditions" icon={<MaterialCommunityIcons name="heart-pulse" size={16} color="#6366F1" />}
              value={conditions} onChange={setConditions} multiline />
          </SectionCard>

          {/* Save Button */}
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={s.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Scroll Wheel Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: 400 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A202C' }}>Select Date of Birth</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Feather name="x" size={20} color="#718096" />
              </TouchableOpacity>
            </View>

            {/* Wheels */}
            <View style={{ flexDirection: 'row', gap: 10, height: 200 }}>
              {/* Day Wheel */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#718096', textTransform: 'uppercase', marginBottom: 8 }}>Day</Text>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <TouchableOpacity 
                      key={d} 
                      style={{ paddingVertical: 10, width: '100%', alignItems: 'center', backgroundColor: selDay === d ? '#EEF2FF' : 'transparent', borderRadius: 8 }}
                      onPress={() => setSelDay(d)}
                    >
                      <Text style={{ fontSize: 16, fontWeight: selDay === d ? '700' : '500', color: selDay === d ? '#4F46E5' : '#4A5568' }}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month Wheel */}
              <View style={{ flex: 1.5, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#718096', textTransform: 'uppercase', marginBottom: 8 }}>Month</Text>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => {
                    const val = idx + 1;
                    return (
                      <TouchableOpacity 
                        key={val} 
                        style={{ paddingVertical: 10, width: '100%', alignItems: 'center', backgroundColor: selMonth === val ? '#EEF2FF' : 'transparent', borderRadius: 8 }}
                        onPress={() => setSelMonth(val)}
                      >
                        <Text style={{ fontSize: 15, fontWeight: selMonth === val ? '700' : '500', color: selMonth === val ? '#4F46E5' : '#4A5568' }}>{m}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Year Wheel */}
              <View style={{ flex: 1.2, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#718096', textTransform: 'uppercase', marginBottom: 8 }}>Year</Text>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                  {Array.from({ length: 90 }, (_, i) => 2026 - i).map(y => (
                    <TouchableOpacity 
                      key={y} 
                      style={{ paddingVertical: 10, width: '100%', alignItems: 'center', backgroundColor: selYear === y ? '#EEF2FF' : 'transparent', borderRadius: 8 }}
                      onPress={() => setSelYear(y)}
                    >
                      <Text style={{ fontSize: 16, fontWeight: selYear === y ? '700' : '500', color: selYear === y ? '#4F46E5' : '#4A5568' }}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity 
              style={{ backgroundColor: '#4F46E5', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 16 }}
              onPress={confirmDatePicker}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardIconBg}>
          <Feather name={icon as any} size={16} color="#4F46E5" />
        </View>
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Field({ label, icon, value, onChange, keyboardType, multiline }: {
  label: string; icon: React.ReactNode; value: string;
  onChange: (v: string) => void; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.inputRow, multiline && { height: 72, alignItems: 'flex-start', paddingTop: 12 }]}>
        <View style={{ marginRight: 10, marginTop: multiline ? 2 : 0 }}>{icon}</View>
        <TextInput
          style={[s.input, multiline && { textAlignVertical: 'top' }]}
          value={value} onChangeText={onChange}
          keyboardType={keyboardType || 'default'}
          multiline={multiline}
          placeholderTextColor="#A0AEC0"
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F8',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F7F7FF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C' },
  saveText: { fontSize: 15, fontWeight: '700', color: '#4F46E5' },
  scroll: { paddingHorizontal: 18, paddingTop: 20 },

  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#FFFFFF' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  avatarName: { fontSize: 20, fontWeight: '800', color: '#1A202C' },
  avatarSub: { fontSize: 13, color: '#718096', marginTop: 2 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  cardIconBg: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A202C' },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9F9FF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E5FF',
    paddingHorizontal: 12, height: 48,
  },
  input: { flex: 1, fontSize: 14, color: '#1A202C' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8F9FF' },
  chipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#718096' },
  chipTextActive: { color: '#FFFFFF' },

  twoCol: { flexDirection: 'row' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#4F46E5', borderRadius: 16, height: 54, marginTop: 8,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
