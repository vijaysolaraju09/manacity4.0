import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/config/api";

export interface Notif {
  _id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  cta?: { label: string; href: string };
}

type St<T> = {
  items: T[];
  item?: T | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  page?: number;
  hasMore?: boolean;
};

const initial: St<Notif> = {
  items: [],
  status: "idle",
  error: null,
  page: 1,
  hasMore: true,
};

export const fetchNotifs = createAsyncThunk(
  "notifs/fetchAll",
  async (params?: any) => {
    const { data } = await api.get("/notifications", { params });
    if (Array.isArray(data)) return { items: data, hasMore: false };
    return data;
  }
);

export const markNotifRead = createAsyncThunk(
  "notifs/markRead",
  async (id: string) => {
    await api.post(`/notifications/read/${id}`);
    return id;
  }
);

export const removeNotif = createAsyncThunk(
  "notifs/remove",
  async (id: string) => {
    await api.delete(`/notifications/${id}`);
    return id;
  }
);

const notifsSlice = createSlice({
  name: "notifs",
  initialState: initial,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchNotifs.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(fetchNotifs.fulfilled, (s, a) => {
      s.status = "succeeded";
      const payload: any = a.payload;
      const arr = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : [];
      s.items = s.page && s.page > 1 ? [...s.items, ...arr] : arr;
      if (payload?.page) s.page = payload.page;
      if (payload?.hasMore !== undefined) s.hasMore = payload.hasMore;
    });
    b.addCase(fetchNotifs.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.error as any)?.message || "Failed to load";
    });
    b.addCase(markNotifRead.fulfilled, (s, a) => {
      s.items = s.items.map((n) =>
        n._id === a.payload ? { ...n, isRead: true } : n
      );
    });
    b.addCase(removeNotif.fulfilled, (s, a) => {
      s.items = s.items.filter((n) => n._id !== a.payload);
    });
  },
});

export default notifsSlice.reducer;
