import React, { useState, useEffect, useRef } from 'react';
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
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { healthStore, MedicineLogEntry } from '../store/healthStore';
import { apiAppointments, apiLabReports, apiAuth, apiProfile } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
type RoutePropType = RouteProp<RootStackParamList, 'Dashboard'>;

const { width, height } = Dimensions.get('window');

const DUMMY_REMINDERS: any[] = [
  { id: 'd1', name: 'Amoxicillin', dosage: '500mg', time: '08:00 AM', taken: false, instructions: 'Take after breakfast', slot: 'Morning', date: 'Daily', prescriptionId: undefined, type: 'daily', status: 'active' },
  { id: 'd2', name: 'Paracetamol', dosage: '650mg', time: '02:00 PM', taken: false, instructions: 'If needed for pain', slot: 'Afternoon', date: 'As needed', prescriptionId: undefined, type: 'sos', status: 'active' },
  { id: 'd3', name: 'Metformin', dosage: '500mg', time: '08:00 PM', taken: true, instructions: 'Take with dinner', slot: 'Night', date: 'Daily', prescriptionId: undefined, type: 'daily', status: 'active' },
];

const DUMMY_APPOINTMENTS = [
  {
    id: 'da1',
    doctor_name: 'Dr. Sarah Jenkins',
    specialty: 'Cardiologist',
    clinic_name: 'City Care Hospital',
    date_time: new Date(Date.now() + 86400000).toISOString(),
    status: 'Upcoming',
  },
  {
    id: 'da2',
    doctor_name: 'Dr. Michael Chen',
    specialty: 'General Physician',
    clinic_name: 'HealthPlus Clinic',
    date_time: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: 'Upcoming',
  },
];

const DUMMY_PRESCRIPTIONS = [
  {
    id: 'dp1',
    doctor: 'Dr. Sarah Jenkins',
    clinic: 'City Care Hospital',
    date: '2026-07-25',
    status: 'Reminder Active',
    medicines: [
      { name: 'Amoxicillin', dosage: '500mg', frequency: 'Daily', time: '08:00 AM' },
    ],
  },
  {
    id: 'dp2',
    doctor: 'Dr. Michael Chen',
    clinic: 'HealthPlus Clinic',
    date: '2026-07-15',
    status: 'Saved Only',
    medicines: [
      { name: 'Paracetamol', dosage: '650mg', frequency: 'As needed', time: '02:00 PM' },
    ],
  },
];

const DUMMY_LAB_REPORTS = [
  { id: 'dl1', name: 'Complete Blood Count (CBC)', date: 'Jul 20, 2026', status: 'Normal' },
  { id: 'dl2', name: 'Lipid Profile Test', date: 'Jul 10, 2026', status: 'High' },
];

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

type TabType = 'Home' | 'Medications' | 'Records' | 'Profile';

export default function DashboardScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser, isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabType>('Home');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);
  const [guestActionName, setGuestActionName] = useState('access this feature');

  // Sub-tabs for Prescription History (Records tab)
  const [recordsSubTab, setRecordsSubTab] = useState<'All' | 'WithReminders' | 'SavedOnly' | 'Completed'>('All');

  // Dynamic store data
  const [prescriptions, setPrescriptions] = useState(healthStore.getPrescriptions());
  const [reminders, setReminders] = useState(healthStore.getReminders());
  const [labReports, setLabReports] = useState(healthStore.getLabReports());

  // API data
  const [appointments, setAppointments] = useState<any[]>([]);
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

  // Medication History Modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<MedicineLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Header Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications Modal state
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(true);

  // Date and Time Pickers for Modals
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerHour, setPickerHour] = useState('10');
  const [pickerMin, setPickerMin] = useState('00');
  const [pickerAmPm, setPickerAmPm] = useState('AM');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDay, setPickerDay] = useState(new Date().getDate());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await healthStore.syncWithBackend();
      const [apptRes, labRes, profileRes] = await Promise.all([
        apiAppointments.getAll().catch(() => null),
        apiLabReports.getAll().catch(() => null),
        apiProfile.getProfile().catch(() => null),
      ]);
      if (apptRes) {
        const appts = apptRes.data || apptRes.appointments;
        if (appts) setAppointments(appts);
      }
      if (labRes) {
        const reps = labRes.data || labRes.reports;
        if (reps) setReportsCount(reps.length);
      }
      if (profileRes && profileRes.success && profileRes.user) {
        await updateUser(profileRes.user);
      }
    } catch (_) {
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    try {
      const logs = await healthStore.getMedicationHistory();
      setHistoryEntries(logs);

      const compiled: any[] = [];

      // 1. Add Missed Medication alerts from logs (up to 3 recent missed)
      const missedLogs = logs.filter(l => l.status === 'missed').slice(0, 3);
      missedLogs.forEach(l => {
        compiled.push({
          id: `missed-${l.id}`,
          type: 'missed',
          title: `Missed: ${l.name}`,
          desc: `You missed your dose scheduled for ${l.time} on ${l.logDate}`,
          time: l.logDate,
          icon: 'pill-off',
          iconColor: '#EF4444',
          bgColor: '#FEF2F2',
        });
      });

      // 2. Add upcoming appointment reminders
      if (appointments && appointments.length > 0) {
        const sortedAppts = [...appointments].sort((a, b) => {
          const timeA = new Date(a.date_time || a.dateTime).getTime();
          const timeB = new Date(b.date_time || b.dateTime).getTime();
          return timeA - timeB;
        });
        sortedAppts.slice(0, 2).forEach((appt, idx) => {
          const rawTime = appt.date_time || appt.dateTime;
          let dateStr = rawTime;
          try {
            const dt = new Date(rawTime.replace(' ', 'T'));
            dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + 
                      dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          } catch (_) {}

          compiled.push({
            id: `appt-upcoming-${appt.id || idx}`,
            type: 'appointment',
            title: 'Upcoming Appointment',
            desc: `Appointment with Dr. ${appt.doctor_name || appt.doctorName || ''} (${appt.specialty || ''}) at ${appt.hospital_name || appt.hospitalName || appt.clinic || ''}`,
            time: dateStr,
            icon: 'calendar',
            iconColor: '#3B82F6',
            bgColor: '#EFF6FF',
          });
        });
      }

      // 3. Add prescription scanned confirmation if prescriptions exist
      if (prescriptions && prescriptions.length > 0) {
        const latestPresc = prescriptions[0];
        compiled.push({
          id: `presc-${latestPresc.id}`,
          type: 'prescription',
          title: 'Prescription Processed',
          desc: `Extracted ${latestPresc.medicines.length} medicines from Dr. ${latestPresc.doctor}'s prescription.`,
          time: latestPresc.date,
          icon: 'file-check-outline',
          iconColor: '#10B981',
          bgColor: '#ECFDF5',
        });
      }

      // 4. Add a daily health tip
      compiled.push({
        id: 'tip-daily',
        type: 'tip',
        title: 'Daily Health Tip',
        desc: 'Remember to stay hydrated! Drink at least 8 glasses of water today.',
        time: 'Today',
        icon: 'water-outline',
        iconColor: '#06B6D4',
        bgColor: '#ECFEFF',
      });

      setNotificationsList(compiled);
    } catch (_) {
    } finally {
      setHistoryLoading(false);
    }
  }, [prescriptions, appointments]);

  // Subscribe to health store updates
  useEffect(() => {
    const unsubscribe = healthStore.subscribe(() => {
      setPrescriptions([...healthStore.getPrescriptions()]);
      setReminders([...healthStore.getReminders()]);
      setLabReports([...healthStore.getLabReports()]);
    });

    healthStore.scheduleAllNotifications();

    return unsubscribe;
  }, []);

  // Fetch API overview counts and profile
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [apptRes, labRes, profileRes] = await Promise.all([
          apiAppointments.getAll().catch(() => null),
          apiLabReports.getAll().catch(() => null),
          apiProfile.getProfile().catch(() => null),
        ]);
        if (!mounted) return;
        if (apptRes) {
          const appts = apptRes.data || apptRes.appointments;
          if (appts) setAppointments(appts);
        }
        if (labRes) {
          const reps = labRes.data || labRes.reports;
          if (reps) setReportsCount(reps.length);
        }
        if (profileRes && profileRes.success && profileRes.user) {
          await updateUser(profileRes.user);
        }
        // Load history logs and populate notifications list
        loadHistory().catch(() => null);
      } catch (_) {
        // API not ready yet — show 0
      } finally {
        if (mounted) setApiLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [loadHistory]);

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
  const firstName = user?.name ? (user.name.split(' ')[0] ?? 'User') : 'Guest';

  // Add Action Handler
  const handleAddOption = (option: string) => {
    setShowAddModal(false);
    const normalized = option.trim().toLowerCase();

    // Allow view-only navigation for guest demo mode
    if (
      normalized === 'lab report' || 
      normalized === 'lab report upload' || 
      normalized === 'upload lab report' || 
      normalized === 'upload report'
    ) {
      navigation.navigate('LabReport');
      return;
    }

    if (normalized === 'doctor appointment' || normalized === 'book appointment' || normalized === 'appointments') {
      navigation.navigate('Appointments');
      return;
    }

    if (normalized === 'reports' || normalized === 'health report' || normalized === 'analytics report') {
      navigation.navigate('HealthAnalyticsReport');
      return;
    }

    if (!isAuthenticated) {
      setGuestActionName(option);
      setShowGuestAuthModal(true);
      return;
    }

    if (normalized === 'scan prescription') {
      navigation.navigate('ScanPrescription');
    } else if (normalized === 'add reminder' || normalized === 'medicine reminder') {
      setCurrentTab('Medications');
      setTimeout(() => {
        setShowManualAddModal(true);
      }, 300);
    } else if (normalized === 'ai health assistant' || normalized === 'ai assistant' || normalized === 'chatbot') {
      navigation.navigate('AIHealthAssistant');
    } else {
      Alert.alert('Action', `${option} clicked!`);
    }
  };

  // Render Home Tab
  const renderHome = () => {
    const activeReminders = (!isAuthenticated && reminders.length === 0) ? DUMMY_REMINDERS : reminders;
    const activeAppts = (!isAuthenticated && appointments.length === 0) ? DUMMY_APPOINTMENTS : appointments;
    const activePrescriptions = (!isAuthenticated && prescriptions.length === 0) ? DUMMY_PRESCRIPTIONS : prescriptions;

    const query = searchQuery.trim().toLowerCase();
    const filteredReminders = query 
      ? activeReminders.filter(r => 
          r.name.toLowerCase().includes(query) ||
          r.dosage.toLowerCase().includes(query)
        )
      : activeReminders;

    const nextReminder = filteredReminders.find(r => !r.taken) || filteredReminders[0];
    const dueCount = filteredReminders.filter(r => !r.taken).length.toString();
    const prescCount = activePrescriptions.length.toString();

    const sortedAppts = [...activeAppts].sort((a, b) => {
      const timeA = new Date(a.date_time || a.dateTime).getTime();
      const timeB = new Date(b.date_time || b.dateTime).getTime();
      return timeA - timeB;
    });
    const nextAppt = sortedAppts[0];

    const getApptDateParts = (dateTimeStr: string) => {
      try {
        const dt = new Date(dateTimeStr.replace(' ', 'T'));
        const month = dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const day = dt.getDate().toString();
        const weekday = dt.toLocaleDateString('en-US', { weekday: 'short' });
        const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        
        const diffMs = dt.getTime() - Date.now();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        let relativeStr = '';
        if (diffDays === 0) relativeStr = 'Today';
        else if (diffDays === 1) relativeStr = 'Tomorrow';
        else if (diffDays > 1) relativeStr = `In ${diffDays} days`;
        else relativeStr = 'Passed';

        return { month, day, weekday, time, relativeStr };
      } catch (_) {
        return { month: 'MAY', day: '20', weekday: 'Tue', time: '10:30 AM', relativeStr: 'In 2 days' };
      }
    };

    const apptParts = nextAppt ? getApptDateParts(nextAppt.date_time || nextAppt.dateTime) : null;

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!isAuthenticated && (
          <View style={styles.demoDataNotice}>
            <Feather name="info" size={16} color="#4F46E5" style={{ marginRight: 8 }} />
            <Text style={styles.demoDataNoticeText}>
              <Text style={{ fontWeight: '700' }}>Demo Mode:</Text> Showing sample health records. Want to save your own records?{' '}
              <Text 
                style={{ fontWeight: '700', color: '#4F46E5', textDecorationLine: 'underline' }} 
                onPress={() => navigation.navigate('Register')}
              >
                Register / Sign In
              </Text>
            </Text>
          </View>
        )}
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
        </View>

        {/* Grid of items */}
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
          {/* HIDE: Doctor Appointment & AI Health Assistant
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
          */}
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
          {/* HIDE: Appointments Overview Card
          <OverviewCard
            icon={<Feather name="calendar" size={20} color="#10B981" />}
            title="Appointments"
            value={appointments.length.toString()}
            bgColor="#ECFDF5"
            textColor="#10B981"
            onPress={() => handleAddOption('Appointments')}
          />
          */}
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

        {/* Lab Reports Row */}
        <View style={styles.splitRow}>
          {/* HIDE: Upcoming Appointment
          <View style={styles.splitCol}>
            <View style={styles.sectionHeaderSmall}>
              <Text style={styles.sectionTitleSmall}>Upcoming Appointment</Text>
            </View>
            {nextAppt && apptParts ? (
              <View style={styles.appointmentCard}>
                <View style={styles.dateBlock}>
                  <Text style={styles.dateMonth}>{apptParts.month}</Text>
                  <Text style={styles.dateDay}>{apptParts.day}</Text>
                  <Text style={styles.dateWeek}>{apptParts.weekday}</Text>
                </View>
                <View style={styles.appointmentDetails}>
                  <Text style={styles.docName}>Dr. {nextAppt.doctor_name || nextAppt.doctorName || ''}</Text>
                  <Text style={styles.docSpec}>{nextAppt.specialty || ''}</Text>
                  
                  <View style={styles.infoRowSmall}>
                    <Feather name="map-pin" size={11} color="#718096" style={{ marginRight: 4 }} />
                    <Text style={styles.infoTextSmall}>{nextAppt.hospital_name || nextAppt.hospitalName || nextAppt.clinic || ''}</Text>
                  </View>

                  <View style={styles.infoRowSmall}>
                    <Feather name="clock" size={11} color="#718096" style={{ marginRight: 4 }} />
                    <Text style={styles.infoTextSmall}>{apptParts.time}</Text>
                  </View>

                  <View style={styles.badgeGreen}>
                    <Text style={styles.badgeGreenText}>{apptParts.relativeStr}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.appointmentCard, { flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 20, flex: 1 }]}
                onPress={() => handleAddOption('Appointments')}
                activeOpacity={0.8}
              >
                <Feather name="calendar" size={30} color="#A0AEC0" style={{ marginBottom: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#718096', textAlign: 'center' }}>No Appointments</Text>
                <Text style={{ fontSize: 10, color: '#A0AEC0', textAlign: 'center', marginTop: 2 }}>Tap to book a visit</Text>
              </TouchableOpacity>
            )}
          </View>
          */}

          {/* Recent Lab Reports */}
          <View style={[styles.splitCol, { flex: 1 }]}>
            <View style={styles.sectionHeaderSmall}>
              <Text style={styles.sectionTitleSmall}>Recent Lab Reports</Text>
            </View>
            <View style={styles.reportsCard}>
              {((!isAuthenticated && labReports.length === 0) ? DUMMY_LAB_REPORTS : labReports).length > 0 ? (
                ((!isAuthenticated && labReports.length === 0) ? DUMMY_LAB_REPORTS : labReports).slice(0, 3).map((rep) => (
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

        {/* Upgrade Plan CTA Banner */}
        <TouchableOpacity 
          style={styles.upgradeBannerContainer} 
          activeOpacity={0.9} 
          onPress={() => navigation.navigate('UpgradePlan')}
        >
          <LinearGradient
            colors={['#7C3AED', '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.upgradeBanner}
          >
            <View style={styles.upgradeBannerLeft}>
              <View style={styles.crownIconBg}>
                <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
              </View>
              <View style={styles.upgradeDetails}>
                <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                <Text style={styles.upgradeDesc}>
                  Unlock AI insights, unlimited scans, family vaults, and 24/7 care support.
                </Text>
              </View>
            </View>
            <View style={styles.upgradeRightBtn}>
              <Feather name="chevron-right" size={20} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Medical Disclaimer Footer */}
        <View style={styles.disclaimerContainer}>
          <View style={styles.disclaimerIconBg}>
            <Feather name="alert-circle" size={18} color="#D97706" />
          </View>
          <Text style={styles.disclaimerText}>
            <Text style={styles.disclaimerTitle}>Medical Disclaimer: </Text>
            CareMate AI provides health tracking and general information only. It does not replace professional medical advice, diagnosis, or treatment.
          </Text>
        </View>

        {/* Extra space */}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  // Render Medications Tab
  const renderMedications = () => {
    const activeReminders = (!isAuthenticated && reminders.length === 0) ? DUMMY_REMINDERS : reminders;
    const activePrescriptions = (!isAuthenticated && prescriptions.length === 0) ? DUMMY_PRESCRIPTIONS : prescriptions;

    // Group reminders by prescriptionId → doctor name
    const grouped: { doctorLabel: string; prescriptionId: string | undefined; items: typeof activeReminders }[] = [];

    const query = searchQuery.trim().toLowerCase();
    const filteredReminders = query 
      ? activeReminders.filter(r => 
          r.name.toLowerCase().includes(query) ||
          r.dosage.toLowerCase().includes(query) ||
          (r.slot && r.slot.toLowerCase().includes(query))
        )
      : activeReminders;

    const manualReminders = filteredReminders.filter(r => !r.prescriptionId);
    const prescriptionReminders = filteredReminders.filter(r => !!r.prescriptionId);

    // Group by prescriptionId
    const seen = new Set<string>();
    prescriptionReminders.forEach(r => {
      const pid = r.prescriptionId!;
      if (!seen.has(pid)) {
        seen.add(pid);
        const presc = activePrescriptions.find(p => p.id === pid);
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
        <ScrollView
          contentContainerStyle={styles.tabScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {!isAuthenticated && (
            <View style={styles.demoDataNotice}>
              <Feather name="info" size={16} color="#4F46E5" style={{ marginRight: 8 }} />
              <Text style={styles.demoDataNoticeText}>
                <Text style={{ fontWeight: '700' }}>Demo Mode:</Text> Showing sample medicine reminders.{' '}
                <Text 
                  style={{ fontWeight: '700', color: '#4F46E5', textDecorationLine: 'underline' }} 
                  onPress={() => navigation.navigate('Register')}
                >
                  Register / Sign In
                </Text>{' '}
                to add your actual medications.
              </Text>
            </View>
          )}
          {/* Header Row */}
          <View style={styles.medTabHeader}>
            <View>
              <Text style={styles.tabTitle}>My Medications</Text>
              <Text style={styles.tabSubtitle}>Reminders grouped by doctor</Text>
            </View>
            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => {
                setShowHistoryModal(true);
                loadHistory();
              }}
              activeOpacity={0.7}
            >
              <Feather name="activity" size={14} color="#4F46E5" style={{ marginRight: 4 }} />
              <Text style={styles.historyBtnText}>History</Text>
            </TouchableOpacity>
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
                  <Text style={styles.groupMedCount}>{`${group.items.length} medicine${group.items.length !== 1 ? 's' : ''}`}</Text>
                </View>

                {/* Medicine Items */}
                {group.items.map((rem) => (
                  <MedicationListItem
                    key={rem.id}
                    id={rem.id}
                    name={rem.name}
                    dosage={rem.dosage}
                    time={rem.time}
                    taken={rem.taken}
                    slot={rem.slot}
                    date={rem.date}
                    imageUri={rem.imageUri}
                    onToggle={() => healthStore.toggleReminderTaken(rem.id)}
                    onImageUpdate={(newUri) => healthStore.updateReminderImage(rem.id, newUri)}
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
    const activePrescriptions = (!isAuthenticated && prescriptions.length === 0) ? DUMMY_PRESCRIPTIONS : prescriptions;

    // Filter prescriptions by recordsSubTab
    const query = searchQuery.trim().toLowerCase();
    const filtered = activePrescriptions.filter(p => {
      if (recordsSubTab === 'WithReminders' && p.status !== 'Reminder Active') return false;
      if (recordsSubTab === 'SavedOnly' && p.status !== 'Saved Only') return false;
      if (recordsSubTab === 'Completed' && p.status !== 'Completed') return false;

      if (query) {
        return (
          p.doctor.toLowerCase().includes(query) ||
          p.clinic.toLowerCase().includes(query) ||
          p.date.toLowerCase().includes(query)
        );
      }
      return true;
    });

    return (
      <ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
        {!isAuthenticated && (
          <View style={styles.demoDataNotice}>
            <Feather name="info" size={16} color="#4F46E5" style={{ marginRight: 8 }} />
            <Text style={styles.demoDataNoticeText}>
              <Text style={{ fontWeight: '700' }}>Demo Mode:</Text> Showing sample prescription history.{' '}
              <Text 
                style={{ fontWeight: '700', color: '#4F46E5', textDecorationLine: 'underline' }} 
                onPress={() => navigation.navigate('Register')}
              >
                Register / Sign In
              </Text>{' '}
              to scan and store prescriptions.
            </Text>
          </View>
        )}
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
                    <Text style={styles.prescClinic}>{`${presc.clinic} • ${presc.medicines.length} Medicines`}</Text>
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
  const renderProfile = () => {
    if (!isAuthenticated || !user) {
      return (
        <ScrollView 
          contentContainerStyle={styles.tabScrollContent} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileCard}>
            <View style={[styles.avatarCircle, { backgroundColor: '#EEF2FF' }]}>
              <Feather name="user" size={32} color="#4F46E5" />
            </View>
            <Text style={styles.profileNameLarge}>Guest User</Text>
            <Text style={styles.profileBio}>Sign in to save records & sync health data</Text>
            <TouchableOpacity
              style={styles.guestProfileLoginBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Feather name="log-in" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.guestProfileLoginText}>Sign In / Create Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileMenu}>
            <ProfileMenuItem
              icon={<MaterialCommunityIcons name="crown-outline" size={20} color="#D97706" />}
              label="Upgrade Plan"
              onPress={() => navigation.navigate('UpgradePlan')}
            />
            <ProfileMenuItem
              icon={<Feather name="shield" size={20} color="#059669" />}
              label="Security & Privacy / Terms"
              onPress={() => navigation.navigate('SecurityPrivacy')}
            />
            <ProfileMenuItem
              icon={<Feather name="help-circle" size={20} color="#8B5CF6" />}
              label="Help & Support"
              onPress={() => navigation.navigate('HelpSupport')}
            />
          </View>
          <View style={{ height: 120 }} />
        </ScrollView>
      );
    }

    return (
      <ScrollView 
        contentContainerStyle={styles.tabScrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
        </View>
        <Text style={styles.profileNameLarge}>{user?.name ?? 'User'}</Text>
        <Text style={styles.profileBio}>{user?.email ?? ''}</Text>
        <View style={{
          marginTop: 6,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
          backgroundColor: user?.email_verified_at ? '#E8F5E9' : '#FFEBEE',
          borderWidth: 1,
          borderColor: user?.email_verified_at ? '#C8E6C9' : '#FFCDD2',
          alignSelf: 'center',
        }}>
          <Text style={{
            fontSize: 10,
            fontWeight: '700',
            color: user?.email_verified_at ? '#2E7D32' : '#C62828',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            {user?.email_verified_at ? 'Verified' : 'Unverified'}
          </Text>
        </View>

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
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header (Top Row) */}
      {isSearching ? (
        <View style={styles.searchHeader}>
          <Feather name="search" size={20} color="#718096" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${currentTab.toLowerCase()}...`}
            placeholderTextColor="#A0AEC0"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <TouchableOpacity 
            style={styles.closeSearchBtn} 
            onPress={() => {
              setIsSearching(false);
              setSearchQuery('');
            }}
          >
            <Feather name="x" size={20} color="#4A5568" />
          </TouchableOpacity>
        </View>
      ) : (
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
            <TouchableOpacity 
              style={styles.iconButton} 
              activeOpacity={0.7}
              onPress={() => setIsSearching(true)}
            >
              <Feather name="search" size={22} color="#1A202C" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton} 
              activeOpacity={0.7}
              onPress={() => {
                setUnreadNotifications(false);
                setShowNotificationsModal(true);
              }}
            >
              <Feather name="bell" size={22} color="#1A202C" />
              {unreadNotifications && <View style={styles.redDot} />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tab Contents */}
      {currentTab === 'Home' && renderHome()}
      {currentTab === 'Medications' && renderMedications()}
      {currentTab === 'Records' && renderRecords()}
      {currentTab === 'Profile' && renderProfile()}

      {/* Floating Bottom Navigation Bar */}
      <View style={[
        styles.bottomTabBar, 
        { 
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 14), 
          height: 65 + Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 14) 
        }
      ]}>
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
            {/* HIDE: Book Doctor Appointment
            <ActionSheetItem
              icon={<Feather name="calendar" size={22} color="#EF4444" />}
              title="Book Doctor Appointment"
              desc="Search doctors and schedule a visit"
              onPress={() => handleAddOption('Book Appointment')}
            />
            */}
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
      {/* Notifications Alerts Modal */}
      <Modal
        visible={showNotificationsModal}
        animationType="slide"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <SafeAreaView style={styles.notifModalContainer}>
          {/* Header */}
          <View style={styles.notifHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.notifHeaderIconBg}>
                <Feather name="bell" size={18} color="#4F46E5" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.notifTitle}>Notifications</Text>
                <Text style={styles.notifSubtitle}>Alerts, tips and updates</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.closeNotifBtn}
              onPress={() => setShowNotificationsModal(false)}
              activeOpacity={0.7}
            >
              <Feather name="x" size={20} color="#4A5568" />
            </TouchableOpacity>
          </View>

          {notificationsList.length === 0 ? (
            <View style={styles.notifEmptyCenter}>
              <MaterialCommunityIcons name="bell-outline" size={64} color="#CBD5E1" />
              <Text style={styles.notifEmptyTitle}>All caught up!</Text>
              <Text style={styles.notifEmptySubtitle}>You have no notifications or alerts at this moment.</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {notificationsList.map(notif => (
                <View key={notif.id} style={styles.notifCard}>
                  <View style={[styles.notifIconWrapper, { backgroundColor: notif.bgColor }]}>
                    <MaterialCommunityIcons 
                      name={notif.icon} 
                      size={20} 
                      color={notif.iconColor} 
                    />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.notifCardTitle}>{notif.title}</Text>
                      <Text style={styles.notifCardTime}>{notif.time}</Text>
                    </View>
                    <Text style={styles.notifCardDesc}>{notif.desc}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Medication History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <SafeAreaView style={styles.historyModalContainer}>
          {/* Header */}
          <View style={styles.historyHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.historyHeaderIconBg}>
                <FontAwesome name="history" size={18} color="#4F46E5" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.historyTitle}>Medication History</Text>
                <Text style={styles.historySubtitle}>Logs of taken & missed doses</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.closeHistoryBtn}
              onPress={() => setShowHistoryModal(false)}
              activeOpacity={0.7}
            >
              <Feather name="x" size={20} color="#4A5568" />
            </TouchableOpacity>
          </View>

          {historyLoading && historyEntries.length === 0 ? (
            <View style={styles.historyCenter}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.historyLoadingText}>Loading history...</Text>
            </View>
          ) : historyEntries.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.historyEmptyCenter}
              refreshControl={<RefreshControl refreshing={historyLoading} onRefresh={loadHistory} />}
            >
              <MaterialCommunityIcons name="history" size={64} color="#CBD5E1" />
              <Text style={styles.historyEmptyTitle}>No history logs found</Text>
              <Text style={styles.historyEmptySubtitle}>Log status will appear here when reminders reset daily.</Text>
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 16 }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={historyLoading} onRefresh={loadHistory} />}
            >
              {(() => {
                // Group entries by date
                const groupedByDate: { [date: string]: MedicineLogEntry[] } = {};
                historyEntries.forEach(entry => {
                  const dateStr = entry.logDate;
                  if (!groupedByDate[dateStr]) {
                    groupedByDate[dateStr] = [];
                  }
                  groupedByDate[dateStr].push(entry);
                });

                // Format dates nicely
                const formatDateStr = (dateString: string) => {
                  try {
                    const dateObj = new Date(dateString);
                    if (isNaN(dateObj.getTime())) return dateString;
                    return dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
                  } catch (_) {
                    return dateString;
                  }
                };

                return Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a)).map(dateStr => (
                  <View key={dateStr} style={styles.historyDateGroup}>
                    <Text style={styles.historyDateLabel}>{formatDateStr(dateStr)}</Text>
                    {groupedByDate[dateStr].map(log => {
                      const isTaken = log.status === 'taken';
                      return (
                        <View key={log.id} style={styles.historyLogCard}>
                          <View style={styles.historyLogInfo}>
                            <View style={[styles.historyLogIconWrapper, { backgroundColor: isTaken ? '#ECFDF5' : '#FEF2F2' }]}>
                              <MaterialCommunityIcons 
                                name={isTaken ? "pill-multiple" : "pill-off"} 
                                size={20} 
                                color={isTaken ? "#10B981" : "#EF4444"} 
                              />
                            </View>
                            <View style={{ marginLeft: 12, flex: 1 }}>
                              <Text style={styles.historyLogName}>{log.name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                <Feather name="clock" size={10} color="#94A3B8" />
                                <Text style={styles.historyLogTime}>{log.time}</Text>
                                {!!isTaken && !!log.takenAt && (
                                  <>
                                    <Text style={styles.historyLogDot}>•</Text>
                                    <Text style={styles.historyLogTime}>
                                      {new Date(log.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                  </>
                                )}
                              </View>
                            </View>
                          </View>
                          <View style={[styles.historyStatusBadge, { backgroundColor: isTaken ? '#D1FAE5' : '#FEE2E2', borderColor: isTaken ? '#A7F3D0' : '#FCA5A5' }]}>
                            <Text style={[styles.historyStatusBadgeText, { color: isTaken ? '#065F46' : '#991B1B' }]}>
                              {isTaken ? 'TAKEN' : 'MISSED'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ));
              })()}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Guest Auth Prompt Modal */}
      <Modal
        visible={showGuestAuthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuestAuthModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGuestAuthModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={{ width: '86%', alignSelf: 'center' }}>
            <View style={styles.guestAuthCard}>
              <View style={styles.guestAuthIconBg}>
                <Feather name="lock" size={26} color="#4F46E5" />
              </View>
              <Text style={styles.guestAuthTitle}>Sign In Required</Text>
              <Text style={styles.guestAuthDesc}>
                {`Please sign in or create an account to use ${guestActionName} and save your health records.`}
              </Text>

              <TouchableOpacity
                style={styles.guestAuthMainBtn}
                onPress={() => {
                  setShowGuestAuthModal(false);
                  navigation.navigate('Login');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.guestAuthMainBtnText}>Sign In / Register</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.guestAuthCloseBtn}
                onPress={() => setShowGuestAuthModal(false)}
              >
                <Text style={styles.guestAuthCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  id?: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  onToggle?: () => void;
  slot?: string;
  date?: string;
  imageUri?: string;
  onDelete?: () => void;
  onImageUpdate?: (newUri: string | undefined) => void;
}

function MedicationListItem({
  id,
  name,
  dosage,
  time,
  taken,
  onToggle,
  slot,
  date,
  imageUri,
  onDelete,
  onImageUpdate,
}: MedicationListItemProps) {
  const [previewVisible, setPreviewVisible] = useState(false);

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
        const diffTime = remDate.getTime() - today.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 1) {
          statusLabel = 'Upcoming';
          statusColor = '#3B82F6';
        }
      }
    } catch (_) {}
  }

  const handlePickImage = () => {
    Alert.alert(
      'Medicine Photo',
      `Add or change photo for ${name}`,
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Camera permission is required to take a medicine photo.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!res.canceled && res.assets && res.assets[0].uri) {
              onImageUpdate?.(res.assets[0].uri);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Gallery permission is required to choose a medicine photo.');
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!res.canceled && res.assets && res.assets[0].uri) {
              onImageUpdate?.(res.assets[0].uri);
            }
          },
        },
        ...(imageUri
          ? [
              {
                text: 'Remove Photo',
                style: 'destructive' as const,
                onPress: () => onImageUpdate?.(undefined),
              },
            ]
          : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  return (
    <View style={styles.medItemCard}>
      <View style={styles.medItemHeader}>
        {/* Medicine Icon or Photo Thumbnail */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => (imageUri ? setPreviewVisible(true) : handlePickImage())}
          style={[styles.medItemIconBg, !imageUri && { backgroundColor: '#F3E8FF', borderWidth: 1, borderColor: '#E9D5FF' }]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: 44, height: 44, borderRadius: 12 }} />
          ) : (
            <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="pill" size={24} color="#7E22CE" />
              <View style={{ position: 'absolute', bottom: -5, right: -6, backgroundColor: '#7E22CE', borderRadius: 7, padding: 2.5, borderWidth: 1.5, borderColor: '#FFFFFF' }}>
                <Feather name="camera" size={9} color="#FFFFFF" />
              </View>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.medItemNameCol}>
          <Text style={styles.medItemName}>{name}</Text>
          <Text style={styles.medItemDosage}>{dosage}</Text>

          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
            {!!slot && (
              <View style={styles.slotBadge}>
                <Text style={styles.slotBadgeText}>{slot}</Text>
              </View>
            )}
            {!!date && (
              <View style={[styles.slotBadge, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
                <Text style={[styles.slotBadgeText, { color: '#15803D' }]}>{date}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handlePickImage}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 3,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: imageUri ? '#F8FAFC' : '#F3E8FF',
                borderWidth: 1,
                borderColor: imageUri ? '#CBD5E1' : '#C084FC',
              }}
            >
              <Feather name="camera" size={11} color={imageUri ? '#475569' : '#7E22CE'} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: imageUri ? '#475569' : '#7E22CE' }}>
                {imageUri ? 'View / Change Photo' : '📷 Add Medicine Photo'}
              </Text>
            </TouchableOpacity>
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

      {/* Full Screen Image Preview Modal */}
      {!!imageUri && (
        <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <TouchableOpacity
              style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}
              onPress={() => setPreviewVisible(false)}
            >
              <Feather name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Image source={{ uri: imageUri }} style={{ width: '90%', height: '60%', borderRadius: 16, resizeMode: 'contain' }} />
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 16 }}>{name}</Text>
            <Text style={{ color: '#CBD5E1', fontSize: 14, marginTop: 4 }}>{dosage}</Text>
            <TouchableOpacity
              style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}
              onPress={() => {
                setPreviewVisible(false);
                setTimeout(handlePickImage, 300);
              }}
            >
              <Feather name="edit-2" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
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
  dashboardDisclaimerText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 8,
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
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    height: 72,
    marginTop: Platform.OS === 'ios' ? 10 : 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    paddingVertical: 8,
  },
  closeSearchBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
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
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  disclaimerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  disclaimerTitle: {
    fontWeight: '700',
    color: '#B45309',
  },
  upgradeBannerContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  demoDataNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
  },
  demoDataNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#3730A3',
    lineHeight: 17,
  },
  guestAuthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  guestAuthIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  guestAuthTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestAuthDesc: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  guestAuthMainBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  guestAuthMainBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  guestAuthCloseBtn: {
    paddingVertical: 10,
  },
  guestAuthCloseText: {
    color: '#A0AEC0',
    fontSize: 14,
    fontWeight: '600',
  },
  guestProfileLoginBtn: {
    flexDirection: 'row',
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  guestProfileLoginText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 24,
  },
  upgradeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  crownIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeDetails: {
    marginLeft: 14,
    flex: 1,
    paddingRight: 8,
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  upgradeDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    lineHeight: 15,
  },
  upgradeRightBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
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

  // === Notifications Modal ===
  notifModalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  notifHeaderIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  notifSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  closeNotifBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  notifEmptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingTop: 100,
  },
  notifEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 16,
  },
  notifEmptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  notifIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  notifCardTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  notifCardDesc: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },

  // === Medication History Modal ===
  historyModalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyHeaderIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  historySubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  closeHistoryBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  historyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  historyLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  historyEmptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingTop: 100,
  },
  historyEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 16,
  },
  historyEmptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  historyDateGroup: {
    marginBottom: 20,
  },
  historyDateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyLogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  historyLogInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  historyLogIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLogName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  historyLogTime: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
  },
  historyLogDot: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 4,
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  historyStatusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
});

interface EmailVerificationModalProps {
  visible: boolean;
  email: string;
  onVerified: (user: any) => void;
  onLogout: () => void;
}

function EmailVerificationModal({ visible, email, onVerified, onLogout }: EmailVerificationModalProps) {
  const [timer, setTimer] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval: any;
    if (visible && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [visible, timer]);

  const handleCheckStatus = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiProfile.getProfile();
      if (res && res.success && res.user) {
        if (res.user.email_verified_at) {
          onVerified(res.user);
          Alert.alert('Success', 'Email verified successfully! Welcome to CareMate AI.');
        } else {
          Alert.alert(
            'Verification Pending',
            'Your email is not verified yet. Please click the verification link in your email and try again.'
          );
        }
      } else {
        Alert.alert('Error', 'Failed to retrieve verification status');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to check verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiAuth.resendVerification(email);
      if (res.success) {
        setTimer(600);
        setCanResend(false);
        Alert.alert('Link Sent', 'A new email verification link has been sent to your email.');
      } else {
        Alert.alert('Error', res.message || 'Failed to resend link');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Resend failed');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FF', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{ width: 85, height: 85, borderRadius: 42.5, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Feather name="mail" size={42} color="#4F46E5" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#1E293B', marginBottom: 12, textAlign: 'center' }}>Verify Your Email</Text>
          <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 15, lineHeight: 22 }}>
            We have sent a verification link to your email address: {'\n'}
            <Text style={{ fontWeight: '700', color: '#1E293B' }}>{email}</Text>
            {'\n\n'}Please click the link in your email to verify and activate your account.
          </Text>
        </View>

        <TouchableOpacity
          style={{
            height: 52,
            borderRadius: 12,
            backgroundColor: '#4F46E5',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
          disabled={loading}
          onPress={handleCheckStatus}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>I Have Verified</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 40 }}>
          <Text style={{ fontSize: 14, color: '#64748B' }}>{"Didn't receive link? "}</Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#4F46E5' }}>Resend Link</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#4F46E5' }}>
              {`Resend in ${Math.floor(timer / 60)}m ${timer % 60}s`}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={onLogout} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#EF4444' }}>Log Out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}
