import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toItems, toItem, toErrorMessage } from '@/lib/response';

export interface Notif {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  link?: string | null;
}

const toPlainObject = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
};

const toIsoString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  const date = value instanceof Date ? value : new Date(value as string);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? date.toISOString() : new Date().toISOString();
};

const normalizeNotification = (input: any): Notif => {
  const base = input ?? {};
  const id =
    typeof base._id === 'string'
      ? base._id
      : typeof base.id === 'string'
      ? base.id
      : globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  const type = typeof base.type === 'string' && base.type.trim() ? base.type.trim() : 'system';
  const message = typeof base.message === 'string' && base.message.trim()
    ? base.message.trim()
    : typeof base.title === 'string'
    ? base.title.trim()
    : 'Notification';
  const createdAt = toIsoString(base.createdAt ?? base.timestamp ?? Date.now());
  const read = Boolean(base.read ?? base.isRead ?? false);
  const data =
    toPlainObject(base.data) ??
    toPlainObject(base.payload) ??
    toPlainObject(base.context) ??
    null;
  const metadata =
    toPlainObject(base.metadata) ??
    toPlainObject(base.meta) ??
    (data ? { ...data } : null);
  const link =
    typeof base.deepLink === 'string'
      ? base.deepLink
      : typeof base.link === 'string'
      ? base.link
      : typeof base.url === 'string'
      ? base.url
      : null;

  return {
    _id: id,
    type,
    message,
    read,
    createdAt,
    data,
    metadata,
    link,
  } satisfies Notif;
};

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
      const rawItems = toItems(res);
      const items = Array.isArray(rawItems)
        ? rawItems.map((entry) => normalizeNotification(entry))
        : [];
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
      await http.patch(`/api/notifications/${id}/read`);
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

export interface CreateNotificationPayload {
  userId: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
  link?: string;
  deepLink?: string;
}

export const sendNotification = createAsyncThunk(
  'notifs/send',
  async (payload: CreateNotificationPayload, { rejectWithValue }) => {
    try {
      const body: Record<string, unknown> = {
        userId: String(payload.userId ?? '').trim(),
        type: String(payload.type ?? 'system').trim() || 'system',
        message: String(payload.message ?? '').trim() || 'Notification',
      };

      if (!body.userId) {
        throw new Error('userId is required to send a notification');
      }

      if (payload.metadata && typeof payload.metadata === 'object') {
        body.metadata = payload.metadata;
      }
      if (payload.data && typeof payload.data === 'object') {
        body.data = payload.data;
      }
      if (payload.link && typeof payload.link === 'string') {
        body.link = payload.link;
      }
      if (payload.deepLink && typeof payload.deepLink === 'string') {
        body.deepLink = payload.deepLink;
      }

      const res = await http.post('/api/notifications', body);
      return normalizeNotification(toItem(res));
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
      .addCase(sendNotification.fulfilled, (state, action) => {
        const notif = action.payload as Notif | undefined;
        if (!notif) return;
        state.items = [notif, ...state.items];
        if (!notif.read) {
          state.unread += 1;
        }
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

