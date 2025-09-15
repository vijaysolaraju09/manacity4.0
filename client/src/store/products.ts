import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { http } from "@/lib/http";
import { toItems, toItem, toErrorMessage } from "@/lib/response";

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
  available?: boolean;
  isSpecial?: boolean;
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
  async (params: any | undefined, { rejectWithValue }) => {
    try {
      const res = await http.get("/special", { params });
      return toItems(res) as Product[];
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchProductById = createAsyncThunk(
  "products/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await http.get(`/products/${id}`);
      return toItem(res) as Product;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
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
      s.items = a.payload as Product[];
    });
    b.addCase(fetchSpecialProducts.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
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
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
  },
});

export const { clearItem } = productsSlice.actions;
export default productsSlice.reducer;
