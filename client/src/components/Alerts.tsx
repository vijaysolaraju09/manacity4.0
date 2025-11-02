import { cn } from '@/lib/utils';

interface AlertProps {
  title: string;
  description?: string;
  className?: string;
}

export const ErrorAlert = ({ title, description, className }: AlertProps) => (
  <div
    role="alert"
    className={cn(
      'flex w-full items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm ring-1 ring-rose-200/60 dark:border-rose-500/60 dark:bg-rose-950/60 dark:text-rose-100',
      className,
    )}
  >
    <span aria-hidden className="mt-0.5 text-base font-semibold">!</span>
    <div className="space-y-1">
      <p className="font-semibold">{title}</p>
      {description ? <p className="text-sm text-rose-700 dark:text-rose-200/80">{description}</p> : null}
    </div>
  </div>
);

export const SuccessAlert = ({ title, description, className }: AlertProps) => (
  <div
    role="status"
    className={cn(
      'flex w-full items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm ring-1 ring-emerald-200/60 dark:border-emerald-500/50 dark:bg-emerald-950/60 dark:text-emerald-100',
      className,
    )}
  >
    <span aria-hidden className="mt-0.5 text-base font-semibold">✓</span>
    <div className="space-y-1">
      <p className="font-semibold">{title}</p>
      {description ? <p className="text-sm text-emerald-700 dark:text-emerald-200/80">{description}</p> : null}
    </div>
  </div>
);
