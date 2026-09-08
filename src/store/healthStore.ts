import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export interface MedicineInfo {
  name: string;
  dosage: string;
  duration: string;
  timing: string[]; // e.g. ['Morning', 'Night']
  type: 'daily' | 'sos';
  raw_notes?: string;
  start_date?: string;
  duration_days?: number;
  meal_relation?: string;
  dose_quantity?: number;
  dose_unit?: string;
}

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  clinic: string;
  dateTime: string; // ISO string
  reason: string;
  reminder: '1Day' | '2Hours' | '30Mins' | 'None';
  isPast: boolean;
}

export interface Prescription {
  id: string;
  date: string;
  doctor: string;
  clinic: string;
  status: 'Reminder Active' | 'Saved Only' | 'Completed';
  medicines: MedicineInfo[];
  imageUri?: string;
}

export interface MedicationReminder {
  id: string;
  prescriptionId?: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  type: 'daily' | 'sos';
  status: 'Taken' | 'Upcoming' | 'As Needed';
  slot?: string;
  date?: string;
  imageUri?: string;
}

export interface MedicineLogEntry {
  id: string;
  medicineId?: string;
  name: string;
  time: string;
  status: 'taken' | 'missed';
  logDate: string;
  takenAt?: string;
}

export interface LabParameter {
  label: string;
  value: string;
  refRange?: string;
  flag?: 'Normal' | 'High' | 'Low' | 'Critical';
}

export interface LabReport {
  id: string;
  name: string;
  date: string;
  lab: string;
  type: string;
  status: 'Normal' | 'High' | 'Low' | 'Critical' | 'Pending';
  imageUri?: string;
  ocrText?: string;
  ocrData: LabParameter[];
  notes?: string;
}

import { apiMedicines, apiAppointments, apiLabReports, apiAuth, apiPrescriptions, apiRequest } from '../api/apiClient';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (_) {}

type Listener = () => void;

class HealthStore {
  private prescriptions: Prescription[] = [];
  private reminders: MedicationReminder[] = [];
  private appointments: Appointment[] = [];
  private labReports: LabReport[] = [];
  private listeners: Set<Listener> = new Set();
  private isSynced: boolean = false;

  public slotTimes = {
    morning: '08:00 AM',
    afternoon: '02:00 PM',
    night: '08:00 PM',
  };

  public reminderBefore: string = '0min';

  constructor() {
    this.loadSlotTimes();
    // Attempt automatic background sync with Laravel backend API
    this.syncWithBackend();
  }

  private async loadSlotTimes() {
    try {
      const saved = await AsyncStorage.getItem('slot_times');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.morning) this.slotTimes.morning = parsed.morning;
        if (parsed.afternoon) this.slotTimes.afternoon = parsed.afternoon;
        if (parsed.night) this.slotTimes.night = parsed.night;
      }
      const savedBefore = await AsyncStorage.getItem('reminder_before');
      if (savedBefore) {
        this.reminderBefore = savedBefore;
      }
    } catch (_) {}
  }


  async syncWithBackend() {
    try {
      const [prescRes, medRes, apptRes, labRes] = await Promise.allSettled([
        apiPrescriptions.getAll(),
        apiMedicines.getAll(),
        apiAppointments.getAll(),
        apiLabReports.getAll(),
      ]);

      let hasSyncedAny = false;

      if (prescRes.status === 'fulfilled' && prescRes.value?.success) {
        const backendPrescs = prescRes.value.data;
        if (backendPrescs) {
          // Map backend prescriptions so imageUri is always populated correctly
          this.prescriptions = backendPrescs.map((p: any) => ({
            ...p,
            id: p.id ? p.id.toString() : `p_${Date.now()}`,
            doctor: p.doctor || p.doctor_name || 'Doctor',
            clinic: p.clinic || p.clinic_name || 'Clinic',
            date: p.date || p.prescription_date || (p.created_at ? p.created_at.substring(0, 10) : ''),
            status: p.status || 'Saved Only',
            imageUri: p.imageUri || p.image_path || p.image_url || p.image || undefined,
            medicines: Array.isArray(p.medicines) ? p.medicines : [],
          }));
          hasSyncedAny = true;
        }
      }

      if (medRes.status === 'fulfilled' && medRes.value?.success) {
        const backendMeds = medRes.value.medicines;
        if (backendMeds) {
          this.reminders = backendMeds.map((m: any) => ({
            id: m.id.toString(),
            prescriptionId: m.prescription_id ? m.prescription_id.toString() : undefined,
            name: m.name,
            dosage: m.dosage,
            time: m.time,
            taken: Boolean(m.taken),
            type: m.time?.toLowerCase() === 'as needed' ? 'sos' : 'daily',
            status: m.taken ? 'Taken' : (m.time?.toLowerCase() === 'as needed' ? 'As Needed' : 'Upcoming'),
            slot: m.raw_notes || undefined,
            date: (() => {
              if (m.time?.toLowerCase() === 'as needed') {
                return m.created_at ? new Date(m.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined;
              }
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const rawStartDate = m.start_date || m.created_at;
              if (rawStartDate) {
                const startDate = new Date(rawStartDate);
                if (!isNaN(startDate.getTime())) {
                  const compareDate = new Date(startDate);
                  compareDate.setHours(0, 0, 0, 0);
                  if (compareDate > today) {
                    return compareDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                  }
                }
              }
              return new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            })(),
          }));
          hasSyncedAny = true;
        }
      }

      if (apptRes.status === 'fulfilled' && apptRes.value?.success) {
        const backendAppts = apptRes.value.appointments;
        if (backendAppts) {
          this.appointments = backendAppts.map((a: any) => ({
            id: a.id.toString(),
            doctorName: a.doctor_name,
            specialty: a.specialty,
            clinic: a.clinic,
            dateTime: a.date_time,
            reason: a.reason || '',
            reminder: a.reminder_alert || '1Day',
            isPast: Boolean(a.is_past),
          }));
          hasSyncedAny = true;
        }
      }

      if (labRes.status === 'fulfilled' && labRes.value?.success) {
        const backendLabs = labRes.value.reports;
        if (backendLabs) {
          this.labReports = backendLabs.map((l: any) => ({
            id: l.id.toString(),
            name: l.name,
            date: l.report_date ? l.report_date.substring(0, 10) : '',
            lab: l.lab_name,
            type: l.report_type,
            status: l.status,
            imageUri: l.image_path || undefined,
            ocrText: l.ocr_text || undefined,
            ocrData: Array.isArray(l.parameters) ? l.parameters : [],
            notes: l.notes || undefined,
          }));
          hasSyncedAny = true;
        }
      }

      this.isSynced = true;
      this.scheduleAllNotifications();
      this.notify();
    } catch (_) {
      // Backend not active yet - gracefully keep local mock state
    }
  }

  getPrescriptions(): Prescription[] {
    return this.prescriptions;
  }

  getReminders(): MedicationReminder[] {
    return this.reminders;
  }

  updateReminderImage(id: string, imageUri?: string) {
    const rem = this.reminders.find(r => r.id === id);
    if (rem) {
      rem.imageUri = imageUri;
      this.notify();
    }
  }

  async getMedicationHistory(): Promise<MedicineLogEntry[]> {
    try {
      const res = await apiMedicines.getHistory();
      if (res && res.success && res.history) {
        return res.history.map((log: any) => ({
          id: log.id.toString(),
          medicineId: log.medicine_id ? log.medicine_id.toString() : undefined,
          name: log.name,
          time: log.time,
          status: log.status,
          logDate: log.log_date ? log.log_date.substring(0, 10) : '',
          takenAt: log.taken_at || undefined,
        }));
      }
    } catch (err) {
      console.warn("Failed to fetch medication history:", err);
    }
    return [];
  }

  getAppointments(): Appointment[] {
    return this.appointments;
  }

  getLabReports(): LabReport[] {
    return this.labReports;
  }

  async addAppointment(data: Omit<Appointment, 'id'>) {
    const appt: Appointment = { id: `a_${Date.now()}`, ...data };
    this.appointments = [appt, ...this.appointments];
    this.notify();

    try {
      await apiAppointments.create({
        doctor_name: data.doctorName,
        specialty: data.specialty,
        clinic: data.clinic,
        date_time: data.dateTime,
        reason: data.reason,
        reminder_alert: data.reminder,
      });
    } catch (_) {}
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  addPrescription(prescription: any) {
    const mapped: Prescription = {
      ...prescription,
      id: prescription.id ? prescription.id.toString() : `p_${Date.now()}`,
      doctor: prescription.doctor || prescription.doctor_name || 'Doctor',
      clinic: prescription.clinic || prescription.clinic_name || 'Clinic',
      date: prescription.date || prescription.prescription_date || new Date().toISOString().substring(0, 10),
      status: prescription.status || 'Saved Only',
      imageUri: prescription.imageUri || prescription.image_path || prescription.image_url || prescription.image || undefined,
      medicines: Array.isArray(prescription.medicines) ? prescription.medicines : [],
    };
    this.prescriptions = [mapped, ...this.prescriptions];
    this.notify();
  }

  updatePrescriptionStatus(id: string, status: Prescription['status']) {
    this.prescriptions = this.prescriptions.map(p =>
      p.id === id ? { ...p, status } : p
    );
    this.notify();
  }

  async addManualReminder(med: { name: string; dosage: string; time: string; date?: string }) {
    const formattedDate = med.date 
      ? new Date(med.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    const newReminder: MedicationReminder = {
      id: `r_manual_${Date.now()}`,
      prescriptionId: undefined,
      name: med.name,
      dosage: med.dosage,
      time: med.time,
      taken: false,
      type: med.time.toLowerCase() === 'as needed' ? 'sos' : 'daily',
      status: med.time.toLowerCase() === 'as needed' ? 'As Needed' : 'Upcoming',
      date: formattedDate,
    };
    this.reminders = [...this.reminders, newReminder];
    this.notify();
    this.scheduleAllNotifications();

    try {
      await apiMedicines.addManual({
        name: med.name,
        dosage: med.dosage,
        time: med.time,
        date: med.date,
      });
    } catch (_) {}
  }

  async toggleReminderTaken(id: string) {
    this.reminders = this.reminders.map(r => {
      if (r.id === id) {
        const nextTaken = !r.taken;
        return {
          ...r,
          taken: nextTaken,
          status: r.type === 'sos' ? 'As Needed' : (nextTaken ? 'Taken' : 'Upcoming')
        };
      }
      return r;
    });
    this.notify();
    this.scheduleAllNotifications();

    try {
      await apiMedicines.toggleTaken(id);
    } catch (_) {}
  }

  async updateReminder(id: string, updated: { name: string; dosage: string; time: string; date?: string }) {
    this.reminders = this.reminders.map(r => {
      if (r.id === id) {
        const formattedDate = updated.date 
          ? new Date(updated.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
          : r.date;
        return {
          ...r,
          name: updated.name,
          dosage: updated.dosage,
          time: updated.time,
          date: formattedDate,
        };
      }
      return r;
    });
    this.notify();
    this.scheduleAllNotifications();

    try {
      await apiMedicines.update(id, updated);
    } catch (_) {}
  }

  async deleteReminder(id: string) {
    this.reminders = this.reminders.filter(r => r.id !== id);
    this.notify();
    this.scheduleAllNotifications();

    try {
      await apiMedicines.delete(id);
    } catch (_) {}
  }

  async createRemindersForPrescription(
    prescriptionId: string, 
    startDateOption: string,
    customTimes?: { morning?: string, afternoon?: string, night?: string }
  ) {
    const prescription = this.prescriptions.find(p => p.id === prescriptionId);
    if (!prescription) return;

    const morningTime = customTimes?.morning || '08:00 AM';
    const afternoonTime = customTimes?.afternoon || '02:00 PM';
    const nightTime = customTimes?.night || '08:00 PM';

    // Map medicines list from prescription model details configured on review screen
    const customMedicines = prescription.medicines.map(m => {
      // Handle fallback values if user didn't fully configure them
      const timings = m.timing || [];
      const mealRelation = m.meal_relation || 'after_meal';
      const startDate = m.start_date || new Date().toISOString().split('T')[0];
      const durationDays = m.duration_days || 30;
      const doseQuantity = m.dose_quantity || 1;
      const doseUnit = m.dose_unit || 'Tablet';

      return {
        name: m.name,
        timings: timings,
        meal_relation: mealRelation,
        start_date: startDate,
        duration_days: durationDays,
        dose_quantity: doseQuantity,
        dose_unit: doseUnit
      };
    });

    // Optimistically update status to active locally so it feels fast
    this.updatePrescriptionStatus(prescriptionId, 'Reminder Active');

    try {
      await apiPrescriptions.activateReminders(prescriptionId, {
        morning: morningTime,
        afternoon: afternoonTime,
        night: nightTime,
        medicines: customMedicines
      });
      // Re-sync with backend to get the split timing reminder rows saved in DB
      await this.syncWithBackend();
    } catch (err) {
      console.warn("Failed to activate reminders on backend, keeping local fallback:", err);

      // Local fallback in case backend is unreachable
      this.reminders = this.reminders.filter(r => r.prescriptionId !== prescriptionId);
      const newReminders: MedicationReminder[] = [];

      customMedicines.forEach((med, idx) => {
        const dosageLabel = `${med.dose_quantity} ${med.dose_unit} (${med.meal_relation.replace('_', ' ')})`;
        if (med.timings.length === 0) {
          newReminders.push({
            id: `r_new_${prescriptionId}_${idx}_sos`,
            prescriptionId: prescriptionId,
            name: med.name,
            dosage: dosageLabel,
            time: 'As Needed',
            taken: false,
            type: 'sos',
            status: 'As Needed',
            slot: 'As Needed',
            date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
          });
        } else {
          med.timings.forEach((timeKey, tIdx) => {
            let medTime = morningTime;
            if (timeKey === 'Morning') {
              medTime = morningTime;
            } else if (timeKey === 'Afternoon') {
              medTime = afternoonTime;
            } else if (timeKey === 'Night') {
              medTime = nightTime;
            }

            newReminders.push({
              id: `r_new_${prescriptionId}_${idx}_${tIdx}`,
              prescriptionId: prescriptionId,
              name: med.name,
              dosage: dosageLabel,
              time: medTime,
              taken: false,
              type: 'daily',
              status: 'Upcoming',
              slot: timeKey,
              date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
            });
          });
        }
      });

      this.reminders = [...newReminders, ...this.reminders];
      this.notify();
      this.scheduleAllNotifications();
    }
  }

  async scanLabReport(imageUri: string, reportType: string) {
    const formData = new FormData();
    formData.append('report_type', reportType);

    const filename = imageUri.split('/').pop() || 'lab_report.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type: type,
    } as any);

    try {
      const response = await apiLabReports.scanReport(formData);
      return response;
    } catch (err) {
      console.warn("Failed to scan lab report via API, using fallback:", err);
      return {
        success: true,
        image_path: imageUri,
        extraction: {
          success: true,
          name: reportType === 'Lipid Profile' ? 'Lipid Profile' : 'Complete Blood Count (CBC)',
          lab_name: 'Popular Diagnostic Centre',
          report_type: reportType,
          report_date: new Date().toISOString().substring(0, 10),
          status: reportType === 'Lipid Profile' ? 'High' : 'Normal',
          notes: 'Mock scanned offline report data generated.',
          parameters: reportType === 'Lipid Profile' ? [
            { label: 'Total Cholesterol', value: '242 mg/dL', refRange: '< 200', flag: 'High' },
            { label: 'HDL Cholesterol', value: '38 mg/dL', refRange: '> 40', flag: 'Low' },
            { label: 'LDL Cholesterol', value: '172 mg/dL', refRange: '< 100', flag: 'High' },
          ] : [
            { label: 'Hemoglobin', value: '14.2 g/dL', refRange: '13.0 - 17.0', flag: 'Normal' },
            { label: 'WBC Count', value: '8200 /cmm', refRange: '4000 - 11000', flag: 'Normal' },
            { label: 'Platelet Count', value: '245000 /cmm', refRange: '150000 - 450000', flag: 'Normal' },
          ]
        }
      };
    }
  }

  async saveLabReport(reportPayload: {
    name: string;
    lab_name: string;
    report_type: string;
    report_date: string;
    status: 'Normal' | 'High' | 'Low' | 'Critical' | 'Pending';
    parameters: LabParameter[];
    notes?: string;
    image_path?: string;
  }) {
    try {
      const response = await apiRequest('/lab-reports', 'POST', reportPayload);
      if (response && response.success) {
        await this.syncWithBackend();
        
        const l = response.report;
        const mappedReport: LabReport = {
          id: l.id.toString(),
          name: l.name,
          date: l.report_date ? l.report_date.substring(0, 10) : '',
          lab: l.lab_name,
          type: l.report_type,
          status: l.status,
          imageUri: l.image_path || undefined,
          ocrText: l.ocr_text || undefined,
          ocrData: Array.isArray(l.parameters) ? l.parameters : [],
          notes: l.notes || undefined,
        };
        
        return { success: true, report: mappedReport };
      }
    } catch (err) {
      console.warn("Failed to save lab report on backend, saving locally:", err);
    }

    const localNewReport: LabReport = {
      id: `lab_local_${Date.now()}`,
      name: reportPayload.name,
      date: reportPayload.report_date,
      lab: reportPayload.lab_name,
      type: reportPayload.report_type,
      status: reportPayload.status,
      imageUri: reportPayload.image_path,
      ocrText: 'Saved Offline',
      ocrData: reportPayload.parameters,
      notes: reportPayload.notes,
    };
    this.labReports = [localNewReport, ...this.labReports];
    this.notify();
    return { success: true, report: localNewReport };
  }

  async updateSlotTimes(morning: string, afternoon: string, night: string) {
    // 1. Update store local defaults
    this.slotTimes.morning = morning;
    this.slotTimes.afternoon = afternoon;
    this.slotTimes.night = night;

    // 2. Persist defaults to AsyncStorage
    try {
      await AsyncStorage.setItem('slot_times', JSON.stringify(this.slotTimes));
    } catch (_) {}

    // 3. Update existing active reminders in memory
    this.reminders = this.reminders.map(r => {
      if (r.slot === 'Morning') {
        return { ...r, time: morning };
      }
      if (r.slot === 'Afternoon') {
        return { ...r, time: afternoon };
      }
      if (r.slot === 'Night') {
        return { ...r, time: night };
      }
      return r;
    });
    this.notify();
    this.scheduleAllNotifications();

    // 4. Update existing reminders in Laravel backend
    try {
      await apiRequest('/medicines/update-slot-times', 'POST', { morning, afternoon, night });
    } catch (_) {}
  }

  async updateReminderBefore(value: string) {
    this.reminderBefore = value;
    try {
      await AsyncStorage.setItem('reminder_before', value);
    } catch (_) {}
    this.notify();
    this.scheduleAllNotifications();
  }

  async scheduleAllNotifications() {
    try {
      // 1. Set up notification channel for Android (sound, vibration, priority)
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('medicine-reminders', {
            name: 'Medicine Reminders',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 250, 500, 250, 500, 250, 500],
            lightColor: '#6366F1',
            sound: 'default',
            bypassDnd: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
        } catch (_) {}
      }

      // 2. Cancel all existing scheduled notifications first
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
      } catch (_) {}

      // 3. Request permission
      let status = 'denied';
      try {
        const res = await Notifications.requestPermissionsAsync();
        status = res.status;
      } catch (_) {}

      if (status !== 'granted') return;

      // 4. Schedule recurring daily notification for each active reminder
      for (const rem of this.reminders) {
        if (rem.taken) continue; // Don't schedule if already taken today

        const timeStr = rem.time;
        if (!timeStr) continue;

        const pts = timeStr.split(' ');
        if (pts.length !== 2) continue;
        const hm = pts[0].split(':');
        if (hm.length !== 2) continue;

        let hours = parseInt(hm[0], 10);
        let minutes = parseInt(hm[1], 10);
        const ampm = pts[1].toUpperCase();

        if (ampm === 'PM' && hours !== 12) {
          hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0;
        }

        // Apply "reminderBefore" offset
        if (this.reminderBefore && this.reminderBefore !== '0min') {
          const beforeMinutes = parseInt(this.reminderBefore, 10);
          if (!isNaN(beforeMinutes)) {
            minutes -= beforeMinutes;
            if (minutes < 0) {
              minutes += 60;
              hours -= 1;
              if (hours < 0) {
                hours += 24;
              }
            }
          }
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Time for your medicine: ${rem.name}! 💊`,
            body: `Dosage: ${rem.dosage}. Please take it now.`,
            data: { reminderId: rem.id },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: hours,
            minute: minutes,
            repeats: true,
            channelId: 'medicine-reminders',
          },
        });
      }
    } catch (err) {
      console.warn("Failed to schedule notifications:", err);
    }
  }

  clearData() {
    this.prescriptions = [];
    this.reminders = [];
    this.appointments = [];
    this.isSynced = false;
    this.notify();
  }
}

export const healthStore = new HealthStore();
