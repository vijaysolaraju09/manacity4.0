import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'manacity-theme'

type Theme = 'light' | 'dark'

const resolveInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'dark' ? 'dark' : 'light'
}

const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(() => resolveInitialTheme())

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, theme)
    }
  }, [theme])

  const toggle = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))

  return (
    <button
      type="button"
      aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      onClick={toggle}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-default bg-surface-1 text-primary shadow-sm-theme transition-colors hover:bg-[color-mix(in_srgb,var(--surface-1)_75%,var(--surface-0))] focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--ring)]"
    >
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  )
}

export default ThemeToggle
