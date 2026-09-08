import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  Dimensions,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useNavigation } from '@react-navigation/native';
import { healthStore, Appointment } from '../store/healthStore';
let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch (e) {
  console.warn('expo-av native module not available in Expo Go:', e);
}
import { apiAppointments } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList, 'Appointments'>;
interface Props { navigation: Nav; }

// --- Calendar helpers ---
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const SHORT_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// ────────────────────────────────────────────────────────────
export default function AppointmentsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'Upcoming' | 'Past'>('Upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>(healthStore.getAppointments());

  React.useEffect(() => {
    const unsub = healthStore.subscribe(() => {
      setAppointments([...healthStore.getAppointments()]);
    });
    return unsub;
  }, []);

  const [showAdd, setShowAdd] = useState(false);

  const upcoming = appointments.filter(a => !a.isPast);
  const past     = appointments.filter(a =>  a.isPast);
  const list     = tab === 'Upcoming' ? upcoming : past;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Feather name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['Upcoming', 'Past'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={52} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>No {tab} Appointments</Text>
            <Text style={styles.emptySub}>Tap + to add a new appointment</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>{tab}</Text>
            {list.map(appt => (
              <AppointmentCard key={appt.id} appt={appt} />
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Appointment Modal */}
      <AddAppointmentModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => setShowAdd(false)}
      />
    </SafeAreaView>
  );
}

// ─── Appointment Card ────────────────────────────────────────
function AppointmentCard({ appt }: { appt: Appointment }) {
  const dateObj   = new Date(appt.dateTime);
  const day       = dateObj.getDate();
  const monthStr  = SHORT_MONTHS[dateObj.getMonth()];
  const dayName   = ['SUN','MON','TUE','WED','THU','FRI','SAT'][dateObj.getDay()];
  const timeStr   = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const daysLeft  = Math.round((dateObj.getTime() - Date.now()) / 86400000);
  const daysLabel = daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : daysLeft > 0 ? `In ${daysLeft} days` : `${Math.abs(daysLeft)}d ago`;
  const badgeColor = appt.isPast ? '#718096' : daysLeft <= 1 ? '#E53E3E' : '#38A169';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85}>
      <View style={styles.cardLeft}>
        {/* Date Block */}
        <View style={styles.dateBlock}>
          <Text style={styles.dateMonth}>{monthStr}</Text>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateDayName}>{dayName}</Text>
        </View>
        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardDoctorName}>{appt.doctorName}</Text>
          <Text style={styles.cardSpecialty}>{appt.specialty}</Text>
          <Text style={styles.cardClinic}>{appt.clinic}</Text>
          <View style={[styles.dayBadge, { backgroundColor: badgeColor + '22' }]}>
            <Text style={[styles.dayBadgeText, { color: badgeColor }]}>{daysLabel}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardTime}>{timeStr}</Text>
        <Feather name="chevron-right" size={18} color="#A0AEC0" />
        <TouchableOpacity style={styles.bellBtn}>
          <Feather name="bell" size={16} color="#6366F1" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Add Appointment Modal ───────────────────────────────────
type AddMode = 'Manual' | 'Voice';
type AddStep = 'Form' | 'DateTime' | 'Review' | 'Success';

interface FormData {
  doctorName: string;
  clinic: string;
  dateTime: Date | null;
  reason: string;
  reminder: '1Day' | '2Hours' | '30Mins' | 'None';
}

function AddAppointmentModal({ visible, onClose, onSaved }: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [mode, setMode]   = useState<AddMode>('Manual');
  const [step, setStep]   = useState<AddStep>('Form');
  const [isListening, setIsListening] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [form, setForm] = useState<FormData>({
    doctorName: '',
    clinic: '',
    dateTime: null,
    reason: '',
    reminder: '1Day',
  });

  // Calendar state
  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selDay,   setSelDay]   = useState<number | null>(null);
  const [selHour,  setSelHour]  = useState(10);
  const [selMin,   setSelMin]   = useState(30);
  const [selAmPm,  setSelAmPm]  = useState<'AM'|'PM'>('AM');

  const [isParsing, setIsParsing] = useState(false);
  const recordingRef = useRef<any | null>(null);

  const isValidDate = (d: Date | null) => d !== null && d instanceof Date && !isNaN(d.getTime());

  const reset = () => {
    setMode('Manual'); setStep('Form'); setIsListening(false); setIsParsing(false);
    setForm({ doctorName:'', clinic:'', dateTime:null, reason:'', reminder:'1Day' });
    setSelDay(null); setSelHour(10); setSelMin(30); setSelAmPm('AM');
  };

  // Voice pulse animation
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  };
  const stopPulse = () => { pulseAnim.stopAnimation(); pulseAnim.setValue(1); };

  const startRecording = async () => {
    try {
      if (!Audio) {
        Alert.alert('Voice Mode', 'Voice recording requires a standalone or development build.');
        return;
      }
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        alert('Microphone permission is required to use Voice Mode.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      startPulse();
      setIsListening(true);
    } catch (err) {
      console.warn('Failed to start recording', err);
    }
  };

  const stopRecordingAndParse = async () => {
    try {
      const recording = recordingRef.current;
      if (!recording) return;

      stopPulse();
      setIsListening(false);
      setIsParsing(true);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      if (uri) {
        const base64Audio = await uriToBase64(uri);
        const mimeType = Platform.OS === 'ios' ? 'audio/x-m4a' : 'audio/3gpp';
        const res = await apiAppointments.parseVoice(base64Audio, mimeType);
        if (res.success && res.data) {
          const parsed = res.data;
          setForm(f => ({
            ...f,
            doctorName: parsed.doctorName || f.doctorName,
            clinic: parsed.clinic || f.clinic,
            reason: parsed.reason || f.reason,
            dateTime: parsed.dateTime ? new Date(parsed.dateTime) : f.dateTime,
          }));
          setMode('Manual');
        } else {
          alert('AI could not extract appointment details. Please try again.');
        }
      }
    } catch (err) {
      console.warn('Failed to parse voice recording', err);
      alert('Failed to parse voice recording. Please enter details manually.');
    } finally {
      setIsParsing(false);
    }
  };

  const uriToBase64 = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64Data = reader.result.split(',')[1];
          resolve(base64Data);
        } else {
          reject(new Error('Failed to read as base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const toggleVoice = () => {
    if (isListening) {
      stopRecordingAndParse();
    } else {
      startRecording();
    }
  };

  // Confirm DateTime
  const confirmDateTime = () => {
    if (!selDay) return;
    const h = selAmPm === 'PM' && selHour !== 12 ? selHour + 12
            : selAmPm === 'AM' && selHour === 12  ? 0
            : selHour;
    const d = new Date(calYear, calMonth, selDay, h, selMin);
    setForm(f => ({ ...f, dateTime: d }));
    setStep('Form');
  };

  // Save appointment
  const saveAppointment = () => {
    if (!isValidDate(form.dateTime) || !form.doctorName.trim()) return;
    healthStore.addAppointment({
      doctorName: form.doctorName.trim(),
      specialty: '',
      clinic: form.clinic.trim(),
      dateTime: form.dateTime!.toISOString(),
      reason: form.reason.trim(),
      reminder: form.reminder,
      isPast: form.dateTime! < new Date(),
    });
    setStep('Success');
  };

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay    = getFirstDayOfMonth(calYear, calMonth);

  const formatDateTime = (d: Date | null) => {
    if (!isValidDate(d)) return 'Select date and time';
    return d!.toLocaleString('en-US', { month:'long', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });
  };

  const reminderLabel = (r: FormData['reminder']) =>
    r === '1Day' ? '1 Day Before' : r === '2Hours' ? '2 Hours Before' : r === '30Mins' ? '30 Mins Before' : 'No Reminder';

  if (!visible) return null;

  // ── DateTime Picker ──
  if (step === 'DateTime') {
    const calDays: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) calDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setStep('Form')}>
        <View style={styles.modalOverlay}>
          <View style={styles.dtSheet}>
            <View style={styles.dtTopRow}>
              <TouchableOpacity onPress={() => setStep('Form')}><Text style={styles.dtCancel}>Cancel</Text></TouchableOpacity>
              <Text style={styles.dtTitle}>Date &amp; Time</Text>
              <TouchableOpacity onPress={confirmDateTime}><Text style={styles.dtDone}>Done</Text></TouchableOpacity>
            </View>

            {/* Month nav */}
            <View style={styles.monthRow}>
              <Text style={styles.monthLabel}>{`${MONTHS[calMonth]} ${calYear}`}</Text>
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y=>y-1); } else setCalMonth(m=>m-1); }}>
                  <Feather name="chevron-left" size={20} color="#6366F1" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y=>y+1); } else setCalMonth(m=>m+1); }}>
                  <Feather name="chevron-right" size={20} color="#6366F1" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Day labels */}
            <View style={styles.dayLabelsRow}>
              {DAYS.map(d => <Text key={d} style={styles.dayLabel}>{d}</Text>)}
            </View>

            {/* Calendar grid */}
            <View style={styles.calGrid}>
              {calDays.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.calCell, d === selDay && styles.calCellSelected]}
                  onPress={() => d && setSelDay(d)}
                  disabled={!d}
                >
                  {d ? <Text style={[styles.calDayText, d === selDay && styles.calDayTextSel]}>{d}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>

            {/* Time */}
            <Text style={styles.timeLabel}>Time</Text>
            <View style={styles.timeRow}>
              <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                {[8,9,10,11,12].map(h => (
                  <TouchableOpacity key={h} onPress={() => setSelHour(h)}>
                    <Text style={[styles.timeItem, h === selHour && styles.timeItemSel]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                {[0,15,30,45].map(m => (
                  <TouchableOpacity key={m} onPress={() => setSelMin(m)}>
                    <Text style={[styles.timeItem, m === selMin && styles.timeItemSel]}>{String(m).padStart(2,'0')}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.ampmCol}>
                {(['AM','PM'] as const).map(ap => (
                  <TouchableOpacity key={ap} onPress={() => setSelAmPm(ap)} style={[styles.ampmBtn, selAmPm===ap && styles.ampmBtnSel]}>
                    <Text style={[styles.ampmText, selAmPm===ap && styles.ampmTextSel]}>{ap}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Review Step ──
  if (step === 'Review') {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setStep('Form')}>
        <View style={styles.modalOverlay}>
          <View style={styles.reviewSheet}>
            <View style={styles.reviewTopRow}>
              <TouchableOpacity onPress={() => setStep('Form')}>
                <Feather name="arrow-left" size={22} color="#1A202C" />
              </TouchableOpacity>
              <Text style={styles.reviewTitle}>Review Appointment</Text>
              <View style={{ width: 22 }} />
            </View>

            <View style={styles.reviewIllustration}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={60} color="#6366F1" />
            </View>
            <Text style={styles.reviewHeading}>Please review the details</Text>
            <Text style={styles.reviewSub}>Make sure everything looks correct.</Text>

            {[
              { icon: <FontAwesome name="user-md" size={16} color="#6366F1" />, label: 'Doctor', value: form.doctorName },
              { icon: <MaterialCommunityIcons name="hospital-building" size={16} color="#6366F1" />, label: 'Hospital', value: form.clinic || '—' },
              { icon: <Feather name="calendar" size={16} color="#6366F1" />, label: 'Date & Time', value: formatDateTime(form.dateTime) },
              { icon: <Feather name="file-text" size={16} color="#6366F1" />, label: 'Reason / Notes', value: form.reason || '—' },
              { icon: <Feather name="bell" size={16} color="#6366F1" />, label: 'Reminder', value: reminderLabel(form.reminder) },
            ].map(row => (
              <View key={row.label} style={styles.reviewRow}>
                <View style={styles.reviewRowIcon}>{row.icon}</View>
                <Text style={styles.reviewRowLabel}>{row.label}</Text>
                <Text style={styles.reviewRowValue}>{row.value}</Text>
              </View>
            ))}

            <TouchableOpacity style={styles.confirmBtn} onPress={saveAppointment}>
              <Text style={styles.confirmBtnText}>Confirm &amp; Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('Form')} style={{ marginTop: 14, alignSelf: 'center' }}>
              <Text style={styles.editLink}>Edit Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Success Step ──
  if (step === 'Success') {
    const appt = healthStore.getAppointments()[0];
    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => { reset(); onSaved(); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.successSheet}>
            <View style={styles.successIconWrap}>
              <View style={styles.successCircle}>
                <Feather name="check" size={36} color="#38A169" />
              </View>
            </View>
            <Text style={styles.successTitle}>Appointment Added!</Text>
            <Text style={styles.successSub}>We'll remind you before your appointment.</Text>

            {appt && (
              <View style={styles.successCard}>
                <View style={styles.successDateBlock}>
                  <Text style={styles.successMonth}>{SHORT_MONTHS[new Date(appt.dateTime).getMonth()]}</Text>
                  <Text style={styles.successDay}>{new Date(appt.dateTime).getDate()}</Text>
                  <Text style={styles.successDayName}>{['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(appt.dateTime).getDay()]}</Text>
                </View>
                <View style={styles.successInfo}>
                  <Text style={styles.successDocName}>{appt.doctorName}</Text>
                  <Text style={styles.successSpecialty}>{appt.specialty || 'Doctor'}</Text>
                  <Text style={styles.successClinic}>{appt.clinic}</Text>
                </View>
                <Text style={styles.successTime}>
                  {new Date(appt.dateTime).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.doneBtn} onPress={() => { reset(); onSaved(); }}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Main Form ──
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={styles.formSheet}>
            {/* Top bar */}
            <View style={styles.formTopRow}>
              <TouchableOpacity onPress={() => { reset(); onClose(); }}>
                <Feather name="arrow-left" size={22} color="#1A202C" />
              </TouchableOpacity>
              <Text style={styles.formTitle}>Add Appointment</Text>
              <View style={{ width: 22 }} />
            </View>

            {/* Mode Toggle */}
            <View style={styles.modeToggle}>
              {(['Manual', 'Voice'] as const).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                  onPress={() => {
                    const plan = user?.plan_tier?.toLowerCase() ?? 'free';
                    if (m === 'Voice' && plan !== 'basic' && plan !== 'premium' && plan !== 'pro' && plan !== 'family') {
                      reset();
                      onClose();
                      navigation.navigate('UpgradePlan');
                      return;
                    }
                    setMode(m);
                  }}
                >
                  {m === 'Manual'
                    ? <Feather name="edit-3" size={15} color={mode === m ? '#FFFFFF' : '#6366F1'} style={{ marginRight: 6 }} />
                    : <Feather name="mic"    size={15} color={mode === m ? '#FFFFFF' : '#6366F1'} style={{ marginRight: 6 }} />
                  }
                  <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                    {m === 'Manual' ? 'Manual Entry' : 'Voice Mode'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {mode === 'Manual' ? (
                <>
                  <FormField
                    icon={<FontAwesome name="user-md" size={16} color="#A0AEC0" />}
                    placeholder="Doctor Name" label="Doctor Name"
                    value={form.doctorName}
                    onChange={v => setForm(f => ({ ...f, doctorName: v }))}
                  />
                  <FormField
                    icon={<MaterialCommunityIcons name="hospital-building" size={16} color="#A0AEC0" />}
                    placeholder="e.g. Mayo Clinic" label="Hospital / Clinic"
                    value={form.clinic}
                    onChange={v => setForm(f => ({ ...f, clinic: v }))}
                  />

                  {/* Date Time */}
                  <Text style={styles.fieldLabel}>Date &amp; Time</Text>
                  <TouchableOpacity style={styles.fieldRow} onPress={() => setStep('DateTime')}>
                    <Feather name="calendar" size={16} color="#A0AEC0" style={{ marginRight: 10 }} />
                    <Text style={[styles.fieldInput, !isValidDate(form.dateTime) && { color: '#A0AEC0' }]}>
                      {formatDateTime(form.dateTime)}</Text>
                    <Feather name="chevron-right" size={16} color="#A0AEC0" />
                  </TouchableOpacity>

                  <FormField
                    icon={<Feather name="file-text" size={16} color="#A0AEC0" />}
                    placeholder="Why are you visiting?" label="Reason / Notes"
                    value={form.reason}
                    onChange={v => setForm(f => ({ ...f, reason: v }))}
                    multiline
                  />

                  {/* Reminder */}
                  <Text style={styles.fieldLabel}>Reminder</Text>
                  <View style={styles.reminderRow}>
                    {([['1Day','1 Day Before'], ['2Hours','2 Hours Before'], ['30Mins','30 Mins Before']] as const).map(([val, lbl]) => (
                      <TouchableOpacity
                        key={val}
                        style={[styles.reminderChip, form.reminder === val && styles.reminderChipActive]}
                        onPress={() => setForm(f => ({ ...f, reminder: val }))}
                      >
                        <Feather name="bell" size={12} color={form.reminder === val ? '#FFFFFF' : '#6366F1'} style={{ marginRight: 4 }} />
                        <Text style={[styles.reminderChipText, form.reminder === val && styles.reminderChipTextActive]}>{lbl}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[styles.noReminderRow, form.reminder === 'None' && styles.noReminderActive]}
                    onPress={() => setForm(f => ({ ...f, reminder: 'None' }))}
                  >
                    <Feather name="bell-off" size={14} color={form.reminder === 'None' ? '#6366F1' : '#A0AEC0'} style={{ marginRight: 8 }} />
                    <Text style={[styles.noReminderText, form.reminder === 'None' && { color: '#6366F1', fontWeight: '700' }]}>No Reminder</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* Voice Mode */
                <View style={styles.voiceWrap}>
                  {isParsing ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center', height: 160 }}>
                      <ActivityIndicator size="large" color="#6366F1" />
                      <Text style={[styles.voiceStatus, { marginTop: 16 }]}>AI is analyzing your voice...</Text>
                    </View>
                  ) : (
                    <>
                      <Animated.View style={[styles.micOuter, { transform: [{ scale: pulseAnim }] }]}>
                        <TouchableOpacity style={styles.micBtn} onPress={toggleVoice} activeOpacity={0.85}>
                          <Feather name="mic" size={40} color={isListening ? '#FFFFFF' : '#6366F1'} />
                        </TouchableOpacity>
                      </Animated.View>
                      <Text style={styles.voiceStatus}>{isListening ? 'Listening...' : 'Tap to speak'}</Text>
                      <Text style={styles.voiceHint}>
                        {isListening
                          ? "Speak about your appointment\nWe'll capture the details for you."
                          : 'Say something like:\n"Dr. Sarah Johnson, Mayo Clinic, May 20 at 10:30 AM"'}
                      </Text>
                      {isListening && (
                        <View style={styles.waveRow}>
                          {Array.from({ length: 20 }).map((_, i) => (
                            <View
                              key={i}
                              style={[
                                styles.waveBar,
                                { height: 4 + Math.sin(i * 0.8) * 12 + Math.random() * 8,
                                  backgroundColor: i % 2 === 0 ? '#6366F1' : '#A5B4FC' }
                              ]}
                            />
                          ))}
                        </View>
                      )}
                      {isListening && (
                        <TouchableOpacity style={styles.stopBtn} onPress={toggleVoice}>
                          <View style={styles.stopDot} />
                          <Text style={styles.stopText}>Stop Recording</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, (!form.doctorName.trim() || !isValidDate(form.dateTime)) && styles.saveBtnDisabled]}
                activeOpacity={0.85}
                onPress={() => { if (form.doctorName.trim() && isValidDate(form.dateTime)) setStep('Review'); }}
                disabled={!form.doctorName.trim() || !isValidDate(form.dateTime)}
              >
                <Text style={styles.saveBtnText}>Save Appointment</Text>
              </TouchableOpacity>
              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── FormField ───────────────────────────────────────────────
function FormField({ icon, label, placeholder, value, onChange, multiline }: {
  icon: React.ReactNode; label: string; placeholder: string;
  value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldRow, multiline && { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
        <View style={{ marginRight: 10, marginTop: multiline ? 2 : 0 }}>{icon}</View>
        <TextInput
          style={[styles.fieldInput, multiline && { flex: 1, textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor="#A0AEC0"
          value={value}
          onChangeText={onChange}
          multiline={multiline}
        />
      </View>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFBFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F8',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F7F7FF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },

  tabRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF' },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F1FB', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#4F46E5' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: '#718096' },
  tabBtnTextActive: { color: '#FFFFFF' },

  listContent: { paddingHorizontal: 20, paddingTop: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#718096', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#4A5568', marginTop: 14 },
  emptySub: { fontSize: 13, color: '#A0AEC0', marginTop: 6 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 14,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  dateBlock: { alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 12, padding: 10, marginRight: 14, minWidth: 52 },
  dateMonth: { fontSize: 10, fontWeight: '700', color: '#6366F1', letterSpacing: 0.5 },
  dateDay: { fontSize: 24, fontWeight: '800', color: '#3730A3', lineHeight: 28 },
  dateDayName: { fontSize: 10, fontWeight: '600', color: '#818CF8' },
  cardInfo: { flex: 1 },
  cardDoctorName: { fontSize: 15, fontWeight: '700', color: '#1A202C' },
  cardSpecialty: { fontSize: 12, color: '#718096', marginTop: 1 },
  cardClinic: { fontSize: 12, color: '#718096', marginTop: 1 },
  dayBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  dayBadgeText: { fontSize: 11, fontWeight: '700' },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  cardTime: { fontSize: 13, fontWeight: '700', color: '#4A5568' },
  bellBtn: { padding: 4 },

  // Modal overlay
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },

  // Form Sheet
  formSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingTop: 20, maxHeight: '95%',
  },
  formTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  formTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C' },

  modeToggle: { flexDirection: 'row', gap: 10, marginBottom: 20, backgroundColor: '#F0EEFF', borderRadius: 14, padding: 4 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  modeBtnActive: { backgroundColor: '#4F46E5' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#6366F1' },
  modeBtnTextActive: { color: '#FFFFFF' },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#4A5568', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9F9FF', borderRadius: 14, borderWidth: 1.5, borderColor: '#E8E5FF',
    paddingHorizontal: 14, height: 52,
  },
  fieldInput: { flex: 1, fontSize: 14, color: '#1A202C' },

  reminderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  reminderChip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#6366F1', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  reminderChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  reminderChipText: { fontSize: 12, fontWeight: '600', color: '#6366F1' },
  reminderChipTextActive: { color: '#FFFFFF' },
  noReminderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  noReminderActive: {},
  noReminderText: { fontSize: 13, color: '#A0AEC0' },

  saveBtn: {
    backgroundColor: '#4F46E5', borderRadius: 16, height: 54,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  saveBtnDisabled: { backgroundColor: '#A5B4FC', shadowOpacity: 0.1 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Voice
  voiceWrap: { alignItems: 'center', paddingVertical: 20 },
  micOuter: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  micBtn: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  voiceStatus: { fontSize: 20, fontWeight: '800', color: '#1A202C', marginBottom: 8 },
  voiceHint: { fontSize: 13, color: '#718096', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 20, height: 36 },
  waveBar: { width: 4, borderRadius: 2, backgroundColor: '#6366F1' },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E53E3E', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 20,
  },
  stopDot: { width: 10, height: 10, borderRadius: 3, backgroundColor: '#E53E3E', marginRight: 8 },
  stopText: { color: '#E53E3E', fontWeight: '700', fontSize: 14 },

  // DateTime Picker
  dtSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32,
  },
  dtTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  dtCancel: { fontSize: 15, color: '#718096', fontWeight: '600' },
  dtTitle: { fontSize: 17, fontWeight: '800', color: '#1A202C' },
  dtDone: { fontSize: 15, color: '#4F46E5', fontWeight: '700' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthLabel: { fontSize: 17, fontWeight: '800', color: '#1A202C' },
  monthNav: { flexDirection: 'row', gap: 8 },
  dayLabelsRow: { flexDirection: 'row', marginBottom: 4 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#A0AEC0' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: (width - 40) / 7, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  calCellSelected: { backgroundColor: '#4F46E5' },
  calDayText: { fontSize: 14, color: '#2D3748', fontWeight: '500' },
  calDayTextSel: { color: '#FFFFFF', fontWeight: '800' },
  timeLabel: { fontSize: 14, fontWeight: '700', color: '#4A5568', marginTop: 16, marginBottom: 8 },
  timeRow: { flexDirection: 'row', height: 140, gap: 16 },
  timeScroll: { flex: 1 },
  timeItem: { textAlign: 'center', fontSize: 22, color: '#A0AEC0', paddingVertical: 8 },
  timeItemSel: { color: '#4F46E5', fontWeight: '800' },
  ampmCol: { justifyContent: 'center', gap: 8 },
  ampmBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F1FB' },
  ampmBtnSel: { backgroundColor: '#4F46E5' },
  ampmText: { fontSize: 14, fontWeight: '700', color: '#718096' },
  ampmTextSel: { color: '#FFFFFF' },

  // Review
  reviewSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingTop: 20, paddingBottom: 32,
  },
  reviewTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  reviewTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C' },
  reviewIllustration: { alignItems: 'center', marginBottom: 12 },
  reviewHeading: { fontSize: 20, fontWeight: '800', color: '#1A202C', textAlign: 'center' },
  reviewSub: { fontSize: 13, color: '#718096', textAlign: 'center', marginBottom: 20, marginTop: 4 },
  reviewRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F8', paddingVertical: 12,
  },
  reviewRowIcon: { width: 28, alignItems: 'center' },
  reviewRowLabel: { width: 90, fontSize: 13, color: '#718096', fontWeight: '600' },
  reviewRowValue: { flex: 1, fontSize: 13, color: '#1A202C', fontWeight: '700', textAlign: 'right' },
  confirmBtn: {
    backgroundColor: '#4F46E5', borderRadius: 16, height: 54,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  editLink: { fontSize: 14, color: '#6366F1', fontWeight: '600' },

  // Success
  successSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingTop: 24, paddingBottom: 36,
  },
  successIconWrap: { alignItems: 'center', marginBottom: 14 },
  successCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0FFF4', borderWidth: 3, borderColor: '#9AE6B4',
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#1A202C', textAlign: 'center' },
  successSub: { fontSize: 13, color: '#718096', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  successCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9FF',
    borderRadius: 16, padding: 14, marginBottom: 16,
  },
  successDateBlock: {
    alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 12, padding: 10, marginRight: 12, minWidth: 50,
  },
  successMonth: { fontSize: 10, fontWeight: '700', color: '#6366F1' },
  successDay: { fontSize: 22, fontWeight: '800', color: '#3730A3', lineHeight: 26 },
  successDayName: { fontSize: 10, fontWeight: '600', color: '#818CF8' },
  successInfo: { flex: 1 },
  successDocName: { fontSize: 15, fontWeight: '700', color: '#1A202C' },
  successSpecialty: { fontSize: 12, color: '#718096' },
  successClinic: { fontSize: 12, color: '#718096' },
  successTime: { fontSize: 14, fontWeight: '700', color: '#4A5568' },
  successOption: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F8', paddingVertical: 14,
  },
  successOptionText: { fontSize: 14, fontWeight: '600', color: '#2D3748' },
  doneBtn: {
    backgroundColor: '#4F46E5', borderRadius: 16, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  doneBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
