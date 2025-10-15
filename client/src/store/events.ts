import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchPublicEvents as fetchPublicEventsApi, fetchPublicEventById } from '@/api/events';
import { http } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';
import type { EventDetail, EventRegistration, EventSummary } from '@/types/events';

interface PaginatedEvents {
  items: EventSummary[];
  total: number;
  page: number;
  pageSize: number;
}

interface EventsState {
  list: {
    items: EventSummary[];
    total: number;
    page: number;
    pageSize: number;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    lastQueryKey: string;
  };
  detail: {
    item: EventDetail | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
  };
  registration: {
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    data: EventRegistration | null;
  };
}

const DEFAULT_QUERY_KEY = '__default__';

type EventQueryParams = Record<string, any> | undefined;

export const createEventsQueryKey = (params?: EventQueryParams): string => {
  if (!params || typeof params !== 'object') return DEFAULT_QUERY_KEY;
  const filtered = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, value] as const);
  if (filtered.length === 0) return DEFAULT_QUERY_KEY;
  filtered.sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0));
  return JSON.stringify(filtered);
};

const initialState: EventsState = {
  list: {
    items: [],
    total: 0,
    page: 1,
    pageSize: 12,
    status: 'idle',
    error: null,
    lastQueryKey: DEFAULT_QUERY_KEY,
  },
  detail: { item: null, status: 'idle', error: null },
  registration: { status: 'idle', error: null, data: null },
};

export const fetchEvents = createAsyncThunk<PaginatedEvents, EventQueryParams, { rejectValue: string }>(
  'events/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchPublicEventsApi(params);
      return {
        items: Array.isArray(res.items) ? res.items : [],
        total:
          typeof res.total === 'number'
            ? res.total
            : Array.isArray(res.items)
            ? res.items.length
            : 0,
        page: typeof res.page === 'number' ? res.page : 1,
        pageSize:
          typeof res.pageSize === 'number'
            ? res.pageSize
            : Array.isArray(res.items)
            ? res.items.length
            : 0,
      };
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchEventById = createAsyncThunk<EventDetail, string, { rejectValue: string }>(
  'events/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const event = await fetchPublicEventById(id);
      if (!event) throw new Error('Invalid event response');
      return event;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const registerForEvent = createAsyncThunk<
  { registration: EventRegistration | null; status: EventRegistration['status'] },
  string,
  { rejectValue: string }
>('events/register', async (id, { rejectWithValue }) => {
  try {
    const res = await http.post(`/events/${id}/register`);
    const data = res?.data?.data || res?.data || {};
    return {
      registration: data.registration || null,
      status: (data.status || data.registration?.status || 'registered') as EventRegistration['status'],
    };
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const unregisterFromEvent = createAsyncThunk<boolean, string, { rejectValue: string }>(
  'events/unregister',
  async (id, { rejectWithValue }) => {
    try {
      const res = await http.delete(`/events/${id}/register`);
      return !!(res?.data?.data ?? res?.data);
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state, action) => {
        state.list.status = 'loading';
        state.list.error = null;
        state.list.lastQueryKey = createEventsQueryKey(action.meta.arg);
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.list.status = 'succeeded';
        state.list.items = action.payload.items;
        state.list.total = action.payload.total;
        state.list.page = action.payload.page;
        state.list.pageSize = action.payload.pageSize;
        state.list.lastQueryKey = createEventsQueryKey(action.meta.arg);
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.list.status = 'failed';
        state.list.error = action.payload || action.error.message || 'Failed to load events';
        state.list.lastQueryKey = createEventsQueryKey(action.meta.arg);
      })
      .addCase(fetchEventById.pending, (state) => {
        state.detail.status = 'loading';
        state.detail.error = null;
        state.detail.item = null;
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.detail.status = 'succeeded';
        state.detail.item = action.payload;
        state.registration.status = 'idle';
        state.registration.error = null;
        state.registration.data = action.payload.registration ?? null;
      })
      .addCase(fetchEventById.rejected, (state, action) => {
        state.detail.status = 'failed';
        state.detail.error = action.payload || action.error.message || 'Failed to load event';
      })
      .addCase(registerForEvent.pending, (state) => {
        state.registration.status = 'loading';
        state.registration.error = null;
      })
      .addCase(registerForEvent.fulfilled, (state, action) => {
        state.registration.status = 'succeeded';
        state.registration.data = action.payload.registration;
        if (state.detail.item) {
          state.detail.item.registration = action.payload.registration;
          if (action.payload.status === 'registered') {
            state.detail.item.registeredCount = (state.detail.item.registeredCount || 0) + 1;
          }
        }
      })
      .addCase(registerForEvent.rejected, (state, action) => {
        state.registration.status = 'failed';
        state.registration.error = action.payload || action.error.message || 'Registration failed';
      })
      .addCase(unregisterFromEvent.pending, (state) => {
        state.registration.status = 'loading';
        state.registration.error = null;
      })
      .addCase(unregisterFromEvent.fulfilled, (state) => {
        state.registration.status = 'succeeded';
        state.registration.data = null;
        if (state.detail.item) {
          state.detail.item.registration = null;
          if (state.detail.item.registeredCount > 0) {
            state.detail.item.registeredCount -= 1;
          }
        }
      })
      .addCase(unregisterFromEvent.rejected, (state, action) => {
        state.registration.status = 'failed';
        state.registration.error = action.payload || action.error.message || 'Unregister failed';
      });
  },
});

export default eventsSlice.reducer;
