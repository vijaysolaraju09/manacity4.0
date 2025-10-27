import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toItems, toItem, toErrorMessage } from '@/lib/response';
import type { VerifiedCard } from '@/types/verified';

type St<T> = {
  items: T[];
  item: T | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  page?: number;
  hasMore?: boolean;
};

type VerifiedState = St<VerifiedCard>;

const initial: VerifiedState = {
  items: [],
  item: null,
  status: "idle",
  error: null,
  page: 1,
  hasMore: true,
};

const normalize = (data: unknown): VerifiedCard => data as VerifiedCard;

export const fetchVerified = createAsyncThunk<
  VerifiedCard[],
  Record<string, unknown> | undefined,
  { rejectValue: string }
>('verified/fetchAll', async (params, thunkApi) => {
  try {
    const res = await http.get('/verified', { params });
    return (toItems(res) as unknown[]).map(normalize);
  } catch (error) {
    return thunkApi.rejectWithValue(toErrorMessage(error));
  }
});

export const fetchVerifiedById = createAsyncThunk<
  VerifiedCard,
  string,
  { rejectValue: string }
>('verified/fetchById', async (id, thunkApi) => {
  try {
    const res = await http.get(`/verified/${id}`);
    return normalize(toItem(res));
  } catch (error) {
    return thunkApi.rejectWithValue(toErrorMessage(error));
  }
});

const verifiedSlice = createSlice({
  name: 'verified',
  initialState: initial,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVerified.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVerified.fulfilled, (state, action: PayloadAction<VerifiedCard[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchVerified.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Failed to load';
      })
      .addCase(fetchVerifiedById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.item = null;
      })
      .addCase(fetchVerifiedById.fulfilled, (state, action: PayloadAction<VerifiedCard>) => {
        state.status = 'succeeded';
        state.item = action.payload;
      })
      .addCase(fetchVerifiedById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Failed to load';
      });
  },
});

export default verifiedSlice.reducer;
