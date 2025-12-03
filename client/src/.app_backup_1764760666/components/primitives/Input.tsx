import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
  inputClassName?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon: Icon, className, inputClassName, type = 'text', ...props }, ref) => (
    <label
      className={cn(
        'flex items-center gap-3 rounded-full border border-default bg-surface-1 px-4 py-2.5 text-sm text-muted shadow-sm-theme focus-within:border-[color-mix(in_srgb,var(--primary)_35%,transparent)] focus-within:text-primary',
        className,
      )}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      <input
        ref={ref}
        type={type}
        className={cn(
          'w-full border-none bg-transparent p-0 text-sm text-primary placeholder:text-muted focus:outline-none',
          inputClassName,
        )}
        {...props}
      />
    </label>
  ),
)

Input.displayName = 'Input'

export type { InputProps }
export default Input
