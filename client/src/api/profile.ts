import { http } from '@/lib/http';
import { toItems } from '@/lib/response';
import { normalizeOrder, type Order } from '@/store/orders';
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

export interface PaginatedOrders {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const resolveId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const candidate = (value as { _id?: unknown; id?: unknown })._id ?? (value as { id?: unknown }).id;
    return candidate ? resolveId(candidate) : '';
  }
  return '';
};

export const getBusinessOrders = async () => {
  const res = await http.get('/api/orders/received');
  return res.data;
};

export const getUserOrders = async (
  params?: { page?: number; pageSize?: number },
): Promise<PaginatedOrders> => {
  const res = await http.get('/api/orders/me', { params });
  const items = (toItems(res) as any[]).map((item) => normalizeOrder(item));
  const payload = res.data?.data ?? {};
  const total = typeof payload.total === 'number' ? payload.total : items.length;
  const page = typeof payload.page === 'number' ? payload.page : params?.page ?? 1;
  const pageSize = typeof payload.pageSize === 'number' ? payload.pageSize : params?.pageSize ?? items.length;
  const hasMore = Boolean(payload.hasMore);
  return { items, total, page, pageSize, hasMore };
};

export interface ServiceRequestSummary {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  location?: string | null;
}

export interface PaginatedServiceRequests {
  items: ServiceRequestSummary[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const getMyServiceRequests = async (
  params?: { page?: number; pageSize?: number },
): Promise<PaginatedServiceRequests> => {
  const res = await http.get('/requests/mine', { params });
  const items = (toItems(res) as any[])
    .map((entry) => {
      const id = resolveId(entry?._id ?? entry?.id);
      if (!id) return null;
      const title =
        (typeof entry?.title === 'string' && entry.title.trim()) ||
        (entry?.service?.name as string) ||
        'Service request';
      const status = typeof entry?.status === 'string' ? entry.status : 'pending';
      const createdAt =
        typeof entry?.createdAt === 'string'
          ? entry.createdAt
          : entry?.createdAt instanceof Date
          ? entry.createdAt.toISOString()
          : new Date().toISOString();
      const location =
        typeof entry?.location === 'string'
          ? entry.location
          : typeof entry?.service?.location === 'string'
          ? entry.service.location
          : null;
      return { id, title, status, createdAt, location } satisfies ServiceRequestSummary;
    })
    .filter((entry): entry is ServiceRequestSummary => Boolean(entry));
  const payload = res.data?.data ?? {};
  const total = typeof payload.total === 'number' ? payload.total : items.length;
  const page = typeof payload.page === 'number' ? payload.page : params?.page ?? 1;
  const pageSize = typeof payload.pageSize === 'number' ? payload.pageSize : params?.pageSize ?? items.length;
  const hasMore = Boolean(payload.hasMore);
  return { items, total, page, pageSize, hasMore };
};

export const getServiceHistory = async () => {
  const res = await http.get('/history/services');
  return res.data;
};

export const getFeedback = async (shopId: string) => {
  const res = await http.get('/feedback', { params: { shopId } });
  return res.data;
};

