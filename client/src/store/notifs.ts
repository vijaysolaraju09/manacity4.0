import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { http } from "@/lib/http";
import { toItems, toErrorMessage } from "@/lib/response";

export interface Notif {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
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
  async (params: any | undefined, { rejectWithValue }) => {
    try {
      const res = await http.get("/notifications", { params });
      const items = toItems(res) as Notif[];
      const hasMore = res.data?.hasMore ?? false;
      return { items, hasMore };
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const markNotifRead = createAsyncThunk(
  "notifs/markRead",
  async (id: string) => {
    await http.patch(`/notifications/${id}/read`);
    return id;
  }
);

export const removeNotif = createAsyncThunk(
  "notifs/remove",
  async (id: string) => {
    await http.delete(`/notifications/${id}`);
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
      const arr = payload.items || [];
      s.items = s.page && s.page > 1 ? [...s.items, ...arr] : arr;
      if (payload.hasMore !== undefined) s.hasMore = payload.hasMore;
    });
    b.addCase(fetchNotifs.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
    b.addCase(markNotifRead.fulfilled, (s, a) => {
      s.items = s.items.map((n) =>
        n._id === a.payload ? { ...n, read: true } : n
      );
    });
    b.addCase(removeNotif.fulfilled, (s, a) => {
      s.items = s.items.filter((n) => n._id !== a.payload);
    });
  },
});

export default notifsSlice.reducer;
