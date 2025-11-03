import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type LabeledInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helperText?: string;
  error?: string;
};

const LabeledInput = forwardRef<HTMLInputElement, LabeledInputProps>(
  ({ className, label, helperText, error, id, type = 'text', ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-semibold text-text-secondary dark:text-text-secondary">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'block w-full rounded-xl border border-borderc/40 bg-surface-1 px-4 py-2.5 text-sm text-text-primary shadow-sm transition focus:border-[color:var(--brand-500)] focus:outline-none focus:ring-4 focus:ring-[color:var(--brand-500)]/10 disabled:cursor-not-allowed disabled:bg-surface-2 dark:border-borderc/40 dark:bg-surface-1 dark:text-text-primary dark:focus:border-[color:var(--brand-400)] dark:focus:ring-[color:var(--brand-400)]/20',
            error && 'border-rose-500 text-rose-600 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-400 dark:text-rose-200',
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
        {helperText ? (
          <p id={helperId} className="text-xs text-text-muted dark:text-text-muted">
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

LabeledInput.displayName = 'LabeledInput';

export { LabeledInput };

export default LabeledInput;
