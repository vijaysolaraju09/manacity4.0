import api from './client';
import type { UserState } from '../store/slices/userSlice';

interface Credentials {
  phone: string;
  password: string;
}

export interface SignupDraft {
  name: string;
  phone: string;
  password: string;
  location: string;
  role?: string;
}

export async function sendOtp(phone: string): Promise<void> {
  await api.post('/auth/otp/send', { phone });
}

export interface VerifyOtpPayload {
  phone: string;
  code: string;
  name?: string;
  password?: string;
  location?: string;
  role?: string;
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<{ token: string; user: UserState }> {
  const res = await api.post('/auth/otp/verify', payload);
  const { token, user } = res.data;
  if (token) {
    localStorage.setItem('token', token);
  }
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  }
  return { token, user };
}

export async function login(creds: Credentials): Promise<UserState> {
  const res = await api.post('/auth/login', creds);
  const { token, user } = res.data.data;
  if (token) {
    localStorage.setItem('token', token);
  }
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  }
  return user;
}

export async function setNewPassword(token: string, password: string): Promise<void> {
  await api.post('/auth/set-new-password', { token, password });
}
