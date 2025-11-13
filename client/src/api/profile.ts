import { http } from '@/lib/http';
import type { User } from '@/types/user';

export interface ProductData {
  _id?: string;
  name: string;
  price: number;
  image?: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  location?: string;
  address?: string;
  profession?: string;
  bio?: string;
  avatarUrl?: string;
  preferences?: { theme?: 'light' | 'dark' | 'system' };
}

export interface BusinessRequest {
  name: string;
  category: string;
  location: string;
  address: string;
  description?: string;
  image?: string;
}

export interface VerifyRequest {
  profession: string;
  bio?: string;
  portfolio?: string[];
}

export const getCurrentUser = async () => {
  const res = await http.get('/auth/me');
  return res.data.data.user as User;
};

export const updateProfile = async (data: UpdateProfileData) => {
  const res = await http.patch('/users/me', data);
  return res.data.data.user as User;
};

export const requestVerification = async (data: VerifyRequest) => {
  const res = await http.post('/verified/request', data);
  return res.data;
};

export const updateMyVerified = async (data: VerifyRequest) => {
  const res = await http.patch('/verified/me', data);
  return res.data;
};

export const requestBusiness = async (data: BusinessRequest) => {
  const res = await http.post('/shops', data);
  return res.data;
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
  const res = await http.get('/api/orders/received');
  return res.data;
};

export const getUserOrders = async () => {
  const res = await http.get('/api/orders/me');
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

