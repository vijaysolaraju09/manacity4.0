import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  user: any | null;
  phone: string | null;
  otpVerified: boolean;
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  phone: null,
  otpVerified: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<any>) {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    logoutSuccess(state) {
      state.user = null;
      localStorage.removeItem('user');
    },
    setOtpVerified(state, action: PayloadAction<boolean>) {
      state.otpVerified = action.payload;
    },
    addPhoneNumber(state, action: PayloadAction<string | null>) {
      state.phone = action.payload;
    },
  },
});

export const { loginSuccess, logoutSuccess, setOtpVerified, addPhoneNumber } = authSlice.actions;
export default authSlice.reducer;
