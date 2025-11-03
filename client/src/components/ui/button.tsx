import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'btn--brand btn-primary shadow-elevBrand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
  secondary: 'btn--ghost btn--ghost-muted btn-ghost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
  outline: 'btn--ghost btn-ghost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
  ghost: 'btn--ghost btn--ghost-plain btn-ghost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
  destructive: 'btn--danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'btn--md',
  sm: 'btn--sm',
  lg: 'btn--lg',
  icon: 'btn--icon',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'btn whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export default Button;
