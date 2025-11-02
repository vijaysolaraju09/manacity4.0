import { cn } from '@/lib/utils';

type SpinnerSize = 'sm' | 'md' | 'lg';

type SpinnerProps = {
  className?: string;
  size?: SpinnerSize;
  ariaLabel?: string;
};

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-[3px]',
  lg: 'h-8 w-8 border-[3px]',
};

export const Spinner = ({ className, size = 'md', ariaLabel = 'Loading' }: SpinnerProps) => (
  <span
    role="status"
    aria-live="polite"
    aria-label={ariaLabel}
    className={cn('inline-flex items-center justify-center', className)}
  >
    <span
      className={cn(
    'block animate-spin rounded-full border-current border-t-transparent text-brand-500 dark:text-brand-400',
        sizeClasses[size],
      )}
    />
  </span>
);

export type { SpinnerProps };

export default Spinner;
