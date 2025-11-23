import adminApi from './adminClient';
import { http } from '@/lib/http';

const trimPath = (path: string) => path.replace(/^\/+/, '');

const withAdminPrefix = (path: string) => {
  const trimmed = trimPath(path);
  if (!trimmed) return 'admin';
  if (trimmed.startsWith('auth/')) return trimmed;
  if (trimmed.startsWith('admin/')) return trimmed;
  return `admin/${trimmed}`;
};

const unwrapPayload = (payload: any) => {
  let current = payload;
  const visited = new Set<any>();
  while (
    current &&
    typeof current === 'object' &&
    !Array.isArray(current) &&
    'data' in current &&
    current.data !== current &&
    !visited.has(current)
  ) {
    visited.add(current);
    current = current.data;
  }
  return current;
};

const pickNumber = (...values: Array<any>) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
};

const isNotFoundError = (error: any) =>
  Boolean(error && typeof error === 'object' && error.response?.status === 404);

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page?: number;
  pages?: number;
  pageSize?: number;
}

const extractPaginatedResult = <T>(
  payload: any,
  additionalKeys: string[] = [],
): PaginatedResult<T> => {
  const source = unwrapPayload(payload);
  const result: PaginatedResult<T> = {
    items: [],
    total: 0,
  };

  if (Array.isArray(source)) {
    result.items = source as T[];
    result.total = source.length;
    return result;
  }

  const keys = [
    ...additionalKeys,
    'items',
    'data',
    'requests',
    'results',
    'rows',
    'docs',
    'list',
  ];

  for (const key of keys) {
    const value = (source as Record<string, unknown>)?.[key];
    if (Array.isArray(value)) {
      result.items = value as T[];
      break;
    }
  }

  result.total =
    pickNumber(
      (source as Record<string, unknown>)?.total,
      (source as Record<string, unknown>)?.count,
      (source as Record<string, unknown>)?.totalCount,
      result.items.length,
    ) ?? result.items.length;

  const page = pickNumber(
    (source as Record<string, unknown>)?.page,
    (source as Record<string, unknown>)?.currentPage,
  );
  if (page !== undefined) {
    result.page = page;
  }

  const pages = pickNumber(
    (source as Record<string, unknown>)?.pages,
    (source as Record<string, unknown>)?.totalPages,
  );
  if (pages !== undefined) {
    result.pages = pages;
  }

  const pageSize = pickNumber(
    (source as Record<string, unknown>)?.pageSize,
    (source as Record<string, unknown>)?.limit,
  );
  if (pageSize !== undefined) {
    result.pageSize = pageSize;
  }

  return result;
};

const extractEntity = <T>(payload: any): T => unwrapPayload(payload) as T;

const resolvePage = (result: PaginatedResult<any>, fallback?: number) =>
  result.page && result.page > 0 ? result.page : fallback ?? 1;

const resolvePages = (
  result: PaginatedResult<any>,
  fallbackPageSize?: number,
  fallbackTotal?: number,
) => {
  if (result.pages && result.pages > 0) {
    return result.pages;
  }
  const candidateSize =
    result.pageSize ?? fallbackPageSize ?? result.items.length;
  const size = candidateSize || 1;
  const total = result.total ?? fallbackTotal ?? result.items.length;
  return size ? Math.max(1, Math.ceil(total / size)) : 1;
};

export interface AdminCreds {
  identifier: string;
  password: string;
}

export const adminLogin = async ({ identifier, password }: AdminCreds) => {
  const res = await adminApi.post('/auth/admin-login', {
    email: identifier,
    password,
  });
  const token = res.data?.data?.token;
  if (token) {
    localStorage.setItem('manacity_admin_token', token);
  }
  return token;
};

export interface MetricsSummary {
  users: number;
  shops: number;
  gmv: number;
  ordersToday: number;
  orders7d: number;
  orders30d: number;
  activeEvents: number;
  conversions: number;
  topShops?: Array<{ id: string; name: string; orders: number }>;
  topProducts?: Array<{ id: string; name: string; orders: number }>;
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface AnalyticsResponse {
  totals: {
    users: number;
    shops: number;
    products: number;
    orders: number;
    gmv: number;
  };
  trends?: {
    orders?: SeriesPoint[];
    gmv?: SeriesPoint[];
  };
  generatedAt: string;
}

export const fetchMetrics = async () => {
  const res = await adminApi.get(withAdminPrefix('metrics'));
  return extractEntity<MetricsSummary>(res.data);
};

export const fetchAdminAnalytics = async (since?: string) => {
  const res = await adminApi.get(withAdminPrefix('analytics'), {
    params: since ? { since } : undefined,
  });
  return extractEntity<AnalyticsResponse>(res.data);
};

export const fetchMetricSeries = async (
  metric: 'orders' | 'signups' | 'gmv',
  period: string,
) => {
  const res = await adminApi.get(withAdminPrefix('metrics/timeseries'), {
    params: { metric, period },
  });
  return extractEntity<SeriesPoint[]>(res.data);
};

export interface UserQueryParams {
  role?: string;
  verified?: boolean;
  status?: string;
  query?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  createdFrom?: string;
  createdTo?: string;
}

export const fetchUsers = async (params: UserQueryParams = {}) => {
  const res = await adminApi.get(withAdminPrefix('users'), { params });
  return extractPaginatedResult<any>(res.data);
};

export const updateUserRole = async (id: string, role: string) => {
  await adminApi.put(withAdminPrefix(`users/${id}/role`), { role });
};

export const updateUserStatus = async (id: string, active: boolean) => {
  await adminApi.put(withAdminPrefix(`users/${id}/status`), { active });
};

export const deleteUser = async (id: string) => {
  await adminApi.delete(withAdminPrefix(`users/${id}`));
};

export interface BusinessRequestParams {
  status?: string;
  category?: string;
  location?: string;
}

export const fetchBusinessRequests = async (
  params: BusinessRequestParams = {},
) => {
  try {
    const res = await adminApi.get(withAdminPrefix('shops/requests'), { params });
    return extractPaginatedResult<any>(res.data);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
    const res = await adminApi.get(trimPath('/shops/requests'), { params });
    return extractPaginatedResult<any>(res.data);
  }
};

export const approveShop = async (id: string) => {
  await adminApi.post(withAdminPrefix(`shops/approve/${id}`));
};

export const rejectShop = async (id: string) => {
  await adminApi.post(withAdminPrefix(`shops/reject/${id}`));
};

export interface VerificationRequestParams {
  page?: number;
  pageSize?: number;
  status?: string;
  profession?: string;
}

export const fetchVerificationRequests = async (
  params: VerificationRequestParams = {},
) => {
  const query = { status: 'pending', ...params };
  try {
    const res = await adminApi.get(withAdminPrefix('verified/requests'), {
      params: query,
    });
    const result = extractPaginatedResult<any>(res.data, ['requests']);
    const page = resolvePage(result, params.page);
    const pages = resolvePages(result, params.pageSize, result.total);
    return {
      requests: result.items,
      total: result.total,
      page,
      pages,
    };
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  const fallbackRes = await http.get('/verified', {
    params: query,
  });
  const fallback = extractPaginatedResult<any>(fallbackRes.data, ['requests']);
  const page = resolvePage(fallback, params.page);
  const pages = resolvePages(
    fallback,
    params.pageSize ?? fallback.pageSize,
    fallback.total,
  );
  return {
    requests: fallback.items,
    total: fallback.total,
    page,
    pages,
  };
};

export const updateVerificationRequest = async (
  id: string,
  status: 'pending' | 'approved' | 'rejected',
) => {
  if (status === 'approved') {
    return adminApi.post(withAdminPrefix(`verified/${id}/approve`));
  }

  if (status === 'rejected') {
    return adminApi.post(withAdminPrefix(`verified/${id}/reject`));
  }

  return adminApi.patch(withAdminPrefix(`verified/${id}/status`), { status });
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
  const res = await adminApi.get(withAdminPrefix('shops'), { params });
  return extractPaginatedResult<any>(res.data);
};

export const createShop = async (data: {
  name: string;
  category: string;
  location: string;
  ownerId: string;
  status?: string;
}) => {
  const res = await adminApi.post(withAdminPrefix('shops'), data);
  return extractEntity<any>(res.data);
};

export const updateShop = async (
  id: string,
  data: Partial<{ name: string; category: string; location: string; status: string }>,
) => {
  const res = await adminApi.put(withAdminPrefix(`shops/${id}`), data);
  return extractEntity<any>(res.data);
};

export const deleteShop = async (id: string) => {
  await adminApi.delete(withAdminPrefix(`shops/${id}`));
};

export interface ProductQueryParams {
  shopId?: string;
  query?: string;
  category?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export const fetchProducts = async (params: ProductQueryParams = {}) => {
  const res = await adminApi.get(withAdminPrefix('products'), { params });
  return extractPaginatedResult<any>(res.data);
};

export interface AdminCreateProductPayload {
  shopId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  mrp: number;
  stock: number;
  image?: string;
  images?: string[];
}

export const createProduct = async (data: AdminCreateProductPayload) => {
  const res = await adminApi.post(withAdminPrefix('products'), data);
  return extractEntity<any>(res.data);
};

export const updateProduct = async (
  id: string,
  data: Partial<{
    name: string;
    description: string;
    mrp: number;
    price: number;
    stock: number;
    images: string[];
    status: string;
    category: string;
    image: string;
  }>,
) => {
  const res = await adminApi.put(withAdminPrefix(`products/${id}`), data);
  return extractEntity<any>(res.data);
};

export const deleteProduct = async (id: string) => {
  await adminApi.delete(withAdminPrefix(`products/${id}`));
};

export interface EventQueryParams {
  status?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  query?: string;
  category?: string;
  type?: string;
}

export interface AdminEventPayload {
  title: string;
  category: string;
  type: string;
  format: string;
  startAt: string;
  endAt: string;
  registrationOpenAt: string;
  registrationCloseAt: string;
  teamSize: number;
  capacity: number;
  maxParticipants?: number;
  entryFeePaise?: number;
  prizePool?: string;
  mode?: 'online' | 'venue';
  venue?: string | null;
  description?: string;
  rules?: string;
  bannerUrl?: string | null;
  coverUrl?: string | null;
  templateId?: string;
}

export const fetchEvents = async (params: EventQueryParams = {}) => {
  const res = await adminApi.get(withAdminPrefix('events'), { params });
  return extractPaginatedResult<any>(res.data);
};

export const fetchEventByIdAdmin = async (id: string) => {
  const res = await adminApi.get(withAdminPrefix(`events/${id}`));
  return extractEntity<any>(res.data);
};

export const createEvent = async (data: AdminEventPayload) => {
  const res = await adminApi.post(withAdminPrefix('events'), data);
  return extractEntity<any>(res.data);
};

export const updateEvent = async (id: string, data: Partial<AdminEventPayload>) => {
  const res = await adminApi.put(withAdminPrefix(`events/${id}`), data);
  return extractEntity<any>(res.data);
};

export const deleteEvent = async (id: string) => {
  await adminApi.delete(withAdminPrefix(`events/${id}`));
};

const eventLifecycleEndpoint = async (id: string, action: 'publish' | 'start' | 'complete' | 'cancel') => {
  const res = await adminApi.post(withAdminPrefix(`events/${id}/${action}`));
  return extractEntity<any>(res.data);
};

export const publishEvent = async (id: string) => eventLifecycleEndpoint(id, 'publish');

export const startEvent = async (id: string) => eventLifecycleEndpoint(id, 'start');

export const completeEvent = async (id: string) => eventLifecycleEndpoint(id, 'complete');

export const cancelEvent = async (id: string) => eventLifecycleEndpoint(id, 'cancel');

export const updateEventWindow = async (
  id: string,
  payload: { regOpenAt: string; regCloseAt: string },
) => {
  const res = await adminApi.patch(withAdminPrefix(`events/${id}/window`), payload);
  return extractEntity<any>(res.data);
};
