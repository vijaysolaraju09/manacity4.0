import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/http";

export interface Order {
  _id: string;
  shop: string;
  items: any[];
  total: number;
  status: string;
  createdAt: string;
}

type St<T> = {
  items: T[];
  item?: T | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  page?: number;
  hasMore?: boolean;
};

interface OrdersState {
  mine: St<Order>;
  received: St<Order>;
}

const base: St<Order> = {
  items: [],
  status: "idle",
  error: null,
  page: 1,
  hasMore: true,
};

const initial: OrdersState = {
  mine: { ...base },
  received: { ...base },
};

export const fetchMyOrders = createAsyncThunk("orders/fetchMy", async (params?: any) => {
  const { data } = await api.get("/orders/my", { params });
  return Array.isArray(data) ? { items: data } : data;
});

export const fetchReceivedOrders = createAsyncThunk(
  "orders/fetchReceived",
  async (params?: any) => {
    const { data } = await api.get("/orders/received", { params });
    return Array.isArray(data) ? { items: data } : data;
  }
);

const ordersSlice = createSlice({
  name: "orders",
  initialState: initial,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMyOrders.pending, (s) => {
      s.mine.status = "loading";
      s.mine.error = null;
    });
    b.addCase(fetchMyOrders.fulfilled, (s, a) => {
      s.mine.status = "succeeded";
      const payload: any = a.payload;
      const arr = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : [];
      s.mine.items = arr;
    });
    b.addCase(fetchMyOrders.rejected, (s, a) => {
      s.mine.status = "failed";
      s.mine.error = (a.error as any)?.message || "Failed to load";
    });
    b.addCase(fetchReceivedOrders.pending, (s) => {
      s.received.status = "loading";
      s.received.error = null;
    });
    b.addCase(fetchReceivedOrders.fulfilled, (s, a) => {
      s.received.status = "succeeded";
      const payload: any = a.payload;
      const arr = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : [];
      s.received.items = arr;
    });
    b.addCase(fetchReceivedOrders.rejected, (s, a) => {
      s.received.status = "failed";
      s.received.error = (a.error as any)?.message || "Failed to load";
    });
  },
});

export default ordersSlice.reducer;
