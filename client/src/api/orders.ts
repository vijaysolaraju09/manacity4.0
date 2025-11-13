import axios from 'axios';
import { toItem, toItems } from '@/lib/response';
import { normalizeOrder, type Order } from '@/store/orders';

const baseURL = import.meta.env.VITE_API_URL;

const ordersClient = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 20000,
});

const normalizeObjectId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return /^[a-f\d]{24}$/iu.test(trimmed) ? trimmed : undefined;
};

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
}

export interface CreateOrderPayload {
  shopId: string;
  items: CreateOrderItemInput[];
}

const toPositiveQuantity = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  const floored = Math.floor(parsed);
  return floored > 0 ? floored : 1;
};

export const createOrder = async ({ shopId, items }: CreateOrderPayload): Promise<Order> => {
  const trimmedShopId = typeof shopId === 'string' ? shopId.trim() : '';
  if (!trimmedShopId) {
    throw new Error('Shop is required to place an order');
  }

  const sanitizedItems = Array.isArray(items)
    ? items
        .map(({ productId, quantity }) => {
          const trimmedProductId = typeof productId === 'string' ? productId.trim() : '';
          if (!trimmedProductId) {
            return null;
          }
          return {
            productId: trimmedProductId,
            quantity: toPositiveQuantity(quantity),
          };
        })
        .filter((entry): entry is CreateOrderItemInput => Boolean(entry))
    : [];

  if (sanitizedItems.length === 0) {
    throw new Error('At least one product is required to place an order');
  }

  const body = {
    shopId: trimmedShopId,
    items: sanitizedItems.map(({ productId, quantity }) => ({
      productId,
      quantity,
    })),
  };

  const response = await ordersClient.post('/orders', body);
  return normalizeOrder(toItem(response));
};

export interface CheckoutOrderItemInput {
  productId: string;
  qty?: number;
  quantity?: number;
  options?: Record<string, unknown>;
}

export interface CheckoutOrdersPayload {
  items: CheckoutOrderItemInput[];
  addressId?: string;
  shippingAddress?: Record<string, unknown>;
  paymentMethod?: string;
  payment?: { method?: string };
  notes?: string;
  fulfillmentType?: 'pickup' | 'delivery';
  fulfillment?: Record<string, unknown>;
}

export interface CheckoutOrderSummary {
  id: string;
  shopId: string;
  shopName?: string | null;
  status?: string | null;
  grandTotal?: number | null;
}

export const checkoutOrders = async (
  payload: CheckoutOrdersPayload,
): Promise<CheckoutOrderSummary[]> => {
  const {
    items,
    addressId,
    shippingAddress,
    paymentMethod,
    payment,
    notes,
    fulfillmentType,
    fulfillment,
  } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one item is required to checkout');
  }

  const body: Record<string, unknown> = {
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
  };

  const normalizedAddressId = normalizeObjectId(addressId);
  if (normalizedAddressId) body.addressId = normalizedAddressId;
  if (shippingAddress) body.shippingAddress = shippingAddress;
  if (notes) body.notes = notes;
  if (fulfillmentType) body.fulfillmentType = fulfillmentType;
  if (fulfillment) body.fulfillment = fulfillment;

  const methodSource = paymentMethod ?? payment?.method ?? 'COD';
  if (typeof methodSource === 'string' && methodSource.trim()) {
    body.paymentMethod = methodSource.trim();
  }

  if (payment) body.payment = payment;

  const response = await ordersClient.post('/orders/checkout', body);
  const payloadData = response?.data?.data;
  const orders = Array.isArray(payloadData?.orders)
    ? payloadData.orders
    : (toItems(response) as { _id?: string; id?: string; shopId?: string }[]);

  return orders
    .map((order) => {
      const id = order.id || order._id;
      const shopId = order.shopId;
      if (!id || !shopId) {
        return null;
      }
      return {
        id,
        shopId,
        shopName: 'shopName' in order ? (order as any).shopName ?? null : undefined,
        status: 'status' in order ? (order as any).status ?? null : undefined,
        grandTotal: 'grandTotal' in order ? (order as any).grandTotal ?? null : undefined,
      } satisfies CheckoutOrderSummary;
    })
    .filter((entry): entry is CheckoutOrderSummary => Boolean(entry));
};
