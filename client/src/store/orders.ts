import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice,
  type EntityState,
} from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toItems, toItem, toErrorMessage } from '@/lib/response';
import type { RootState } from './index';

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'placed'
  | 'confirmed'
  | 'accepted'
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
  unitPrice: number;
  subtotal: number;
  options?: Record<string, unknown> | null;
}

export interface OrderTotals {
  items: number;
  discount: number;
  tax: number;
  shipping: number;
  grand: number;
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

const toIsoString = (value: unknown): string => {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const toRupees = (value: unknown): number => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num) / 100;
};

const toNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
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
        const unitPrice = usesPaise
          ? toRupees(item.unitPrice ?? item.price ?? 0)
          : toNumber(item.unitPrice ?? item.price ?? 0);
        const subtotal = usesPaise
          ? toRupees(item.subtotal ?? item.total ?? unitPrice * qty)
          : toNumber(item.subtotal ?? item.total ?? unitPrice * qty);
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
          unitPrice,
          subtotal,
          options: item.options || null,
        };
      })
    : [];

  const totals: OrderTotals = usesPaise
    ? {
        items: toRupees(input.itemsTotal),
        discount: toRupees(input.discountTotal),
        tax: toRupees(input.taxTotal),
        shipping: toRupees(input.shippingFee),
        grand: toRupees(input.grandTotal),
      }
    : {
        items: toNumber(input.totals?.subtotal ?? input.itemsTotal),
        discount: toNumber(input.totals?.discount ?? input.discountTotal),
        tax: toNumber(input.totals?.tax ?? input.totals?.taxes ?? input.taxTotal),
        shipping: toNumber(input.totals?.shipping ?? input.totals?.fee ?? input.shippingFee),
        grand: toNumber(input.totals?.total ?? input.totals?.grand ?? input.grandTotal),
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
        status: entry.status || input.status || 'placed',
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

  const status: OrderStatus = (input.status || 'placed') as OrderStatus;

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

interface OrdersSliceState {
  mine: EntityState<Order, string> & { status: RequestStatus; error: string | null };
  received: EntityState<Order, string> & { status: RequestStatus; error: string | null };
}

const initialState: OrdersSliceState = {
  mine: ordersAdapter.getInitialState({ status: 'idle', error: null }),
  received: ordersAdapter.getInitialState({ status: 'idle', error: null }),
};

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
      const res = await http.get('/orders/received');
      const data = toItems(res) as any[];
      return data.map(normalizeOrder);
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
      const res = await http.patch(`/orders/${id}/status`, { status, note });
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
      const res = await http.patch(`/verified/orders/${id}`, { action });
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

