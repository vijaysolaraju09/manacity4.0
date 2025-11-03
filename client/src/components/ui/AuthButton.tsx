import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

type AuthButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type AuthButtonTone = 'default' | 'success';

type AuthButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AuthButtonVariant;
  tone?: AuthButtonTone;
  loading?: boolean;
};

const baseStyles =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-[color:var(--brand-400)]';

const variantStyles: Record<AuthButtonVariant, string> = {
  primary:
    'bg-brand-500 text-white shadow-brand hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-400',
  secondary:
    'bg-surface-2 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-700 focus-visible:outline-slate-700 dark:bg-surface-2 dark:hover:bg-slate-700',
  outline:
    'border border-[color:var(--border-subtle)] bg-[var(--surface)] text-ink-700 hover:border-[color:var(--brand-300)] hover:bg-[var(--surface-card)] dark:border-[color:var(--border-subtle)] dark:bg-[var(--surface-card)] dark:text-ink-500',
  ghost:
    'bg-transparent text-ink-600 hover:bg-[color-mix(in_srgb,var(--ink-300)_20%,transparent)] hover:text-ink-900 dark:text-ink-500 dark:hover:bg-[color-mix(in_srgb,var(--ink-500)_20%,transparent)] dark:hover:text-ink-900',
  danger:
    'bg-[var(--danger-500)] text-white shadow-lg shadow-[rgba(220,38,38,0.32)] hover:bg-[var(--danger-600)] dark:bg-[var(--danger-500)] dark:hover:bg-[var(--danger-600)]',
};

const toneStyles: Record<AuthButtonTone, string> = {
  default: '',
  success: 'bg-[var(--success-500)] hover:bg-[var(--success-600)] text-white',
};

const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
  (
    { className, children, variant = 'primary', tone = 'default', loading = false, type = 'button', disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(baseStyles, variantStyles[variant], toneStyles[tone], className)}
        data-variant={variant}
        data-tone={tone}
        disabled={disabled ?? loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Spinner size="sm" ariaLabel="Processing" /> : null}
        <span className="truncate">{children}</span>
      </button>
    );
  },
);

AuthButton.displayName = 'AuthButton';

export type { AuthButtonProps };

export { AuthButton };

export default AuthButton;
