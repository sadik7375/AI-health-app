import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { healthStore } from '../store/healthStore';
import { BASE_URL } from '../api/apiClient';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'PrescriptionDetails'>;
type RoutePropType = RouteProp<RootStackParamList, 'PrescriptionDetails'>;

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

export default function PrescriptionDetailsScreen({ navigation, route }: Props) {
  const { prescriptionId } = route.params;

  const [showFullScreen, setShowFullScreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    if (isDownloading) return;
    setIsDownloading(true);
    
    // Simulate a download progress with 1 second delay
    setTimeout(() => {
      setIsDownloading(false);
      Alert.alert(
        'Download Complete',
        'The prescription image has been saved to your device gallery successfully.',
        [{ text: 'OK' }]
      );
    }, 1000);
  };

  // Resolve backend server address dynamically for prescription images
  const getFullImageUri = (uri?: string) => {
    if (!uri) return undefined;
    if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('file://') || uri.startsWith('data:')) {
      return uri;
    }
    const host = BASE_URL.replace('/api', '');
    return `${host}${uri}`;
  };

  // Fetch prescription from store
  const prescriptions = healthStore.getPrescriptions();
  const prescription = prescriptions.find(p => p.id === prescriptionId);

  if (!prescription) {
    return (
      <SafeAreaView style={styles.errorArea}>
        <Text>Prescription not found!</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Dashboard')}>
          <Text style={styles.backBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isSavedOnly = prescription.status === 'Saved Only';
  const isActive = prescription.status === 'Reminder Active';

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
        <Text style={styles.headerTitle}>Prescription Details</Text>
        <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
          <Feather name="more-horizontal" size={22} color="#1A202C" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Prescription Metadata Card */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <Text style={styles.metaDate}>{prescription.date}</Text>
              <Text style={styles.metaDoctor}>{prescription.doctor}</Text>
              <Text style={styles.metaClinic}>{prescription.clinic}</Text>
              <Text style={styles.metaCount}>{prescription.medicines.length} Medicines</Text>
            </View>
            <View style={isSavedOnly ? styles.badgeOrange : styles.badgeGreen}>
              <Text style={isSavedOnly ? styles.badgeOrangeText : styles.badgeGreenText}>
                {prescription.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Medicines Section */}
        <Text style={styles.sectionTitle}>Medicines</Text>
        <View style={styles.medsList}>
          {prescription.medicines.map((med, idx) => {
            const isSos = med.type === 'sos';
            return (
              <View key={idx} style={styles.medItem}>
                <View style={styles.medLeft}>
                  <View style={[styles.medIconBg, isSos && styles.medIconBgSos]}>
                    <MaterialCommunityIcons 
                      name="pill" 
                      size={20} 
                      color={isSos ? '#F59E0B' : '#4F46E5'} 
                    />
                  </View>
                  <View style={styles.medDetails}>
                    <Text style={styles.medName}>{med.name}</Text>
                    <Text style={styles.medDosage}>{med.dosage}</Text>
                    
                    {!isSos && (
                      <View style={styles.timingRow}>
                        {med.timing.map((time, tIdx) => (
                          <View key={tIdx} style={styles.timingBadge}>
                            <Text style={styles.timingBadgeText}>{time}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.medRight}>
                  <Text style={styles.durationLabel}>Duration</Text>
                  <Text style={styles.durationValue}>{med.duration}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Prescription Image */}
        <Text style={styles.sectionTitle}>Prescription Image</Text>
        <View style={styles.imageCard}>
          {prescription.imageUri ? (
            <Image 
              source={{ uri: getFullImageUri(prescription.imageUri) }} 
              style={styles.prescriptionImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.mockDoc}>
              <Text style={styles.rxSymbol}>Rx</Text>
              <View style={styles.docLineLong} />
              <View style={styles.docLineMed} />
              <View style={[styles.docLineLong, { marginTop: 8 }]} />
              <View style={styles.docLineMed} />
              <View style={styles.docLineShort} />
            </View>
          )}

          {/* Action buttons under image card */}
          <View style={styles.imageActionsRow}>
            <TouchableOpacity 
              style={styles.imageOverlayTextBg}
              activeOpacity={0.7}
              onPress={() => setShowFullScreen(true)}
            >
              <Feather name="eye" size={16} color="#4F46E5" style={{ marginRight: 6 }} />
              <Text style={styles.imageOverlayText}>View Original Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.downloadIconBtn}
              activeOpacity={0.7}
              onPress={handleDownload}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <Feather name="download" size={16} color="#4F46E5" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={showFullScreen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullScreen(false)}
      >
        <View style={styles.fullScreenOverlay}>
          {/* Top Bar with Actions */}
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity 
              style={styles.closeModalBtn}
              onPress={() => setShowFullScreen(false)}
            >
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerRightActions}>
              <TouchableOpacity 
                style={styles.headerDownloadBtn}
                onPress={handleDownload}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="download" size={22} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Image Container */}
          <View style={styles.fullScreenImageContainer}>
            {prescription.imageUri ? (
              <Image 
                source={{ uri: getFullImageUri(prescription.imageUri) }} 
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={{ color: '#FFFFFF' }}>No image loaded</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.shareBtn} activeOpacity={0.7}>
          <Feather name="share-2" size={20} color="#4F46E5" />
        </TouchableOpacity>
        
        {isSavedOnly ? (
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CreateReminderLater', { prescriptionId })}
          >
            <Text style={styles.actionBtnText}>Create Reminder</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDisabled]}
            activeOpacity={0.9}
            disabled={true}
          >
            <Feather name="check-circle" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Reminders Active</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  metaCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9D8FD',
    padding: 20,
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metaLeft: {
    flex: 1,
  },
  metaDate: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  metaDoctor: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 6,
  },
  metaClinic: {
    fontSize: 14,
    color: '#4A5568',
    marginTop: 2,
  },
  metaCount: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
    marginTop: 8,
  },
  badgeOrange: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeOrangeText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeGreenText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 12,
  },
  medsList: {
    gap: 12,
    marginBottom: 24,
  },
  medItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  medLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  medIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medIconBgSos: {
    backgroundColor: '#FFFBEB',
  },
  medDetails: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
  },
  medDosage: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  timingRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  timingBadge: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  timingBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#718096',
  },
  medRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  durationLabel: {
    fontSize: 10,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  durationValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D3748',
    marginTop: 2,
  },
  imageCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  prescriptionImage: {
    width: '100%',
    height: 320,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mockDoc: {
    width: 140,
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    elevation: 1,
    opacity: 0.8,
  },
  rxSymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D3748',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 6,
  },
  docLineLong: {
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 1.5,
    width: '90%',
    marginBottom: 4,
  },
  docLineMed: {
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 1.5,
    width: '70%',
    marginBottom: 4,
  },
  docLineShort: {
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 1.5,
    width: '45%',
    marginBottom: 4,
  },
  imageOverlayTextBg: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  imageOverlayText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
  },
  imageActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    alignItems: 'center',
  },
  downloadIconBtn: {
    backgroundColor: '#E0E7FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  fullScreenHeader: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'ios' ? 44 : 20,
  },
  closeModalBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerDownloadBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fullScreenImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  fullScreenImage: {
    width: '100%',
    height: '90%',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 84,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  shareBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    height: 56,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionBtnDisabled: {
    backgroundColor: '#10B981',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
