import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/config/api";

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
  products?: { _id: string }[];
}

export const fetchShops = createAsyncThunk(
  "shops/fetchAll",
  async (params?: Record<string, string>) => {
    const { data } = await api.get("/shops", { params });
    return data;
  }
);

type St = {
  items: Shop[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const init: St = { items: [], status: "idle", error: null };

const shopsSlice = createSlice({
  name: "shops",
  initialState: init,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchShops.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(fetchShops.fulfilled, (s, a) => {
      s.status = "succeeded";
      const payload: any = a.payload;
      s.items = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : [];
    });
    b.addCase(fetchShops.rejected, (s, a) => {
      s.status = "failed";
      s.error = a.error?.message || "Failed to load";
    });
  },
});

export default shopsSlice.reducer;
