import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/config/api";

export interface VerifiedUser {
  _id: string;
  name: string;
  profession: string;
  location: string;
  bio?: string;
  contact?: string;
  avatar?: string;
  rating?: number;
  stats?: Record<string, any>;
  reviews?: Array<Record<string, any>>;
}

type St<T> = {
  items: T[];
  item: T | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  page?: number;
  hasMore?: boolean;
};

const initial: St<VerifiedUser> = {
  items: [],
  item: null,
  status: "idle",
  error: null,
  page: 1,
  hasMore: true,
};

export const fetchVerified = createAsyncThunk(
  "verified/fetchAll",
  async (params?: any) => {
    const { data } = await api.get("/verified", { params });
    return Array.isArray(data) ? { items: data } : data;
  }
);

export const fetchVerifiedById = createAsyncThunk(
  "verified/fetchById",
  async (id: string) => {
    const { data } = await api.get(`/verified/${id}`);
    return data;
  }
);

const verifiedSlice = createSlice({
  name: "verified",
  initialState: initial,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchVerified.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(fetchVerified.fulfilled, (s, a) => {
      s.status = "succeeded";
      const payload: any = a.payload;
      const arr = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : [];
      s.items = arr;
    });
    b.addCase(fetchVerified.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.error as any)?.message || "Failed to load";
    });
    b.addCase(fetchVerifiedById.pending, (s) => {
      s.status = "loading";
      s.error = null;
      s.item = null;
    });
    b.addCase(fetchVerifiedById.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.item = a.payload as VerifiedUser;
    });
    b.addCase(fetchVerifiedById.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.error as any)?.message || "Failed to load";
    });
  },
});

export default verifiedSlice.reducer;
