import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toItems, toErrorMessage } from '@/lib/response';

export interface Notif {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string | null;
  ctaText?: string | null;
  priority?: 'low' | 'normal' | 'high';
  pinned?: boolean;
  entityType?: 'order' | 'serviceRequest' | 'event' | 'announcement' | null;
  entityId?: string | null;
  redirectUrl?: string | null;
  targetType?: 'order' | 'serviceRequest' | 'event' | 'announcement' | null;
  targetId?: string | null;
  targetLink?: string | null;
  resourceType?: 'order' | 'serviceRequest' | 'event' | 'announcement' | null;
  resourceId?: string | null;
  resourceLink?: string | null;
  metadata?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
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

const toIdString = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if ('_id' in (value as Record<string, unknown>) && (value as Record<string, unknown>)._id) {
      const raw = (value as Record<string, unknown>)._id;
      return typeof raw === 'string' ? raw : raw ? String(raw) : null;
    }
    if ('id' in (value as Record<string, unknown>) && (value as Record<string, unknown>).id) {
      const raw = (value as Record<string, unknown>).id;
      return typeof raw === 'string' ? raw : raw ? String(raw) : null;
    }
    const stringifier = (value as { toString?: () => string }).toString;
    if (typeof stringifier === 'function') {
      const str = stringifier.call(value as { toString?: () => string });
      return str ? str : null;
    }
  }
  return null;
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
};

const normalizeNotification = (entry: any): Notif => {
  const payload = toRecord(entry?.payload);
  const metadata = toRecord(entry?.metadata);
  const entityId = toIdString(entry?.entityId ?? payload?.entityId);
  const targetId = toIdString(entry?.targetId ?? payload?.targetId ?? entityId);
  const redirectUrl = typeof entry?.redirectUrl === 'string' ? entry.redirectUrl : payload?.redirectUrl;
  const targetLinkRaw = typeof entry?.targetLink === 'string' ? entry.targetLink : payload?.targetLink;
  const targetLink = targetLinkRaw ?? redirectUrl ?? null;
  const entityType = (entry?.entityType ?? payload?.entityType ?? null) as Notif['entityType'];
  const targetType = (entry?.targetType ?? payload?.targetType ?? entityType ?? null) as Notif['targetType'];
  const title = typeof entry?.title === 'string' && entry.title.trim()
    ? entry.title.trim()
    : typeof payload?.title === 'string'
    ? payload.title
    : typeof metadata?.title === 'string'
    ? metadata.title
    : null;
  const subtitle = typeof entry?.subtitle === 'string' && entry.subtitle.trim()
    ? entry.subtitle.trim()
    : typeof payload?.subtitle === 'string'
    ? payload.subtitle
    : typeof metadata?.subtitle === 'string'
    ? metadata.subtitle
    : null;
  const imageUrl =
    typeof entry?.imageUrl === 'string'
      ? entry.imageUrl
      : typeof payload?.imageUrl === 'string'
      ? payload.imageUrl
      : typeof metadata?.imageUrl === 'string'
      ? metadata.imageUrl
      : null;
  const ctaText =
    typeof payload?.ctaText === 'string'
      ? payload.ctaText
      : typeof entry?.ctaText === 'string'
      ? entry.ctaText
      : typeof metadata?.ctaText === 'string'
      ? metadata.ctaText
      : null;
  const priority =
    (entry?.priority as Notif['priority']) ??
    ((typeof payload?.priority === 'string' ? (payload.priority as Notif['priority']) : undefined) ??
      'normal');
  const pinned = Boolean(entry?.pinned ?? payload?.pinned ?? metadata?.pinned);
  const resourceType =
    (entry?.resourceType ?? payload?.resourceType ?? targetType ?? null) as Notif['resourceType'];
  const resourceId = toIdString(entry?.resourceId ?? payload?.resourceId ?? targetId);
  const resourceLink =
    typeof entry?.resourceLink === 'string'
      ? entry.resourceLink
      : typeof payload?.resourceLink === 'string'
      ? payload.resourceLink
      : targetLink;
  return {
    _id: String(entry?._id ?? ''),
    type: entry?.type ?? 'system',
    message: entry?.message ?? '',
    read: Boolean(entry?.read),
    createdAt: entry?.createdAt ?? new Date().toISOString(),
    title,
    subtitle,
    imageUrl,
    ctaText,
    priority,
    pinned,
    entityType,
    entityId: entityId ?? null,
    redirectUrl: redirectUrl ?? null,
    targetType,
    targetId: targetId ?? null,
    targetLink,
    resourceType,
    resourceId: resourceId ?? null,
    resourceLink: resourceLink ?? null,
    metadata,
    payload,
  };
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
      const items = (toItems(res) as Notif[]).map((item) => normalizeNotification(item));
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

