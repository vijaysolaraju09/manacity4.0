import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toItems, toErrorMessage } from '@/lib/response';

export interface Notif {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  entityType?: 'order' | 'serviceRequest' | 'event' | 'announcement' | null;
  entityId?: string | null;
  redirectUrl?: string | null;
}

interface NotifState {
  items: Notif[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  page: number;
  hasMore: boolean;
  unread: number;
}

const initialState: NotifState = {
  items: [],
  status: 'idle',
  error: null,
  page: 1,
  hasMore: true,
  unread: 0,
};

export const fetchNotifs = createAsyncThunk(
  'notifs/fetchAll',
  async (
    params: { page?: number; limit?: number } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      const res = await http.get('/api/notifications', { params: { page, limit } });
      const items = (toItems(res) as Notif[]).map((item) => ({
        ...item,
        entityType: item.entityType ?? null,
        entityId: item.entityId ?? null,
        redirectUrl: item.redirectUrl ?? null,
      }));
      const payload = res.data?.data ?? res.data ?? {};
      const hasMore = Boolean(payload.hasMore);
      const unread =
        typeof payload.unread === 'number'
          ? payload.unread
          : Array.isArray(items)
          ? items.filter((notif) => !notif.read).length
          : 0;
      return { items, hasMore, unread, page };
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const markNotifRead = createAsyncThunk(
  'notifs/markRead',
  async (id: string, { rejectWithValue }) => {
    try {
      await http.post(`/api/notifications/${id}/read`);
      return id;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const removeNotif = createAsyncThunk(
  'notifs/remove',
  async (id: string, { rejectWithValue }) => {
    try {
      await http.delete(`/api/notifications/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

const notifsSlice = createSlice({
  name: 'notifs',
  initialState,
  reducers: {
    markAllAsRead: (state) => {
      state.items = state.items.map((notif) => ({ ...notif, read: true }));
      state.unread = 0;
      state.status = state.status === 'idle' ? 'succeeded' : state.status;
    },
    clearAll: (state) => {
      state.items = [];
      state.unread = 0;
      state.hasMore = false;
      state.page = 1;
      state.status = 'succeeded';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifs.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        if (typeof action.meta.arg?.page === 'number') {
          state.page = action.meta.arg.page;
        }
      })
      .addCase(fetchNotifs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { items, hasMore, unread, page } = action.payload as {
          items: Notif[];
          hasMore: boolean;
          unread: number;
          page: number;
        };
        state.page = page;
        state.hasMore = hasMore;
        state.unread = unread;
        state.items = page > 1 ? [...state.items, ...items] : items;
      })
      .addCase(fetchNotifs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message || 'Failed to load';
      })
      .addCase(markNotifRead.fulfilled, (state, action) => {
        const id = action.payload as string;
        state.items = state.items.map((notif) => {
          if (notif._id !== id) return notif;
          if (!notif.read && state.unread > 0) {
            state.unread -= 1;
          }
          return { ...notif, read: true };
        });
      })
      .addCase(removeNotif.fulfilled, (state, action) => {
        const id = action.payload as string;
        const removed = state.items.find((notif) => notif._id === id);
        if (removed && !removed.read && state.unread > 0) {
          state.unread -= 1;
        }
        state.items = state.items.filter((notif) => notif._id !== id);
      });
  },
});

export const { markAllAsRead, clearAll } = notifsSlice.actions;

export default notifsSlice.reducer;

