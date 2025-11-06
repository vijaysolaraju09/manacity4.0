import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

const Card = ({ children, className, ...props }: CardProps) => (
  <div
    className={cn(
      'bg-surface-1 border border-default shadow-sm-theme backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--surface-1)_88%,transparent)] rounded-3xl',
      className,
    )}
    {...props}
  >
    {children}
  </div>
)

export type { CardProps }
export default Card
