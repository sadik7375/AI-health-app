import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { useAuth } from '../context/AuthContext';

// ── Auth Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// ── App Screens
import DashboardScreen from '../screens/DashboardScreen';
import ScanPrescriptionScreen from '../screens/ScanPrescriptionScreen';
import AIExtractingScreen from '../screens/AIExtractingScreen';
import ReviewMedicinesScreen from '../screens/ReviewMedicinesScreen';
import ChooseActionScreen from '../screens/ChooseActionScreen';
import StartRemindersScreen from '../screens/StartRemindersScreen';
import PrescriptionDetailsScreen from '../screens/PrescriptionDetailsScreen';
import CreateReminderLaterScreen from '../screens/CreateReminderLaterScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import PersonalInfoScreen from '../screens/PersonalInfoScreen';
import SecurityPrivacyScreen from '../screens/SecurityPrivacyScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import LabReportScreen from '../screens/LabReportScreen';
import HealthAnalyticsReportScreen from '../screens/HealthAnalyticsReportScreen';
import UpgradePlanScreen from '../screens/UpgradePlanScreen';
import AIHealthAssistantScreen from '../screens/AIHealthAssistantScreen';

// ── Route param types
export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Dashboard: undefined;
  ScanPrescription: undefined;
  AIExtracting: { imageUri: string };
  ReviewMedicines: { prescriptionId: string };
  ChooseAction: { prescriptionId: string };
  StartReminders: { prescriptionId: string };
  PrescriptionDetails: { prescriptionId: string };
  CreateReminderLater: { prescriptionId: string };
  Appointments: undefined;
  PersonalInfo: undefined;
  SecurityPrivacy: undefined;
  NotificationSettings: undefined;
  HelpSupport: undefined;
  LabReport: undefined;
  HealthAnalyticsReport: undefined;
  UpgradePlan: undefined;
  AIHealthAssistant: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOpts = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  contentStyle: { backgroundColor: '#FFFFFF' },
};

// ── Guest Stack (not logged in) ──────────────────────────────
function GuestNavigator() {
  return (
    <Stack.Navigator initialRouteName="Welcome" screenOptions={screenOpts}>
      <Stack.Screen name="Welcome"        component={WelcomeScreen} />
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// ── Authenticated Stack (logged in) ─────────────────────────
function AppNavigatorStack() {
  return (
    <Stack.Navigator initialRouteName="Dashboard" screenOptions={screenOpts}>
      <Stack.Screen name="Dashboard"            component={DashboardScreen} />
      <Stack.Screen name="ScanPrescription"     component={ScanPrescriptionScreen} />
      <Stack.Screen name="AIExtracting"         component={AIExtractingScreen} />
      <Stack.Screen name="ReviewMedicines"      component={ReviewMedicinesScreen} />
      <Stack.Screen name="ChooseAction"         component={ChooseActionScreen} />
      <Stack.Screen name="StartReminders"       component={StartRemindersScreen} />
      <Stack.Screen name="PrescriptionDetails"  component={PrescriptionDetailsScreen} />
      <Stack.Screen name="CreateReminderLater"  component={CreateReminderLaterScreen} />
      <Stack.Screen name="Appointments"         component={AppointmentsScreen} />
      <Stack.Screen name="PersonalInfo"         component={PersonalInfoScreen} />
      <Stack.Screen name="SecurityPrivacy"      component={SecurityPrivacyScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="HelpSupport"          component={HelpSupportScreen} />
      <Stack.Screen name="LabReport"            component={LabReportScreen} />
      <Stack.Screen name="HealthAnalyticsReport" component={HealthAnalyticsReportScreen} />
      <Stack.Screen name="UpgradePlan"          component={UpgradePlanScreen} />
      <Stack.Screen name="AIHealthAssistant"    component={AIHealthAssistantScreen} />
    </Stack.Navigator>
  );
}

// ── Root Navigator — switches between Guest / App based on auth ──
export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show a splash/loading screen while restoring session from AsyncStorage
  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigatorStack /> : <GuestNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#F8F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
