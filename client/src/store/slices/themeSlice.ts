import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'colored' | 'light' | 'dark';

const stored = (localStorage.getItem('theme') as Theme) || 'colored';

const themeSlice = createSlice({
  name: 'theme',
  initialState: stored as Theme,
  reducers: {
    setTheme(_state, action: PayloadAction<Theme>) {
      localStorage.setItem('theme', action.payload);
      return action.payload;
    },
  },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
export type ThemeState = ReturnType<typeof themeSlice.reducer>;
