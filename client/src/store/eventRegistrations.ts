import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';

export interface EventRegistrationItem {
  _id: string;
  teamName?: string;
  status: string;
  user?: {
    _id: string;
    name?: string;
  } | null;
  createdAt?: string;
}

interface RegistrationsState {
  items: EventRegistrationItem[];
  count: number;
  preview: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: RegistrationsState = {
  items: [],
  count: 0,
  preview: true,
  status: 'idle',
  error: null,
};

export const fetchEventRegistrations = createAsyncThunk<
  { items: EventRegistrationItem[]; count: number; preview: boolean },
  string,
  { rejectValue: string }
>('eventRegistrations/fetch', async (eventId, { rejectWithValue }) => {
  try {
    const res = await http.get(`/events/${eventId}/registrations`);
    const data = res?.data?.data || res?.data || {};
    const items = Array.isArray(data.items) ? data.items : [];
    return {
      items: items.map((item: any) => ({
        _id: item._id,
        teamName: item.teamName,
        status: item.status,
        user: item.user || null,
        createdAt: item.createdAt,
      })),
      count: typeof data.count === 'number' ? data.count : items.length,
      preview: !!data.preview,
    };
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

const eventRegistrationsSlice = createSlice({
  name: 'eventRegistrations',
  initialState,
  reducers: {
    clearEventRegistrations: (state) => {
      state.items = [];
      state.count = 0;
      state.preview = true;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEventRegistrations.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEventRegistrations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.count = action.payload.count;
        state.preview = action.payload.preview;
      })
      .addCase(fetchEventRegistrations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message || 'Failed to load registrations';
      });
  },
});

export const { clearEventRegistrations } = eventRegistrationsSlice.actions;
export default eventRegistrationsSlice.reducer;
