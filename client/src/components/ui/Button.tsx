import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonTone = 'default' | 'success';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  loading?: boolean;
};

const baseStyles =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 focus-visible:outline-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400',
  secondary:
    'bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-700 focus-visible:outline-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700',
  outline:
    'border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-blue-500 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white',
  danger:
    'bg-rose-600 text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 focus-visible:outline-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400',
};

const toneStyles: Record<ButtonTone, string> = {
  default: '',
  success: 'bg-emerald-600 hover:bg-emerald-500 focus-visible:outline-emerald-500 text-white',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
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

Button.displayName = 'Button';

export type { ButtonProps };

export default Button;
