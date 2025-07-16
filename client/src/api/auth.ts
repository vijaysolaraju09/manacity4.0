import api from './client';
import type { UserState } from '../store/slices/userSlice';


interface Credentials {
  phone: string;
  password: string;
}

interface SignupData extends Credentials {
  name: string;
  location: string;
}

export async function login(creds: Credentials): Promise<UserState> {
  const res = await api.post('/auth/login', creds);
  const { token, user } = res.data;
  if (token) {
    localStorage.setItem('token', token);
  }
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  }
  return user;
}

export async function signup(data: SignupData): Promise<void> {
  await api.post('/auth/signup', data);
}

export async function verifyOtp(phone: string, code: string): Promise<void> {
  await api.post('/auth/verify-otp', { phone, code });
}

export async function resendOtp(phone: string): Promise<void> {
  await api.post('/auth/resend-otp', { phone });
}
