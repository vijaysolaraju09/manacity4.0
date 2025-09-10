import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/config/api";

export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image?: string;
  images?: string[];
  mrp?: number;
  discount?: number;
  ratingAvg?: number;
  shop?: string;
}

type St<T> = {
  items: T[];
  item: T | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  page?: number;
  hasMore?: boolean;
};

const initial: St<Product> = {
  items: [],
  item: null,
  status: "idle",
  error: null,
  page: 1,
  hasMore: true,
};

export const fetchSpecialProducts = createAsyncThunk(
  "products/fetchSpecial",
  async (params?: any) => {
    const { data } = await api.get("/special-shop", { params });
    return Array.isArray(data) ? { items: data } : data;
  }
);

export const fetchProductById = createAsyncThunk(
  "products/fetchById",
  async (id: string) => {
    const { data } = await api.get(`/products/${id}`);
    return data;
  }
);

const productsSlice = createSlice({
  name: "products",
  initialState: initial,
  reducers: {
    clearItem(s) {
      s.item = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchSpecialProducts.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(fetchSpecialProducts.fulfilled, (s, a) => {
      s.status = "succeeded";
      const payload: any = a.payload;
      const arr = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : [];
      s.items = arr;
    });
    b.addCase(fetchSpecialProducts.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.error as any)?.message || "Failed to load";
    });
    b.addCase(fetchProductById.pending, (s) => {
      s.status = "loading";
      s.error = null;
      s.item = null;
    });
    b.addCase(fetchProductById.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.item = a.payload as Product;
    });
    b.addCase(fetchProductById.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.error as any)?.message || "Failed to load";
    });
  },
});

export const { clearItem } = productsSlice.actions;
export default productsSlice.reducer;
