import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice,
  type EntityState,
} from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import type { RootState } from './index';

export interface OrderItem {
  productId?: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Order {
  _id: string;
  type: 'product' | 'service';
  customerId: string | { _id: string; name: string; phone?: string };
  targetId: string;
  items: OrderItem[];
  status: 'pending' | 'accepted' | 'cancelled' | 'completed';
  totals: { subtotal: number; discount: number; total: number };
  contactSharedAt?: string;
  createdAt: string;
}

const ordersAdapter = createEntityAdapter<Order, string>({
  selectId: (order) => order._id,
  sortComparer: (a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
});

interface OrdersSliceState {
  mine: EntityState<Order, string> & { status: string; error: string | null };
  received: EntityState<Order, string> & { status: string; error: string | null };
}

const initialState: OrdersSliceState = {
  mine: ordersAdapter.getInitialState({ status: 'idle', error: null }),
  received: ordersAdapter.getInitialState({ status: 'idle', error: null }),
};

export const fetchMyOrders = createAsyncThunk(
  'orders/fetchMine',
  async () => {
    const res = await http.get('/orders/mine');
    return res.data.data as Order[];
  }
);

export const fetchReceivedOrders = createAsyncThunk(
  'orders/fetchReceived',
  async () => {
    const res = await http.get('/orders/received');
    return res.data.data as Order[];
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async ({ id, action }: { id: string; action: string }) => {
    const res = await http.patch(`/orders/${id}`, { action });
    return res.data.data as Order;
  }
);

export const updateServiceOrderStatus = createAsyncThunk(
  'orders/updateServiceStatus',
  async ({ id, action }: { id: string; action: string }) => {
    const res = await http.patch(`/verified/orders/${id}`, { action });
    return res.data.data as Order;
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
        state.mine.error = action.error.message || 'Failed to load';
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
        state.received.error = action.error.message || 'Failed to load';
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
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

// Selectors
const selectMineState = (state: RootState) => state.orders.mine;
const selectReceivedState = (state: RootState) => state.orders.received;

export const {
  selectAll: selectMyOrders,
} = ordersAdapter.getSelectors(selectMineState);

export const {
  selectAll: selectReceivedOrders,
} = ordersAdapter.getSelectors(selectReceivedState);

export const selectOrdersByStatus = (
  state: RootState,
  role: 'mine' | 'received',
  status: Order['status']
) => {
  const source = role === 'mine' ? selectMyOrders(state) : selectReceivedOrders(state);
  return source.filter((o) => o.status === status);
};

