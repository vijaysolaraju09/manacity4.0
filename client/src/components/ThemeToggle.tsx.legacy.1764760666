import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme } from '@/theme/ThemeProvider';

const iconMap = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

export default function ThemeToggle() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div className="card elevated flex flex-col gap-3">
      <span className="text-sm font-medium text-ink-500">Theme</span>
      <div className="flex flex-wrap gap-2">
        {availableThemes.map((option) => {
          const Icon = iconMap[option];
          const isActive = theme === option;

          return (
            <button
              key={option}
              type="button"
              className={`btn min-w-[96px] justify-center ${isActive ? 'btn--brand' : 'btn--ghost'}`}
              onClick={() => setTheme(option)}
              aria-pressed={isActive}
              aria-label={`Switch to ${option} theme`}
            >
              {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
              <span className="text-sm font-medium capitalize">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
