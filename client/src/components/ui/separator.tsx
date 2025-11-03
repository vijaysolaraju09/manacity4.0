import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type SeparatorProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical';
};

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', role = 'separator', ...props }, ref) => (
    <div
      ref={ref}
      role={role}
      aria-orientation={orientation}
      className={cn(
        'bg-surface-2 dark:bg-surface-2',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  ),
);

Separator.displayName = 'Separator';

export default Separator;
