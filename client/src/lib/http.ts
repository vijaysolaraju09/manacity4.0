import axios from 'axios';
import { API_BASE } from '@/config/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(
      error.response?.data?.error || error.message || 'Request failed',
    );
  },
);

export default api;
