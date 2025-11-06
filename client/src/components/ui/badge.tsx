import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClass: Record<BadgeVariant, string> = {
  default: 'badge--brand',
  secondary: 'badge--muted',
  outline: 'badge--outline',
  success: 'badge--success',
  warning: 'badge--warning',
  danger: 'badge--danger',
};

const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => (
  <span className={cn('chip badge', variantClass[variant], className)} {...props} />
);

export default Badge;
