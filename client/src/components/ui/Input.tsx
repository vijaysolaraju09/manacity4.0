import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helperText?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, id, type = 'text', ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20',
            error && 'border-rose-500 text-rose-600 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-400 dark:text-rose-200',
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
        {helperText ? (
          <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className="text-xs font-medium text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
