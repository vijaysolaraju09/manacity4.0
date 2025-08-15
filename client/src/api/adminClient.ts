import axios from 'axios';

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('manacity_admin_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default adminApi;
