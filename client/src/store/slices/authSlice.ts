import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toItem, toErrorMessage } from '@/lib/response';
import type { User } from '@/types/user';

export interface SignupDraft {
  name: string;
  phone: string;
  password: string;
  location?: string;
  role?: 'customer' | 'business';
  email?: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

const ensureAuthResponse = (payload: unknown): AuthResponse => {
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as { token?: unknown }).token !== 'string' ||
    !(payload as { token?: string }).token ||
    typeof (payload as { user?: unknown }).user !== 'object' ||
    (payload as { user?: unknown }).user === null
  ) {
    throw new Error('Invalid auth response');
  }
  return payload as AuthResponse;
};

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const storedUser = localStorage.getItem('user');

const initialState: AuthState = {
  user: storedUser ? (JSON.parse(storedUser) as User) : null,
  token: localStorage.getItem('token'),
  status: 'idle',
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (
    creds: { phone: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await http.post('/auth/login', creds);
      return ensureAuthResponse(toItem(res));
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async (payload: SignupDraft, { rejectWithValue }) => {
    try {
      const res = await http.post('/auth/signup', payload);
      return ensureAuthResponse(toItem(res));
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchMe = createAsyncThunk(
  'auth/me',
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await http.get('/auth/me');
      return toItem(res) as User;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      localStorage.setItem('token', action.payload);
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error =
          (action.payload as string) || action.error.message || 'Login failed';
      })
      .addCase(signup.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(signup.rejected, (state, action) => {
        state.status = 'failed';
        state.error =
          (action.payload as string) || action.error.message || 'Signup failed';
      })
      .addCase(fetchMe.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.status = 'failed';
        state.error =
          (action.payload as string) || action.error.message || 'Failed to fetch user';
      });
  },
});

export const { setUser, setToken, logout } = authSlice.actions;
export default authSlice.reducer;
