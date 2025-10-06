import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice,
  type EntityState,
} from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toItems, toItem, toErrorMessage } from '@/lib/response';
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
      return toItems(res) as Order[];
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
      return toItems(res) as Order[];
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async (
    { id, action }: { id: string; action: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await http.patch(`/orders/${id}`, { action });
      return toItem(res) as Order;
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
      return toItem(res) as Order;
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
        ordersAdapter.setAll(state.mine, action.payload as Order[]);
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.mine.status = 'failed';
        state.mine.error =
          (action.payload as string) || action.error.message || 'Failed to load';
      })
      .addCase(fetchReceivedOrders.pending, (state) => {
        state.received.status = 'loading';
        state.received.error = null;
      })
      .addCase(fetchReceivedOrders.fulfilled, (state, action) => {
        state.received.status = 'succeeded';
        ordersAdapter.setAll(state.received, action.payload as Order[]);
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

