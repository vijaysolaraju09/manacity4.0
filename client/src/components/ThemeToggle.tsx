import { useTheme } from '@/theme/ThemeProvider';

export default function ThemeToggle() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div className="card elevated flex flex-col gap-3">
      <span className="text-sm font-medium text-ink-500">Theme</span>
      <div className="flex flex-wrap gap-2">
        {availableThemes.map((option) => (
          <button
            key={option}
            type="button"
            className={`btn min-w-[96px] ${theme === option ? 'btn--brand shadow-brand' : 'btn--ghost'}`}
            onClick={() => setTheme(option)}
            aria-pressed={theme === option}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
