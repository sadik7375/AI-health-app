/**
 * ─────────────────────────────────────────────────────────
 *  AuthContext.tsx
 *  Global Authentication State Manager.
 *  - Stores user info + token persistently via AsyncStorage
 *  - Provides login/logout/register actions to any screen
 *  - Guards navigation: unauthenticated users cannot access Dashboard
 * ─────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiAuth, setAuthToken } from '../api/apiClient';
import { healthStore } from '../store/healthStore';

// ── Types ─────────────────────────────────────────────────
interface AuthUser {
  id: number;
  name: string;
  email: string;
  plan_tier?: string;
  blood_type?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  height?: string;
  weight?: string;
  allergies?: string;
  medical_conditions?: string;
  email_verified_at?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginWithToken: (token: string, user: AuthUser) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: AuthUser) => Promise<void>;
  isAuthenticated: boolean;
}

// ── Context ───────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // starts true to show splash while checking storage

  // On mount: restore saved session from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem('auth_token');
        const savedUser  = await AsyncStorage.getItem('auth_user');

        if (savedToken && savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setToken(savedToken);
          setUser(parsedUser);
          setAuthToken(savedToken); // register in apiClient for future requests
          
          // Sync existing data from backend in background
          try {
            healthStore.syncWithBackend();
          } catch (_) {}
        }
      } catch (_) {
        // storage read fail — user must login again
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Login ──────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    try {
      const response = await apiAuth.login({ email, password });

      const newToken = response?.token || response?.access_token || response?.data?.token || response?.data?.access_token;
      const newUser  = response?.user  || response?.data?.user || (response?.success && response?.data);

      if (response && (response.success || newToken)) {
        if (newToken) setToken(newToken);
        if (newUser)  setUser(newUser);
        if (newToken) setAuthToken(newToken);

        if (newToken) await AsyncStorage.setItem('auth_token', newToken);
        if (newUser)  await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));

        // Sync fresh data from backend
        healthStore.syncWithBackend();

        return { success: true };
      } else {
        return { success: false, message: response?.message || 'Invalid credentials.' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Server connection failed.' };
    }
  };

  // ── Register ───────────────────────────────────────────
  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await apiAuth.register({ name, email, password });

      const newToken = response?.token || response?.access_token || response?.data?.token || response?.data?.access_token;
      const newUser  = response?.user  || response?.data?.user || (response?.success && response?.data);

      if (response && (response.success || newToken)) {
        if (newToken) setToken(newToken);
        if (newUser)  setUser(newUser);
        if (newToken) setAuthToken(newToken);

        if (newToken) await AsyncStorage.setItem('auth_token', newToken);
        if (newUser)  await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));

        // Sync fresh data from backend
        healthStore.syncWithBackend();

        return { success: true };
      } else {
        return { success: false, message: response?.message || 'Registration failed.' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Server connection failed.' };
    }
  };

  // ── Logout ─────────────────────────────────────────────
  const logout = async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    
    // Clear out data store
    healthStore.clearData();
  };

  const updateUser = async (newUser: AuthUser) => {
    setUser(newUser);
    await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
  };

  const loginWithToken = async (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    setAuthToken(newToken);

    await AsyncStorage.setItem('auth_token', newToken);
    await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));

    // Sync fresh data from backend
    healthStore.syncWithBackend();
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      loginWithToken,
      register,
      logout,
      updateUser,
      isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
