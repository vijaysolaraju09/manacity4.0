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

export interface BusinessRequestParams {
  status?: string;
  category?: string;
  location?: string;
}

export const fetchBusinessRequests = async (
  params: BusinessRequestParams = {},
) => {
  const res = await adminApi.get('/shops/requests', { params });
  return res.data;
};

export const approveShop = async (id: string) => {
  await adminApi.post(`/shops/approve/${id}`);
};

export const rejectShop = async (id: string) => {
  await adminApi.post(`/shops/reject/${id}`);
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

export interface ShopQueryParams {
  query?: string;
  status?: string;
  category?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export const fetchShops = async (params: ShopQueryParams = {}) => {
  const res = await adminApi.get('/shops', { params });
  return res.data;
};

export const updateShop = async (
  id: string,
  data: Partial<{ name: string; category: string; location: string; status: string }>,
) => {
  const res = await adminApi.put(`/shops/${id}`, data);
  return res.data;
};

export const deleteShop = async (id: string) => {
  await adminApi.delete(`/shops/${id}`);
};
