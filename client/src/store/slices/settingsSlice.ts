import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface NotificationPrefs {
  orderUpdates: boolean;
  offersPromos: boolean;
  systemMessages: boolean;
}

export interface SettingsState {
  language: string;
  notifications: NotificationPrefs;
}

const defaultNotifications: NotificationPrefs = {
  orderUpdates: true,
  offersPromos: true,
  systemMessages: true,
};

const getInitialLanguage = (): string => {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('manacity_lang');
    if (stored) return stored;
    localStorage.setItem('manacity_lang', 'EN');
  }
  return 'EN';
};

const getInitialNotifications = (): NotificationPrefs => {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('manacity_prefs');
    if (stored) {
      try {
        return { ...defaultNotifications, ...JSON.parse(stored) };
      } catch {
        // ignore parse errors and fall back to defaults
      }
    } else {
      localStorage.setItem('manacity_prefs', JSON.stringify(defaultNotifications));
    }
  }
  return defaultNotifications;
};

const initialState: SettingsState = {
  language: getInitialLanguage(),
  notifications: getInitialNotifications(),
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<string>) {
      state.language = action.payload;
    },
    setNotificationPrefs(state, action: PayloadAction<Partial<NotificationPrefs>>) {
      state.notifications = { ...state.notifications, ...action.payload };
    },
  },
});

export const { setLanguage, setNotificationPrefs } = settingsSlice.actions;
export default settingsSlice.reducer;
