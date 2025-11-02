export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  return stored ?? 'system';
}

function resolveTheme(mode: Theme): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode;
}

function applyResolvedTheme(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.setAttribute('data-theme', resolved);
  if (document.body) {
    document.body.classList.toggle('dark', resolved === 'dark');
    document.body.setAttribute('data-theme', resolved);
  }
}

export function setTheme(mode: Theme) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(mode);
  applyResolvedTheme(resolved);
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    console.warn('[theme] Failed to persist theme preference', error);
  }
}

export function applyTheme(theme: Theme) {
  setTheme(theme);
}

export function initTheme() {
  if (typeof window === 'undefined') return;
  const initial = getInitialTheme();
  setTheme(initial);

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    if ((stored ?? 'system') === 'system') {
      setTheme('system');
    }
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handleChange);
  }
}
