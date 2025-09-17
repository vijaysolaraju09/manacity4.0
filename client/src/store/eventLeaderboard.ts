import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';

export interface EventLeaderboardEntry {
  _id?: string;
  participantId?: string;
  user?: string;
  teamName?: string;
  points?: number;
  rank?: number;
  wins?: number;
  losses?: number;
  kills?: number;
  time?: number;
}

interface LeaderboardState {
  entries: EventLeaderboardEntry[];
  version: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: LeaderboardState = {
  entries: [],
  version: 0,
  status: 'idle',
  error: null,
};

export const fetchEventLeaderboard = createAsyncThunk<
  { entries: EventLeaderboardEntry[]; version: number },
  string,
  { rejectValue: string }
>('eventLeaderboard/fetch', async (eventId, { rejectWithValue }) => {
  try {
    const res = await http.get(`/events/${eventId}/leaderboard`);
    const data = res?.data?.data || res?.data || {};
    const entries = Array.isArray(data.entries) ? data.entries : [];
    return {
      entries: entries.map((entry: any) => ({
        _id: entry._id,
        participantId: entry.participantId,
        user: entry.user,
        teamName: entry.teamName,
        points: entry.points,
        rank: entry.rank,
        wins: entry.wins,
        losses: entry.losses,
        kills: entry.kills,
        time: entry.time,
      })),
      version: data.version ?? 0,
    };
  } catch (err) {
    return rejectWithValue(toErrorMessage(err));
  }
});

const eventLeaderboardSlice = createSlice({
  name: 'eventLeaderboard',
  initialState,
  reducers: {
    clearEventLeaderboard: (state) => {
      state.entries = [];
      state.version = 0;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEventLeaderboard.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEventLeaderboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.entries = action.payload.entries;
        state.version = action.payload.version;
      })
      .addCase(fetchEventLeaderboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message || 'Failed to load leaderboard';
      });
  },
});

export const { clearEventLeaderboard } = eventLeaderboardSlice.actions;
export default eventLeaderboardSlice.reducer;
