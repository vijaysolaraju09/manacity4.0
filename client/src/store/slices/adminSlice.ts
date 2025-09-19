import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AdminState {
  token: string | null;
}

const storedToken = localStorage.getItem('manacity_admin_token');

const initialState: AdminState = {
  token: storedToken,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setAdminToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      localStorage.setItem('manacity_admin_token', action.payload);
    },
    clearAdminToken(state) {
      state.token = null;
      localStorage.removeItem('manacity_admin_token');
    },
  },
});

export const { setAdminToken, clearAdminToken } = adminSlice.actions;
export default adminSlice.reducer;
