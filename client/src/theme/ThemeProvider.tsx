import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getInitialTheme, getSystemTheme, type Theme } from './theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const storageKey = 'theme';
const availableThemes: Theme[] = ['light', 'dark', 'system'];

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme);

      if (typeof document === 'undefined') {
        return;
      }

      const resolved = nextTheme === 'system' ? getSystemTheme() : nextTheme;
      const root = document.documentElement;
      root.setAttribute('data-theme', resolved);

      if (resolved === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      if (document.body) {
        document.body.setAttribute('data-theme', resolved);
        document.body.classList.toggle('dark', resolved === 'dark');
      }

      try {
        localStorage.setItem(storageKey, nextTheme);
      } catch (error) {
        console.warn('[theme] Failed to persist theme preference', error);
      }
    },
    [],
  );

  useEffect(() => {
    setTheme(theme);
    // We only want to run this on mount to ensure the DOM reflects the initial theme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
