import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { http } from '@/lib/http';

export interface AuthUser {
  id?: string;
  name: string;
  phone: string;
  location: string;
  role: string;
  address?: string;
  isVerified?: boolean;
  verificationStatus?: string;
  profession?: string;
  bio?: string;
  avatar?: string;
  avatarUrl?: string;
}

export interface SignupDraft {
  name: string;
  phone: string;
  password: string;
  location: string;
  role?: string;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const storedUser = localStorage.getItem('user');

const initialState: AuthState = {
  user: storedUser ? (JSON.parse(storedUser) as AuthUser) : null,
  token: localStorage.getItem('token'),
  status: 'idle',
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (creds: { phone: string; password: string }) => {
    const res = await http.post('/auth/login', creds);
    return res.data.data as AuthResponse;
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async (payload: SignupDraft) => {
    const res = await http.post('/auth/signup', payload);
    return res.data.data as AuthResponse;
  }
);

export const fetchMe = createAsyncThunk('auth/me', async () => {
  const res = await http.get('/auth/me');
  return res.data.data.user as AuthUser;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser>) {
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
        state.error = action.error.message || 'Login failed';
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
        state.error = action.error.message || 'Signup failed';
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
        state.error = action.error.message || 'Failed to fetch user';
      });
  },
});

export const { setUser, setToken, logout } = authSlice.actions;
export default authSlice.reducer;
