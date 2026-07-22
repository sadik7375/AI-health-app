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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReviewMedicines'>;
type RoutePropType = RouteProp<RootStackParamList, 'ReviewMedicines'>;

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

interface CustomMedForm {
  name: string;
  raw_notes: string;
  timings: string[];
  meal_relation: string;
  start_date: string;
  finish_date: string;
  duration_days: string;
  dose_quantity: string;
  dose_unit: string;
}

export default function ReviewMedicinesScreen({ navigation, route }: Props) {
  const { prescriptionId } = route.params;

  // Retrieve the prescription from store
  const initialPrescription = healthStore.getPrescriptions().find(p => p.id === prescriptionId);

  // Warning popup visibility
  const [showWarning, setShowWarning] = useState(true);

  // Date Picker modal visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateKey, setActiveDateKey] = useState<{ medIdx: number; field: 'start_date' | 'finish_date' } | null>(null);

  // Temporal Date Picker values
  const [pickerDay, setPickerDay] = useState(new Date().getDate());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // Parse initial prescription medicines into form state
  const [medicines, setMedicines] = useState<CustomMedForm[]>(() => {
    if (!initialPrescription) return [];
    return initialPrescription.medicines.map(m => {
      const isCapsule = m.name.toUpperCase().includes('CAP') || m.name.toUpperCase().includes('CAPSULE');
      
      // Force clean YYYY-MM-DD format by slicing first 10 characters (removes timezone strings)
      const startRaw = m.start_date || new Date().toISOString();
      const start = startRaw.substring(0, 10);
      
      const duration = m.duration_days || 30;
      
      // Calculate finish date = start + duration
      const startDateObj = new Date(start);
      startDateObj.setDate(startDateObj.getDate() + duration);
      const finish = startDateObj.toISOString().substring(0, 10);

      return {
        name: m.name,
        raw_notes: m.raw_notes || 'No instructions extracted',
        timings: m.timing || ['Morning'],
        meal_relation: m.meal_relation || 'after_meal',
        start_date: start,
        finish_date: finish,
        duration_days: duration.toString(),
        dose_quantity: m.dose_quantity ? m.dose_quantity.toString() : '1',
        dose_unit: m.dose_unit || (isCapsule ? 'Capsule' : 'Tablet'),
      };
    });
  });

  // Fallback if not found (should not happen)
  if (!initialPrescription) {
    return (
      <SafeAreaView style={styles.errorArea}>
        <Text style={styles.errorText}>Prescription not found!</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Dashboard')}>
          <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Calculate difference in days between two YYYY-MM-DD dates
  const calculateDuration = (start: string, finish: string) => {
    const startDateObj = new Date(start);
    const finishDateObj = new Date(finish);
    const diffTime = finishDateObj.getTime() - startDateObj.getTime();
    if (diffTime <= 0) return '1';
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays.toString();
  };

  // Update field value for a medicine
  const updateField = (index: number, key: keyof CustomMedForm, value: any) => {
    const updated = [...medicines];
    updated[index] = {
      ...updated[index],
      [key]: value
    };
    setMedicines(updated);
  };

  // Toggle timing selection (Morning, Afternoon, Night)
  const toggleTiming = (index: number, timing: string) => {
    const updated = [...medicines];
    const currentTimings = [...updated[index].timings];
    if (currentTimings.includes(timing)) {
      updated[index].timings = currentTimings.filter(t => t !== timing);
    } else {
      updated[index].timings = [...currentTimings, timing];
    }
    setMedicines(updated);
  };

  // Remove a medicine card
  const removeMedicine = (index: number) => {
    const updated = medicines.filter((_, idx) => idx !== index);
    setMedicines(updated);
  };


  // Open Date Picker for a specific medicine and date type
  const openDatePicker = (medIdx: number, field: 'start_date' | 'finish_date') => {
    const dateStr = medicines[medIdx][field];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      setPickerYear(parseInt(parts[0], 10));
      setPickerMonth(parseInt(parts[1], 10));
      setPickerDay(parseInt(parts[2], 10));
    } else {
      const today = new Date();
      setPickerYear(today.getFullYear());
      setPickerMonth(today.getMonth() + 1);
      setPickerDay(today.getDate());
    }
    setActiveDateKey({ medIdx, field });
    setShowDatePicker(true);
  };

  // Confirm Date Selection
  const savePickedDate = () => {
    if (activeDateKey) {
      const { medIdx, field } = activeDateKey;

      // Sanitize days in month
      let maxDays = 31;
      if ([4, 6, 9, 11].includes(pickerMonth)) {
        maxDays = 30;
      } else if (pickerMonth === 2) {
        const isLeap = (pickerYear % 4 === 0 && pickerYear % 100 !== 0) || (pickerYear % 400 === 0);
        maxDays = isLeap ? 29 : 28;
      }

      const sanitizedDay = Math.min(pickerDay, maxDays);
      const dayStr = sanitizedDay < 10 ? `0${sanitizedDay}` : sanitizedDay.toString();
      const monthStr = pickerMonth < 10 ? `0${pickerMonth}` : pickerMonth.toString();
      const dateStr = `${pickerYear}-${monthStr}-${dayStr}`;

      const updated = [...medicines];
      updated[medIdx] = {
        ...updated[medIdx],
        [field]: dateStr
      };

      // Auto-recalculate duration based on start and finish date difference
      const durationVal = calculateDuration(updated[medIdx].start_date, updated[medIdx].finish_date);
      updated[medIdx].duration_days = durationVal;

      setMedicines(updated);
      setShowDatePicker(false);
      setActiveDateKey(null);
    }
  };

  // Handle Looks Good action (navigates to ChooseAction)
  const handleLooksGood = () => {
    if (medicines.length === 0) {
      alert("Please add at least one medicine before continuing.");
      return;
    }

    // Basic Validation
    for (let i = 0; i < medicines.length; i++) {
      if (!medicines[i].name.trim()) {
        alert(`Medicine #${i + 1} has an empty name. Please write a name.`);
        return;
      }
    }

    // Save customized configurations back to the store's prescription record
    const currentPrescriptions = healthStore.getPrescriptions();
    const targetIdx = currentPrescriptions.findIndex(p => p.id === prescriptionId);
    if (targetIdx !== -1) {
      currentPrescriptions[targetIdx].medicines = medicines.map(m => {
        const timingsLabel = m.timings.join(' + ') || 'As Needed';
        const mealText = m.meal_relation.replace('_', ' ');
        
        return {
          name: m.name.trim(),
          dosage: `${m.dose_quantity} ${m.dose_unit} (${mealText})`,
          duration: `${m.duration_days} Days`,
          timing: m.timings,
          type: m.timings.length === 0 ? 'sos' : 'daily',
          raw_notes: m.raw_notes,
          start_date: m.start_date.trim(),
          duration_days: parseInt(m.duration_days, 10) || 30,
          meal_relation: m.meal_relation,
          dose_quantity: parseFloat(m.dose_quantity) || 1.0,
          dose_unit: m.dose_unit
        };
      });
    }

    // Navigate to ChooseAction Screen
    navigation.navigate('ChooseAction', { prescriptionId });
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
        <Text style={styles.headerTitle}>Review Medicines</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Doctor & Medicines Count Header Banner */}
        <View style={styles.alertBanner}>
          <View style={styles.alertIconBg}>
            <Feather name="check" size={16} color="#4F46E5" />
          </View>
          <View style={styles.alertTextCol}>
            <Text style={styles.alertTitle}>{initialPrescription.doctor}</Text>
            <Text style={styles.alertDesc}>{medicines.length} medicines found. Please review and confirm details.</Text>
          </View>
        </View>

        {/* Medicines list */}
        <View style={styles.medicinesList}>
          {medicines.map((med, idx) => (
            <View key={idx} style={styles.medCard}>
              {/* Card Header (Pill Icon + Name Input + Remove Button) */}
              <View style={styles.medCardHeader}>
                <View style={styles.medInfoRow}>
                  <View style={styles.pillIconBg}>
                    <MaterialCommunityIcons name="pill" size={20} color="#4F46E5" />
                  </View>
                  <TextInput
                    style={styles.medNameInput}
                    value={med.name}
                    onChangeText={(val) => updateField(idx, 'name', val)}
                    placeholder="Medicine Name"
                    placeholderTextColor="#A0AEC0"
                  />
                </View>
                <TouchableOpacity 
                  style={styles.removeBtn} 
                  activeOpacity={0.7}
                  onPress={() => removeMedicine(idx)}
                >
                  <Feather name="trash-2" size={18} color="#E53E3E" />
                </TouchableOpacity>
              </View>

              {/* AI Scanned Notes Box (High Contrast Indigo theme, English labels) */}
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>AI read:</Text>
                <Text style={styles.notesText}>"{med.raw_notes}"</Text>
              </View>

              {/* Schedule (Morning, Afternoon, Night) */}
              <Text style={styles.sectionLabel}>Schedule</Text>
              <View style={styles.chipsRow}>
                {['Morning', 'Afternoon', 'Night'].map(t => {
                  const active = med.timings.includes(t);
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chipBtn, active && styles.chipBtnActive]}
                      activeOpacity={0.8}
                      onPress={() => toggleTiming(idx, t)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {t} {active ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Meal Relation Selection */}
              <Text style={styles.sectionLabel}>Meal Relation</Text>
              <View style={styles.chipsRow}>
                {[
                  { key: 'before_meal', label: 'Before Meal' },
                  { key: 'after_meal', label: 'After Meal' },
                  { key: 'with_meal', label: 'With Meal' }
                ].map(item => {
                  const active = med.meal_relation === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.chipBtn, active && styles.chipBtnActive]}
                      activeOpacity={0.8}
                      onPress={() => updateField(idx, 'meal_relation', item.key)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Start Date & Finish Date (Both are Date Pickers!) */}
              <View style={styles.inputsGrid}>
                <View style={styles.gridCol}>
                  <Text style={styles.inputLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    activeOpacity={0.7}
                    onPress={() => openDatePicker(idx, 'start_date')}
                  >
                    <Text style={styles.datePickerText}>{med.start_date}</Text>
                    <Feather name="calendar" size={14} color="#718096" />
                  </TouchableOpacity>
                </View>

                <View style={styles.gridCol}>
                  <Text style={styles.inputLabel}>Finish Date</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    activeOpacity={0.7}
                    onPress={() => openDatePicker(idx, 'finish_date')}
                  >
                    <Text style={styles.datePickerText}>{med.finish_date}</Text>
                    <Feather name="calendar" size={14} color="#718096" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dose Quantity & Dose Unit (with Custom Width weights to avoid breaking unit chips) */}
              <View style={styles.inputsGrid}>
                {/* Dose Quantity taking 30% of the row */}
                <View style={{ flex: 0.3 }}>
                  <Text style={styles.inputLabel}>Dose</Text>
                  <TextInput
                    style={styles.gridInput}
                    value={med.dose_quantity}
                    onChangeText={(val) => {
                      const updated = [...medicines];
                      updated[idx].dose_quantity = val;
                      setMedicines(updated);
                    }}
                    keyboardType="numeric"
                    placeholder="e.g. 1"
                    placeholderTextColor="#A0AEC0"
                  />
                </View>

                {/* Dose Unit selection taking 70% of the row to prevent text wrap */}
                <View style={{ flex: 0.7 }}>
                  <Text style={styles.inputLabel}>Dose Unit</Text>
                  <View style={styles.unitChips}>
                    {['Tablet', 'Capsule', 'Spoon'].map(unit => {
                      const active = med.dose_unit === unit;
                      return (
                        <TouchableOpacity
                          key={unit}
                          style={[styles.smallChip, active && styles.smallChipActive]}
                          activeOpacity={0.8}
                          onPress={() => updateField(idx, 'dose_unit', unit)}
                        >
                          <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>{unit}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
              
              {/* Calculated duration feedback */}
              <Text style={styles.durationFeedbackText}>
                Total duration: <Text style={{ fontWeight: '700', color: '#4F46E5' }}>{med.duration_days} Days</Text>
              </Text>
            </View>
          ))}
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.looksGoodBtn}
            activeOpacity={0.85}
            onPress={handleLooksGood}
          >
            <Text style={styles.looksGoodBtnText}>Looks Good</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Robot Warning Alert Modal */}
      <Modal
        visible={showWarning}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWarning(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Robot Avatar Icon to look friendlier and match AI theme */}
            <View style={styles.robotIconBg}>
              <MaterialCommunityIcons name="robot" size={32} color="#4F46E5" />
            </View>
            <Text style={styles.modalTitle}>Check with prescription</Text>
            <Text style={styles.modalWarningText}>
              AI can make mistakes when scanning your prescription. 
              Please recheck and verify all medicine names, timings, start dates, and durations against your physical paper prescription before saving.
            </Text>
            
            <TouchableOpacity
              style={styles.warningConfirmBtn}
              activeOpacity={0.85}
              onPress={() => setShowWarning(false)}
            >
              <Text style={styles.warningConfirmText}>OK, Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <Text style={styles.modalSub}>Adjust Day, Month, and Year:</Text>
            
            <View style={styles.pickerSelectorRow}>
              {/* Day */}
              <View style={styles.pickerCol}>
                <Text style={styles.pickerColLabel}>Day</Text>
                <TouchableOpacity 
                  style={styles.pickerArrow}
                  onPress={() => setPickerDay(prev => prev === 31 ? 1 : prev + 1)}
                >
                  <Feather name="chevron-up" size={20} color="#4F46E5" />
                </TouchableOpacity>
                <View style={styles.pickerValBox}>
                  <Text style={styles.pickerValText}>{pickerDay < 10 ? `0${pickerDay}` : pickerDay}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.pickerArrow}
                  onPress={() => setPickerDay(prev => prev === 1 ? 31 : prev - 1)}
                >
                  <Feather name="chevron-down" size={20} color="#4F46E5" />
                </TouchableOpacity>
              </View>

              {/* Month */}
              <View style={styles.pickerCol}>
                <Text style={styles.pickerColLabel}>Month</Text>
                <TouchableOpacity 
                  style={styles.pickerArrow}
                  onPress={() => setPickerMonth(prev => prev === 12 ? 1 : prev + 1)}
                >
                  <Feather name="chevron-up" size={20} color="#4F46E5" />
                </TouchableOpacity>
                <View style={styles.pickerValBox}>
                  <Text style={styles.pickerValText}>{pickerMonth < 10 ? `0${pickerMonth}` : pickerMonth}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.pickerArrow}
                  onPress={() => setPickerMonth(prev => prev === 1 ? 12 : prev - 1)}
                >
                  <Feather name="chevron-down" size={20} color="#4F46E5" />
                </TouchableOpacity>
              </View>

              {/* Year */}
              <View style={styles.pickerCol}>
                <Text style={styles.pickerColLabel}>Year</Text>
                <TouchableOpacity 
                  style={styles.pickerArrow}
                  onPress={() => setPickerYear(prev => prev + 1)}
                >
                  <Feather name="chevron-up" size={20} color="#4F46E5" />
                </TouchableOpacity>
                <View style={styles.pickerValBox}>
                  <Text style={styles.pickerValText}>{pickerYear}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.pickerArrow}
                  onPress={() => setPickerYear(prev => prev - 1)}
                >
                  <Feather name="chevron-down" size={20} color="#4F46E5" />
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
                onPress={savePickedDate}
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
    backgroundColor: '#F8FAFC',
  },
  errorArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    borderColor: '#CBD5E0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  alertIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertTextCol: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  alertDesc: {
    fontSize: 12,
    color: '#4A5568',
    marginTop: 2,
    lineHeight: 16,
  },
  medicinesList: {
    gap: 16,
    marginBottom: 28,
  },
  medCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  medCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
    paddingBottom: 12,
    marginBottom: 12,
  },
  medInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  pillIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    paddingVertical: 4,
  },
  removeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesBox: {
    backgroundColor: '#F0F4FF',
    borderColor: '#E0E7FF',
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#1A202C',
    lineHeight: 18,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    marginTop: 4,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chipBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipBtnActive: {
    backgroundColor: '#EEF2F6',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
  },
  chipTextActive: {
    color: '#4F46E5',
  },
  inputsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  gridCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 6,
  },
  gridInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1A202C',
    backgroundColor: '#F8FAFC',
  },
  datePickerBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  datePickerText: {
    fontSize: 13,
    color: '#1A202C',
    fontWeight: '600',
  },
  unitChips: {
    flexDirection: 'row',
    gap: 6,
    height: 44,
    alignItems: 'center',
  },
  smallChip: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  smallChipActive: {
    backgroundColor: '#EEF2F6',
    borderColor: '#4F46E5',
  },
  smallChipText: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '600',
  },
  smallChipTextActive: {
    color: '#4F46E5',
  },
  durationFeedbackText: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
    marginBottom: 6,
  },
  bottomButtons: {
    gap: 12,
  },
  looksGoodBtn: {
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
  looksGoodBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  manualAddBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  manualAddBtnText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
    textAlign: 'center',
  },
  robotIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalWarningText: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  warningConfirmBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pickerSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 12,
  },
  pickerCol: {
    alignItems: 'center',
    width: 72,
  },
  pickerColLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#718096',
    marginBottom: 8,
  },
  pickerArrow: {
    padding: 4,
  },
  pickerValBox: {
    width: 64,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  pickerValText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
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
