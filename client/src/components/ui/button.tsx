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
  default: 'btn--brand',
  secondary: 'btn--ghost btn--ghost-muted',
  outline: 'btn--ghost',
  ghost: 'btn--ghost btn--ghost-plain',
  destructive: 'btn--danger',
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
