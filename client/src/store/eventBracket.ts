import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';

export interface BracketParticipant {
  registration?: string;
  teamName?: string;
  displayName?: string;
  seed?: number;
}

export interface BracketMatch {
  id: string;
  round: number;
  stage?: string;
  order: number;
  participantA?: BracketParticipant | null;
  participantB?: BracketParticipant | null;
  status: string;
  scoreA?: number;
  scoreB?: number;
  winner?: string | null;
}

export interface BracketRound {
  round: number;
  matches: BracketMatch[];
}

interface BracketState {
  rounds: BracketRound[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: BracketState = {
  rounds: [],
  status: 'idle',
  error: null,
};

export const fetchEventBracket = createAsyncThunk<BracketRound[], string, { rejectValue: string }>(
  'eventBracket/fetch',
  async (eventId, { rejectWithValue }) => {
    try {
      const res = await http.get(`/events/${eventId}/bracket`);
      const data = res?.data?.data || res?.data || {};
      const rounds = Array.isArray(data.rounds) ? data.rounds : [];
      return rounds.map((round: any) => ({
        round: round.round,
        matches: Array.isArray(round.matches)
          ? round.matches.map((match: any) => ({
              id: match.id || match._id,
              round: match.round,
              stage: match.stage,
              order: match.order,
              participantA: match.participantA || null,
              participantB: match.participantB || null,
              status: match.status,
              scoreA: match.scoreA,
              scoreB: match.scoreB,
              winner: match.winner || null,
            }))
          : [],
      }));
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

const eventBracketSlice = createSlice({
  name: 'eventBracket',
  initialState,
  reducers: {
    clearEventBracket: (state) => {
      state.rounds = [];
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEventBracket.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEventBracket.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.rounds = action.payload;
      })
      .addCase(fetchEventBracket.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message || 'Failed to load bracket';
      });
  },
});

export const { clearEventBracket } = eventBracketSlice.actions;
export default eventBracketSlice.reducer;
