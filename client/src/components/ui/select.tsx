import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  const isInvalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true';
  return (
    <select
      ref={ref}
      className={cn('input select', isInvalid && 'input--invalid', className)}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';

export default Select;
