import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { http } from "@/lib/http";
import { toItems, toItem, toErrorMessage } from "@/lib/response";

export interface Event {
  _id: string;
  title: string;
  cover?: string;
  startsAt: string;
  endsAt: string;
  price?: number;
  registered: string[];
  status: "draft" | "open" | "closed" | "finished";
  leaderboard?: Array<{ userId: string; score: number; name?: string }>;
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
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await http.get("/events");
      return toItems(res) as Event[];
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchEventById = createAsyncThunk(
  "events/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await http.get(`/events/${id}`);
      return toItem(res) as Event;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const registerForEvent = createAsyncThunk(
  "events/register",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await http.post(`/events/${id}/register`);
      return toItem(res) as Event;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
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
      s.items = a.payload as Event[];
    });
    b.addCase(fetchEvents.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
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
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
    b.addCase(registerForEvent.fulfilled, (s, a) => {
      s.item = a.payload as Event;
      const idx = s.items.findIndex((e) => e._id === a.payload._id);
      if (idx !== -1) s.items[idx] = a.payload as Event;
    });
    b.addCase(registerForEvent.rejected, (s, a) => {
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
  },
});

export default eventsSlice.reducer;
