import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { healthStore } from '../store/healthStore';
import { apiHealthAnalytics } from '../api/apiClient';

const { width } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList, 'HealthAnalyticsReport'>;
interface Props {
  navigation: Nav;
}

type TimeFilter = 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME';

export default function HealthAnalyticsReportScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<TimeFilter>('THIS_WEEK');
  const [loading, setLoading] = useState(true);
  const [healthScore, setHealthScore] = useState(80);
  const [adherenceRate, setAdherenceRate] = useState('100%');
  const [labNormalcy, setLabNormalcy] = useState('100%');
  const [dangerZoneItems, setDangerZoneItems] = useState<any[]>([]);
  const [missedMeds, setMissedMeds] = useState<any[]>([]);
  const [takenCount, setTakenCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);

  const scoreCategory = healthScore >= 80 ? 'Good' : healthScore >= 60 ? 'Moderate' : 'Critical';
  const scoreColor = healthScore >= 80 ? '#10B981' : healthScore >= 60 ? '#F59E0B' : '#EF4444';

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await apiHealthAnalytics.getAnalytics();
      if (res && res.success) {
        setHealthScore(res.health_score ?? 80);
        setAdherenceRate(res.adherence_rate ?? '100%');
        setLabNormalcy(res.lab_normalcy ?? '100%');
        setDangerZoneItems(res.danger_alerts ?? []);
        setMissedMeds(res.missed_doses ?? []);
        setTakenCount(res.taken_count ?? 0);
        setMissedCount(res.missed_count ?? 0);
      }
    } catch (err) {
      console.warn("Failed to fetch health analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShareReport = async () => {
    try {
      await Share.share({
        title: 'Health Executive Summary Report',
        message: `📋 CareMate AI Summary Report\nHealth Score: ${healthScore}/100 (${scoreCategory})\nMissed Doses: ${missedMeds.length}\nDanger Zone Alerts: ${dangerZoneItems.length}\n\nDownloaded via CareMate AI App.`,
      });
    } catch (_) {}
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Analytics Report</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShareReport}>
          <Feather name="share-2" size={18} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* Time Filter Tabs */}
      <View style={styles.filterRow}>
        {(['THIS_WEEK', 'THIS_MONTH', 'ALL_TIME'] as const).map((tf) => (
          <TouchableOpacity
            key={tf}
            style={[styles.filterChip, filter === tf && styles.filterChipActive]}
            onPress={() => setFilter(tf)}
          >
            <Text style={[styles.filterChipText, filter === tf && styles.filterChipTextActive]}>
              {tf === 'THIS_WEEK' ? 'This Week' : tf === 'THIS_MONTH' ? 'This Month' : 'All Time'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FF' }}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={{ fontSize: 14, color: '#718096', marginTop: 12, fontWeight: '600' }}>Loading health report analytics...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ════════════════════════════════════════════════════════
              1. OVERALL HEALTH SCORE CARD
             ════════════════════════════════════════════════════════ */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreCardHeader}>
              <View>
                <Text style={styles.scoreLabel}>OVERALL HEALTH SCORE</Text>
                <Text style={styles.scoreSubLabel}>Updated based on labs & adherence</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: scoreColor + '22' }]}>
                <Text style={[styles.statusBadgeText, { color: scoreColor }]}>{scoreCategory}</Text>
              </View>
            </View>

            <View style={styles.scoreGaugeRow}>
              {/* Big Circular Score */}
              <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                <Text style={styles.scoreValueText}>{healthScore}</Text>
                <Text style={styles.scoreMaxText}>/100</Text>
              </View>

              {/* Score Metrics Breakdown */}
              <View style={styles.scoreMetricsCol}>
                <MetricItem label="Medicine Adherence" percent={adherenceRate} color="#10B981" />
                <MetricItem label="Lab Test Normalcy" percent={labNormalcy} color="#F59E0B" />
                <MetricItem label="Vitals Stability" percent="92%" color="#3B82F6" />
              </View>
            </View>
          </View>

          {/* ════════════════════════════════════════════════════════
              2. DANGER ZONE / ATTENTION NEEDED
             ════════════════════════════════════════════════════════ */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="alert-decagram-outline" size={18} color="#EF4444" />
            </View>
            <Text style={styles.sectionTitle}>Danger Zone &amp; Risk Alerts</Text>
            <View style={styles.dangerCountBadge}>
              <Text style={styles.dangerCountText}>{dangerZoneItems.length} High Risks</Text>
            </View>
          </View>

          {dangerZoneItems.length === 0 ? (
            <View style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20 }}>
              <Feather name="shield" size={32} color="#10B981" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A202C', marginTop: 8 }}>All Vitals Clear</Text>
              <Text style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>No abnormal laboratory parameters found.</Text>
            </View>
          ) : (
            dangerZoneItems.map((item) => (
              <View key={item.id} style={styles.dangerCard}>
                <View style={styles.dangerCardTop}>
                  <View style={styles.dangerTag}>
                    <Feather name="alert-triangle" size={12} color="#EF4444" style={{ marginRight: 4 }} />
                    <Text style={styles.dangerTagText}>{item.severity}</Text>
                  </View>
                  <Text style={styles.dangerDate}>{item.date}</Text>
                </View>

                <Text style={styles.dangerTitle}>{item.title}</Text>
                <View style={styles.dangerValueRow}>
                  <Text style={styles.dangerValue}>{item.value}</Text>
                  <Text style={styles.dangerRef}>{item.ref}</Text>
                </View>

                <Text style={styles.dangerSource}>Source: {item.source}</Text>

                <View style={styles.recommendBox}>
                  <Feather name="info" size={14} color="#D97706" style={{ marginRight: 6, marginTop: 2 }} />
                  <Text style={styles.recommendText}>{item.recommendation}</Text>
                </View>
              </View>
            ))
          )}

          {/* ════════════════════════════════════════════════════════
              3. MISSED MEDICINE TRACKER
             ════════════════════════════════════════════════════════ */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="pill-off" size={18} color="#D97706" />
            </View>
            <Text style={styles.sectionTitle}>Missed Medicine Tracker</Text>
          </View>

          <View style={styles.medSummaryCard}>
            {/* Stats Bar */}
            <View style={styles.medStatsRow}>
              <View style={styles.medStatItem}>
                <Text style={[styles.medStatVal, { color: '#10B981' }]}>{takenCount}</Text>
                <Text style={styles.medStatLbl}>Taken</Text>
              </View>
              <View style={styles.medStatDivider} />
              <View style={styles.medStatItem}>
                <Text style={[styles.medStatVal, { color: '#EF4444' }]}>{missedCount}</Text>
                <Text style={styles.medStatLbl}>Missed</Text>
              </View>
              <View style={styles.medStatDivider} />
              <View style={styles.medStatItem}>
                <Text style={[styles.medStatVal, { color: '#3B82F6' }]}>{adherenceRate}</Text>
                <Text style={styles.medStatLbl}>Adherence</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.missedListTitle}>Missed Doses Details:</Text>
            {missedMeds.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Feather name="check-circle" size={24} color="#10B981" />
                <Text style={{ fontSize: 13, color: '#718096', marginTop: 6, fontWeight: '600' }}>Great job! No missed doses.</Text>
              </View>
            ) : (
              missedMeds.map((m) => (
                <View key={m.id} style={styles.missedRow}>
                  <View style={styles.missedIconBg}>
                    <Feather name="x-circle" size={16} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.missedName}>{m.name}</Text>
                    <Text style={styles.missedTime}>{m.time}</Text>
                  </View>
                  <View style={styles.reasonBadge}>
                    <Text style={styles.reasonText}>{m.reason}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* ════════════════════════════════════════════════════════
              4. QUICK ACTION & LAB SUMMARY
             ════════════════════════════════════════════════════════ */}
          <TouchableOpacity
            style={styles.labCtaBanner}
            onPress={() => navigation.navigate('LabReport')}
            activeOpacity={0.88}
          >
            <View style={styles.labCtaIconBg}>
              <MaterialCommunityIcons name="flask-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.labCtaTitle}>View All Lab Reports</Text>
              <Text style={styles.labCtaSub}>Access scanned images, OCR text &amp; export PDF</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MetricItem({ label, percent, color }: { label: string; percent: string; color: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{percent}</Text>
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
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A202C' },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Time Filter
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F8',
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F1FB',
    alignItems: 'center',
  },
  filterChipActive: { backgroundColor: '#4F46E5' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#718096' },
  filterChipTextActive: { color: '#FFFFFF' },

  scroll: { paddingHorizontal: 18, paddingTop: 18 },

  // Score Card
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  scoreCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  scoreLabel: { fontSize: 11, fontWeight: '800', color: '#718096', letterSpacing: 0.6 },
  scoreSubLabel: { fontSize: 12, color: '#A0AEC0', marginTop: 2 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '800' },

  scoreGaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  scoreCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFBFF',
  },
  scoreValueText: { fontSize: 28, fontWeight: '900', color: '#1A202C' },
  scoreMaxText: { fontSize: 11, fontWeight: '700', color: '#A0AEC0', marginTop: -4 },

  scoreMetricsCol: { flex: 1, gap: 10 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { fontSize: 12, fontWeight: '600', color: '#4A5568' },
  metricValue: { fontSize: 13, fontWeight: '800' },

  // Section Headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 6, marginLeft: 2 },
  sectionIconBg: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1A202C', flex: 1 },
  dangerCountBadge: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  dangerCountText: { fontSize: 10, fontWeight: '700', color: '#EF4444' },

  // Danger Cards
  dangerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dangerCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dangerTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  dangerTagText: { fontSize: 9, fontWeight: '800', color: '#EF4444' },
  dangerDate: { fontSize: 10, color: '#A0AEC0', fontWeight: '500' },
  dangerTitle: { fontSize: 13, fontWeight: '700', color: '#1A202C' },
  dangerValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  dangerValue: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
  dangerRef: { fontSize: 11, color: '#718096', fontWeight: '500' },
  dangerSource: { fontSize: 10, color: '#A0AEC0', marginTop: 2 },

  recommendBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  recommendText: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 16 },

  // Missed Meds Card
  medSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  medStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 6 },
  medStatItem: { alignItems: 'center' },
  medStatVal: { fontSize: 22, fontWeight: '900' },
  medStatLbl: { fontSize: 11, color: '#718096', fontWeight: '600', marginTop: 2 },
  medStatDivider: { width: 1, height: 28, backgroundColor: '#F0F0F8' },

  divider: { height: 1, backgroundColor: '#F0F0F8', marginVertical: 14 },
  missedListTitle: { fontSize: 12, fontWeight: '700', color: '#4A5568', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },

  missedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9F9FF' },
  missedIconBg: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  missedName: { fontSize: 13, fontWeight: '700', color: '#1A202C' },
  missedTime: { fontSize: 11, color: '#718096', marginTop: 1 },
  reasonBadge: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  reasonText: { fontSize: 11, color: '#4A5568', fontWeight: '600' },

  // CTA Banner
  labCtaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    gap: 14,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  labCtaIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  labCtaTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  labCtaSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
});
