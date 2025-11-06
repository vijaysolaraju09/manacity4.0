import type { HTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface InputProps extends HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  placeholder: string
}

const Input = ({ icon: Icon, placeholder, className, ...props }: InputProps) => (
  <div
    className={cn(
      'flex items-center gap-3 rounded-full border border-default bg-surface-1 px-4 py-2.5 text-sm text-muted shadow-sm-theme',
      className,
    )}
    {...props}
  >
    {Icon ? <Icon className="h-4 w-4" /> : null}
    <span>{placeholder}</span>
  </div>
)

export type { InputProps }
export default Input
