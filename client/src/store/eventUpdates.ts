import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toItems, toErrorMessage } from '@/lib/response';

export interface EventUpdateItem {
  _id: string;
  type: 'pre' | 'live' | 'post';
  message: string;
  postedBy?: string;
  isPinned: boolean;
  createdAt: string;
}

interface EventUpdatesState {
  items: EventUpdateItem[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: EventUpdatesState = {
  items: [],
  status: 'idle',
  error: null,
};

export const fetchEventUpdates = createAsyncThunk<
  EventUpdateItem[],
  string,
  { rejectValue: string }
>('eventUpdates/fetch', async (eventId, { rejectWithValue }) => {
  try {
    const res = await http.get(`/events/${eventId}/updates`, { params: { pinnedFirst: true } });
    const raw = toItems(res);
    return raw.map((item: any) => ({
      _id: item._id,
      type: item.type ?? 'pre',
      message: item.message ?? '',
      postedBy: item.postedBy?.name || item.postedBy?.username || undefined,
      isPinned: !!item.isPinned,
      createdAt: item.createdAt,
    }));
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

const eventUpdatesSlice = createSlice({
  name: 'eventUpdates',
  initialState,
  reducers: {
    clearEventUpdates: (state) => {
      state.items = [];
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEventUpdates.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEventUpdates.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchEventUpdates.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message || 'Failed to load updates';
      });
  },
});

export const { clearEventUpdates } = eventUpdatesSlice.actions;
export default eventUpdatesSlice.reducer;
