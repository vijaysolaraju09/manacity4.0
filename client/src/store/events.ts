import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toItems, toItem, toErrorMessage } from '@/lib/response';

export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'canceled';
export type EventType = 'tournament' | 'activity';
export type EventFormat =
  | 'single_elim'
  | 'double_elim'
  | 'round_robin'
  | 'points'
  | 'single_match'
  | 'custom';

export interface EventSummary {
  _id: string;
  title: string;
  type: EventType;
  category: string;
  format: EventFormat;
  teamSize: number;
  maxParticipants: number;
  registeredCount: number;
  registrationOpenAt: string;
  registrationCloseAt: string;
  startAt: string;
  endAt?: string | null;
  status: EventStatus;
  mode: 'online' | 'venue';
  venue?: string | null;
  visibility: 'public' | 'private';
  bannerUrl?: string | null;
  lifecycleStatus?: 'upcoming' | 'ongoing' | 'past';
}

export interface EventDetail extends EventSummary {
  timezone: string;
  description: string;
  rules: string;
  prizePool?: string | null;
  coverUrl?: string | null;
  updatesCount?: number;
  leaderboardVersion?: number;
  isRegistrationOpen?: boolean;
  registration?: EventRegistration | null;
}

export interface EventRegistration {
  _id: string;
  status: 'registered' | 'waitlisted' | 'checked_in' | 'withdrawn' | 'disqualified';
  teamName?: string;
}

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

const initialState: EventsState = {
  list: { items: [], total: 0, page: 1, pageSize: 12, status: 'idle', error: null },
  detail: { item: null, status: 'idle', error: null },
  registration: { status: 'idle', error: null, data: null },
};

const adaptEventSummary = (raw: any): EventSummary | null => {
  if (!raw) return null;
  const lifecycleRaw =
    typeof raw.lifecycleStatus === 'string'
      ? raw.lifecycleStatus
      : typeof raw.lifecycle_status === 'string'
      ? raw.lifecycle_status
      : '';

  const summary: EventSummary = {
    _id: raw._id || raw.id,
    title: raw.title || '',
    type: (raw.type as EventType) || 'activity',
    category: raw.category || 'other',
    format: (raw.format as EventFormat) || 'single_match',
    teamSize: Number(raw.teamSize) || 1,
    maxParticipants: Number(raw.maxParticipants) || 0,
    registeredCount: Number(raw.registeredCount) || 0,
    registrationOpenAt: raw.registrationOpenAt || raw.registration_open_at || raw.startAt || new Date().toISOString(),
    registrationCloseAt: raw.registrationCloseAt || raw.registration_close_at || raw.startAt || new Date().toISOString(),
    startAt: raw.startAt || raw.start_date || new Date().toISOString(),
    endAt: raw.endAt || raw.end_date || null,
    status: (raw.status as EventStatus) || 'draft',
    mode: raw.mode === 'venue' ? 'venue' : 'online',
    venue: raw.venue || null,
    visibility: raw.visibility === 'private' ? 'private' : 'public',
    bannerUrl: raw.bannerUrl || raw.cover || null,
  };

  const startTime = Date.parse(summary.startAt);
  const endTime = summary.endAt ? Date.parse(summary.endAt) : NaN;
  const normalizedLifecycle = lifecycleRaw.toLowerCase();
  if (['upcoming', 'ongoing', 'past'].includes(normalizedLifecycle)) {
    summary.lifecycleStatus = normalizedLifecycle as 'upcoming' | 'ongoing' | 'past';
  } else {
    const now = Date.now();
    if (
      summary.status === 'completed' ||
      summary.status === 'canceled' ||
      (Number.isFinite(endTime) && endTime < now)
    ) {
      summary.lifecycleStatus = 'past';
    } else if (
      summary.status === 'ongoing' ||
      (Number.isFinite(startTime) && startTime <= now && (!Number.isFinite(endTime) || endTime >= now))
    ) {
      summary.lifecycleStatus = 'ongoing';
    } else {
      summary.lifecycleStatus = 'upcoming';
    }
  }

  return summary;
};

const adaptEventDetail = (raw: any): EventDetail | null => {
  const summary = adaptEventSummary(raw);
  if (!summary) return null;
  return {
    ...summary,
    timezone: raw.timezone || 'Asia/Kolkata',
    description: raw.description || '',
    rules: raw.rules || '',
    prizePool: raw.prizePool || null,
    coverUrl: raw.coverUrl || raw.cover || null,
    updatesCount: raw.updatesCount ?? 0,
    leaderboardVersion: raw.leaderboardVersion ?? 0,
    isRegistrationOpen: !!raw.isRegistrationOpen,
    registration: raw.registration || null,
  };
};

export const fetchEvents = createAsyncThunk<PaginatedEvents, Record<string, any> | undefined, { rejectValue: string }>(
  'events/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await http.get('/events', { params });
      const rawItems = toItems(res);
      const data = res?.data?.data || {};
      const items = rawItems.map(adaptEventSummary).filter(Boolean) as EventSummary[];
      return {
        items,
        total: typeof data.total === 'number' ? data.total : items.length,
        page: typeof data.page === 'number' ? data.page : 1,
        pageSize: typeof data.pageSize === 'number' ? data.pageSize : items.length,
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
      const res = await http.get(`/events/${id}`);
      const raw = toItem(res);
      const event = adaptEventDetail(raw);
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
      .addCase(fetchEvents.pending, (state) => {
        state.list.status = 'loading';
        state.list.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.list.status = 'succeeded';
        state.list.items = action.payload.items;
        state.list.total = action.payload.total;
        state.list.page = action.payload.page;
        state.list.pageSize = action.payload.pageSize;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.list.status = 'failed';
        state.list.error = action.payload || action.error.message || 'Failed to load events';
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
