import { api } from '@/lib/http';
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

export async function signup(data: SignupDraft): Promise<UserState> {
  const res = await api.post('/auth/signup', data);
  return res.data.data.user as UserState;
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
  return user as UserState;
}
