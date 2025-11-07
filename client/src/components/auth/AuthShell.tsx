import { useEffect, useMemo, useRef, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export type ThemeMode = 'light' | 'dark';

export const SCREENS = ['Landing', 'Login', 'Signup', 'Forgot Password', 'Verify OTP', 'Change Password'] as const;
export type ScreenKey = (typeof SCREENS)[number];

export function AuthShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }
    const stored = window.localStorage.getItem('manacity-theme');
    return stored === 'dark' ? 'dark' : 'light';
  });
  const previousTheme = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (previousTheme.current === null) {
      previousTheme.current = document.documentElement.getAttribute('data-theme');
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.setAttribute('data-theme', theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('manacity-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    return () => {
      if (typeof document === 'undefined') {
        return;
      }

      const original = previousTheme.current;
      if (original) {
        document.documentElement.setAttribute('data-theme', original);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] transition-colors">
      <ThemeStyles />
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface-1)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-[var(--shadow-md)]" />
            <span className="truncate text-lg font-semibold tracking-tight">Manacity</span>
          </div>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}

function ThemeToggle({ theme, setTheme }: { theme: ThemeMode; setTheme: (mode: ThemeMode) => void }) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)] shadow-[var(--shadow-sm)] transition-colors hover:text-[var(--text-primary)]"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function cn(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(' ');
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'ghost';
  className?: string;
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
}) {
  const styles = useMemo(() => {
    switch (variant) {
      case 'outline':
        return 'border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] hover:bg-[var(--surface-0)]';
      case 'ghost':
        return 'text-[var(--text-primary)]/80 hover:bg-[var(--surface-0)]';
      case 'primary':
      default:
        return 'bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white shadow-[var(--shadow-md)] hover:opacity-95';
    }
  }, [variant]);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'focus-ring inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60',
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-[var(--shadow-sm)]', className)}>{children}</div>;
}

export function AuthCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('p-4 md:p-6', className)}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function Input({ label, helperText, error, className = '', ...rest }: InputProps) {
  return (
    <label className="block text-sm">
      {label && <div className="mb-1 text-[var(--text-muted)]">{label}</div>}
      <input
        {...rest}
        className={cn(
          'focus-ring w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]/70',
          error && 'border-red-400 text-red-500 placeholder:text-red-300',
          className,
        )}
      />
      {(error || helperText) && (
        <div className={cn('mt-1 text-xs', error ? 'text-red-500' : 'text-[var(--text-muted)]')}>{error ?? helperText}</div>
      )}
    </label>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[var(--surface-0)] px-2 py-1 text-xs text-[var(--text-muted)]">{children}</span>;
}

export function ThemeStyles() {
  return (
    <style>{`
      :root {
        --primary: #12c9b2;
        --accent: #8b5cf6;
        --surface-0: #f8fafc;
        --surface-1: #ffffff;
        --border: #e2e8f0;
        --text-primary: #0f172a;
        --text-muted: #475569;
        --shadow-sm: 0 1px 2px rgba(0,0,0,.05);
        --shadow-md: 0 6px 18px rgba(18,201,178,.18);
        --shadow-lg: 0 16px 40px rgba(139,92,246,.20);
        --ring: 0 0 0 2px var(--accent);
      }
      [data-theme="dark"] {
        --primary: #22d3ee;
        --accent: #a78bfa;
        --surface-0: #0b0f16;
        --surface-1: #151b26;
        --border: #2d3748;
        --text-primary: #e2e8f0;
        --text-muted: #94a3b8;
        --shadow-sm: 0 1px 4px rgba(0,0,0,.4);
        --shadow-md: 0 6px 22px rgba(34,211,238,.18);
        --shadow-lg: 0 18px 44px rgba(167,139,250,.25);
        --ring: 0 0 0 2px var(--accent);
      }
      *, *::before, *::after { box-sizing: border-box; }
      html, body, #root { height: 100%; }
      body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
      .focus-ring:focus-visible { outline: none; box-shadow: var(--ring); }
    `}</style>
  );
}
