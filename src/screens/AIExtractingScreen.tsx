import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { healthStore } from '../store/healthStore';

import { RouteProp, useRoute } from '@react-navigation/native';
import { apiPrescriptions } from '../api/apiClient';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AIExtracting'>;
type AIExtractingRouteProp = RouteProp<RootStackParamList, 'AIExtracting'>;

interface Props {
  navigation: NavigationProp;
}

export default function AIExtractingScreen({ navigation }: Props) {
  const route = useRoute<AIExtractingRouteProp>();
  const { imageUri } = route.params;

  const [step, setStep] = useState(0); // 0 to 4
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;

  // Pulse animations for loader circles
  useEffect(() => {
    const pulse1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim1, {
          toValue: 1.4,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim1, {
          toValue: 1.0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    const pulse2 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim2, {
          toValue: 1.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim2, {
          toValue: 1.0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    pulse1.start();
    pulse2.start();

    return () => {
      pulse1.stop();
      pulse2.stop();
    };
  }, []);

  // Upload image to backend & perform real AI extraction
  useEffect(() => {
    let active = true;

    const performExtraction = async () => {
      try {
        if (active) setStep(0);
        
        // 1. Prepare Form Data
        const uriParts = imageUri.split('/');
        const filename = uriParts[uriParts.length - 1];
        const fileType = filename.split('.').pop();

        const formData = new FormData();
        formData.append('image', {
          uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
          name: filename,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        } as any);

        if (active) setStep(1);

        // 2. Call API Scan
        const response = await apiPrescriptions.scan(formData);

        if (active) setStep(2);

        if (response && response.success) {
          if (active) setStep(3);
          
          const prescriptionData = response.data;
          
          // Save parsed prescription to store
          healthStore.addPrescription(prescriptionData);

          if (active) setStep(4);

          // Redirect to Review Screen
          setTimeout(() => {
            if (active) {
              navigation.replace('ReviewMedicines', { prescriptionId: prescriptionData.id });
            }
          }, 800);
        } else {
          throw new Error(response?.message || 'AI extraction failed');
        }
      } catch (err: any) {
        Alert.alert(
          'Scanning Failed',
          err.message || 'We could not scan the prescription. Please check your internet connection and try again.',
          [{ text: 'Go Back', onPress: () => navigation.goBack() }]
        );
      }
    };

    performExtraction();

    return () => {
      active = false;
    };
  }, [imageUri]);

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
        <Text style={styles.headerTitle}>AI Extracting...</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Animated Robot Loader */}
        <View style={styles.animationContainer}>
          <View style={styles.ringsWrapper}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim2 }], opacity: 0.15 }]} />
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim1 }], opacity: 0.3 }]} />
            <View style={styles.robotCircle}>
              <MaterialCommunityIcons name="robot" size={54} color="#4F46E5" />
            </View>
          </View>
          
          <Text style={styles.extractTitle}>Extracting medicines</Text>
          <Text style={styles.extractDesc}>
            Please wait a few seconds while we read your prescription.
          </Text>
        </View>

        {/* Status Checklist */}
        <View style={styles.checklist}>
          <ChecklistItem text="Detecting text" active={step >= 0} completed={step >= 1} />
          <ChecklistItem text="Understanding medicines" active={step >= 1} completed={step >= 2} />
          <ChecklistItem text="Identifying dosage & timing" active={step >= 2} completed={step >= 3} />
          <ChecklistItem text="Almost done..." active={step >= 3} completed={step >= 4} />
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Feather name="clock" size={14} color="#A0AEC0" style={{ marginRight: 6 }} />
          <Text style={styles.footerText}>This usually takes 3-5 seconds</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

interface ChecklistItemProps {
  text: string;
  active: boolean;
  completed: boolean;
}

function ChecklistItem({ text, active, completed }: ChecklistItemProps) {
  return (
    <View style={[styles.checkItemRow, !active && styles.checkItemInactive]}>
      {completed ? (
        <View style={styles.checkIconCompleted}>
          <Feather name="check" size={14} color="#FFFFFF" />
        </View>
      ) : active ? (
        <View style={styles.checkIconActive} />
      ) : (
        <View style={styles.checkIconPlaceholder} />
      )}
      <Text style={[
        styles.checkItemText,
        completed ? styles.checkTextCompleted : null,
        !active ? styles.checkTextInactive : null
      ]}>
        {text}
      </Text>
    </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 32,
  },
  animationContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  ringsWrapper: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 32,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0E7FF',
  },
  robotCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  extractTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  extractDesc: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  checklist: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkItemInactive: {
    opacity: 0.5,
  },
  checkIconCompleted: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkIconActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
    marginRight: 14,
  },
  checkIconPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginRight: 14,
  },
  checkItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  checkTextCompleted: {
    color: '#1A202C',
  },
  checkTextInactive: {
    color: '#A0AEC0',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#A0AEC0',
    fontWeight: '500',
  },
});
