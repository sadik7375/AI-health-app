import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, StatusBar, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { healthStore } from '../store/healthStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'NotificationSettings'>;
interface Props { navigation: Nav; }

export default function NotificationSettingsScreen({ navigation }: Props) {
  const [medReminders,   setMedReminders]   = useState(true);
  const [medSound,       setMedSound]       = useState(true);
  const [medVibrate,     setMedVibrate]     = useState(true);
  const [reminderBefore, setReminderBefore] = useState('10min');
  const [appUpdates,     setAppUpdates]     = useState(true);
  const [newsletter,     setNewsletter]     = useState(false);

  // Default Slot Times State
  const [morningTime, setMorningTime] = useState(healthStore.slotTimes.morning);
  const [afternoonTime, setAfternoonTime] = useState(healthStore.slotTimes.afternoon);
  const [nightTime, setNightTime] = useState(healthStore.slotTimes.night);

  // Time Picker states
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeSlot, setActiveSlot] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [pickerHour, setPickerHour] = useState('08');
  const [pickerMin, setPickerMin] = useState('00');
  const [pickerAmPm, setPickerAmPm] = useState('AM');

  const openTimePicker = (slot: 'morning' | 'afternoon' | 'night', timeStr: string) => {
    setActiveSlot(slot);
    const pts = timeStr.split(' ');
    if (pts.length === 2) {
      const hm = pts[0].split(':');
      if (hm.length === 2) {
        setPickerHour(hm[0]);
        setPickerMin(hm[1]);
      }
      setPickerAmPm(pts[1]);
    }
    setShowTimePicker(true);
  };

  const handleConfirmTime = () => {
    const finalTime = `${pickerHour}:${pickerMin} ${pickerAmPm}`;
    let nextMorning = morningTime;
    let nextAfternoon = afternoonTime;
    let nextNight = nightTime;

    if (activeSlot === 'morning') {
      setMorningTime(finalTime);
      nextMorning = finalTime;
    } else if (activeSlot === 'afternoon') {
      setAfternoonTime(finalTime);
      nextAfternoon = finalTime;
    } else if (activeSlot === 'night') {
      setNightTime(finalTime);
      nextNight = finalTime;
    }

    // Call store to persist settings and update active reminders
    healthStore.updateSlotTimes(nextMorning, nextAfternoon, nextNight);
    setShowTimePicker(false);
  };

  const BEFORE_CHIPS = ['5min', '10min', '15min', '30min'];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color="#1A202C" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notification Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Medicine Reminders */}
        <SectionCard title="Medicine Reminders" iconName="pill" iconColor="#4F46E5" iconBg="#EEF2FF">
          <ToggleRow icon="bell" iconBg="#EEF2FF" iconColor="#4F46E5"
            title="Medicine Reminders" sub="Get notified for each dose"
            val={medReminders} onToggle={setMedReminders} />
          <Divider />
          <ToggleRow icon="volume-2" iconBg="#ECFDF5" iconColor="#059669"
            title="Sound Alert" sub="Play sound when reminder triggers"
            val={medSound} onToggle={setMedSound} disabled={!medReminders} />
          <Divider />
          <ToggleRow icon="smartphone" iconBg="#FEF3C7" iconColor="#D97706"
            title="Vibration" sub="Vibrate on reminder"
            val={medVibrate} onToggle={setMedVibrate} disabled={!medReminders} />
          <Divider />
          <Text style={s.subLabel}>Remind me before</Text>
          <View style={s.chipRow}>
            {BEFORE_CHIPS.map(c => (
              <TouchableOpacity key={c}
                style={[s.chip, reminderBefore === c && s.chipActive, !medReminders && { opacity: 0.4 }]}
                onPress={() => medReminders && setReminderBefore(c)}>
                <Text style={[s.chipText, reminderBefore === c && s.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>
        {/* Reminder Slot Times */}
        <SectionCard title="Reminder Slot Times" iconName="clock" iconColor="#6C5CE7" iconBg="#F3F0FF">
          <View style={s.slotRow}>
            <View style={s.slotRowLeft}>
              <View style={[s.iconBg, { backgroundColor: '#EEF2FF' }]}>
                <Feather name="sun" size={16} color="#4F46E5" />
              </View>
              <View style={s.rowText}>
                <Text style={s.rowTitle}>Morning Reminder</Text>
                <Text style={s.rowSub}>Default time for morning doses</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={s.timeBadge}
              activeOpacity={0.8}
              onPress={() => openTimePicker('morning', morningTime)}
            >
              <Text style={s.timeBadgeText}>{morningTime}</Text>
              <Feather name="edit-2" size={12} color="#4F46E5" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
          <Divider />
          <View style={s.slotRow}>
            <View style={s.slotRowLeft}>
              <View style={[s.iconBg, { backgroundColor: '#ECFDF5' }]}>
                <Feather name="cloud" size={16} color="#059669" />
              </View>
              <View style={s.rowText}>
                <Text style={s.rowTitle}>Afternoon Reminder</Text>
                <Text style={s.rowSub}>Default time for afternoon doses</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={s.timeBadge}
              activeOpacity={0.8}
              onPress={() => openTimePicker('afternoon', afternoonTime)}
            >
              <Text style={s.timeBadgeText}>{afternoonTime}</Text>
              <Feather name="edit-2" size={12} color="#059669" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
          <Divider />
          <View style={s.slotRow}>
            <View style={s.slotRowLeft}>
              <View style={[s.iconBg, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="moon" size={16} color="#D97706" />
              </View>
              <View style={s.rowText}>
                <Text style={s.rowTitle}>Night Reminder</Text>
                <Text style={s.rowSub}>Default time for night doses</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={s.timeBadge}
              activeOpacity={0.8}
              onPress={() => openTimePicker('night', nightTime)}
            >
              <Text style={s.timeBadgeText}>{nightTime}</Text>
              <Feather name="edit-2" size={12} color="#D97706" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* General */}
        <SectionCard title="General" iconName="settings" iconColor="#718096" iconBg="#F1F5F9">
          <ToggleRow icon="refresh-cw" iconBg="#EEF2FF" iconColor="#4F46E5"
             title="App Updates" sub="Get notified about new features"
             val={appUpdates} onToggle={setAppUpdates} />
          <Divider />
          <ToggleRow icon="mail" iconBg="#FEF3C7" iconColor="#D97706"
             title="Newsletter" sub="Health articles and news"
             val={newsletter} onToggle={setNewsletter} />
        </SectionCard>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Time Picker Bottom Sheet Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: 400 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A202C' }}>
                Select {activeSlot.charAt(0).toUpperCase() + activeSlot.slice(1)} Time
              </Text>
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
              onPress={handleConfirmTime}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Confirm Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionCard({ title, iconName, iconColor, iconBg, children }: {
  title: string; iconName: string; iconColor: string; iconBg: string; children: React.ReactNode;
}) {
  return (
    <>
      <View style={s.sectionHeader}>
        <View style={[s.sectionIconBg, { backgroundColor: iconBg }]}>
          <Feather name={iconName as any} size={14} color={iconColor} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <View style={s.card}>{children}</View>
    </>
  );
}

function ToggleRow({ icon, iconBg, iconColor, title, sub, val, onToggle, disabled }: {
  icon: string; iconBg: string; iconColor: string; title: string; sub: string;
  val: boolean; onToggle: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <View style={[s.row, disabled && { opacity: 0.5 }]}>
      <View style={[s.iconBg, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={16} color={iconColor} />
      </View>
      <View style={s.rowText}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <Switch value={val} onValueChange={onToggle} disabled={disabled}
        trackColor={{ false: '#E2E8F0', true: '#C7D2FE' }}
        thumbColor={val ? '#4F46E5' : '#A0AEC0'} />
    </View>
  );
}

function Divider() { return <View style={s.divider} />; }

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F7F7FF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C' },
  scroll: { paddingHorizontal: 18, paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginLeft: 4 },
  sectionIconBg: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#4A5568', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, marginBottom: 20, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  iconBg: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#1A202C' },
  rowSub: { fontSize: 12, color: '#718096', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#F0F0F8', marginLeft: 50 },
  subLabel: { fontSize: 12, fontWeight: '600', color: '#718096', paddingTop: 4, paddingBottom: 10 },
  chipRow: { flexDirection: 'row', gap: 8, paddingBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8F9FF' },
  chipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#718096' },
  chipTextActive: { color: '#FFFFFF' },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  slotRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
});
