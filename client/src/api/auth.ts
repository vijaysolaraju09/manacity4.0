import api from './client';
import type { UserState } from '../store/slices/userSlice';

interface Credentials {
  phone: string;
  password: string;
}

export interface SignupDraft extends Credentials {
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

export async function verifyFirebase(payload: {
  idToken: string;
  purpose: 'signup' | 'reset';
  signupDraft?: SignupDraft;
}): Promise<any> {
  const res = await api.post('/auth/verify-firebase', payload);
  return res.data;
}

export async function setNewPassword(token: string, newPassword: string): Promise<void> {
  await api.post('/auth/set-password', { token, newPassword });
}
