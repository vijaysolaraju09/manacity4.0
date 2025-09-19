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

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      localStorage.removeItem('manacity_admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default adminApi;
