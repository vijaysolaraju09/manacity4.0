import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

type ButtonVariant = 'primary' | 'outline' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon
  trailingIcon?: LucideIcon
  variant?: ButtonVariant
  children: ReactNode
}

const Button = ({
  icon: Icon,
  trailingIcon: TrailingIcon,
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonProps) => (
  <button
    type="button"
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--ring)]',
      variant === 'primary' && 'bg-[var(--primary)] text-white shadow-md-theme hover:opacity-95',
      variant === 'outline' &&
        'border border-default bg-transparent text-primary hover:bg-[color-mix(in_srgb,var(--surface-1)_75%,var(--surface-0))]',
      variant === 'ghost' && 'text-primary hover:bg-[color-mix(in_srgb,var(--surface-1)_65%,var(--surface-0))]',
      className,
    )}
    {...props}
  >
    {Icon ? <Icon className="h-4 w-4" /> : null}
    <span>{children}</span>
    {TrailingIcon ? <TrailingIcon className="h-4 w-4" /> : null}
  </button>
)

export type { ButtonProps, ButtonVariant }
export default Button
