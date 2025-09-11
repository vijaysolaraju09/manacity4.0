import axios from 'axios';
import { API_BASE } from '@/config/api';

const adminApi = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: 20000,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('manacity_admin_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.url?.startsWith('/')) {
    config.url = config.url.slice(1);
  }
  return config;
});

export default adminApi;
