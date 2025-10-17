import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeBase =
  'inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 shadow-sm dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-100';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'outline' | 'success' | 'warning' };

const variantClass: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: badgeBase,
  outline:
    'inline-flex items-center rounded-full border border-slate-300 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-200',
  success:
    'inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 shadow-sm dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-100',
  warning:
    'inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 shadow-sm dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100',
};

const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => (
  <span className={cn(variantClass[variant], className)} {...props} />
);

export default Badge;
