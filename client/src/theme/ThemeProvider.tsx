import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'colorful';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const storageKey = 'manacity_theme';
const availableThemes: Theme[] = ['light', 'dark', 'colorful'];

const applyThemeAttributes = (value: Theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', value);
  document.documentElement.classList.toggle('dark', value === 'dark');
  document.body.setAttribute('data-theme', value);
  document.body.classList.toggle('dark', value === 'dark');
};

const getInitialTheme = (): Theme => {
  const stored = localStorage.getItem(storageKey) as Theme | null;
  const initial = stored && availableThemes.includes(stored) ? stored : 'light';
  applyThemeAttributes(initial);
  return initial;
};

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyThemeAttributes(theme);
    localStorage.setItem(storageKey, theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
