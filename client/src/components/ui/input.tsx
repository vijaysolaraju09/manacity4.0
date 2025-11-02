import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', ...props }, ref) => {
  const isInvalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true';
  return (
    <input
      ref={ref}
      type={type}
      className={cn('input', isInvalid && 'input--invalid', className)}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
