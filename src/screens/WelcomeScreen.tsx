import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Logo } from '../components/Logo';

const { width, height } = Dimensions.get('window');

type WelcomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0F4BE1', '#2161FC', '#F0F4FF']}
        locations={[0, 0.45, 0.78]}
        style={styles.gradient}
      >
        {/* Arc Decorations */}
        <View style={styles.arcContainer}>
          <View style={[styles.arcRing, { width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75, opacity: 0.05, borderWidth: 1 }]} />
          <View style={[styles.arcRing, { width: width * 1.2, height: width * 1.2, borderRadius: width * 0.6, opacity: 0.08, borderWidth: 1.5 }]} />
          <View style={[styles.arcRing, { width: width * 0.9, height: width * 0.9, borderRadius: width * 0.45, opacity: 0.12, borderWidth: 2 }]} />
        </View>

        {/* Content Section */}
        <View style={styles.topSection}>
          <View style={styles.logoWrapper}>
            <Logo size={100} inverted={true} />
          </View>
          <Text style={styles.appName}>AI Health Vault</Text>
        </View>

        {/* Bottom Actions Section */}
        <View style={styles.bottomSection}>
          <Text style={styles.tagline}>
            Your AI Assistant for Secure Health Records and Personal Insights.
          </Text>

          <TouchableOpacity
            style={styles.signInButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createAccountButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.createAccountText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: height * 0.18,
    paddingBottom: height * 0.05,
  },
  arcContainer: {
    position: 'absolute',
    top: -width * 0.3,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcRing: {
    position: 'absolute',
    borderColor: '#FFFFFF',
  },
  topSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  bottomSection: {
    alignItems: 'center',
    width: '100%',
  },
  tagline: {
    fontSize: 14,
    color: '#3A4B75',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  signInButton: {
    backgroundColor: '#0B44CD',
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0B44CD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 12,
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  createAccountButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#0B44CD',
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createAccountText: {
    color: '#0B44CD',
    fontSize: 16,
    fontWeight: '700',
  },
});
