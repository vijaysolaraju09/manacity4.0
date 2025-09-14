import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { http } from "@/lib/http";
import { toItems, toItem, toErrorMessage } from "@/lib/response";

export interface Shop {
  id: string;
  _id: string;
  owner: string;
  name: string;
  category: string;
  location: string;
  address: string;
  image?: string | null;
  banner?: string | null;
  description?: string;
  status: "pending" | "approved" | "rejected";
  ratingAvg?: number;
  ratingCount?: number;
  createdAt?: string;
  contact?: string;
  isOpen?: boolean;
  distance?: number;
  products?: Product[];
}

interface Product {
  _id: string;
  name: string;
  price: number;
  image?: string;
  available?: boolean;
}

type St<T> = {
  items: T[];
  item: T | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  page?: number;
  hasMore?: boolean;
  products?: Product[];
};

const initial: St<Shop> = {
  items: [],
  item: null,
  status: "idle",
  error: null,
  page: 1,
  hasMore: true,
  products: [],
};

export const fetchShops = createAsyncThunk(
  "shops/fetchAll",
  async (
    params: Record<string, any> | undefined,
    { rejectWithValue }: { rejectWithValue: (value: any) => any }
  ) => {
    try {
      const p = { ...(params || {}) };
      if (p.status) {
        const map: Record<string, string> = { active: "approved", suspended: "rejected" };
        p.status = map[p.status] || p.status;
      }
      const res = await http.get("/shops", { params: p });
      return toItems(res) as Shop[];
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchShopById = createAsyncThunk(
  "shops/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await http.get(`/shops/${id}`);
      return toItem(res) as Shop;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchProductsByShop = createAsyncThunk(
  "shops/fetchProducts",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await http.get(`/shops/${id}/products`);
      return { id, items: toItems(res) };
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

const shopsSlice = createSlice({
  name: "shops",
  initialState: initial,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchShops.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(fetchShops.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.items = a.payload as Shop[];
    });
    b.addCase(fetchShops.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
    b.addCase(fetchShopById.pending, (s) => {
      s.status = "loading";
      s.error = null;
      s.item = null;
    });
    b.addCase(fetchShopById.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.item = a.payload as Shop;
    });
    b.addCase(fetchShopById.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
    b.addCase(fetchProductsByShop.fulfilled, (s, a) => {
      if ((s.item && s.item._id === a.payload.id) || !s.products) {
        s.products = a.payload.items as Product[];
      }
    });
    b.addCase(fetchProductsByShop.rejected, (s, a) => {
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
  },
});

export default shopsSlice.reducer;
