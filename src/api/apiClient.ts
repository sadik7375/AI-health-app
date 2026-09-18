/**
 * ──────────────────────────────────────────────────────────────
 *  apiClient.ts
 *  React Native API Client for Laravel REST Backend.
 * ──────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────
//  🌐  Production API Server
//  App is now connected to the live production backend.
//
//  Production URL: http://caremateai.cannyapps.com
//
//  ⚠️  NOTE: For local development, replace with your PC's Wi-Fi IP:
//  Example: 'http://192.168.x.x:8000/api'
// ─────────────────────────────────────────────────────────────────────────
export const BASE_URL = 'https://caremateaiapp.cannyapps.com/api';

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
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 CareMateAI/1.0',
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

    let url = `${BASE_URL}${endpoint}`;
    if (method === 'GET') {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}_t=${Date.now()}`;
    }

    const response = await fetch(url, options);
    let data;
    try {
      data = await response.json();
    } catch (_) {
      throw new Error(`Server returned status ${response.status} (invalid JSON response)`);
    }

    if (!response.ok) {
      throw new Error(data?.message || `API request failed with status ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.warn(`API Error [${endpoint}]:`, error?.message || error);
    const detail = `[URL: ${BASE_URL}${endpoint}] Error: ${error?.message || String(error)}`;
    throw new Error(detail);
  }
};

// ── Auth Endpoints ────────────────────────────────────────────
export const apiAuth = {
  register: (data: any) => apiRequest('/auth/register', 'POST', data),
  login: (data: any) => apiRequest('/auth/login', 'POST', data),
  forgotPassword: (email: string) => apiRequest('/auth/forgot-password', 'POST', { email }),
  verifyOtp: (email: string, otp: string) => apiRequest('/auth/verify-otp', 'POST', { email, otp }),
  resendVerification: (email: string) => apiRequest('/auth/resend-verification', 'POST', { email }),
  resetPassword: (data: any) => apiRequest('/auth/reset-password', 'POST', data),
  googleLogin: (idToken: string) => apiRequest('/auth/google', 'POST', { id_token: idToken }),
};

// ── User Profile Endpoints ─────────────────────────────────────
export const apiProfile = {
  getProfile: () => apiRequest('/profile', 'GET'),
  updateProfile: (data: any) => apiRequest('/profile/update', 'PUT', data),
  changePassword: (data: any) => apiRequest('/profile/password', 'POST', data),
  deleteAccount: () => apiRequest('/profile/account', 'DELETE'),
};

// ── Medicine Endpoints ────────────────────────────────────────
export const apiMedicines = {
  getAll: () => apiRequest('/medicines', 'GET'),
  getHistory: () => apiRequest('/medicines/history', 'GET'),
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
