import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { healthStore } from '../store/healthStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'StartReminders'>;
type RoutePropType = RouteProp<RootStackParamList, 'StartReminders'>;

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

type DateOption = 'today' | 'prescription' | 'tomorrow' | 'custom';

export default function StartRemindersScreen({ navigation, route }: Props) {
  const { prescriptionId } = route.params;

  const [startDate, setStartDate] = useState<DateOption>('prescription');
  const [morningTime, setMorningTime] = useState(healthStore.slotTimes.morning);
  const [afternoonTime, setAfternoonTime] = useState(healthStore.slotTimes.afternoon);
  const [nightTime, setNightTime] = useState(healthStore.slotTimes.night);

  // Custom Date Picker state
  const [customDateText, setCustomDateText] = useState('Pick a date');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState(20);
  const [selectedMonth, setSelectedMonth] = useState('May');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [dateHour, setDateHour] = useState('08');
  const [dateMin, setDateMin] = useState('30');
  const [dateAmPm, setDateAmPm] = useState('AM');

  // Modal editing time state
  const [editingPeriod, setEditingPeriod] = useState<'morning' | 'afternoon' | 'night' | null>(null);
  const [timeHour, setTimeHour] = useState('08');
  const [timeMin, setTimeMin] = useState('00');
  const [timeAmPm, setTimeAmPm] = useState('AM');
  const [showTimeModal, setShowTimeModal] = useState(false);

  // Generate calendar days for May 2026 (May 1st is Friday = index 5)
  const daysInMonth = 31;
  const startDayOffset = 5; 
  const daysArray: (number | null)[] = [];
  for (let i = 0; i < startDayOffset; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const openTimeEditor = (period: 'morning' | 'afternoon' | 'night') => {
    setEditingPeriod(period);
    let timeStr = period === 'morning' ? morningTime : period === 'afternoon' ? afternoonTime : nightTime;
    
    // Parse time like "08:00 AM"
    const parts = timeStr.split(' ');
    if (parts.length === 2) {
      const timeParts = parts[0].split(':');
      if (timeParts.length === 2) {
        setTimeHour(timeParts[0]);
        setTimeMin(timeParts[1]);
      }
      setTimeAmPm(parts[1]);
    }
    setShowTimeModal(true);
  };

  const saveTime = () => {
    const formatted = `${timeHour}:${timeMin} ${timeAmPm}`;
    if (editingPeriod === 'morning') setMorningTime(formatted);
    else if (editingPeriod === 'afternoon') setAfternoonTime(formatted);
    else if (editingPeriod === 'night') setNightTime(formatted);
    
    setShowTimeModal(false);
    setEditingPeriod(null);
  };

  const handleCreateReminders = () => {
    // Call store mutation to create reminders
    healthStore.createRemindersForPrescription(prescriptionId, startDate, {
      morning: morningTime,
      afternoon: afternoonTime,
      night: nightTime
    });

    // Navigate to Dashboard with success params to trigger active tab and toast
    navigation.navigate('Dashboard', {
      showToast: true,
      toastMessage: 'Reminders are now active and will notify you at the set times.',
      activeTab: 'Medications'
    } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Start Reminders</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Calendar Icon illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.iconCircleBg}>
            <Feather name="calendar" size={44} color="#4F46E5" />
            <View style={styles.clockSubBadge}>
              <Feather name="clock" size={12} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.heading}>When should reminders start?</Text>
        </View>

        {/* Start Date Radio List */}
        <View style={styles.radioList}>
          {/* Today */}
          <TouchableOpacity
            style={[styles.radioItem, startDate === 'today' && styles.radioItemActive]}
            activeOpacity={0.8}
            onPress={() => setStartDate('today')}
          >
            <View>
              <Text style={styles.radioTitle}>Today</Text>
              <Text style={styles.radioSubtitle}>Start from today</Text>
            </View>
            <View style={[styles.radioCircle, startDate === 'today' && styles.radioCircleActive]}>
              {startDate === 'today' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Prescription Start Date */}
          <TouchableOpacity
            style={[styles.radioItem, startDate === 'prescription' && styles.radioItemActive]}
            activeOpacity={0.8}
            onPress={() => setStartDate('prescription')}
          >
            <View>
              <Text style={styles.radioTitle}>Prescription Start Date</Text>
              <Text style={styles.radioSubtitle}>Use start date from prescription</Text>
            </View>
            <View style={[styles.radioCircle, startDate === 'prescription' && styles.radioCircleActive]}>
              {startDate === 'prescription' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Tomorrow */}
          <TouchableOpacity
            style={[styles.radioItem, startDate === 'tomorrow' && styles.radioItemActive]}
            activeOpacity={0.8}
            onPress={() => setStartDate('tomorrow')}
          >
            <View>
              <Text style={styles.radioTitle}>Tomorrow</Text>
              <Text style={styles.radioSubtitle}>Start from tomorrow</Text>
            </View>
            <View style={[styles.radioCircle, startDate === 'tomorrow' && styles.radioCircleActive]}>
              {startDate === 'tomorrow' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Custom Date */}
          <TouchableOpacity
            style={[styles.radioItem, startDate === 'custom' && styles.radioItemActive]}
            activeOpacity={0.8}
            onPress={() => {
              setStartDate('custom');
              setShowDatePicker(true);
            }}
          >
            <View>
              <Text style={styles.radioTitle}>Custom Date</Text>
              <Text style={styles.radioSubtitle}>
                {startDate === 'custom' ? customDateText : 'Pick a date'}
              </Text>
            </View>
            <View style={[styles.radioCircle, startDate === 'custom' && styles.radioCircleActive]}>
              {startDate === 'custom' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* AI Suggested Times Section */}
        <View style={styles.timesSection}>
          <Text style={styles.sectionTitle}>AI Suggested Times</Text>
          <Text style={styles.sectionSubtitle}>You can edit times before creating</Text>

          <View style={styles.timeInputsList}>
            {/* Morning */}
            <TouchableOpacity 
              style={styles.timeRow} 
              activeOpacity={0.7}
              onPress={() => openTimeEditor('morning')}
            >
              <View style={styles.timeRowLeft}>
                <Feather name="sun" size={20} color="#F59E0B" style={{ marginRight: 12 }} />
                <Text style={styles.timeLabel}>Morning</Text>
              </View>
              <View style={styles.timeRowRight}>
                <Text style={styles.timeText}>{morningTime}</Text>
                <Feather name="edit-2" size={14} color="#718096" style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>

            {/* Afternoon */}
            <TouchableOpacity 
              style={styles.timeRow} 
              activeOpacity={0.7}
              onPress={() => openTimeEditor('afternoon')}
            >
              <View style={styles.timeRowLeft}>
                <MaterialCommunityIcons name="weather-sunny" size={22} color="#D97706" style={{ marginRight: 10, marginLeft: -1 }} />
                <Text style={styles.timeLabel}>Afternoon</Text>
              </View>
              <View style={styles.timeRowRight}>
                <Text style={styles.timeText}>{afternoonTime}</Text>
                <Feather name="edit-2" size={14} color="#718096" style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>

            {/* Night */}
            <TouchableOpacity 
              style={styles.timeRow} 
              activeOpacity={0.7}
              onPress={() => openTimeEditor('night')}
            >
              <View style={styles.timeRowLeft}>
                <Feather name="moon" size={20} color="#4F46E5" style={{ marginRight: 12 }} />
                <Text style={styles.timeLabel}>Night</Text>
              </View>
              <View style={styles.timeRowRight}>
                <Text style={styles.timeText}>{nightTime}</Text>
                <Feather name="edit-2" size={14} color="#718096" style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.createBtn}
          activeOpacity={0.85}
          onPress={handleCreateReminders}
        >
          <Text style={styles.createBtnText}>Create Reminders</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Time Picker Edit Modal */}
      <Modal
        visible={showTimeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Reminder Time</Text>
            <Text style={styles.modalSub}>Select reminder time for {editingPeriod}:</Text>
            
            {/* Custom Interactive Time Selector */}
            <View style={styles.pickerSelectorRow}>
              {/* Hour Column */}
              <View style={styles.pickerCol}>
                <TouchableOpacity 
                  style={styles.pickerArrow} 
                  onPress={() => {
                    let hr = parseInt(timeHour);
                    hr = hr === 12 ? 1 : hr + 1;
                    setTimeHour(hr < 10 ? `0${hr}` : `${hr}`);
                  }}
                >
                  <Feather name="chevron-up" size={24} color="#4F46E5" />
                </TouchableOpacity>
                <View style={styles.pickerValBox}>
                  <Text style={styles.pickerValText}>{timeHour}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.pickerArrow}
                  onPress={() => {
                    let hr = parseInt(timeHour);
                    hr = hr === 1 ? 12 : hr - 1;
                    setTimeHour(hr < 10 ? `0${hr}` : `${hr}`);
                  }}
                >
                  <Feather name="chevron-down" size={24} color="#4F46E5" />
                </TouchableOpacity>
                <Text style={styles.pickerColLabel}>Hour</Text>
              </View>

              <Text style={styles.pickerColon}>:</Text>

              {/* Minute Column */}
              <View style={styles.pickerCol}>
                <TouchableOpacity 
                  style={styles.pickerArrow}
                  onPress={() => {
                    let mn = parseInt(timeMin);
                    mn = mn === 55 ? 0 : mn + 5;
                    setTimeMin(mn < 10 ? `0${mn}` : `${mn}`);
                  }}
                >
                  <Feather name="chevron-up" size={24} color="#4F46E5" />
                </TouchableOpacity>
                <View style={styles.pickerValBox}>
                  <Text style={styles.pickerValText}>{timeMin}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.pickerArrow}
                  onPress={() => {
                    let mn = parseInt(timeMin);
                    mn = mn === 0 ? 55 : mn - 5;
                    setTimeMin(mn < 10 ? `0${mn}` : `${mn}`);
                  }}
                >
                  <Feather name="chevron-down" size={24} color="#4F46E5" />
                </TouchableOpacity>
                <Text style={styles.pickerColLabel}>Min</Text>
              </View>

              {/* AM/PM Column */}
              <View style={styles.ampmContainer}>
                <TouchableOpacity 
                  style={[styles.ampmBtn, timeAmPm === 'AM' && styles.ampmBtnActive]}
                  onPress={() => setTimeAmPm('AM')}
                >
                  <Text style={[styles.ampmBtnText, timeAmPm === 'AM' && styles.ampmBtnTextActive]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.ampmBtn, timeAmPm === 'PM' && styles.ampmBtnActive]}
                  onPress={() => setTimeAmPm('PM')}
                >
                  <Text style={[styles.ampmBtnText, timeAmPm === 'PM' && styles.ampmBtnTextActive]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowTimeModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={saveTime}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <Text style={styles.modalTitle}>Select Date & Time</Text>
            <Text style={styles.modalSub}>Choose custom start date and time:</Text>
            
            {/* Calendar Widget */}
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarMonthText}>May 2026</Text>
              </View>
              
              {/* Day Labels */}
              <View style={styles.calendarWeekdays}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((wd, i) => (
                  <Text key={i} style={styles.weekdayLabel}>{wd}</Text>
                ))}
              </View>

              {/* Day Grid */}
              <View style={styles.calendarGrid}>
                {daysArray.map((day, idx) => {
                  if (day === null) {
                    return <View key={`empty-${idx}`} style={styles.emptyDayCell} />;
                  }

                  const isSelected = selectedDay === day;

                  return (
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={[styles.dayCell, isSelected && styles.dayCellActive]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text style={[styles.dayCellText, isSelected && styles.dayCellTextActive]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Time Selector */}
            <View style={styles.dividerLine} />
            <Text style={styles.timeSectionLabel}>Select Start Time</Text>
            
            <View style={styles.pickerSelectorRow}>
              {/* Hour */}
              <View style={styles.pickerCol}>
                <TouchableOpacity 
                  style={styles.pickerArrow}
                  onPress={() => {
                    let hr = parseInt(dateHour);
                    hr = hr === 12 ? 1 : hr + 1;
                    setDateHour(hr < 10 ? `0${hr}` : `${hr}`);
                  }}
                >
                  <Feather name="chevron-up" size={20} color="#4F46E5" />
                </TouchableOpacity>
                <View style={styles.pickerValBoxSmall}>
                  <Text style={styles.pickerValTextSmall}>{dateHour}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.pickerArrow}
                  onPress={() => {
                    let hr = parseInt(dateHour);
                    hr = hr === 1 ? 12 : hr - 1;
                    setDateHour(hr < 10 ? `0${hr}` : `${hr}`);
                  }}
                >
                  <Feather name="chevron-down" size={20} color="#4F46E5" />
                </TouchableOpacity>
              </View>

              <Text style={styles.pickerColon}>:</Text>

              {/* Minute */}
              <View style={styles.pickerCol}>
                <TouchableOpacity 
                  style={styles.pickerArrow}
                  onPress={() => {
                    let mn = parseInt(dateMin);
                    mn = mn === 55 ? 0 : mn + 5;
                    setDateMin(mn < 10 ? `0${mn}` : `${mn}`);
                  }}
                >
                  <Feather name="chevron-up" size={20} color="#4F46E5" />
                </TouchableOpacity>
                <View style={styles.pickerValBoxSmall}>
                  <Text style={styles.pickerValTextSmall}>{dateMin}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.pickerArrow}
                  onPress={() => {
                    let mn = parseInt(dateMin);
                    mn = mn === 0 ? 55 : mn - 5;
                    setDateMin(mn < 10 ? `0${mn}` : `${mn}`);
                  }}
                >
                  <Feather name="chevron-down" size={20} color="#4F46E5" />
                </TouchableOpacity>
              </View>

              {/* AM/PM */}
              <View style={styles.ampmContainerSmall}>
                <TouchableOpacity 
                  style={[styles.ampmBtnSmall, dateAmPm === 'AM' && styles.ampmBtnActiveSmall]}
                  onPress={() => setDateAmPm('AM')}
                >
                  <Text style={[styles.ampmBtnTextSmall, dateAmPm === 'AM' && styles.ampmBtnTextActiveSmall]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.ampmBtnSmall, dateAmPm === 'PM' && styles.ampmBtnActiveSmall]}
                  onPress={() => setDateAmPm('PM')}
                >
                  <Text style={[styles.ampmBtnTextSmall, dateAmPm === 'PM' && styles.ampmBtnTextActiveSmall]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => {
                  setCustomDateText(`${selectedDay} ${selectedMonth} ${selectedYear}, ${dateHour}:${dateMin} ${dateAmPm}`);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.modalSaveText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircleBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  clockSubBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    textAlign: 'center',
  },
  radioList: {
    gap: 12,
    marginBottom: 24,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  radioItemActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#FAF5FF',
  },
  radioTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  radioSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: '#4F46E5',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F46E5',
  },
  timesSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
    marginBottom: 14,
  },
  timeInputsList: {
    gap: 10,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  timeRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  createBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 32, 44, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
  },
  modalContentLarge: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  calendarContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    marginVertical: 12,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarMonthText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekdayLabel: {
    width: '13%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
  },
  emptyDayCell: {
    width: '13%',
    aspectRatio: 1,
  },
  dayCell: {
    width: '13%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dayCellActive: {
    backgroundColor: '#4F46E5',
  },
  dayCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3748',
  },
  dayCellTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  timeSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 6,
  },
  pickerSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  pickerCol: {
    alignItems: 'center',
  },
  pickerArrow: {
    padding: 4,
  },
  pickerValBox: {
    width: 60,
    height: 50,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerValText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  pickerColLabel: {
    fontSize: 10,
    color: '#718096',
    marginTop: 4,
    fontWeight: '600',
  },
  pickerColon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4F46E5',
    marginHorizontal: 4,
    paddingBottom: 20,
  },
  ampmContainer: {
    gap: 6,
    marginLeft: 12,
  },
  ampmBtn: {
    width: 50,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ampmBtnActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  ampmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#718096',
  },
  ampmBtnTextActive: {
    color: '#FFFFFF',
  },
  pickerValBoxSmall: {
    width: 50,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerValTextSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  ampmContainerSmall: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 10,
  },
  ampmBtnSmall: {
    width: 44,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ampmBtnActiveSmall: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  ampmBtnTextSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
  },
  ampmBtnTextActiveSmall: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#718096',
    fontSize: 15,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
