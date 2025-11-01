import { http } from '@/lib/http';
import type { SignupDraft } from '@/store/slices/authSlice';
import type { User } from '@/types/user';

export interface Credentials {
  phone: string;
  password: string;
}

export type SignupPayload = SignupDraft & { firebaseIdToken: string };

export async function signup(data: SignupPayload) {
  const res = await http.post('/auth/signup', data);
  return res.data.data as { user?: User; token?: string; message?: string };
}

export async function login(creds: Credentials) {
  const res = await http.post('/auth/login', creds);
  return res.data.data as { user: User; token: string };
}

export async function fetchMe() {
  const res = await http.get('/auth/me');
  return res.data.data.user as User;
}

export async function logoutApi() {
  await http.post('/auth/logout');
}

export async function resetPassword(phone: string, password: string, firebaseIdToken: string) {
  const res = await http.post('/auth/reset', { phone, password, firebaseIdToken });
  return res.data.data;
}
