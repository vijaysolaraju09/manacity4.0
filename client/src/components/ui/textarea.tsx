import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => {
    const isInvalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true';
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn('input textarea', isInvalid && 'input--invalid', className)}
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';

export default Textarea;
