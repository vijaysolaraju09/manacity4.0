import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning'
  | 'outline'
  | 'default'
  | 'destructive';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-tertiary',
  danger: 'btn btn-danger',
  success: 'btn btn-success',
  warning: 'btn btn-warning',
  outline: 'btn btn-secondary',
  default: 'btn btn-primary',
  destructive: 'btn btn-danger',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'btn--md',
  sm: 'btn--sm',
  lg: 'btn--lg',
  icon: 'btn--icon',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', type = 'button', ...props }, ref) => {
    const alias: Record<ButtonVariant, keyof typeof variantClasses> = {
      primary: 'primary',
      secondary: 'secondary',
      ghost: 'ghost',
      danger: 'danger',
      success: 'success',
      warning: 'warning',
      outline: 'secondary',
      default: 'primary',
      destructive: 'danger',
    };
    const classes = variantClasses[alias[variant]];
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'whitespace-nowrap text-sm font-semibold disabled:pointer-events-none disabled:opacity-50',
          classes,
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
