/**
 * ──────────────────────────────────────────────────────────────
 *  apiClient.ts
 *  React Native API Client for Laravel REST Backend.
 * ──────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────
//  ⚠️  IMPORTANT: Never use "localhost" for physical devices!
//  Physical phones cannot reach PC's localhost.
//  Use your PC's Wi-Fi IPv4 address (found via: ipconfig → IPv4 Address).
//
//  Current PC IP: 192.168.110.19
//  Laravel backend runs on port 8000.
//
//  If you switch networks (home/office/hotspot), update this IP accordingly.
// ─────────────────────────────────────────────────────────────────────────
export const BASE_URL = 'http://192.168.110.19:8000/api';

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export const apiRequest = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  isFormData: boolean = false
) => {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = isFormData ? body : JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error: any) {
    console.warn(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
};

// ── Auth Endpoints ────────────────────────────────────────────
export const apiAuth = {
  register: (data: any) => apiRequest('/auth/register', 'POST', data),
  login: (data: any) => apiRequest('/auth/login', 'POST', data),
  forgotPassword: (email: string) => apiRequest('/auth/forgot-password', 'POST', { email }),
  verifyOtp: (email: string, otp: string) => apiRequest('/auth/verify-otp', 'POST', { email, otp }),
  resetPassword: (data: any) => apiRequest('/auth/reset-password', 'POST', data),
};

// ── User Profile Endpoints ─────────────────────────────────────
export const apiProfile = {
  getProfile: () => apiRequest('/profile', 'GET'),
  updateProfile: (data: any) => apiRequest('/profile/update', 'PUT', data),
  changePassword: (data: any) => apiRequest('/profile/password', 'POST', data),
};

// ── Medicine Endpoints ────────────────────────────────────────
export const apiMedicines = {
  getAll: () => apiRequest('/medicines', 'GET'),
  toggleTaken: (id: string) => apiRequest(`/medicines/${id}/toggle`, 'POST'),
  addManual: (data: any) => apiRequest('/medicines/manual', 'POST', data),
  update: (id: string, data: any) => apiRequest(`/medicines/${id}`, 'PUT', data),
  delete: (id: string) => apiRequest(`/medicines/${id}`, 'DELETE'),
};

// ── Prescription Endpoints ────────────────────────────────────
export const apiPrescriptions = {
  getAll: () => apiRequest('/prescriptions', 'GET'),
  scan: (formData: FormData) => apiRequest('/prescriptions/scan', 'POST', formData, true),
  activateReminders: (id: string, data: any) => 
    apiRequest(`/prescriptions/${id}/activate-reminders`, 'POST', data),
};

// ── Appointment Endpoints ─────────────────────────────────────
export const apiAppointments = {
  getAll: () => apiRequest('/appointments', 'GET'),
  create: (data: any) => apiRequest('/appointments', 'POST', data),
  parseVoice: (audio: string, mimeType: string) => apiRequest('/appointments/parse-voice', 'POST', { audio, mime_type: mimeType }),
};

// ── Lab Report Endpoints ──────────────────────────────────────
export const apiLabReports = {
  getAll: () => apiRequest('/lab-reports', 'GET'),
  getById: (id: string) => apiRequest(`/lab-reports/${id}`, 'GET'),
  scanReport: (formData: FormData) => apiRequest('/lab-reports/scan', 'POST', formData, true),
};

// ── Health Analytics Endpoints ────────────────────────────────
export const apiHealthAnalytics = {
  getAnalytics: () => apiRequest('/health-analytics', 'GET'),
};

// ── AI Health Assistant Endpoints ──────────────────────────────
export const apiAIAssistant = {
  chat: (prompt: string) => apiRequest('/ai-assistant/chat', 'POST', { prompt }),
};
