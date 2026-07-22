import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { healthStore } from '../store/healthStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateReminderLater'>;
type RoutePropType = RouteProp<RootStackParamList, 'CreateReminderLater'>;

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

type DateOption = 'today' | 'tomorrow' | 'custom';

export default function CreateReminderLaterScreen({ navigation, route }: Props) {
  const { prescriptionId } = route.params;

  // Retrieve prescription to get medicines count
  const prescriptions = healthStore.getPrescriptions();
  const prescription = prescriptions.find(p => p.id === prescriptionId);
  const medCount = prescription ? prescription.medicines.length : 2;

  const [startDate, setStartDate] = useState<DateOption>('today');
  const [morningTime, setMorningTime] = useState(healthStore.slotTimes.morning);
  const [afternoonTime, setAfternoonTime] = useState(healthStore.slotTimes.afternoon);
  const [nightTime, setNightTime] = useState(healthStore.slotTimes.night);

  // Modal editing time state
  const [editingPeriod, setEditingPeriod] = useState<'morning' | 'afternoon' | 'night' | null>(null);
  const [tempTime, setTempTime] = useState('');
  const [showTimeModal, setShowTimeModal] = useState(false);

  const openTimeEditor = (period: 'morning' | 'afternoon' | 'night') => {
    setEditingPeriod(period);
    if (period === 'morning') setTempTime(morningTime);
    else if (period === 'afternoon') setTempTime(afternoonTime);
    else setTempTime(nightTime);
    setShowTimeModal(true);
  };

  const saveTime = () => {
    if (editingPeriod === 'morning') setMorningTime(tempTime);
    else if (editingPeriod === 'afternoon') setAfternoonTime(tempTime);
    else if (editingPeriod === 'night') setNightTime(tempTime);
    
    setShowTimeModal(false);
    setEditingPeriod(null);
  };

  const handleCreateReminders = () => {
    // Call store mutation to create reminders and mark prescription active
    healthStore.createRemindersForPrescription(prescriptionId, startDate, {
      morning: morningTime,
      afternoon: afternoonTime,
      night: nightTime
    });

    // Navigate to Dashboard with success params to trigger active medication tab and toast
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
        <Text style={styles.headerTitle}>Create Reminder</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.bannerIconBg}>
            <Feather name="check" size={16} color="#047857" />
          </View>
          <Text style={styles.bannerText}>
            We will create reminders for {medCount} medicines.
          </Text>
        </View>

        <Text style={styles.sectionHeading}>When should reminders start?</Text>

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
            onPress={() => setStartDate('custom')}
          >
            <View>
              <Text style={styles.radioTitle}>Custom Date</Text>
              <Text style={styles.radioSubtitle}>Pick a date</Text>
            </View>
            <View style={[styles.radioCircle, startDate === 'custom' && styles.radioCircleActive]}>
              {startDate === 'custom' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Reminder Times Section */}
        <View style={styles.timesSection}>
          <Text style={styles.sectionTitle}>Reminder Times</Text>
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

      {/* Time Picker Edit Modal */}
      <Modal
        visible={showTimeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Reminder Time</Text>
            <Text style={styles.modalSub}>Enter time for {editingPeriod} reminders:</Text>
            
            <TextInput
              style={styles.timeInput}
              value={tempTime}
              onChangeText={setTempTime}
              placeholder="e.g. 08:00 AM"
              maxLength={8}
            />

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
    paddingTop: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  bannerIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 14,
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
  timeInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 20,
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
