import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { applyTheme, getInitialTheme, type Theme } from './theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const storageKey = 'theme';
const availableThemes: Theme[] = ['light', 'dark', 'system'];

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleMedia = () => {
      const stored = localStorage.getItem(storageKey) as Theme | null;
      if ((stored ?? 'system') === 'system') {
        setTheme('system');
      }
    };

    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMedia);
      return () => mediaQuery.removeEventListener('change', handleMedia);
    }
    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleMedia);
      return () => mediaQuery.removeListener(handleMedia);
    }
    return undefined;
  }, []);

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
