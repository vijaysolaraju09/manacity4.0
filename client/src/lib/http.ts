import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { Store } from '@reduxjs/toolkit';
import { API_BASE } from '@/config/api';
import { logout } from '@/store/slices/authSlice';
import { clearAdminToken } from '@/store/slices/adminSlice';
import { paths } from '@/routes/paths';
import showToast from '@/components/ui/Toast';
import { toErrorMessage } from './response';

type AugmentedConfig = InternalAxiosRequestConfig & { __retryCount?: number };

const MAX_RETRIES = 3;
const RETRYABLE_METHODS = new Set(['get', 'head']);
const RETRY_BASE_DELAY = 300;

let store: Store | null = null;

export const injectStore = (s: Store) => {
  store = s;
};

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const normalizeUrl = (config: InternalAxiosRequestConfig) => {
  if (config.url?.startsWith('/')) {
    config.url = config.url.slice(1);
  }
  return config;
};

const shouldRetry = (error: AxiosError): error is AxiosError & {
  config: AugmentedConfig;
} => {
  const { config, response } = error;
  if (!config) return false;

  const method = (config.method || 'get').toLowerCase();
  if (!RETRYABLE_METHODS.has(method)) return false;

  const retries = (config as AugmentedConfig).__retryCount ?? 0;
  if (retries >= MAX_RETRIES) return false;

  const status = response?.status;
  if (status && status < 500) return false;

  return true;
};

const detectEnvelopeError = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  if (data.ok === false) {
    return (
      toErrorMessage({ response: { data } }) ||
      (typeof data.msg === 'string' ? data.msg : null) ||
      'Request failed'
    );
  }
  return null;
};

interface HttpClientOptions {
  tokenStorageKey: string;
  onUnauthorized?: () => void;
  redirectTo?: string;
}

const createHttpClient = ({
  tokenStorageKey,
  onUnauthorized,
  redirectTo,
}: HttpClientOptions): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE,
    withCredentials: false,
    timeout: 20000,
  });

  instance.interceptors.request.use((config) => {
    normalizeUrl(config);

    const token = localStorage.getItem(tokenStorageKey);
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const message = detectEnvelopeError(response?.data);
      if (message) {
        showToast(message, 'error');
        return Promise.reject(new Error(message));
      }
      return response;
    },
    async (error: AxiosError) => {
      const envelopeMessage = detectEnvelopeError(error?.response?.data);
      if (envelopeMessage) {
        showToast(envelopeMessage, 'error');
      }
      if (shouldRetry(error)) {
        const config = error.config as AugmentedConfig;
        config.__retryCount = (config.__retryCount ?? 0) + 1;
        const attempt = config.__retryCount;
        const wait = RETRY_BASE_DELAY * 2 ** (attempt - 1);
        await delay(wait);
        return instance(config);
      }

      if (error.response?.status === 401) {
        localStorage.removeItem(tokenStorageKey);
        onUnauthorized?.();
        if (redirectTo) {
          window.location.assign(redirectTo);
        }
      }

      if (!envelopeMessage) {
        const message = toErrorMessage(error);
        if (message) {
          showToast(message, 'error');
        }
      }

      return Promise.reject(error);
    },
  );

  return instance;
};

export const http = createHttpClient({
  tokenStorageKey: 'token',
  onUnauthorized: () => store?.dispatch(logout()),
  redirectTo: paths.auth.login(),
});

export const adminHttp = createHttpClient({
  tokenStorageKey: 'manacity_admin_token',
  onUnauthorized: () => store?.dispatch(clearAdminToken()),
  redirectTo: paths.admin.login(),
});
