export const BASE_URL = import.meta.env.VITE_API_URL;
import axios from "axios";
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(
      error.response?.data?.error || error.message || "Request failed"
    );
  }
);
