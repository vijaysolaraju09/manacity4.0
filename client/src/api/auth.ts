import { http } from '@/lib/http';
import type { AuthUser, SignupDraft } from '@/store/slices/authSlice';

export interface Credentials {
  phone: string;
  password: string;
}

export async function signup(data: SignupDraft) {
  const res = await http.post('/auth/signup', data);
  return res.data.data as { user: AuthUser; token: string };
}

export async function login(creds: Credentials) {
  const res = await http.post('/auth/login', creds);
  return res.data.data as { user: AuthUser; token: string };
}

export async function fetchMe() {
  const res = await http.get('/auth/me');
  return res.data.data.user as AuthUser;
}

export async function logoutApi() {
  await http.post('/auth/logout');
}

