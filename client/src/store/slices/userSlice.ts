import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  name: string;
  phone: string;
  location: string;
  role: string;
  address?: string;
  isVerified?: boolean;
  verificationStatus?: string;
  profession?: string;
  bio?: string;
}

const initialState: UserState = {
  name: '',
  phone: '',
  location: '',
  role: 'user',
  isVerified: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<UserState>) {
      return { ...state, ...action.payload };
    },
    clearUser() {
      return initialState;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
