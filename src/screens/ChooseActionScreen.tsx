import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { healthStore } from '../store/healthStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChooseAction'>;
type RoutePropType = RouteProp<RootStackParamList, 'ChooseAction'>;

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

export default function ChooseActionScreen({ navigation, route }: Props) {
  const { prescriptionId } = route.params;
  const [selectedOption, setSelectedOption] = useState<'only' | 'reminders'>('reminders');

  const handleContinue = () => {
    if (selectedOption === 'only') {
      // Just keep it as 'Saved Only' in the store (which it is by default)
      healthStore.updatePrescriptionStatus(prescriptionId, 'Saved Only');
      
      // Navigate back to Dashboard with parameters to show a toast
      navigation.navigate('Dashboard', { 
        showToast: true, 
        toastMessage: 'Prescription saved to vault successfully!' 
      } as any);
    } else {
      // Navigate to setup reminders screen
      navigation.navigate('StartReminders', { prescriptionId });
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
        <Text style={styles.headerTitle}>Save Prescription</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Prescription Saved Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.iconCircleBg}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color="#4F46E5" />
            <View style={styles.checkBadge}>
              <Feather name="check" size={16} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.heading}>What would you like to do?</Text>
          <Text style={styles.subheading}>
            You can always create reminders later from prescription details.
          </Text>
        </View>

        {/* Options list */}
        <View style={styles.optionsList}>
          {/* Option 1: Save Only */}
          <TouchableOpacity
            style={[styles.optionCard, selectedOption === 'only' && styles.optionCardActive]}
            activeOpacity={0.8}
            onPress={() => setSelectedOption('only')}
          >
            <View style={styles.optionLeftCol}>
              <View style={[styles.cardIconBg, selectedOption === 'only' && styles.cardIconBgActive]}>
                <Feather name="file-text" size={22} color={selectedOption === 'only' ? '#4F46E5' : '#718096'} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.optionTitle}>Save Prescription Only</Text>
                <Text style={styles.optionDesc}>Save prescription details without creating reminders.</Text>
              </View>
            </View>
            <View style={[styles.radioCircle, selectedOption === 'only' && styles.radioCircleActive]}>
              {selectedOption === 'only' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Option 2: Save & Create Reminders */}
          <TouchableOpacity
            style={[styles.optionCard, selectedOption === 'reminders' && styles.optionCardActive]}
            activeOpacity={0.8}
            onPress={() => setSelectedOption('reminders')}
          >
            <View style={styles.optionLeftCol}>
              <View style={[styles.cardIconBg, selectedOption === 'reminders' && styles.cardIconBgActive]}>
                <Feather name="bell" size={22} color={selectedOption === 'reminders' ? '#4F46E5' : '#718096'} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.optionTitle}>Save & Create Medicine Reminders</Text>
                <Text style={styles.optionDesc}>Save prescription and set up medicine reminders.</Text>
              </View>
            </View>
            <View style={[styles.radioCircle, selectedOption === 'reminders' && styles.radioCircleActive]}>
              {selectedOption === 'reminders' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Button */}
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.85}
          onPress={handleContinue}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
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
    paddingTop: 30,
    paddingBottom: 24,
  },
  illustrationContainer: {
    alignItems: 'center',
  },
  iconCircleBg: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 28,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  optionsList: {
    gap: 16,
    marginVertical: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 18,
    backgroundColor: '#FFFFFF',
  },
  optionCardActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#FAF5FF',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  optionLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  cardIconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardIconBgActive: {
    backgroundColor: '#E0E7FF',
  },
  cardTextCol: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
  },
  optionDesc: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
    lineHeight: 16,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
  continueBtn: {
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
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
