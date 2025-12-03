import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  children: ReactNode
}

const Chip = ({ active = false, className, children, ...props }: ChipProps) => (
  <button
    type="button"
    className={cn(
      'inline-flex items-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--ring)]',
      active ? 'chip-active' : 'chip-inactive',
      className,
    )}
    {...props}
  >
    {children}
  </button>
)

export type { ChipProps }
export default Chip
