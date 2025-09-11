import { http } from '@/lib/http';

export interface ProductData {
  _id?: string;
  name: string;
  price: number;
  image?: string;
}

export interface UpdateProfileData {
  name?: string;
  location?: string;
  avatarUrl?: string;
}

export interface BusinessRequest {
  name: string;
  category: string;
  location: string;
  address: string;
  description?: string;
}

export interface VerifyRequest {
  profession: string;
  bio: string;
  portfolio?: string[];
}

export const getCurrentUser = async () => {
  const res = await http.get('/users/me');
  return res.data.data.user;
};

export const updateProfile = async (data: UpdateProfileData) => {
  const res = await http.patch('/users/me', data);
  return res.data.data.user;
};

export const requestVerification = async (data: VerifyRequest) => {
  const res = await http.post('/verified/apply', data);
  return res.data;
};

export const requestBusiness = async (data: BusinessRequest) => {
  await http.post('/shops', data);
};

export const getMyBusinessRequest = async () => {
  const res = await http.get('/shops/my');
  return res.data;
};

export const getMyProducts = async () => {
  const res = await http.get('/shops/my-products');
  return res.data;
};

export const addProduct = async (data: ProductData) => {
  const res = await http.post('/products', data);
  return res.data;
};

export const updateProduct = async (id: string, data: ProductData) => {
  await http.patch(`/products/${id}`, data);
};

export const deleteProduct = async (id: string) => {
  await http.delete(`/products/${id}`);
};

export const getBusinessOrders = async () => {
  const res = await http.get('/orders/received');
  return res.data;
};

export const getVerifiedServiceRequests = async () => {
  const res = await http.get('/verified/requests');
  return res.data;
};

export const getUserOrders = async () => {
  const res = await http.get('/orders/mine');
  return res.data;
};

export const getServiceHistory = async () => {
  const res = await http.get('/history/services');
  return res.data;
};

export const getFeedback = async (shopId: string) => {
  const res = await http.get('/feedback', { params: { shopId } });
  return res.data;
};

