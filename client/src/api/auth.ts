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

export async function signup(data: SignupDraft): Promise<void> {
  await api.post('/auth/signup', data);
}

export async function verifyOtp(payload: { phone: string; otp: string }): Promise<void> {
  await api.post('/auth/verify-otp', payload);
}

export async function verifyFirebase(payload: { idToken: string; purpose: string; signupDraft?: SignupDraft }): Promise<any> {
  const res = await api.post('/auth/verify-firebase', payload);
  return res.data;
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
