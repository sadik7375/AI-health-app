import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Modal,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { healthStore } from '../store/healthStore';
import { apiAppointments, apiLabReports } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
type RoutePropType = RouteProp<RootStackParamList, 'Dashboard'>;

const { width, height } = Dimensions.get('window');

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

type TabType = 'Home' | 'Medications' | 'Records' | 'Profile';

export default function DashboardScreen({ navigation, route }: Props) {
  const { user, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabType>('Home');
  const [showAddModal, setShowAddModal] = useState(false);

  // Sub-tabs for Prescription History (Records tab)
  const [recordsSubTab, setRecordsSubTab] = useState<'All' | 'WithReminders' | 'SavedOnly' | 'Completed'>('All');

  // Dynamic store data
  const [prescriptions, setPrescriptions] = useState(healthStore.getPrescriptions());
  const [reminders, setReminders] = useState(healthStore.getReminders());
  const [labReports, setLabReports] = useState(healthStore.getLabReports());

  // API data
  const [appointmentsCount, setAppointmentsCount] = useState<number>(0);
  const [reportsCount, setReportsCount] = useState<number>(0);
  const [apiLoading, setApiLoading] = useState(true);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Manual add medicine modal
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [manualMedName, setManualMedName] = useState('');
  const [manualMedDosage, setManualMedDosage] = useState('');
  const [manualMedTime, setManualMedTime] = useState('');
  const [manualMedDate, setManualMedDate] = useState('');

  // Date and Time Pickers for Modals
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerHour, setPickerHour] = useState('10');
  const [pickerMin, setPickerMin] = useState('00');
  const [pickerAmPm, setPickerAmPm] = useState('AM');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDay, setPickerDay] = useState(new Date().getDate());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // Subscribe to health store updates
  useEffect(() => {
    const unsubscribe = healthStore.subscribe(() => {
      setPrescriptions([...healthStore.getPrescriptions()]);
      setReminders([...healthStore.getReminders()]);
      setLabReports([...healthStore.getLabReports()]);
    });
    return unsubscribe;
  }, []);

  // Fetch API overview counts
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [apptRes, labRes] = await Promise.all([
          apiAppointments.getAll().catch(() => null),
          apiLabReports.getAll().catch(() => null),
        ]);
        if (!mounted) return;
        if (apptRes && apptRes.data) setAppointmentsCount(apptRes.data.length);
        if (labRes  && labRes.data)  setReportsCount(labRes.data.length);
      } catch (_) {
        // API not ready yet — show 0
      } finally {
        if (mounted) setApiLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Listen to incoming route params (e.g. from reminder creation screens)
  useEffect(() => {
    if (route?.params && (route.params as any).showToast) {
      setToastMessage((route.params as any).toastMessage);
      setShowToast(true);
      
      if ((route.params as any).activeTab) {
        setCurrentTab((route.params as any).activeTab);
      }

      // Reset routing parameters so toast is not shown repeatedly
      navigation.setParams({ showToast: false, toastMessage: undefined, activeTab: undefined } as any);

      const timer = setTimeout(() => {
        setShowToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [route?.params]);

  // Greeting based on time of day
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };
  const firstName = user?.name?.split(' ')[0] ?? 'User';

  // Add Action Handler
  const handleAddOption = (option: string) => {
    setShowAddModal(false);
    if (option === 'Scan Prescription') {
      navigation.navigate('ScanPrescription');
    } else if (option === 'Add Reminder') {
      setCurrentTab('Medications');
    } else if (option === 'Doctor Appointment' || option === 'Book Appointment' || option === 'Appointments') {
      navigation.navigate('Appointments');
    } else if (option === 'Lab Report' || option === 'Lab Report Upload' || option === 'Upload Lab Report') {
      navigation.navigate('LabReport');
    } else if (option === 'Reports' || option === 'Health Report' || option === 'Analytics Report') {
      navigation.navigate('HealthAnalyticsReport');
    } else if (option === 'AI Health Assistant' || option === 'AI Assistant' || option === 'Chatbot') {
      navigation.navigate('AIHealthAssistant');
    } else {
      alert(`${option} clicked!`);
    }
  };

  // Render Home Tab
  const renderHome = () => {
    const nextReminder = reminders.find(r => !r.taken) || reminders[0];
    const dueCount = reminders.filter(r => !r.taken).length.toString();
    const prescCount = prescriptions.length.toString();

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Next Medicine Card */}
        <View style={styles.nextMedContainer}>
          {nextReminder ? (
            <LinearGradient
              colors={['#4F46E5', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextMedCard}
            >
              <View style={styles.nextMedRow}>
                {/* Alarm Icon */}
                <View style={styles.alarmIconBg}>
                  <Feather name="clock" size={26} color="#4F46E5" />
                </View>

                {/* Medicine details */}
                <View style={styles.medDetails}>
                  <Text style={styles.nextMedLabel}>Next Medicine</Text>
                  <Text style={styles.medName}>{nextReminder.name}</Text>
                  <Text style={styles.medInstructions}>{nextReminder.dosage}</Text>
                </View>

                {/* Time and Action */}
                <View style={styles.timeActionCol}>
                  <View style={styles.timeBadge}>
                    <Feather name="clock" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.timeText}>{nextReminder.time}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.takenBtn, nextReminder.taken && styles.takenBtnActive]}
                    onPress={() => healthStore.toggleReminderTaken(nextReminder.id)}
                    activeOpacity={0.8}
                  >
                    {nextReminder.taken ? (
                      <View style={styles.takenRow}>
                        <Feather name="check" size={14} color="#10B981" />
                        <Text style={[styles.takenText, { color: '#10B981' }]}> Taken</Text>
                      </View>
                    ) : (
                      <View style={styles.takenRow}>
                        <Feather name="check" size={14} color="#4F46E5" />
                        <Text style={styles.takenText}> Mark as Taken</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={['#805AD5', '#B794F4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextMedCard}
            >
              <View style={styles.nextMedRow}>
                <View style={styles.alarmIconBg}>
                  <MaterialCommunityIcons name="bell-off-outline" size={26} color="#805AD5" />
                </View>
                <View style={[styles.medDetails, { flex: 1 }]}>
                  <Text style={styles.nextMedLabel}>No Active Reminders</Text>
                  <Text style={styles.medName}>Scan to start tracking</Text>
                  <Text style={styles.medInstructions}>Upload your prescription now</Text>
                </View>
                <TouchableOpacity
                  style={[styles.takenBtn, { backgroundColor: '#FFFFFF', paddingHorizontal: 12 }]}
                  onPress={() => navigation.navigate('ScanPrescription')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.takenText, { color: '#805AD5', fontWeight: '700' }]}>Scan Now</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Grid of 6 items */}
        <View style={styles.quickActionsGrid}>
          <QuickActionButton
            icon={<MaterialCommunityIcons name="qrcode-scan" size={24} color="#6C5CE7" />}
            label="AI Prescription Scanner"
            bgColor="#F3E8FF"
            onPress={() => navigation.navigate('ScanPrescription')}
          />
          <QuickActionButton
            icon={<MaterialCommunityIcons name="pill" size={24} color="#10B981" />}
            label="Medicine Reminder"
            bgColor="#ECFDF5"
            onPress={() => setCurrentTab('Medications')}
          />
          <QuickActionButton
            icon={<Feather name="file-text" size={24} color="#3B82F6" />}
            label="Prescription History"
            bgColor="#EFF6FF"
            onPress={() => setCurrentTab('Records')}
          />
          <QuickActionButton
            icon={<MaterialCommunityIcons name="beaker-outline" size={24} color="#F59E0B" />}
            label="Lab Report Upload"
            bgColor="#FEF3C7"
            onPress={() => handleAddOption('Lab Report Upload')}
          />
          <QuickActionButton
            icon={<FontAwesome name="user-md" size={24} color="#EF4444" />}
            label="Doctor Appointment"
            bgColor="#FEE2E2"
            onPress={() => handleAddOption('Doctor Appointment')}
          />
          <QuickActionButton
            icon={<MaterialCommunityIcons name="robot" size={24} color="#6366F1" />}
            label="AI Health Assistant"
            bgColor="#EEF2F6"
            onPress={() => handleAddOption('AI Health Assistant')}
          />
        </View>

        {/* Today's Overview */}
        <Text style={[styles.sectionTitle, { marginHorizontal: 20, marginTop: 24, marginBottom: 12 }]}>
          Today's Overview
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.overviewScroll}
        >
          <OverviewCard
            icon={<MaterialCommunityIcons name="pill" size={20} color="#6C5CE7" />}
            title="Medicines Due"
            value={dueCount}
            bgColor="#FAF5FF"
            textColor="#6C5CE7"
            onPress={() => setCurrentTab('Medications')}
          />
          <OverviewCard
            icon={<Feather name="calendar" size={20} color="#10B981" />}
            title="Appointments"
            value="1"
            bgColor="#ECFDF5"
            textColor="#10B981"
            onPress={() => handleAddOption('Appointments')}
          />
          <OverviewCard
            icon={<MaterialCommunityIcons name="beaker-outline" size={20} color="#3B82F6" />}
            title="Reports"
            value="2"
            bgColor="#EFF6FF"
            textColor="#3B82F6"
            onPress={() => navigation.navigate('HealthAnalyticsReport')}
          />
          <OverviewCard
            icon={<Feather name="file-text" size={20} color="#F59E0B" />}
            title="Prescriptions"
            value={prescCount}
            bgColor="#FEF3C7"
            textColor="#F59E0B"
            onPress={() => setCurrentTab('Records')}
          />
        </ScrollView>

        {/* Appointment and Lab Reports Split Row */}
        <View style={styles.splitRow}>
          {/* Upcoming Appointment */}
          <View style={styles.splitCol}>
            <View style={styles.sectionHeaderSmall}>
              <Text style={styles.sectionTitleSmall}>Upcoming Appointment</Text>
            </View>
            <View style={styles.appointmentCard}>
              <View style={styles.dateBlock}>
                <Text style={styles.dateMonth}>MAY</Text>
                <Text style={styles.dateDay}>20</Text>
                <Text style={styles.dateWeek}>Tue</Text>
              </View>
              <View style={styles.appointmentDetails}>
                <Text style={styles.docName}>Dr. Sarah Johnson</Text>
                <Text style={styles.docSpec}>Cardiologist</Text>
                
                <View style={styles.infoRowSmall}>
                  <Feather name="map-pin" size={11} color="#718096" style={{ marginRight: 4 }} />
                  <Text style={styles.infoTextSmall}>City Medical</Text>
                </View>

                <View style={styles.infoRowSmall}>
                  <Feather name="clock" size={11} color="#718096" style={{ marginRight: 4 }} />
                  <Text style={styles.infoTextSmall}>10:30 AM</Text>
                </View>

                <View style={styles.badgeGreen}>
                  <Text style={styles.badgeGreenText}>In 2 days</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Recent Lab Reports */}
          <View style={styles.splitCol}>
            <View style={styles.sectionHeaderSmall}>
              <Text style={styles.sectionTitleSmall}>Recent Lab Reports</Text>
            </View>
            <View style={styles.reportsCard}>
              {labReports.length > 0 ? (
                labReports.slice(0, 3).map((rep) => (
                  <TouchableOpacity 
                    key={rep.id} 
                    onPress={() => navigation.navigate('LabReport')}
                    activeOpacity={0.8}
                  >
                    <ReportItem 
                      title={rep.name} 
                      date={rep.date} 
                      status={rep.status} 
                    />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#718096' }}>No lab reports uploaded yet.</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* AI Health Assistant Banner */}
        <View style={styles.assistantBannerContainer}>
          <View style={styles.assistantBanner}>
            <View style={styles.botIconWrapper}>
              <MaterialCommunityIcons name="robot" size={28} color="#4F46E5" />
              <View style={styles.botPulse} />
            </View>
            <View style={styles.assistantDetails}>
              <View style={styles.botTitleRow}>
                <Text style={styles.botTitle}>AI Health Assistant</Text>
                <View style={styles.betaBadge}>
                  <Text style={styles.betaText}>BETA</Text>
                </View>
              </View>
              <Text style={styles.botDesc}>
                Ask me about your medicines, reports, appointments or any health queries.
              </Text>
            </View>
            <TouchableOpacity style={styles.botStartBtn} activeOpacity={0.8} onPress={() => handleAddOption('AI Chat')}>
              <Text style={styles.botStartBtnText}>Start Chat</Text>
              <Feather name="chevron-right" size={14} color="#4F46E5" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Extra space */}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  // Render Medications Tab
  const renderMedications = () => {
    // Group reminders by prescriptionId → doctor name
    const grouped: { doctorLabel: string; prescriptionId: string | undefined; items: typeof reminders }[] = [];

    const manualReminders = reminders.filter(r => !r.prescriptionId);
    const prescriptionReminders = reminders.filter(r => !!r.prescriptionId);

    // Group by prescriptionId
    const seen = new Set<string>();
    prescriptionReminders.forEach(r => {
      const pid = r.prescriptionId!;
      if (!seen.has(pid)) {
        seen.add(pid);
        const presc = prescriptions.find(p => p.id === pid);
        grouped.push({
          doctorLabel: presc ? `${presc.doctor} (${presc.date})` : 'Unknown Doctor',
          prescriptionId: pid,
          items: prescriptionReminders.filter(x => x.prescriptionId === pid),
        });
      }
    });

    if (manualReminders.length > 0) {
      grouped.push({
        doctorLabel: 'Manually Added',
        prescriptionId: undefined,
        items: manualReminders,
      });
    }

    const handleSaveManualMed = () => {
      if (!manualMedName.trim()) return;
      healthStore.addManualReminder({
        name: manualMedName.trim(),
        dosage: manualMedDosage.trim() || '1 tablet',
        time: manualMedTime.trim() || 'As Needed',
        date: manualMedDate.trim() || undefined,
      });
      setManualMedName('');
      setManualMedDosage('');
      setManualMedTime('');
      setManualMedDate('');
      setShowManualAddModal(false);
    };

    return (
      <>
        <ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Row */}
          <View style={styles.medTabHeader}>
            <View>
              <Text style={styles.tabTitle}>My Medications</Text>
              <Text style={styles.tabSubtitle}>Reminders grouped by doctor</Text>
            </View>
          </View>

          {grouped.length > 0 ? (
            grouped.map((group, gi) => (
              <View key={group.prescriptionId ?? 'manual'} style={styles.prescriptionGroup}>
                {/* Doctor Name Header */}
                <View style={styles.doctorGroupHeader}>
                  <View style={styles.doctorIconBg}>
                    <FontAwesome name="user-md" size={14} color="#4F46E5" />
                  </View>
                  <Text style={styles.doctorGroupLabel}>{group.doctorLabel}</Text>
                  <Text style={styles.groupMedCount}>{group.items.length} medicine{group.items.length !== 1 ? 's' : ''}</Text>
                </View>

                {/* Medicine Items */}
                {group.items.map((rem) => (
                  <MedicationListItem
                    key={rem.id}
                    name={rem.name}
                    dosage={rem.dosage}
                    time={rem.time}
                    taken={rem.taken}
                    slot={rem.slot}
                    date={rem.date}
                    onToggle={() => healthStore.toggleReminderTaken(rem.id)}
                    onDelete={() => {
                      Alert.alert(
                        'Delete Reminder',
                        'Are you sure you want to delete this medicine reminder?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => healthStore.deleteReminder(rem.id) }
                        ]
                      );
                    }}
                  />
                ))}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="pill-off" size={48} color="#A0AEC0" />
              <Text style={styles.emptyStateTitle}>No active reminders</Text>
              <Text style={styles.emptyStateText}>Scan a prescription or add a medicine manually.</Text>
              <TouchableOpacity
                style={styles.emptyStateBtn}
                onPress={() => navigation.navigate('ScanPrescription')}
              >
                <Text style={styles.emptyStateBtnText}>Scan Prescription</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Manual Add Medicine Modal */}
        <Modal
          visible={showManualAddModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowManualAddModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowManualAddModal(false)}
            >
              <TouchableOpacity activeOpacity={1} style={{ width: '100%', alignItems: 'center' }}>
                <View style={styles.manualModalContent}>
                  <View style={styles.modalBar} />
                  <Text style={styles.modalTitle}>Add Medicine Manually</Text>
                  <Text style={styles.manualModalSubtitle}>Add a medicine without a prescription</Text>

                  <Text style={styles.manualInputLabel}>Medicine Name *</Text>
                  <View style={styles.manualInputWrapper}>
                    <MaterialCommunityIcons name="pill" size={18} color="#6C5CE7" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.manualInput}
                      placeholder="e.g. Napa 500mg"
                      placeholderTextColor="#A9A9C8"
                      value={manualMedName}
                      onChangeText={setManualMedName}
                    />
                  </View>

                  <Text style={styles.manualInputLabel}>Dosage</Text>
                  <View style={styles.manualInputWrapper}>
                    <Feather name="activity" size={18} color="#6C5CE7" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.manualInput}
                      placeholder="e.g. 1 tablet after meal"
                      placeholderTextColor="#A9A9C8"
                      value={manualMedDosage}
                      onChangeText={setManualMedDosage}
                    />
                  </View>

                  <Text style={styles.manualInputLabel}>Time *</Text>
                  <TouchableOpacity
                    style={styles.manualInputWrapper}
                    activeOpacity={0.8}
                    onPress={() => {
                      // Set default temp values
                      if (manualMedTime) {
                        const pts = manualMedTime.split(' ');
                        if (pts.length === 2) {
                          const hm = pts[0].split(':');
                          if (hm.length === 2) {
                            setPickerHour(hm[0]);
                            setPickerMin(hm[1]);
                          }
                          setPickerAmPm(pts[1]);
                        }
                      }
                      setShowTimePicker(true);
                    }}
                  >
                    <Feather name="clock" size={18} color="#6C5CE7" style={{ marginRight: 8 }} />
                    <Text style={{ flex: 1, fontSize: 14, color: manualMedTime ? '#1A202C' : '#A9A9C8' }}>
                      {manualMedTime || 'Select Time (e.g. 08:00 AM)'}
                    </Text>
                    <Feather name="chevron-down" size={16} color="#A0AEC0" />
                  </TouchableOpacity>

                  <Text style={styles.manualInputLabel}>Custom Date (Optional)</Text>
                  <TouchableOpacity
                    style={styles.manualInputWrapper}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (manualMedDate) {
                        const parts = manualMedDate.split('-');
                        if (parts.length === 3) {
                          setPickerYear(parseInt(parts[0], 10));
                          setPickerMonth(parseInt(parts[1], 10));
                          setPickerDay(parseInt(parts[2], 10));
                        }
                      }
                      setShowDatePicker(true);
                    }}
                  >
                    <Feather name="calendar" size={18} color="#6C5CE7" style={{ marginRight: 8 }} />
                    <Text style={{ flex: 1, fontSize: 14, color: manualMedDate ? '#1A202C' : '#A9A9C8' }}>
                      {manualMedDate ? new Date(manualMedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Leave blank for today'}
                    </Text>
                    <Feather name="chevron-down" size={16} color="#A0AEC0" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.manualSaveBtn, !manualMedName.trim() && { opacity: 0.5 }]}
                    activeOpacity={0.85}
                    onPress={handleSaveManualMed}
                    disabled={!manualMedName.trim()}
                  >
                    <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.manualSaveBtnText}>Save Medicine</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>


        {/* Time Picker Modal Sheet */}
        <Modal
          visible={showTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: 400 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A202C' }}>Select Reminder Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Feather name="x" size={20} color="#718096" />
                </TouchableOpacity>
              </View>

              {/* Hour / Minute / AM-PM Wheels */}
              <View style={{ flexDirection: 'row', gap: 12, height: 200 }}>
                {/* Hour */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#718096', marginBottom: 8 }}>Hour</Text>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(h => (
                      <TouchableOpacity
                        key={h}
                        style={{ paddingVertical: 8, width: '100%', alignItems: 'center', backgroundColor: pickerHour === h ? '#EEF2FF' : 'transparent', borderRadius: 8 }}
                        onPress={() => setPickerHour(h)}
                      >
                        <Text style={{ fontSize: 16, fontWeight: pickerHour === h ? '700' : '500', color: pickerHour === h ? '#4F46E5' : '#4A5568' }}>{h}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Minute */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#718096', marginBottom: 8 }}>Minute</Text>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                      <TouchableOpacity
                        key={m}
                        style={{ paddingVertical: 8, width: '100%', alignItems: 'center', backgroundColor: pickerMin === m ? '#EEF2FF' : 'transparent', borderRadius: 8 }}
                        onPress={() => setPickerMin(m)}
                      >
                        <Text style={{ fontSize: 16, fontWeight: pickerMin === m ? '700' : '500', color: pickerMin === m ? '#4F46E5' : '#4A5568' }}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* AM/PM */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#718096', marginBottom: 8 }}>Period</Text>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    {['AM', 'PM'].map(p => (
                      <TouchableOpacity
                        key={p}
                        style={{ paddingVertical: 10, width: '100%', alignItems: 'center', backgroundColor: pickerAmPm === p ? '#EEF2FF' : 'transparent', borderRadius: 8 }}
                        onPress={() => setPickerAmPm(p)}
                      >
                        <Text style={{ fontSize: 16, fontWeight: pickerAmPm === p ? '700' : '500', color: pickerAmPm === p ? '#4F46E5' : '#4A5568' }}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Confirm */}
              <TouchableOpacity
                style={{ backgroundColor: '#4F46E5', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 16 }}
                onPress={() => {
                  const finalTime = `${pickerHour}:${pickerMin} ${pickerAmPm}`;
                  setManualMedTime(finalTime);
                  setShowTimePicker(false);
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Confirm Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Date Picker Modal Sheet */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: 400 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A202C' }}>Select Custom Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Feather name="x" size={20} color="#718096" />
                </TouchableOpacity>
              </View>

              {/* Day / Month / Year Wheels */}
              <View style={{ flexDirection: 'row', gap: 12, height: 200 }}>
                {/* Day */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#718096', marginBottom: 8 }}>Day</Text>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <TouchableOpacity
                        key={d}
                        style={{ paddingVertical: 8, width: '100%', alignItems: 'center', backgroundColor: pickerDay === d ? '#EEF2FF' : 'transparent', borderRadius: 8 }}
                        onPress={() => setPickerDay(d)}
                      >
                        <Text style={{ fontSize: 16, fontWeight: pickerDay === d ? '700' : '500', color: pickerDay === d ? '#4F46E5' : '#4A5568' }}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Month */}
                <View style={{ flex: 1.5, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#718096', marginBottom: 8 }}>Month</Text>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => {
                      const val = idx + 1;
                      return (
                        <TouchableOpacity
                          key={val}
                          style={{ paddingVertical: 8, width: '100%', alignItems: 'center', backgroundColor: pickerMonth === val ? '#EEF2FF' : 'transparent', borderRadius: 8 }}
                          onPress={() => setPickerMonth(val)}
                        >
                          <Text style={{ fontSize: 15, fontWeight: pickerMonth === val ? '700' : '500', color: pickerMonth === val ? '#4F46E5' : '#4A5568' }}>{m}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Year */}
                <View style={{ flex: 1.2, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#718096', marginBottom: 8 }}>Year</Text>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                    {Array.from({ length: 10 }, (_, i) => 2026 - i).map(y => (
                      <TouchableOpacity
                        key={y}
                        style={{ paddingVertical: 8, width: '100%', alignItems: 'center', backgroundColor: pickerYear === y ? '#EEF2FF' : 'transparent', borderRadius: 8 }}
                        onPress={() => setPickerYear(y)}
                      >
                        <Text style={{ fontSize: 16, fontWeight: pickerYear === y ? '700' : '500', color: pickerYear === y ? '#4F46E5' : '#4A5568' }}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Confirm */}
              <TouchableOpacity
                style={{ backgroundColor: '#4F46E5', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 16 }}
                onPress={() => {
                  const paddedMonth = pickerMonth.toString().padStart(2, '0');
                  const paddedDay = pickerDay.toString().padStart(2, '0');
                  const finalDateStr = `${pickerYear}-${paddedMonth}-${paddedDay}`;
                  setManualMedDate(finalDateStr);
                  setShowDatePicker(false);
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Confirm Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  };

  // Render Records Tab
  const renderRecords = () => {
    // Filter prescriptions by recordsSubTab
    const filtered = prescriptions.filter(p => {
      if (recordsSubTab === 'WithReminders') return p.status === 'Reminder Active';
      if (recordsSubTab === 'SavedOnly') return p.status === 'Saved Only';
      if (recordsSubTab === 'Completed') return p.status === 'Completed';
      return true; // 'All'
    });

    return (
      <ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.recordsHeader}>
          <Text style={styles.tabTitle}>Prescription History</Text>
          <TouchableOpacity 
            style={styles.uploadBtnSmall} 
            onPress={() => navigation.navigate('ScanPrescription')}
          >
            <Feather name="plus" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.uploadBtnSmallText}>Scan</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.tabSubtitle}>All your extracted medical records and prescription documents</Text>

        {/* Sub-tabs Row */}
        <View style={styles.subTabsContainer}>
          <TouchableOpacity
            style={[styles.subTabBtn, recordsSubTab === 'All' && styles.subTabBtnActive]}
            onPress={() => setRecordsSubTab('All')}
          >
            <Text style={[styles.subTabLabel, recordsSubTab === 'All' && styles.subTabLabelActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTabBtn, recordsSubTab === 'WithReminders' && styles.subTabBtnActive]}
            onPress={() => setRecordsSubTab('WithReminders')}
          >
            <Text style={[styles.subTabLabel, recordsSubTab === 'WithReminders' && styles.subTabLabelActive]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTabBtn, recordsSubTab === 'SavedOnly' && styles.subTabBtnActive]}
            onPress={() => setRecordsSubTab('SavedOnly')}
          >
            <Text style={[styles.subTabLabel, recordsSubTab === 'SavedOnly' && styles.subTabLabelActive]}>Saved Only</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTabBtn, recordsSubTab === 'Completed' && styles.subTabBtnActive]}
            onPress={() => setRecordsSubTab('Completed')}
          >
            <Text style={[styles.subTabLabel, recordsSubTab === 'Completed' && styles.subTabLabelActive]}>Completed</Text>
          </TouchableOpacity>
        </View>

        {filtered.length > 0 ? (
          filtered.map((presc) => {
            const isSaved = presc.status === 'Saved Only';
            const isActive = presc.status === 'Reminder Active';
            const isDone = presc.status === 'Completed';

            let badgeStyle = styles.badgeOrange;
            let badgeText = presc.status;
            if (isActive) {
              badgeStyle = styles.badgeGreenSmall;
            } else if (isDone) {
              badgeStyle = styles.badgeGrey;
            }

            return (
              <TouchableOpacity
                key={presc.id}
                style={styles.prescriptionCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('PrescriptionDetails', { prescriptionId: presc.id })}
              >
                <View style={styles.prescLeft}>
                  <View style={styles.prescIconBg}>
                    <MaterialCommunityIcons name="file-document" size={24} color="#4F46E5" />
                  </View>
                  <View style={styles.prescInfo}>
                    <Text style={styles.prescDate}>{presc.date}</Text>
                    <Text style={styles.prescDoctor}>{presc.doctor}</Text>
                    <Text style={styles.prescClinic}>{presc.clinic} • {presc.medicines.length} Medicines</Text>
                  </View>
                </View>
                <View style={[badgeStyle, { alignSelf: 'center' }]}>
                  <Text style={isActive ? styles.badgeGreenTextSmall : isDone ? styles.badgeGreyText : styles.badgeOrangeText}>
                    {badgeText}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-document-outline" size={48} color="#A0AEC0" />
            <Text style={styles.emptyStateTitle}>No prescriptions found</Text>
            <Text style={styles.emptyStateText}>Prescriptions you scan will show up here.</Text>
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    );
  };

  // Render Profile Tab
  const renderProfile = () => (
    <ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
        </View>
        <Text style={styles.profileNameLarge}>{user?.name ?? 'User'}</Text>
        <Text style={styles.profileBio}>{user?.email ?? ''}</Text>

        <View style={styles.statsRow}>
          <ProfileStat label="Blood" value={user?.blood_type ?? '—'} />
          <ProfileStat label="Weight" value={user?.weight ? `${user.weight} kg` : '—'} />
          <ProfileStat label="Plan" value={user?.plan_tier ?? 'Free'} />
        </View>
      </View>

      <View style={styles.profileMenu}>
        <ProfileMenuItem
          icon={<Feather name="user" size={20} color="#4F46E5" />}
          label="Personal Information"
          onPress={() => navigation.navigate('PersonalInfo')}
        />
        <ProfileMenuItem
          icon={<Feather name="shield" size={20} color="#059669" />}
          label="Security & Privacy"
          onPress={() => navigation.navigate('SecurityPrivacy')}
        />
        <ProfileMenuItem
          icon={<Feather name="bell" size={20} color="#D97706" />}
          label="Notifications Settings"
          onPress={() => navigation.navigate('NotificationSettings')}
        />
        <ProfileMenuItem
          icon={<MaterialCommunityIcons name="crown-outline" size={20} color="#D97706" />}
          label="Upgrade Plan"
          onPress={() => navigation.navigate('UpgradePlan')}
        />
        <ProfileMenuItem
          icon={<Feather name="help-circle" size={20} color="#8B5CF6" />}
          label="Help & Support"
          onPress={() => navigation.navigate('HelpSupport')}
        />
        <TouchableOpacity
          style={styles.logoutRow}
          activeOpacity={0.7}
          onPress={async () => {
            await logout();
            // AppNavigator will auto-switch to GuestNavigator when isAuthenticated becomes false
          }}
        >
          <Feather name="log-out" size={20} color="#E53E3E" style={{ marginRight: 12 }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 120 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header (Top Row) */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, styles.avatarHeaderCircle]}>
            <Text style={styles.avatarHeaderInitial}>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
          </View>
          <View style={styles.headerGreeting}>
            <Text style={styles.greetingText}>{getGreeting()}, 👋</Text>
            <Text style={styles.profileName}>{firstName}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Feather name="search" size={22} color="#1A202C" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Feather name="bell" size={22} color="#1A202C" />
            <View style={styles.redDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Contents */}
      {currentTab === 'Home' && renderHome()}
      {currentTab === 'Medications' && renderMedications()}
      {currentTab === 'Records' && renderRecords()}
      {currentTab === 'Profile' && renderProfile()}

      {/* Floating Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('Home')}
          activeOpacity={0.8}
        >
          <Feather
            name="home"
            size={22}
            color={currentTab === 'Home' ? '#4F46E5' : '#A0AEC0'}
          />
          <Text style={[styles.tabLabel, { color: currentTab === 'Home' ? '#4F46E5' : '#A0AEC0' }]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('Medications')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="pill"
            size={22}
            color={currentTab === 'Medications' ? '#4F46E5' : '#A0AEC0'}
          />
          <Text style={[styles.tabLabel, { color: currentTab === 'Medications' ? '#4F46E5' : '#A0AEC0' }]}>
            Medications
          </Text>
        </TouchableOpacity>

        {/* Center Plus Button */}
        <View style={styles.plusBtnContainer}>
          <TouchableOpacity
            style={styles.plusBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.9}
          >
            <Feather name="plus" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('HealthAnalyticsReport')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="chart-box-outline"
            size={22}
            color="#4F46E5"
          />
          <Text style={[styles.tabLabel, { color: '#4F46E5', fontWeight: '700' }]}>
            Reports
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('Profile')}
          activeOpacity={0.8}
        >
          <Feather
            name="user"
            size={22}
            color={currentTab === 'Profile' ? '#4F46E5' : '#A0AEC0'}
          />
          <Text style={[styles.tabLabel, { color: currentTab === 'Profile' ? '#4F46E5' : '#A0AEC0' }]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Modal / Action Sheet */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalBar} />
            <Text style={styles.modalTitle}>Quick Action</Text>
            
            <ActionSheetItem
              icon={<MaterialCommunityIcons name="qrcode-scan" size={22} color="#6C5CE7" />}
              title="Scan Prescription"
              desc="Use AI to extract medications and dosages"
              onPress={() => handleAddOption('Scan Prescription')}
            />
            <ActionSheetItem
              icon={<MaterialCommunityIcons name="pill" size={22} color="#10B981" />}
              title="Add Medicine Reminder"
              desc="Set times, intervals and doses"
              onPress={() => handleAddOption('Add Reminder')}
            />
            <ActionSheetItem
              icon={<Feather name="upload" size={22} color="#3B82F6" />}
              title="Upload Lab Report"
              desc="Store PDFs, images or lab files safely"
              onPress={() => handleAddOption('Upload Report')}
            />
            <ActionSheetItem
              icon={<Feather name="calendar" size={22} color="#EF4444" />}
              title="Book Doctor Appointment"
              desc="Search doctors and schedule a visit"
              onPress={() => handleAddOption('Book Appointment')}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Toast Alert */}
      {showToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toastCard}>
            <View style={styles.toastIconBg}>
              <Feather name="check" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.toastText}>{toastMessage}</Text>
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => setShowToast(false)}
              style={{ padding: 4, marginLeft: 8 }}
            >
              <Feather name="x" size={18} color="#A0AEC0" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// Helper components
interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  onPress: () => void;
}

function QuickActionButton({ icon, label, bgColor, onPress }: QuickActionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.quickActionItem, { backgroundColor: '#FFFFFF' }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={[styles.quickActionIconWrapper, { backgroundColor: bgColor }]}>
        {icon}
      </View>
      <Text style={styles.quickActionLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

interface OverviewCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  bgColor: string;
  textColor: string;
  onPress: () => void;
}

function OverviewCard({ icon, title, value, bgColor, textColor, onPress }: OverviewCardProps) {
  return (
    <TouchableOpacity style={[styles.overviewCard, { backgroundColor: bgColor }]} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.overviewHeaderRow}>
        <View style={styles.overviewIconBg}>
          {icon}
        </View>
        <Text style={[styles.overviewTitle, { color: '#4A5568' }]}>{title}</Text>
      </View>
      <Text style={[styles.overviewValue, { color: textColor }]}>{value}</Text>
      <View style={styles.overviewFooter}>
        <Text style={[styles.overviewLink, { color: textColor }]}>View</Text>
        <Feather name="chevron-right" size={14} color={textColor} />
      </View>
    </TouchableOpacity>
  );
}

interface ReportItemProps {
  title: string;
  date: string;
  status: string;
}

function ReportItem({ title, date, status }: ReportItemProps) {
  const isHigh = status === 'High' || status === 'Critical';
  const badgeStyle = isHigh ? styles.badgeOrange : styles.badgeGreenSmall;
  const badgeText = isHigh ? styles.badgeOrangeText : styles.badgeGreenTextSmall;

  return (
    <View style={styles.reportRow}>
      <View style={styles.reportLeft}>
        <View style={styles.reportIconBg}>
          <Feather name="file-text" size={16} color="#3B82F6" />
        </View>
        <View style={styles.reportDetails}>
          <Text style={styles.reportName} numberOfLines={1}>{title}</Text>
          <Text style={styles.reportDate}>{date}</Text>
        </View>
      </View>
      <View style={badgeStyle}>
        <Text style={badgeText}>{status}</Text>
      </View>
    </View>
  );
}

interface ActionSheetItemProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onPress: () => void;
}

function ActionSheetItem({ icon, title, desc, onPress }: ActionSheetItemProps) {
  return (
    <TouchableOpacity style={styles.actionSheetItem} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.actionSheetIconWrapper}>
        {icon}
      </View>
      <View style={styles.actionSheetTextWrapper}>
        <Text style={styles.actionSheetTitle}>{title}</Text>
        <Text style={styles.actionSheetDesc}>{desc}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#A0AEC0" />
    </TouchableOpacity>
  );
}

interface MedicationListItemProps {
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  onToggle?: () => void;
  slot?: string;
  date?: string;
  onDelete?: () => void;
}

function MedicationListItem({ name, dosage, time, taken, onToggle, slot, date, onDelete }: MedicationListItemProps) {
  // Determine status label and color dynamically
  let statusLabel = taken ? 'Taken' : 'Pending';
  let statusColor = taken ? '#10B981' : '#F59E0B';

  if (!taken && date) {
    try {
      const remDate = new Date(date);
      if (!isNaN(remDate.getTime())) {
        const today = new Date();
        remDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - remDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 2) {
          statusLabel = 'Upcoming';
          statusColor = '#3B82F6';
        }
      }
    } catch (_) {}
  }

  return (
    <View style={styles.medItemCard}>
      <View style={styles.medItemHeader}>
        <View style={styles.medItemIconBg}>
          <MaterialCommunityIcons name="pill" size={24} color="#4F46E5" />
        </View>
        <View style={styles.medItemNameCol}>
          <Text style={styles.medItemName}>{name}</Text>
          <Text style={styles.medItemDosage}>{dosage}</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {slot && (
              <View style={styles.slotBadge}>
                <Text style={styles.slotBadgeText}>{slot}</Text>
              </View>
            )}
            {date && (
              <View style={[styles.slotBadge, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
                <Text style={[styles.slotBadgeText, { color: '#15803D' }]}>{date}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.medItemTimeBadge}>
          <Text style={styles.medItemTimeText}>{time}</Text>
        </View>
      </View>
      <View style={styles.medItemFooter}>
        <Text style={styles.medItemStatus}>
          Status: <Text style={{ color: statusColor, fontWeight: '700' }}>{statusLabel}</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={{ padding: 6, borderRadius: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="trash-2" size={13} color="#EF4444" />
            </TouchableOpacity>
          )}
          {onToggle && (
            <TouchableOpacity
              style={[styles.medCheckBtn, taken && styles.medCheckBtnActive]}
              onPress={onToggle}
            >
              <Feather name={taken ? "check-circle" : "circle"} size={16} color={taken ? "#FFFFFF" : "#4F46E5"} style={{ marginRight: 6 }} />
              <Text style={[styles.medCheckText, { color: taken ? "#FFFFFF" : "#4F46E5" }]}>
                {taken ? 'Taken' : 'Mark Taken'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

interface RecordListItemProps {
  title: string;
  date: string;
  size: string;
  type: string;
  status: 'Normal' | 'High';
}

function RecordListItem({ title, date, size, type, status }: RecordListItemProps) {
  const isHigh = status === 'High';
  return (
    <View style={styles.recordItemCard}>
      <View style={styles.recordLeftCol}>
        <View style={styles.recordIconBox}>
          <Feather name="file-text" size={22} color="#3B82F6" />
          <View style={styles.recordTypeTag}>
            <Text style={styles.recordTypeText}>{type}</Text>
          </View>
        </View>
        <View style={styles.recordTextInfo}>
          <Text style={styles.recordTitleText}>{title}</Text>
          <Text style={styles.recordMetaText}>{date} • {size}</Text>
        </View>
      </View>
      <View style={isHigh ? styles.badgeOrange : styles.badgeGreenSmall}>
        <Text style={isHigh ? styles.badgeOrangeText : styles.badgeGreenTextSmall}>{status}</Text>
      </View>
    </View>
  );
}

interface ProfileStatProps {
  label: string;
  value: string;
}

function ProfileStat({ label, value }: ProfileStatProps) {
  return (
    <View style={styles.profileStatItem}>
      <Text style={styles.profileStatValue}>{value}</Text>
      <Text style={styles.profileStatLabel}>{label}</Text>
    </View>
  );
}

interface ProfileMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

function ProfileMenuItem({ icon, label, onPress }: ProfileMenuItemProps) {
  return (
    <TouchableOpacity style={styles.profileMenuItem} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.profileMenuLeft}>
        <View style={styles.profileMenuIconBg}>{icon}</View>
        <Text style={styles.profileMenuText}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={16} color="#A0AEC0" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarHeaderCircle: {
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHeaderInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerGreeting: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  nextMedContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  nextMedCard: {
    borderRadius: 24,
    padding: 20,
  },
  nextMedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alarmIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  medDetails: {
    flex: 1,
  },
  nextMedLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    fontWeight: '500',
    marginBottom: 4,
  },
  medName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  medInstructions: {
    fontSize: 12,
    color: '#C7D2FE',
  },
  timeActionCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 76,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  takenBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  takenBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  takenRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  takenText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: (width - 48) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F7FAFC',
    shadowColor: '#A0AEC0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 14,
  },
  overviewScroll: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  overviewCard: {
    width: 130,
    borderRadius: 18,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewIconBg: {
    marginRight: 6,
  },
  overviewTitle: {
    fontSize: 10,
    fontWeight: '600',
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  overviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewLink: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 2,
  },
  splitRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    justifyContent: 'space-between',
  },
  splitCol: {
    width: (width - 52) / 2,
  },
  sectionHeaderSmall: {
    marginBottom: 10,
  },
  sectionTitleSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F7FAFC',
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    shadowColor: '#A0AEC0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateBlock: {
    backgroundColor: '#EEF2F6',
    borderRadius: 12,
    width: 44,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dateMonth: {
    fontSize: 8,
    fontWeight: '700',
    color: '#4F46E5',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
  },
  dateWeek: {
    fontSize: 9,
    fontWeight: '600',
    color: '#718096',
  },
  appointmentDetails: {
    flex: 1,
  },
  docName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 2,
  },
  docSpec: {
    fontSize: 10,
    color: '#718096',
    marginBottom: 6,
  },
  infoRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoTextSmall: {
    fontSize: 9,
    color: '#718096',
    fontWeight: '500',
  },
  badgeGreen: {
    backgroundColor: '#E6FDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  badgeGreenText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '700',
  },
  reportsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F7FAFC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#A0AEC0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  reportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reportIconBg: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  reportDetails: {
    flex: 1,
  },
  reportName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1A202C',
  },
  reportDate: {
    fontSize: 8,
    color: '#A0AEC0',
  },
  badgeGreenSmall: {
    backgroundColor: '#E6FDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeGreenTextSmall: {
    color: '#10B981',
    fontSize: 8,
    fontWeight: '700',
  },
  badgeOrange: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeOrangeText: {
    color: '#F59E0B',
    fontSize: 8,
    fontWeight: '700',
  },
  assistantBannerContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  assistantBanner: {
    backgroundColor: '#EEF2F6',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  botIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 12,
  },
  botPulse: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  assistantDetails: {
    flex: 1,
    marginRight: 8,
  },
  botTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  botTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A202C',
    marginRight: 6,
  },
  betaBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  betaText: {
    color: '#4F46E5',
    fontSize: 8,
    fontWeight: '800',
  },
  botDesc: {
    fontSize: 10,
    color: '#718096',
    lineHeight: 14,
  },
  botStartBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#A0AEC0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  botStartBtnText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 4,
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 14 : 0,
    shadowColor: '#1A202C',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  plusBtnContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  plusBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingTop: 12,
  },
  modalBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  actionSheetIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionSheetTextWrapper: {
    flex: 1,
  },
  actionSheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  actionSheetDesc: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
  },
  tabScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A202C',
  },
  tabSubtitle: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
    marginBottom: 24,
  },
  medItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#A0AEC0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  medItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
    paddingBottom: 12,
  },
  medItemIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medItemNameCol: {
    flex: 1,
  },
  medItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  medItemDosage: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  slotBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  slotBadgeText: {
    color: '#4F46E5',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  medItemTimeBadge: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  medItemTimeText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '700',
  },
  medItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  medItemStatus: {
    fontSize: 12,
    color: '#718096',
  },
  medCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  medCheckBtnActive: {
    backgroundColor: '#10B981',
  },
  medCheckText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uploadBtnSmall: {
    flexDirection: 'row',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  recordItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  recordLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  recordIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 12,
  },
  recordTypeTag: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  recordTypeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800',
  },
  recordTextInfo: {
    flex: 1,
  },
  recordTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  recordMetaText: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#A0AEC0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  profileLargeAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  profileNameLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A202C',
  },
  profileBio: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
    marginTop: 20,
    paddingTop: 16,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  profileStatLabel: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
  },
  profileMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 8,
  },
  profileMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  profileMenuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileMenuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileMenuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E53E3E',
  },
  prescriptionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  prescLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prescIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prescInfo: {
    flex: 1,
  },
  prescDate: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '600',
  },
  prescDoctor: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 2,
  },
  prescClinic: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  badgeGrey: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeGreyText: {
    color: '#718096',
    fontSize: 10,
    fontWeight: '700',
  },
  subTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 16,
  },
  subTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabBtnActive: {
    backgroundColor: '#E0E7FF',
    borderColor: '#4F46E5',
  },
  subTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
  },
  subTabLabelActive: {
    color: '#4F46E5',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyStateBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyStateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A202C',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  toastIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // === Medications Tab - Grouped by Doctor ===
  medTabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  manualAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  manualAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  prescriptionGroup: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  doctorGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  doctorIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorGroupLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#3730A3',
    letterSpacing: 0.1,
  },
  groupMedCount: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '600',
    backgroundColor: '#C7D2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // === Manual Add Medicine Modal ===
  manualModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  manualModalSubtitle: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 20,
    marginTop: -4,
  },
  manualInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  manualInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6FF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8E5FF',
    paddingHorizontal: 14,
    height: 50,
  },
  manualInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A202C',
  },
  manualSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    height: 52,
    marginTop: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 7,
  },
  manualSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
