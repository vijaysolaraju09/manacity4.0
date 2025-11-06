import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const elevationClass: Record<NonNullable<CardProps['elevation']>, string> = {
  sm: 'mc-shadow-sm',
  md: 'mc-shadow-md',
  lg: 'mc-shadow-lg',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation = 'sm', hover = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[var(--mc-radius)] border border-[rgb(var(--mc-border))] bg-[rgb(var(--mc-surface))] text-[rgb(var(--mc-on-surface))] transition-all duration-200',
          elevationClass[elevation],
          hover && 'hover:-translate-y-0.5 hover:[box-shadow:var(--mc-shadow-md)] motion-reduce:hover:translate-y-0',
          className,
        )}
        {...props}
      />
    );
  },
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-1.5 border-b border-[rgb(var(--mc-border))] p-6 text-[rgb(var(--mc-on-surface))]',
        className,
      )}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-tight text-[rgb(var(--mc-on-surface))]', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-[rgb(var(--mc-muted))]', className)}
      {...props}
    />
  ),
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3 border-t border-[rgb(var(--mc-border))] p-6 text-[rgb(var(--mc-on-surface))]',
        className,
      )}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

export default Card;
