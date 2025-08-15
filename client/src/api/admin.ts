import adminApi from './adminClient';

export interface AdminCreds {
  identifier: string;
  password: string;
}

export const adminLogin = async ({ identifier, password }: AdminCreds) => {
  const res = await adminApi.post('/auth/admin-login', {
    email: identifier,
    password,
  });
  const { token } = res.data;
  if (token) {
    localStorage.setItem('manacity_admin_token', token);
  }
  return token;
};

export const fetchUsers = async () => {
  const res = await adminApi.get('/admin/users');
  return res.data;
};

export const fetchBusinessRequests = async () => {
  const res = await adminApi.get('/shops/requests');
  return res.data;
};

export const approveShop = async (id: string) => {
  await adminApi.put(`/shops/approve/${id}`);
};

export const rejectShop = async (id: string) => {
  await adminApi.put(`/shops/reject/${id}`);
};

export interface VerificationRequestParams {
  page?: number;
  status?: string;
  profession?: string;
}

export const fetchVerificationRequests = async (
  params: VerificationRequestParams = {},
) => {
  const res = await adminApi.get('/verified/requests', { params });
  return res.data;
};

export const acceptVerification = async (id: string) => {
  await adminApi.post(`/verified/accept/${id}`);
};

export const rejectVerification = async (id: string) => {
  await adminApi.post(`/verified/reject/${id}`);
};
