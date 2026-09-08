import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { healthStore } from '../store/healthStore';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ScanPrescription'>;

interface Props {
  navigation: NavigationProp;
}

export default function ScanPrescriptionScreen({ navigation }: Props) {
  const { user } = useAuth();

  const checkScanLimit = () => {
    const plan = user?.plan_tier?.toLowerCase() ?? 'free';
    const prescriptionsList = healthStore.getPrescriptions();
    
    if (plan === 'free') {
      if (prescriptionsList.length >= 1) {
        navigation.navigate('UpgradePlan');
        return false;
      }
    } else if (plan === 'basic' || plan === 'pro') {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyScans = prescriptionsList.filter(p => {
        const pDate = new Date(p.date);
        return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
      }).length;

      if (monthlyScans >= 10) {
        navigation.navigate('UpgradePlan');
        return false;
      }
    } else if (plan === 'premium' || plan === 'family') {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyScans = prescriptionsList.filter(p => {
        const pDate = new Date(p.date);
        return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
      }).length;

      if (monthlyScans >= 30) {
        Alert.alert(
          'Monthly Limit Reached',
          'Premium plan is limited to 30 prescription scans per month.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };
  
  // Request Camera & Library Permissions
  const takePhoto = async () => {
    if (!checkScanLimit()) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to scan prescriptions.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.4,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        navigation.navigate('AIExtracting', { imageUri: result.assets[0].uri });
      }
    } catch (err: any) {
      Alert.alert('Error', 'Could not access camera: ' + err.message);
    }
  };

  const chooseFromGallery = async () => {
    if (!checkScanLimit()) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library permission is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.4,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        navigation.navigate('AIExtracting', { imageUri: result.assets[0].uri });
      }
    } catch (err: any) {
      Alert.alert('Error', 'Could not open gallery: ' + err.message);
    }
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
        <Text style={styles.headerTitle}>Scan Prescription</Text>
        <View style={{ width: 40 }} /> {/* Spacer to align title center */}
      </View>

      <View style={styles.content}>
        {/* Mock Viewfinder */}
        <View style={styles.cameraContainer}>
          <View style={styles.viewfinder}>
            {/* Corner Guides */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Mock Prescription Document */}
            <View style={styles.mockDoc}>
              <Text style={styles.rxSymbol}>Rx</Text>
              <View style={styles.docLineLong} />
              <View style={styles.docLineMed} />
              <View style={[styles.docLineLong, { marginTop: 12 }]} />
              <View style={styles.docLineMed} />
              <View style={styles.docLineShort} />
              <View style={[styles.docLineLong, { marginTop: 12 }]} />
              <View style={styles.docLineMed} />
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionTitle}>Scan your prescription</Text>
          <Text style={styles.instructionDesc}>
            Place the prescription on a flat surface in good lighting and capture.
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={takePhoto}
          >
            <Feather name="camera" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={chooseFromGallery}
          >
            <Feather name="image" size={20} color="#4F46E5" style={{ marginRight: 8 }} />
            <Text style={styles.secondaryBtnText}>Choose from Gallery</Text>
          </TouchableOpacity>

          <Text style={styles.supportText}>We support JPG, PNG and PDF</Text>
        </View>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  viewfinder: {
    width: width - 48,
    aspectRatio: 0.85,
    backgroundColor: '#F7FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#4F46E5',
  },
  topLeft: {
    top: 20,
    left: 20,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 20,
    right: 20,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 20,
    left: 20,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 20,
    right: 20,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  mockDoc: {
    width: '55%',
    height: '65%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  rxSymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3748',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 10,
  },
  docLineLong: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    width: '90%',
    marginBottom: 6,
  },
  docLineMed: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    width: '70%',
    marginBottom: 6,
  },
  docLineShort: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    width: '45%',
    marginBottom: 6,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  instructionDesc: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  primaryBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  supportText: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 4,
  },
});
