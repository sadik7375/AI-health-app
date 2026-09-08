import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'UpgradePlan'>;
interface Props {
  navigation: Nav;
}

export default function UpgradePlanScreen({ navigation }: Props) {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [selectedPlan, setSelectedPlan] = useState<'FREE' | 'BASIC' | 'PREMIUM'>('PREMIUM');

  const handleSelectPlan = (planName: string, price: string) => {
    Alert.alert(
      'Plan Selected',
      `You selected the ${planName} plan (${billingCycle.toLowerCase()}) for ${price}. Redirecting to payment...`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade Plan</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Crown Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.crownCircle}>
            <MaterialCommunityIcons name="crown-outline" size={32} color="#4F46E5" />
          </View>
          <Text style={styles.heroTitle}>Unlock Premium Features</Text>
          <Text style={styles.heroSub}>
            Get unlimited AI scans, 24/7 AI Health Assistant, and advanced danger alerts.
          </Text>
        </View>

        {/* Billing Toggle (Monthly / Yearly) */}
        <View style={styles.billingToggleWrap}>
          <TouchableOpacity
            style={[styles.billingBtn, billingCycle === 'MONTHLY' && styles.billingBtnActive]}
            onPress={() => setBillingCycle('MONTHLY')}
          >
            <Text style={[styles.billingText, billingCycle === 'MONTHLY' && styles.billingTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingBtn, billingCycle === 'YEARLY' && styles.billingBtnActive]}
            onPress={() => setBillingCycle('YEARLY')}
          >
            <Text style={[styles.billingText, billingCycle === 'YEARLY' && styles.billingTextActive]}>
              Yearly
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>SAVE 30%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════════════
            3 PRICING PLAN CARDS (RESTORED CARD-BASED DESIGN)
           ════════════════════════════════════════════════════════ */}

        {/* PLAN 1: FREE */}
        <View style={[styles.planCard, selectedPlan === 'FREE' && styles.planCardSelected]}>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>Free Plan</Text>
              <Text style={styles.planDesc}>Basic health tracking & reminders</Text>
            </View>
            <View style={styles.priceWrap}>
              <Text style={styles.priceVal}>$0</Text>
              <Text style={styles.pricePeriod}>/forever</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.featureList}>
            <FeatureRow text="10 Prescription Scans per account" active />
            <FeatureRow text="10 Lab Report Scans per account" active />
            <FeatureRow text="Active Medicine Reminders" active />
            <FeatureRow text="Prescription Document History" active />
            <FeatureRow text="Unlimited Manual Appointments" active />
            <FeatureRow text="Voice Appointment Bookings" active={false} />
            <FeatureRow text="AI Health Chatbot (1 message limit)" active={false} />
          </View>

          <TouchableOpacity
            style={[styles.planBtn, styles.currentPlanBtn]}
            disabled={true}
          >
            <Text style={styles.currentPlanBtnText}>Current Active Plan</Text>
          </TouchableOpacity>
        </View>

        {/* PLAN 2: BASIC ($5/Mo) */}
        <View style={[styles.planCard, selectedPlan === 'BASIC' && styles.planCardSelected]}>
          <View style={styles.planHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.planName, { color: '#4A5568' }]}>Basic Plan</Text>
              <Text style={styles.planDesc}>Enhanced tracking for individuals</Text>
            </View>
            <View style={styles.priceWrap}>
              {billingCycle === 'YEARLY' ? (
                <>
                  <Text style={[styles.priceVal, { color: '#4A5568' }]}>$3.50</Text>
                  <Text style={styles.originalPrice}>$5.00</Text>
                  <Text style={styles.pricePeriod}>/month (billed $42/yr)</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.priceVal, { color: '#4A5568' }]}>$5.00</Text>
                  <Text style={styles.pricePeriod}>/month</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.featureList}>
            <FeatureRow text="10 Prescription Scans / Month" active />
            <FeatureRow text="10 Lab Report Scans / Month" active />
            <FeatureRow text="Active Medicine Reminders" active />
            <FeatureRow text="Prescription Document History" active />
            <FeatureRow text="Unlimited Manual Appointments" active />
            <FeatureRow text="Voice Appointment Bookings" active />
            <FeatureRow text="AI Chatbot (20 messages / Month)" active />
          </View>

          <TouchableOpacity
            style={[styles.planBtn, styles.basicBtn]}
            onPress={() => {
              setSelectedPlan('BASIC');
              handleSelectPlan('Basic', billingCycle === 'YEARLY' ? '$42.00/year' : '$5.00/month');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.basicBtnText}>Choose Basic Plan</Text>
          </TouchableOpacity>
        </View>

        {/* PLAN 3: PREMIUM ($10/Mo ⭐ RECOMMENDED) */}
        <View style={[styles.planCard, styles.proCard, selectedPlan === 'PREMIUM' && styles.planCardSelected]}>
          {/* Recommended Tag */}
          <View style={styles.popularBadge}>
            <MaterialCommunityIcons name="star" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.popularText}>RECOMMENDED</Text>
          </View>

          <View style={styles.planHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.planName, { color: '#4F46E5' }]}>Premium Plan</Text>
              <Text style={styles.planDesc}>Full diagnostic OCR & advanced AI</Text>
            </View>
            <View style={styles.priceWrap}>
              {billingCycle === 'YEARLY' ? (
                <>
                  <Text style={[styles.priceVal, { color: '#4F46E5' }]}>$7.00</Text>
                  <Text style={styles.originalPrice}>$10.00</Text>
                  <Text style={styles.pricePeriod}>/month (billed $84/yr)</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.priceVal, { color: '#4F46E5' }]}>$10.00</Text>
                  <Text style={styles.pricePeriod}>/month</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.featureList}>
            <FeatureRow text="30 Prescription Scans / Month" active />
            <FeatureRow text="30 Lab Report Scans / Month" active />
            <FeatureRow text="Active Medicine Reminders" active />
            <FeatureRow text="Prescription Document History" active />
            <FeatureRow text="Unlimited Manual Appointments" active />
            <FeatureRow text="Voice Appointment Bookings" active />
            <FeatureRow text="AI Chatbot (30 messages / Month)" active />
          </View>

          <TouchableOpacity
            style={[styles.planBtn, styles.proBtn]}
            onPress={() => {
              setSelectedPlan('PREMIUM');
              handleSelectPlan('Premium', billingCycle === 'YEARLY' ? '$84.00/year' : '$10.00/month');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.proBtnText}>Upgrade to Premium</Text>
            <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* Guarantee Info */}
        <View style={styles.guaranteeRow}>
          <MaterialCommunityIcons name="shield-check" size={18} color="#059669" style={{ marginRight: 8 }} />
          <Text style={styles.guaranteeText}>7-Day Money-Back Guarantee • Cancel Anytime</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({ text, active }: { text: string; active: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Feather
        name={active ? 'check-circle' : 'x-circle'}
        size={16}
        color={active ? '#10B981' : '#CBD5E0'}
        style={{ marginRight: 10 }}
      />
      <Text style={[styles.featureText, !active && styles.featureTextDisabled]}>{text}</Text>
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
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C' },
  scroll: { paddingHorizontal: 18, paddingTop: 16 },

  // Hero
  heroBanner: { alignItems: 'center', marginBottom: 20, paddingHorizontal: 10 },
  crownCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#1A202C', textAlign: 'center' },
  heroSub: { fontSize: 13, color: '#718096', textAlign: 'center', marginTop: 4, lineHeight: 20 },

  // Billing Toggle
  billingToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  billingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  billingBtnActive: { backgroundColor: '#4F46E5' },
  billingText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
  billingTextActive: { color: '#FFFFFF' },
  saveBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  saveBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },

  // Plan Cards
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
  },
  proCard: { borderColor: '#4F46E5', backgroundColor: '#FAFAFF' },
  planCardSelected: { shadowOpacity: 0.12, shadowRadius: 14, elevation: 5, borderColor: '#6366F1' },

  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { fontSize: 17, fontWeight: '800', color: '#1A202C' },
  planDesc: { fontSize: 11, color: '#718096', marginTop: 2, maxWidth: '65%' },
  priceWrap: { alignItems: 'flex-end', minWidth: '35%' },
  priceVal: { fontSize: 24, fontWeight: '900', color: '#1A202C' },
  originalPrice: { fontSize: 12, color: '#A0AEC0', textDecorationLine: 'line-through', marginTop: 2 },
  pricePeriod: { fontSize: 10, color: '#718096', marginTop: 2, textAlign: 'right' },

  divider: { height: 1, backgroundColor: '#F0F0F8', marginVertical: 16 },

  featureList: { gap: 10, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureText: { fontSize: 13, color: '#2D3748', fontWeight: '600' },
  featureTextDisabled: { color: '#CBD5E0', textDecorationLine: 'line-through' },

  planBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  currentPlanBtn: { backgroundColor: '#F1F5F9' },
  currentPlanBtnText: { color: '#718096', fontSize: 14, fontWeight: '700' },

  basicBtn: {
    backgroundColor: '#4A5568',
  },
  basicBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  proBtn: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  proBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  guaranteeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  guaranteeText: { fontSize: 12, color: '#059669', fontWeight: '600' },
});
