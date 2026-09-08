import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Linking, LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'HelpSupport'>;
interface Props { navigation: Nav; }

const FAQS = [
  {
    q: 'How do I scan a prescription?',
    a: 'Tap the "AI Prescription Scanner" button on the Home tab or press the + button at the bottom. Point your camera at the prescription and our AI will automatically extract all medicine details.',
  },
  {
    q: 'Can I add medicines manually?',
    a: 'Yes! Go to the Medications tab and tap "Add Medicine" button at the top right. You can enter the medicine name, dosage, and time manually.',
  },
  {
    q: 'How do reminders work?',
    a: 'After scanning a prescription, you can set up daily reminders. The app will send you notifications at the specified times to remind you to take your medicine.',
  },
  {
    q: 'Is my health data secure?',
    a: 'Yes, your health data is encrypted and stored securely. We use industry-standard encryption (AES-256) and follow HIPAA compliance guidelines. Your data is never sold to third parties.',
  },
  {
    q: 'How to export my data?',
    a: 'Go to Profile → Security & Privacy → Download My Data. You will receive an email with all your health records in PDF and JSON formats within 24 hours.',
  },
  {
    q: 'What is the AI Health Assistant?',
    a: 'The AI Health Assistant is an intelligent chatbot powered by advanced AI. You can ask it about your medicines, side effects, health tips, appointment reminders, and more.',
  },
  {
    q: 'How do I book a doctor appointment?',
    a: 'Tap "Doctor Appointment" on the Home screen or go to the + button and select "Book Doctor Appointment". You can add appointment details manually or use Voice Mode.',
  },
];

export default function HelpSupportScreen({ navigation }: Props) {
  const [search,    setSearch]   = useState('');
  const [expanded,  setExpanded] = useState<number | null>(null);

  const filtered = FAQS.filter(f =>
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(expanded === i ? null : i);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color="#1A202C" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Help &amp; Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero Banner */}
        <View style={s.heroBanner}>
          <View style={s.heroIconWrap}>
            <MaterialCommunityIcons name="headset" size={32} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>How can we help?</Text>
            <Text style={s.heroSub}>Search FAQs or contact our team</Text>
          </View>
        </View>

        {/* Search */}
        <View style={s.searchRow}>
          <Feather name="search" size={16} color="#A0AEC0" style={{ marginRight: 10 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search FAQs..."
            placeholderTextColor="#A0AEC0"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color="#A0AEC0" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={s.sectionLabel}>Contact Us</Text>
        <View style={s.quickRow}>
          <QuickAction icon="message-circle" label="Chat with Us" color="#4F46E5" bg="#EEF2FF"
            onPress={() => {}} />
          <QuickAction icon="phone" label="Call Support" color="#059669" bg="#ECFDF5"
            onPress={() => Linking.openURL('tel:+8801700000000')} />
          <QuickAction icon="mail" label="Email Us" color="#3B82F6" bg="#EFF6FF"
            onPress={() => Linking.openURL('mailto:support@aihealthvault.com')} />
        </View>

        {/* FAQs */}
        <Text style={s.sectionLabel}>
          Frequently Asked Questions {search ? `(${filtered.length} results)` : ''}
        </Text>

        {filtered.length === 0 ? (
          <View style={s.emptyWrap}>
            <Feather name="search" size={36} color="#CBD5E0" />
            <Text style={s.emptyText}>No results for "{search}"</Text>
          </View>
        ) : (
          filtered.map((faq, i) => (
            <TouchableOpacity key={i} style={s.faqCard} onPress={() => toggle(i)} activeOpacity={0.8}>
              <View style={s.faqHeader}>
                <View style={s.faqQNum}>
                  <Text style={s.faqQNumText}>Q</Text>
                </View>
                <Text style={s.faqQ}>{faq.q}</Text>
                <Feather name={expanded === i ? 'chevron-up' : 'chevron-down'} size={18} color="#A0AEC0" />
              </View>
              {expanded === i && (
                <View style={s.faqAnswer}>
                  <View style={s.faqALine} />
                  <Text style={s.faqA}>{faq.a}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}

        {/* Version */}
        <View style={s.versionCard}>
          <MaterialCommunityIcons name="heart-pulse" size={20} color="#4F46E5" style={{ marginBottom: 6 }} />
          <Text style={s.versionName}>CareMate AI</Text>
          <Text style={s.versionNum}>Version 1.0.0</Text>
          <Text style={s.versionBuild}>Build 2026.07</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, color, bg, onPress }: {
  icon: string; label: string; color: string; bg: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.quickBtn} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.quickIconBg, { backgroundColor: bg }]}>
        <Feather name={icon as any} size={22} color={color} />
      </View>
      <Text style={s.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F7F7FF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C' },
  scroll: { paddingHorizontal: 18, paddingTop: 16 },

  heroBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 18, padding: 18, marginBottom: 18, gap: 14 },
  heroIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#C7D2FE', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C' },
  heroSub: { fontSize: 13, color: '#6366F1', marginTop: 2 },

  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#E8E5FF', paddingHorizontal: 14, height: 50, marginBottom: 20, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A202C' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginLeft: 4 },

  quickRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  quickBtn: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  quickIconBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 12, fontWeight: '700', color: '#4A5568', textAlign: 'center' },

  faqCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 10, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  faqHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  faqQNum: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  faqQNumText: { fontSize: 12, fontWeight: '800', color: '#4F46E5' },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A202C' },
  faqAnswer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16 },
  faqALine: { width: 3, backgroundColor: '#C7D2FE', borderRadius: 2, marginRight: 12 },
  faqA: { flex: 1, fontSize: 13, color: '#4A5568', lineHeight: 20 },

  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#A0AEC0', marginTop: 10 },

  versionCard: { alignItems: 'center', paddingVertical: 24, marginTop: 8 },
  versionName: { fontSize: 16, fontWeight: '800', color: '#1A202C', marginTop: 2 },
  versionNum: { fontSize: 13, color: '#4F46E5', fontWeight: '600', marginTop: 2 },
  versionBuild: { fontSize: 12, color: '#A0AEC0', marginTop: 2 },
});
