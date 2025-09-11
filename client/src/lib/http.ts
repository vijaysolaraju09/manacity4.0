import axios from 'axios';
import { API_BASE } from '@/config/api';
import type { Store } from '@reduxjs/toolkit';
import { logout } from '@/store/slices/authSlice';

let store: Store | null = null;

export const injectStore = (s: Store) => {
  store = s;
};

export const http = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: 20000,
});

const MAX_RETRIES = 3;

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error: any) => {
    const config = error.config || {};
    if (
      config.method === 'get' &&
      (config.__retryCount || 0) < MAX_RETRIES &&
      (!error.response || error.response.status >= 500)
    ) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      return http(config);
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      store?.dispatch(logout());
      window.location.href = '/login';
    }
    return Promise.reject(
      error.response?.data?.error || error.message || 'Request failed'
    );
  }
);
