import axios from 'axios';
import { toItem } from '@/lib/response';
import { normalizeOrder, type Order } from '@/store/orders';

const baseURL = import.meta.env.VITE_API_URL;

const ordersClient = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 20000,
});

ordersClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  options?: Record<string, unknown>;
}

export interface CreateOrderPayload {
  shopId: string;
  items: CreateOrderItemInput[];
  fulfillment?: { type: 'pickup' | 'delivery'; eta?: string | null };
  notes?: string;
  shippingAddress?: Record<string, unknown>;
  payment?: { method?: string };
  idempotencyKey?: string;
}

export const createOrder = async (
  payload: CreateOrderPayload,
): Promise<Order> => {
  const { shopId, items, fulfillment, notes, shippingAddress, payment, idempotencyKey } = payload;

  const body: Record<string, unknown> = {
    shopId,
    items: items.map(({ productId, quantity, options }) => ({
      productId,
      quantity,
      ...(options ? { options } : {}),
    })),
    fulfillment: fulfillment ?? { type: 'pickup' },
  };

  if (notes) body.notes = notes;
  if (shippingAddress) body.shippingAddress = shippingAddress;
  if (payment) body.payment = payment;

  const headers = idempotencyKey
    ? { 'Idempotency-Key': idempotencyKey }
    : undefined;

  const response = await ordersClient.post('/orders', body, { headers });
  return normalizeOrder(toItem(response));
};
