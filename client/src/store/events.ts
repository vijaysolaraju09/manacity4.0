import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/http";

export interface Event {
  _id: string;
  name: string;
  image?: string;
  category?: string;
  location?: string;
  startDate?: string;
  date?: string;
  description?: string;
}

type St<T> = {
  items: T[];
  item: T | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  page?: number;
  hasMore?: boolean;
};

const initial: St<Event> = {
  items: [],
  item: null,
  status: "idle",
  error: null,
  page: 1,
  hasMore: true,
};

export const fetchEvents = createAsyncThunk(
  "events/fetchAll",
  async (params?: any) => {
    const { data } = await api.get("/events", { params });
    return Array.isArray(data) ? { items: data } : data;
  }
);

export const fetchEventById = createAsyncThunk(
  "events/fetchById",
  async (id: string) => {
    const { data } = await api.get(`/events/${id}`);
    return data;
  }
);

const eventsSlice = createSlice({
  name: "events",
  initialState: initial,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchEvents.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(fetchEvents.fulfilled, (s, a) => {
      s.status = "succeeded";
      const payload: any = a.payload;
      s.items = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : [];
    });
    b.addCase(fetchEvents.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.error as any)?.message || "Failed to load";
    });
    b.addCase(fetchEventById.pending, (s) => {
      s.status = "loading";
      s.error = null;
      s.item = null;
    });
    b.addCase(fetchEventById.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.item = a.payload as Event;
    });
    b.addCase(fetchEventById.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.error as any)?.message || "Failed to load";
    });
  },
});

export default eventsSlice.reducer;
