import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { http, adminHttp } from '@/lib/http';
import { toErrorMessage, toItem, toItems } from '@/lib/response';
import { submitRegistration } from './registrationsSlice';
import {
  adaptEventDetail,
  adaptEventSummary,
  adaptEventLeaderboardEntry,
  adaptEventRegistrationSummary,
  adaptEventUpdate,
} from '@/types/events';
import type {
  EventDetail,
  EventLeaderboardEntry,
  EventRegistration,
  EventRegistrationSummary,
  EventSummary,
  EventUpdate,
} from '@/types/events';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type EventsQueryParams = Record<string, any> | undefined;

const DEFAULT_QUERY_KEY = '__default__';

export const createEventsQueryKey = (params?: EventsQueryParams) => {
  if (!params) return DEFAULT_QUERY_KEY;
  const entries = Object.entries(params).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  });
  if (entries.length === 0) return DEFAULT_QUERY_KEY;
  entries.sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0));
  return JSON.stringify(entries);
};

const createPaginatedState = <T>() => ({
  items: [] as T[],
  total: 0,
  page: 1,
  pageSize: 12,
  loading: false as boolean,
  error: null as string | null,
  hasMore: false as boolean,
});

interface EntityState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface EventsState {
  list: ReturnType<typeof createPaginatedState<EventSummary>> & { queryKey: string };
  detail: EntityState<EventDetail> & { refreshing: boolean };
  registrations: ReturnType<typeof createPaginatedState<EventRegistrationSummary>> & {
    preview: boolean;
  };
  myRegistration: EntityState<EventRegistration>;
  updates: ReturnType<typeof createPaginatedState<EventUpdate>>;
  leaderboard: ReturnType<typeof createPaginatedState<EventLeaderboardEntry>> & {
    version: number;
  };
  actions: {
    register: 'idle' | 'loading' | 'succeeded' | 'failed';
    unregister: 'idle' | 'loading' | 'succeeded' | 'failed';
    postUpdate: 'idle' | 'loading' | 'succeeded' | 'failed';
    postLeaderboard: 'idle' | 'loading' | 'succeeded' | 'failed';
  };
}

const initialState: EventsState = {
  list: { ...createPaginatedState<EventSummary>(), queryKey: DEFAULT_QUERY_KEY },
  detail: { data: null, loading: false, refreshing: false, error: null },
  registrations: { ...createPaginatedState<EventRegistrationSummary>(), preview: false },
  myRegistration: { data: null, loading: false, error: null },
  updates: createPaginatedState<EventUpdate>(),
  leaderboard: { ...createPaginatedState<EventLeaderboardEntry>(), version: 0 },
  actions: {
    register: 'idle',
    unregister: 'idle',
    postUpdate: 'idle',
    postLeaderboard: 'idle',
  },
};

export const fetchEvents = createAsyncThunk<PaginatedResult<EventSummary>, EventsQueryParams, { rejectValue: string }>(
  'events/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await http.get('/events', { params });
      const payload = res?.data?.data ?? res?.data ?? {};
      const items: unknown[] = Array.isArray(payload.items) ? payload.items : toItems(res);
      const summaries = items
        .map((item) => adaptEventSummary(item))
        .filter((item): item is EventSummary => item !== null);
      return {
        items: summaries,
        total: typeof payload.total === 'number' ? payload.total : summaries.length,
        page: typeof payload.page === 'number' ? payload.page : Number(params?.page ?? 1) || 1,
        pageSize:
          typeof payload.pageSize === 'number'
            ? payload.pageSize
            : Number(params?.pageSize ?? summaries.length) || summaries.length || 0,
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
      if (!id) throw new Error('Event id is required');
      const res = await http.get(`/events/${id}`);
      const item = toItem(res);
      const adapted = item ? adaptEventDetail(item) : null;
      if (!adapted) throw new Error('Invalid event response');
      return adapted;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export interface FetchRegistrationsParams {
  eventId: string;
  page?: number;
  limit?: number;
  status?: EventRegistration['status'][];
  search?: string;
  admin?: boolean;
}

export const fetchRegistrations = createAsyncThunk<
  { items: EventRegistrationSummary[]; total: number; preview: boolean; page: number; pageSize: number },
  FetchRegistrationsParams,
  { rejectValue: string }
>(
  'events/fetchRegistrations',
  async ({ eventId, page, limit, status, search, admin = false }, { rejectWithValue }) => {
    try {
      const client = admin ? adminHttp : http;
      const params: Record<string, unknown> = {};
      if (page && page > 0) params.page = page;
      if (limit && limit > 0) params.limit = limit;
      if (status && status.length > 0) params.status = status.join(',');
      if (search && search.trim().length > 0) params.q = search.trim();

      const res = await client.get(`/events/${eventId}/registrations`, { params });
      const payload = res?.data?.data ?? res?.data ?? {};
      const items = Array.isArray(payload.items)
        ? payload.items
            .map((item: unknown) => adaptEventRegistrationSummary(item))
            .filter(
              (
                summary: EventRegistrationSummary | null,
              ): summary is EventRegistrationSummary => summary !== null,
            )
        : [];

      const totalCandidate =
        typeof payload.total === 'number'
          ? payload.total
          : typeof payload.count === 'number'
          ? payload.count
          : items.length;
      const resolvedPage = typeof payload.page === 'number' ? payload.page : page ?? 1;
      const resolvedPageSize =
        typeof payload.limit === 'number'
          ? payload.limit
          : typeof payload.pageSize === 'number'
          ? payload.pageSize
          : limit ?? items.length;

      return {
        items,
        total: totalCandidate,
        preview: Boolean(payload.preview),
        page: resolvedPage,
        pageSize: resolvedPageSize || items.length || 1,
      };
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  },
);

export const fetchMyRegistration = createAsyncThunk<EventRegistration | null, string, { rejectValue: string }>(
  'events/fetchMyRegistration',
  async (eventId, { rejectWithValue }) => {
    try {
      const res = await http.get(`/events/${eventId}/registered/me`);
      const payload = res?.data?.data ?? res?.data ?? null;
      if (!payload) return null;
      return payload as EventRegistration;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export interface RegistrationPayload {
  teamName?: string;
  members?: Array<{ name: string; contact?: string }>;
  metadata?: Record<string, unknown>;
}

export const registerForEvent = createAsyncThunk<
  EventRegistration,
  { eventId: string; payload?: RegistrationPayload },
  { rejectValue: string }
>('events/register', async ({ eventId, payload }, { rejectWithValue }) => {
  try {
    const res = await http.post(`/events/${eventId}/register`, payload);
    const data = res?.data?.data ?? res?.data ?? {};
    const registration = (data.registration ?? data) as EventRegistration | undefined;
    if (!registration) throw new Error('Invalid registration response');
    return registration;
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const unregisterFromEvent = createAsyncThunk<
  boolean,
  string,
  { rejectValue: string }
>('events/unregister', async (eventId, { rejectWithValue }) => {
  try {
    const res = await http.delete(`/events/${eventId}/register`);
    const payload = res?.data?.data ?? res?.data ?? {};
    if (typeof payload === 'boolean') return payload;
    return true;
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const fetchEventUpdates = createAsyncThunk<
  EventUpdate[],
  string,
  { rejectValue: string }
>('events/fetchUpdates', async (eventId, { rejectWithValue }) => {
  try {
    const res = await http.get(`/events/${eventId}/updates`, { params: { pinnedFirst: true } });
    const payload = res?.data?.data ?? res?.data ?? {};
    const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload) ? payload : toItems(res);
    return (items ?? [])
      .map((item: unknown) => adaptEventUpdate(item))
      .filter((update: EventUpdate | null): update is EventUpdate => update !== null);
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const postEventUpdate = createAsyncThunk<
  EventUpdate,
  { eventId: string; payload: Partial<EventUpdate> },
  { rejectValue: string }
>('events/postUpdate', async ({ eventId, payload }, { rejectWithValue }) => {
  try {
    const res = await http.post(`/events/${eventId}/updates`, payload);
    const item = toItem(res) ?? res?.data?.data ?? res?.data;
    if (!item) throw new Error('Invalid update response');
    return item as EventUpdate;
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const fetchLeaderboard = createAsyncThunk<
  { items: EventLeaderboardEntry[]; version: number },
  string,
  { rejectValue: string }
>('events/fetchLeaderboard', async (eventId, { rejectWithValue }) => {
  try {
    const res = await http.get(`/events/${eventId}/leaderboard`);
    const payload = res?.data?.data ?? res?.data ?? {};
    const items = Array.isArray(payload.entries)
      ? payload.entries.map((entry: unknown) => adaptEventLeaderboardEntry(entry)).filter(Boolean)
      : [];
    return {
      items: items as EventLeaderboardEntry[],
      version: typeof payload.version === 'number' ? payload.version : 0,
    };
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

export const postLeaderboard = createAsyncThunk<
  { items: EventLeaderboardEntry[]; version: number },
  { eventId: string; payload: { entries: EventLeaderboardEntry[] } },
  { rejectValue: string }
>('events/postLeaderboard', async ({ eventId, payload }, { rejectWithValue }) => {
  try {
    const res = await http.post(`/events/${eventId}/leaderboard`, payload);
    const data = res?.data?.data ?? res?.data ?? {};
    const itemsSource = Array.isArray(data.entries) ? data.entries : payload.entries;
    const items = (itemsSource ?? [])
      .map((entry: unknown) => adaptEventLeaderboardEntry(entry))
      .filter((entry: EventLeaderboardEntry | null): entry is EventLeaderboardEntry => entry !== null);
    return {
      items,
      version: typeof data.version === 'number' ? data.version : Date.now(),
    };
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

const eventsSlice = createSlice({
  name: 'eventsV2',
  initialState,
  reducers: {
    resetEventDetail: (state) => {
      state.detail = { data: null, loading: false, refreshing: false, error: null };
      state.registrations = { ...createPaginatedState<EventRegistrationSummary>(), preview: false };
      state.updates = createPaginatedState<EventUpdate>();
      state.myRegistration = { data: null, loading: false, error: null };
      state.leaderboard = { ...createPaginatedState<EventLeaderboardEntry>(), version: 0 };
      state.actions.register = 'idle';
      state.actions.unregister = 'idle';
      state.actions.postUpdate = 'idle';
      state.actions.postLeaderboard = 'idle';
    },
    setEventsQueryKey: (state, action: PayloadAction<string>) => {
      state.list.queryKey = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state, action) => {
        const queryKey = createEventsQueryKey(action.meta.arg);
        if (queryKey !== state.list.queryKey) {
          state.list.items = [];
          state.list.page = 1;
          state.list.hasMore = false;
        }
        state.list.loading = true;
        state.list.error = null;
        state.list.queryKey = queryKey;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        const queryKey = createEventsQueryKey(action.meta.arg);
        const isSameQuery = queryKey === state.list.queryKey;
        const page = action.payload.page || 1;
        if (isSameQuery && page > 1) {
          state.list.items = [...(state.list.items ?? []), ...(action.payload.items ?? [])];
        } else {
          state.list.items = action.payload.items ?? [];
        }
        state.list.total = action.payload.total ?? action.payload.items.length;
        state.list.page = page;
        state.list.pageSize = action.payload.pageSize || action.payload.items.length || 12;
        const currentLength = state.list.items?.length ?? 0;
        state.list.hasMore = currentLength < state.list.total;
        state.list.loading = false;
        state.list.error = null;
        state.list.queryKey = queryKey;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.list.loading = false;
        state.list.error = action.payload || action.error.message || 'Failed to load events';
      })
      .addCase(fetchEventById.pending, (state) => {
        state.detail.loading = true;
        state.detail.error = null;
        state.detail.refreshing = state.detail.data !== null;
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.detail.loading = false;
        state.detail.refreshing = false;
        state.detail.data = action.payload;
        state.detail.error = null;
        state.myRegistration.data = action.payload.registration ?? null;
      })
      .addCase(fetchEventById.rejected, (state, action) => {
        state.detail.loading = false;
        state.detail.refreshing = false;
        state.detail.error = action.payload || action.error.message || 'Failed to load event';
        state.detail.data = null;
      })
      .addCase(fetchRegistrations.pending, (state) => {
        state.registrations.loading = true;
        state.registrations.error = null;
      })
      .addCase(fetchRegistrations.fulfilled, (state, action) => {
        state.registrations.loading = false;
        state.registrations.items = action.payload.items ?? [];
        state.registrations.total = action.payload.total ?? action.payload.items.length;
        state.registrations.page = action.payload.page ?? 1;
        state.registrations.pageSize =
          action.payload.pageSize ?? action.payload.items.length ?? state.registrations.pageSize;
        state.registrations.preview = action.payload.preview;
        const page = state.registrations.page ?? 1;
        const size = state.registrations.pageSize ?? action.payload.items.length ?? 0;
        const total = state.registrations.total ?? state.registrations.items.length ?? 0;
        state.registrations.hasMore = page * size < total;
      })
      .addCase(fetchRegistrations.rejected, (state, action) => {
        state.registrations.loading = false;
        state.registrations.error = action.payload || action.error.message || 'Failed to load registrations';
      })
      .addCase(fetchMyRegistration.pending, (state) => {
        state.myRegistration.loading = true;
        state.myRegistration.error = null;
      })
      .addCase(fetchMyRegistration.fulfilled, (state, action) => {
        state.myRegistration.loading = false;
        state.myRegistration.data = action.payload ?? null;
      })
      .addCase(fetchMyRegistration.rejected, (state, action) => {
        state.myRegistration.loading = false;
        state.myRegistration.data = null;
        state.myRegistration.error = action.payload || action.error.message || 'Failed to load registration';
      })
      .addCase(registerForEvent.pending, (state) => {
        state.actions.register = 'loading';
      })
      .addCase(registerForEvent.fulfilled, (state, action) => {
        state.actions.register = 'succeeded';
        state.myRegistration.data = action.payload;
        if (state.detail.data) {
          state.detail.data.registration = action.payload;
          state.detail.data.registeredCount = (state.detail.data.registeredCount || 0) + 1;
        }
      })
      .addCase(submitRegistration.fulfilled, (state, action) => {
        const eventId = action.meta.arg?.eventId;
        if (!eventId) return;
        const result = action.payload;
        const status = result?.status ?? 'registered';
        if (state.list.items) {
          state.list.items = state.list.items.map((event) => {
            if (event._id !== eventId) return event;
            const payment = result?.payment ?? null;
            const nextRegistration = {
              status,
              paymentRequired:
                typeof payment?.required === 'boolean'
                  ? payment.required
                  : event.registration?.paymentRequired,
              paymentAmount:
                typeof payment?.amount === 'number'
                  ? payment.amount
                  : event.registration?.paymentAmount ?? null,
              paymentCurrency:
                typeof payment?.currency === 'string'
                  ? payment.currency
                  : event.registration?.paymentCurrency ?? null,
              paymentProofUrl:
                typeof payment?.proofUrl === 'string'
                  ? payment.proofUrl
                  : event.registration?.paymentProofUrl ?? null,
              submittedAt: event.registration?.submittedAt ?? new Date().toISOString(),
            };
            return {
              ...event,
              registration: nextRegistration,
              registrationStatus: status,
              myRegistrationStatus: status,
            };
          });
        }
        if (state.detail.data && state.detail.data._id === eventId) {
          const payment = result?.payment ?? state.detail.data.registration?.payment ?? null;
          state.detail.data.registration = {
            ...(state.detail.data.registration ?? {
              _id: result?.id ?? '',
              status: status as EventRegistration['status'],
            }),
            status: status as EventRegistration['status'],
            payment,
            proofUrl: payment?.proofUrl ?? state.detail.data.registration?.proofUrl ?? null,
            createdAt: state.detail.data.registration?.createdAt ?? new Date().toISOString(),
          } as EventRegistration;
          state.detail.data.myRegistrationStatus = status;
          const registrationMeta = state.detail.data.registration as EventRegistration & {
            paymentProofUrl?: string | null;
            paymentRequired?: boolean;
            paymentAmount?: number | null;
            paymentCurrency?: string | null;
            submittedAt?: string | null;
          };
          registrationMeta.paymentProofUrl = payment?.proofUrl ?? registrationMeta.paymentProofUrl ?? null;
          registrationMeta.paymentRequired =
            typeof payment?.required === 'boolean'
              ? payment.required
              : registrationMeta.paymentRequired;
          registrationMeta.paymentAmount =
            typeof payment?.amount === 'number'
              ? payment.amount
              : registrationMeta.paymentAmount ?? null;
          registrationMeta.paymentCurrency =
            typeof payment?.currency === 'string'
              ? payment.currency
              : registrationMeta.paymentCurrency ?? null;
          registrationMeta.submittedAt = registrationMeta.submittedAt ?? new Date().toISOString();
        }
      })
      .addCase(registerForEvent.rejected, (state, action) => {
        state.actions.register = 'failed';
        state.myRegistration.error = action.payload || action.error.message || 'Registration failed';
      })
      .addCase(unregisterFromEvent.pending, (state) => {
        state.actions.unregister = 'loading';
      })
      .addCase(unregisterFromEvent.fulfilled, (state) => {
        state.actions.unregister = 'succeeded';
        state.myRegistration.data = null;
        if (state.detail.data && state.detail.data.registeredCount > 0) {
          state.detail.data.registeredCount -= 1;
          state.detail.data.registration = null;
        }
      })
      .addCase(unregisterFromEvent.rejected, (state, action) => {
        state.actions.unregister = 'failed';
        state.myRegistration.error = action.payload || action.error.message || 'Unable to unregister';
      })
      .addCase(fetchEventUpdates.pending, (state) => {
        state.updates.loading = true;
        state.updates.error = null;
      })
      .addCase(fetchEventUpdates.fulfilled, (state, action) => {
        state.updates.loading = false;
        state.updates.items = action.payload ?? [];
        state.updates.total = action.payload?.length ?? 0;
        state.updates.page = 1;
        state.updates.pageSize = action.payload?.length ?? state.updates.pageSize;
        state.updates.hasMore = false;
      })
      .addCase(fetchEventUpdates.rejected, (state, action) => {
        state.updates.loading = false;
        state.updates.error = action.payload || action.error.message || 'Failed to load updates';
      })
      .addCase(postEventUpdate.pending, (state) => {
        state.actions.postUpdate = 'loading';
      })
      .addCase(postEventUpdate.fulfilled, (state, action) => {
        state.actions.postUpdate = 'succeeded';
        const existing = state.updates.items ?? [];
        state.updates.items = [action.payload, ...existing];
        state.updates.total = (state.updates.total ?? existing.length) + 1;
      })
      .addCase(postEventUpdate.rejected, (state, action) => {
        state.actions.postUpdate = 'failed';
        state.updates.error = action.payload || action.error.message || 'Failed to post update';
      })
      .addCase(fetchLeaderboard.pending, (state) => {
        state.leaderboard.loading = true;
        state.leaderboard.error = null;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.leaderboard.loading = false;
        state.leaderboard.items = action.payload.items ?? [];
        state.leaderboard.total = action.payload.items?.length ?? 0;
        state.leaderboard.page = 1;
        state.leaderboard.pageSize = action.payload.items?.length ?? state.leaderboard.pageSize;
        state.leaderboard.hasMore = false;
        state.leaderboard.version = action.payload.version ?? 0;
      })
      .addCase(fetchLeaderboard.rejected, (state, action) => {
        state.leaderboard.loading = false;
        state.leaderboard.error = action.payload || action.error.message || 'Failed to load leaderboard';
      })
      .addCase(postLeaderboard.pending, (state) => {
        state.actions.postLeaderboard = 'loading';
      })
      .addCase(postLeaderboard.fulfilled, (state, action) => {
        state.actions.postLeaderboard = 'succeeded';
        state.leaderboard.items = action.payload.items ?? [];
        state.leaderboard.version = action.payload.version ?? state.leaderboard.version;
        state.leaderboard.total = action.payload.items?.length ?? state.leaderboard.total;
      })
      .addCase(postLeaderboard.rejected, (state, action) => {
        state.actions.postLeaderboard = 'failed';
        state.leaderboard.error = action.payload || action.error.message || 'Failed to update leaderboard';
      });
  },
});

export const { resetEventDetail, setEventsQueryKey } = eventsSlice.actions;

export default eventsSlice.reducer;
