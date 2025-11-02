export type Theme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'theme';

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  return saved ?? 'system';
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  root.classList.toggle('dark', resolved === 'dark');
  root.setAttribute('data-theme', resolved);
  document.body.classList.toggle('dark', resolved === 'dark');
  document.body.setAttribute('data-theme', resolved);
  localStorage.setItem(STORAGE_KEY, theme);
}

export function initTheme() {
  if (typeof window === 'undefined') return;
  const initial = getInitialTheme();
  applyTheme(initial);
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if ((stored ?? 'system') === 'system') {
      applyTheme('system');
    }
  };
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handleChange);
  }
}
