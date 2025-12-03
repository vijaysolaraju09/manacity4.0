import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type BadgeTone = 'success' | 'neutral' | 'accent'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

const toneClasses: Record<BadgeTone, string> = {
  success: 'bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[color-mix(in_srgb,var(--primary)_85%,var(--text-primary))]',
  neutral: 'bg-[color-mix(in_srgb,var(--text-muted)_16%,transparent)] text-muted',
  accent: 'bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[color-mix(in_srgb,var(--accent)_90%,var(--text-primary))]',
}

const Badge = ({ children, tone = 'success', className }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
      toneClasses[tone],
      className,
    )}
  >
    {children}
  </span>
)

export type { BadgeProps, BadgeTone }
export default Badge
