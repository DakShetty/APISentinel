import axios from 'axios';
import {
  User,
  APITarget,
  ScanJob,
  Vulnerability,
  ReportItem,
  DashboardStats,
  DashboardActivity,
  EndpointConfig
} from '../types';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('sentinel_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 unauth
client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('sentinel_token');
        localStorage.removeItem('sentinel_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  auth: {
    register: async (data: any) => (await client.post<{ access_token: string; user: User }>('/auth/register', data)).data,
    login: async (data: any) => (await client.post<{ access_token: string; user: User }>('/auth/login', data)).data,
    getMe: async () => (await client.get<User>('/auth/me')).data,
  },

  // Targets
  targets: {
    list: async () => (await client.get<APITarget[]>('/targets')).data,
    get: async (id: number) => (await client.get<APITarget>(`/targets/${id}`)).data,
    create: async (data: any) => (await client.post<APITarget>('/targets', data)).data,
    update: async (id: number, data: any) => (await client.put<APITarget>(`/targets/${id}`, data)).data,
    delete: async (id: number) => (await client.delete(`/targets/${id}`)).data,
    verify: async (id: number) => (await client.post<{ success: boolean; status_code?: number; latency_ms?: number; message: string; server_header?: string }>(`/targets/${id}/verify`)).data,
  },

  // Scans
  scans: {
    start: async (data: { target_id: number; authorization_confirmed: boolean; scan_types?: string[]; custom_endpoints?: EndpointConfig[] }) =>
      (await client.post<ScanJob>('/scans', data)).data,
    list: async () => (await client.get<ScanJob[]>('/scans')).data,
    get: async (id: number) => (await client.get<ScanJob>(`/scans/${id}`)).data,
    getResults: async (id: number) => (await client.get<Vulnerability[]>(`/scans/${id}/results`)).data,
    cancel: async (id: number) => (await client.post<{ message: string }>(`/scans/${id}/cancel`)).data,
  },

  // Vulnerabilities
  vulnerabilities: {
    list: async (params?: { severity?: string; category?: string; target_id?: number; status?: string; search?: string }) =>
      (await client.get<Vulnerability[]>('/vulnerabilities', { params })).data,
    get: async (id: number) => (await client.get<Vulnerability>(`/vulnerabilities/${id}`)).data,
    updateStatus: async (id: number, status: string) =>
      (await client.patch<Vulnerability>(`/vulnerabilities/${id}/status`, { status })).data,
  },

  // Reports
  reports: {
    list: async () => (await client.get<ReportItem[]>('/reports')).data,
    generate: async (scanId: number) => (await client.post<ReportItem>(`/reports/${scanId}/generate`)).data,
    getDownloadUrl: (reportId: number) => {
      const token = localStorage.getItem('sentinel_token');
      return `/api/reports/${reportId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    },
    downloadPdf: async (reportId: number, filename?: string) => {
      const res = await client.get(`/reports/${reportId}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `API_Sentinel_Report_${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  },

  // Dashboard
  dashboard: {
    getStats: async () => (await client.get<DashboardStats>('/dashboard/stats')).data,
    getActivity: async (days: number = 7) => (await client.get<DashboardActivity[]>(`/dashboard/activity?days=${days}`)).data,
  },
};

