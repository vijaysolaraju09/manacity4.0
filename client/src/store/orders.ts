import {
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
  createSlice,
  type EntityState,
} from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toItems, toItem, toErrorMessage } from '@/lib/response';
import { toPaise as ensurePaise, rupeesToPaise } from '@/utils/currency';
import type { RootState } from './index';

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'placed'
  | 'confirmed'
  | 'accepted'
  | 'rejected'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'completed'
  | 'returned';

export interface OrderItem {
  id: string;
  productId?: string;
  title: string;
  image?: string;
  qty: number;
  unitPricePaise: number;
  subtotalPaise: number;
  options?: Record<string, unknown> | null;
}

export interface OrderTotals {
  itemsPaise: number;
  discountPaise: number;
  taxPaise: number;
  shippingPaise: number;
  grandPaise: number;
}

export interface OrderParty {
  id: string;
  name?: string;
  phone?: string;
  location?: string;
  address?: string;
}

export interface OrderTimelineEntry {
  at: string;
  by: 'system' | 'user' | 'shop' | 'admin';
  status: OrderStatus;
  note?: string;
}

export interface OrderFulfillment {
  type: 'pickup' | 'delivery';
  eta?: string | null;
}

export interface OrderAddress {
  name?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  landmark?: string;
  city?: string;
  pincode?: string;
  geo?: { lat?: number; lng?: number };
}

export interface Order {
  id: string;
  type: 'product' | 'service';
  status: OrderStatus;
  items: OrderItem[];
  totals: OrderTotals;
  fulfillment: OrderFulfillment;
  shippingAddress?: OrderAddress | null;
  notes?: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  timeline: OrderTimelineEntry[];
  customer: OrderParty;
  shop: OrderParty;
  payment?: { method?: string; status?: string };
  cancel?: { by?: string; reason?: string; at?: string | null } | null;
  rating?: number | null;
  review?: string | null;
  contactSharedAt?: string | null;
}

export interface CheckoutCartItemPayload {
  productId: string;
  qty: number;
  shopId?: string;
  variantId?: string;
  options?: Record<string, unknown> | null;
}

export interface CheckoutCartInput {
  items: CheckoutCartItemPayload[];
  addressId?: string;
  shippingAddress?: Record<string, unknown>;
}

export interface CheckoutCartResult {
  summaries: { id: string; shopId?: string; status?: OrderStatus }[];
  orders: Order[];
  raw?: unknown;
}

const toIsoString = (value: unknown): string => {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const toPositivePaise = (value: unknown): number => {
  const raw = ensurePaise(value);
  return Number.isFinite(raw) ? Math.max(0, raw) : 0;
};

const fromRupeesToPaise = (value: unknown): number => {
  const raw = rupeesToPaise(value);
  return Number.isFinite(raw) ? Math.max(0, raw) : 0;
};

const resolveId = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const possibleId = (value as { _id?: unknown; id?: unknown })._id ?? (
      value as { id?: unknown }
    ).id;
    if (possibleId) return resolveId(possibleId);
  }
  return undefined;
};

export const normalizeOrder = (input: any): Order => {
  if (!input) {
    throw new Error('Invalid order payload');
  }

  const fallbackId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const id = resolveId(input._id ?? input.id) ?? fallbackId;
  const type: Order['type'] = input.type === 'service' ? 'service' : 'product';
  const createdAt = toIsoString(input.createdAt);
  const updatedAt = toIsoString(input.updatedAt ?? input.modifiedAt ?? input.createdAt);
  const usesPaise =
    typeof input.itemsTotal === 'number' || typeof input.grandTotal === 'number';

  const items = Array.isArray(input.items)
    ? input.items.map((item: any, index: number): OrderItem => {
        const rawQty = Number(item.qty ?? item.quantity ?? 0);
        const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
        const unitPricePaise = usesPaise
          ? toPositivePaise(item.unitPrice ?? item.price ?? 0)
          : fromRupeesToPaise(item.unitPrice ?? item.price ?? 0);
        const subtotalCandidate = item.subtotal ?? item.total;
        const subtotalPaise = usesPaise
          ? subtotalCandidate !== undefined
            ? toPositivePaise(subtotalCandidate)
            : unitPricePaise * qty
          : subtotalCandidate !== undefined
          ? fromRupeesToPaise(subtotalCandidate)
          : unitPricePaise * qty;
        return {
          id: resolveId(item._id ?? item.id) ?? `${id}-item-${index}`,
          productId:
            resolveId(item.product) ??
            resolveId(item.productId) ??
            (typeof item.sku === 'string' ? item.sku : undefined),
          title:
            (item.productSnapshot && item.productSnapshot.name) ||
            item.name ||
            'Item',
          image:
            (item.productSnapshot && item.productSnapshot.image) ||
            item.image ||
            undefined,
          qty,
          unitPricePaise,
          subtotalPaise,
          options: item.options || null,
        };
      })
    : [];

  const totals: OrderTotals = usesPaise
    ? {
        itemsPaise: toPositivePaise(input.itemsTotal),
        discountPaise: toPositivePaise(input.discountTotal),
        taxPaise: toPositivePaise(input.taxTotal),
        shippingPaise: toPositivePaise(input.shippingFee),
        grandPaise: toPositivePaise(input.grandTotal),
      }
    : {
        itemsPaise: fromRupeesToPaise(input.totals?.subtotal ?? input.itemsTotal),
        discountPaise: fromRupeesToPaise(input.totals?.discount ?? input.discountTotal),
        taxPaise: fromRupeesToPaise(input.totals?.tax ?? input.totals?.taxes ?? input.taxTotal),
        shippingPaise: fromRupeesToPaise(
          input.totals?.shipping ?? input.totals?.fee ?? input.shippingFee,
        ),
        grandPaise: fromRupeesToPaise(
          input.totals?.total ?? input.totals?.grand ?? input.grandTotal,
        ),
      };

  const userSnapshot = input.userSnapshot || input.customer || input.customerDetails || {};
  const customerId =
    resolveId(input.user) ??
    resolveId(input.customerId) ??
    resolveId(userSnapshot._id) ??
    resolveId(userSnapshot.id) ??
    '';
  const customer: OrderParty = {
    id: customerId,
    name: userSnapshot.name || userSnapshot.fullName || input.customerName || '',
    phone: userSnapshot.phone || userSnapshot.contact || undefined,
    location: userSnapshot.location || undefined,
    address: userSnapshot.address || undefined,
  };

  const shopSnapshot = input.shopSnapshot || input.shop || input.target || {};
  const shopId =
    resolveId(input.shop) ??
    resolveId(input.shopId) ??
    resolveId(input.targetId) ??
    resolveId(shopSnapshot._id) ??
    resolveId(shopSnapshot.id) ??
    '';
  const shop: OrderParty = {
    id: shopId,
    name: shopSnapshot.name || input.shopName || input.targetName || '',
    phone: shopSnapshot.phone || undefined,
    location: shopSnapshot.location || undefined,
    address: shopSnapshot.address || undefined,
  };

  const fulfillment: OrderFulfillment = {
    type: input.fulfillment?.type === 'delivery' ? 'delivery' : 'pickup',
    eta: input.fulfillment?.eta ? toIsoString(input.fulfillment.eta) : undefined,
  };

  const timeline: OrderTimelineEntry[] = Array.isArray(input.timeline)
    ? input.timeline.map((entry: any) => ({
        at: toIsoString(entry.at),
        by: entry.by || 'system',
        status: entry.status || input.status || 'pending',
        note: entry.note || undefined,
      }))
    : [];

  const cancelInfo = input.cancel
    ? {
        by: input.cancel.by || undefined,
        reason: input.cancel.reason || undefined,
        at: input.cancel.at ? toIsoString(input.cancel.at) : null,
      }
    : null;

  const contactSharedAt = input.contactSharedAt
    ? toIsoString(input.contactSharedAt)
    : input.contactSharedAt ?? null;

  const status: OrderStatus = (input.status || 'pending') as OrderStatus;

  return {
    id,
    type,
    status,
    items,
    totals,
    fulfillment,
    shippingAddress: input.shippingAddress || null,
    notes: input.notes || undefined,
    currency: typeof input.currency === 'string' ? input.currency : 'INR',
    createdAt,
    updatedAt,
    timeline,
    customer,
    shop,
    payment: input.payment ? { method: input.payment.method, status: input.payment.status } : undefined,
    cancel: cancelInfo,
    rating: typeof input.rating === 'number' ? input.rating : null,
    review: input.review || null,
    contactSharedAt,
  };
};

const ordersAdapter = createEntityAdapter<Order, string>({
  selectId: (order) => order.id,
  sortComparer: (a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
});

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface OrdersSliceState {
  mine: EntityState<Order, string> & { status: RequestStatus; error: string | null };
  received: EntityState<Order, string> & { status: RequestStatus; error: string | null };
}

const initialState: OrdersSliceState = {
  mine: ordersAdapter.getInitialState({ status: 'idle', error: null }),
  received: ordersAdapter.getInitialState({ status: 'idle', error: null }),
};

const toObject = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
};

const extractOrdersFromResponse = (res: any): any[] => {
  const directArray = Array.isArray(res?.data?.orders)
    ? res.data.orders
    : Array.isArray(res?.data?.data?.orders)
    ? res.data.data.orders
    : Array.isArray(res?.data)
    ? res.data
    : null;

  if (Array.isArray(directArray)) {
    return directArray;
  }

  const envelope = toObject(toItem(res));
  if (envelope) {
    if (Array.isArray(envelope.orders)) {
      return envelope.orders as any[];
    }
    const firstArray = Object.values(envelope).find((entry) => Array.isArray(entry));
    if (Array.isArray(firstArray)) {
      return firstArray as any[];
    }
  }

  const fallback = toItems(res);
  return Array.isArray(fallback) ? fallback : [];
};

export const checkoutCart = createAsyncThunk(
  'orders/checkoutCart',
  async ({ items, addressId, shippingAddress }: CheckoutCartInput, { rejectWithValue }) => {
    try {
      const sanitizedItems = Array.isArray(items)
        ? items
            .map((item) => {
              const productId = String(item.productId ?? '').trim();
              if (!productId) {
                return null;
              }
              const qtyRaw = Number(item.qty);
              const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;
              const payload: Record<string, unknown> = { productId, qty };
              if (item.options && typeof item.options === 'object') {
                payload.options = item.options;
              }
              if (item.variantId) {
                payload.variantId = String(item.variantId);
              }
              return payload;
            })
            .filter((entry): entry is Record<string, unknown> => Boolean(entry))
        : [];

      if (sanitizedItems.length === 0) {
        throw new Error('At least one item is required to checkout');
      }

      const body: Record<string, unknown> = {
        items: sanitizedItems,
      };

      const trimmedAddressId = typeof addressId === 'string' ? addressId.trim() : '';
      if (trimmedAddressId) {
        body.addressId = trimmedAddressId;
      }
      if (shippingAddress && typeof shippingAddress === 'object') {
        body.shippingAddress = shippingAddress;
      }

      const res = await http.post('/api/orders/checkout', body);
      const rawOrders = extractOrdersFromResponse(res);

      const normalizedOrders = rawOrders
        .map((entry) => {
          try {
            return normalizeOrder(entry);
          } catch (error) {
            return null;
          }
        })
        .filter((order): order is Order => Boolean(order));

      const summaries = rawOrders
        .map((entry) => {
          const data = toObject(entry) ?? {};
          const idCandidate = data._id ?? data.id;
          if (!idCandidate || typeof idCandidate !== 'string') {
            return null;
          }
          const shopIdCandidate =
            typeof data.shopId === 'string'
              ? data.shopId
              : typeof data.shop === 'object' && data.shop
              ? (data.shop as { _id?: string; id?: string })._id ?? (data.shop as { id?: string }).id
              : undefined;
          const statusCandidate = typeof data.status === 'string' ? (data.status as OrderStatus) : undefined;
          return {
            id: idCandidate,
            shopId: shopIdCandidate,
            status: statusCandidate,
          };
        })
        .filter((entry): entry is { id: string; shopId?: string; status?: OrderStatus } => Boolean(entry));

      return { summaries, orders: normalizedOrders, raw: rawOrders } satisfies CheckoutCartResult;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  },
);

export const fetchMyOrders = createAsyncThunk(
  'orders/fetchMine',
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await http.get('/orders/mine');
      const data = toItems(res) as any[];
      return data.map(normalizeOrder);
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchReceivedOrders = createAsyncThunk(
  'orders/fetchReceived',
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await http.get('/api/orders/received');
      const data = toItems(res) as any[];
      return data.map(normalizeOrder);
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const respondToReceivedOrder = createAsyncThunk(
  'orders/respondToReceived',
  async (
    { id, status, note }: { id: string; status: Extract<OrderStatus, 'accepted' | 'rejected'>; note?: string },
    { rejectWithValue }
  ) => {
    try {
      const trimmedId = String(id ?? '').trim();
      if (!trimmedId) {
        throw new Error('Order id is required');
      }
      const payload: Record<string, unknown> = { status };
      if (note && note.trim()) {
        payload.note = note.trim();
      }
      const res = await http.patch(`/api/business/orders/${trimmedId}`, payload);
      return normalizeOrder(toItem(res));
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async (
    { id, status, note }: { id: string; status: OrderStatus; note?: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await http.patch(`/api/orders/${id}/status`, { status, note });
      return normalizeOrder(toItem(res));
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const cancelOrder = createAsyncThunk(
  'orders/cancel',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      const res = await http.patch(`/orders/${id}/cancel`, { reason });
      return normalizeOrder(toItem(res));
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const rateOrder = createAsyncThunk(
  'orders/rate',
  async (
    { id, rating, review }: { id: string; rating: number; review?: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await http.post(`/orders/${id}/rate`, { rating, review });
      return normalizeOrder(toItem(res));
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const updateServiceOrderStatus = createAsyncThunk(
  'orders/updateServiceStatus',
  async (
    { id, action }: { id: string; action: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await http.patch(`/api/pros/orders/${id}`, { action });
      return normalizeOrder(toItem(res));
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyOrders.pending, (state) => {
        state.mine.status = 'loading';
        state.mine.error = null;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.mine.status = 'succeeded';
        ordersAdapter.setAll(state.mine, action.payload);
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.mine.status = 'failed';
        state.mine.error = (action.payload as string) || action.error.message || 'Failed to load';
      })
      .addCase(fetchReceivedOrders.pending, (state) => {
        state.received.status = 'loading';
        state.received.error = null;
      })
      .addCase(fetchReceivedOrders.fulfilled, (state, action) => {
        state.received.status = 'succeeded';
        ordersAdapter.setAll(state.received, action.payload);
      })
      .addCase(fetchReceivedOrders.rejected, (state, action) => {
        state.received.status = 'failed';
        state.received.error =
          (action.payload as string) || action.error.message || 'Failed to load';
      })
      .addCase(checkoutCart.fulfilled, (state, action) => {
        const { orders } = action.payload as CheckoutCartResult;
        if (Array.isArray(orders) && orders.length > 0) {
          ordersAdapter.upsertMany(state.mine, orders);
        }
      })
      .addCase(respondToReceivedOrder.fulfilled, (state, action) => {
        ordersAdapter.upsertOne(state.received, action.payload);
        ordersAdapter.upsertOne(state.mine, action.payload);
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        ordersAdapter.upsertOne(state.mine, action.payload);
        ordersAdapter.upsertOne(state.received, action.payload);
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        ordersAdapter.upsertOne(state.mine, action.payload);
        ordersAdapter.upsertOne(state.received, action.payload);
      })
      .addCase(rateOrder.fulfilled, (state, action) => {
        ordersAdapter.upsertOne(state.mine, action.payload);
        ordersAdapter.upsertOne(state.received, action.payload);
      })
      .addCase(updateServiceOrderStatus.fulfilled, (state, action) => {
        ordersAdapter.upsertOne(state.mine, action.payload);
        ordersAdapter.upsertOne(state.received, action.payload);
      });
  },
});

export default ordersSlice.reducer;

const selectMineState = (state: RootState) => state.orders.mine;
const selectReceivedState = (state: RootState) => state.orders.received;

export const { selectAll: selectMyOrders } = ordersAdapter.getSelectors(selectMineState);

export const { selectAll: selectReceivedOrders } = ordersAdapter.getSelectors(
  selectReceivedState
);

export const selectOrdersByStatus = (
  state: RootState,
  role: 'mine' | 'received',
  status: OrderStatus
) => {
  const source = role === 'mine' ? selectMyOrders(state) : selectReceivedOrders(state);
  return source.filter((order) => order.status === status);
};

export const selectOrderById = (state: RootState, id: string) =>
  state.orders.mine.entities[id] ?? state.orders.received.entities[id] ?? null;

const activeCustomerStatuses: OrderStatus[] = [
  'pending',
  'placed',
  'confirmed',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
];

export const selectMyPendingOrders = createSelector(selectMyOrders, (orders) =>
  orders.filter((order) => activeCustomerStatuses.includes(order.status))
);

export const selectMyPendingOrdersCount = createSelector(
  selectMyPendingOrders,
  (orders) => orders.length,
);

