import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toItems, toErrorMessage } from '@/lib/response';

export interface Notif {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
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
      const res = await http.get('/notifications', { params: { page, limit } });
      const items = toItems(res) as Notif[];
      const payload = res.data?.data ?? res.data ?? {};
      const hasMore = Boolean(payload.hasMore);
      const unread = typeof payload.unread === 'number' ? payload.unread : 0;
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
      await http.patch(`/notifications/${id}/read`);
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
      await http.delete(`/notifications/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

const notifsSlice = createSlice({
  name: 'notifs',
  initialState,
  reducers: {},
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

export default notifsSlice.reducer;

