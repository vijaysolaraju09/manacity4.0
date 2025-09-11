import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { http } from "@/lib/http";

export interface Shop {
  _id: string;
  name: string;
  category: string;
  location: string;
  isOpen?: boolean;
  image?: string;
  logo?: string;
  rating?: number;
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
  async (params?: Record<string, any>) => {
    const res = await http.get("/shops", { params });
    const items =
      res.data?.data?.items ||
      res.data?.items ||
      (Array.isArray(res.data) ? res.data : []);
    return { items };
  }
);

export const fetchShopById = createAsyncThunk("shops/fetchById", async (id: string) => {
  const res = await http.get(`/shops/${id}`);
  return res.data?.data?.shop || res.data?.shop || res.data;
});

export const fetchProductsByShop = createAsyncThunk(
  "shops/fetchProducts",
  async (id: string) => {
    const res = await http.get(`/shops/${id}/products`);
    const items =
      res.data?.data?.items ||
      res.data?.items ||
      (Array.isArray(res.data) ? res.data : []);
    return { id, items };
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
      s.items = a.payload.items as Shop[];
    });
    b.addCase(fetchShops.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.error as any)?.message || "Failed to load";
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
      s.error = (a.error as any)?.message || "Failed to load";
    });
    b.addCase(fetchProductsByShop.fulfilled, (s, a) => {
      if ((s.item && s.item._id === a.payload.id) || !s.products) {
        s.products = a.payload.items as Product[];
      }
    });
  },
});

export default shopsSlice.reducer;
