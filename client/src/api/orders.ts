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
  qty?: number;
  quantity?: number;
  options?: Record<string, unknown>;
}

export interface CreateOrderPayload {
  shopId: string;
  items: CreateOrderItemInput[];
  notes?: string;
  addressId?: string;
  fulfillmentType?: 'pickup' | 'delivery';
  shippingAddress?: Record<string, unknown>;
  paymentMethod?: string;
  payment?: { method?: string };
  idempotencyKey?: string;
}

export const createOrder = async (
  payload: CreateOrderPayload,
): Promise<Order> => {
  const {
    shopId,
    items,
    notes,
    addressId,
    fulfillmentType,
    shippingAddress,
    paymentMethod,
    payment,
    idempotencyKey,
  } = payload;

  const selectedFulfillmentType = fulfillmentType ?? 'pickup';

  const body: Record<string, unknown> = {
    shopId,
    items: items.map(({ productId, qty, quantity, options }) => {
      const rawQty = qty ?? quantity ?? 1;
      const numericQty = Number(rawQty);
      const resolvedQty = Number.isFinite(numericQty) && numericQty > 0 ? numericQty : 1;
      return {
        productId,
        qty: resolvedQty,
        ...(options ? { options } : {}),
      };
    }),
    fulfillmentType: selectedFulfillmentType,
  };

  if (notes) body.notes = notes;
  if (addressId) body.addressId = addressId;
  if (shippingAddress) body.shippingAddress = shippingAddress;

  const methodSource = paymentMethod ?? payment?.method ?? 'COD';
  if (typeof methodSource === 'string' && methodSource.trim()) {
    body.paymentMethod = methodSource.trim();
  }

  if (payment) body.payment = payment;

  const headers = idempotencyKey
    ? { 'Idempotency-Key': idempotencyKey }
    : undefined;

  const response = await ordersClient.post('/orders', body, { headers });
  return normalizeOrder(toItem(response));
};
