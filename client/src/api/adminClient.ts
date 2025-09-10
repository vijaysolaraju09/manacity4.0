import axios from 'axios';
import { API_BASE } from '@/config/api';

const adminApi = axios.create({
  baseURL: API_BASE,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('manacity_admin_token');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default adminApi;
