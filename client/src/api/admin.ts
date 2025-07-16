import adminApi from './adminClient';

export interface AdminCreds {
  email: string;
  password: string;
}

export const adminLogin = async (creds: AdminCreds) => {
  const res = await adminApi.post('/auth/admin-login', creds);
  const { token } = res.data;
  if (token) {
    localStorage.setItem('adminToken', token);
  }
  return token;
};

export const fetchUsers = async () => {
  const res = await adminApi.get('/admin/users');
  return res.data;
};
