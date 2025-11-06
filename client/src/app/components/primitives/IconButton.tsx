import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  variant?: 'solid' | 'ghost'
  badge?: string | number
}

const IconButton = ({ icon: Icon, label, variant = 'ghost', badge, className, ...props }: IconButtonProps) => (
  <button
    type="button"
    aria-label={label}
    className={cn(
      'relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--ring)]',
      variant === 'solid'
        ? 'border-transparent bg-[color-mix(in_srgb,var(--primary)_92%,var(--surface-1))] text-white shadow-md-theme hover:opacity-95'
        : 'border-default bg-surface-1 text-primary shadow-sm-theme hover:bg-[color-mix(in_srgb,var(--surface-1)_75%,var(--surface-0))]',
      className,
    )}
    {...props}
  >
    <Icon className="h-5 w-5" />
    {badge ? (
      <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-semibold text-white shadow-sm-theme">
        {badge}
      </span>
    ) : null}
  </button>
)

export type { IconButtonProps }
export default IconButton
