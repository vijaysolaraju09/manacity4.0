import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { http } from "@/lib/http";
import { toItems, toItem, toErrorMessage } from "@/lib/response";
import type { VerifiedCard } from "@/types/verified";

type St<T> = {
  items: T[];
  item: T | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  page?: number;
  hasMore?: boolean;
};

const initial: St<VerifiedCard> = {
  items: [],
  item: null,
  status: "idle",
  error: null,
  page: 1,
  hasMore: true,
};

const normalize = (data: any): VerifiedCard => data as VerifiedCard;

export const fetchVerified = createAsyncThunk(
  "verified/fetchAll",
  async (
    params: any | undefined,
    { rejectWithValue }: { rejectWithValue: (value: any) => any }
  ) => {
    try {
      const res = await http.get("/verified", { params });
      return (toItems(res) as any[]).map(normalize);
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchVerifiedById = createAsyncThunk(
  "verified/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await http.get(`/verified/${id}`);
      return normalize(toItem(res));
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
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
      s.items = a.payload as VerifiedCard[];
    });
    b.addCase(fetchVerified.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
    b.addCase(fetchVerifiedById.pending, (s) => {
      s.status = "loading";
      s.error = null;
      s.item = null;
    });
    b.addCase(fetchVerifiedById.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.item = a.payload as VerifiedCard;
    });
    b.addCase(fetchVerifiedById.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
  },
});

export default verifiedSlice.reducer;
