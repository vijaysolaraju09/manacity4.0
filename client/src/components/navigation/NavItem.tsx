import type { ReactNode } from 'react';
import { NavLink, type NavLinkProps } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItemVariant = 'icon' | 'default';

type BaseProps = {
  icon: LucideIcon;
  label: ReactNode;
  ariaLabel: string;
  badge?: ReactNode;
  variant?: NavItemVariant;
  className?: string;
};

export type NavItemProps = BaseProps & Omit<NavLinkProps, 'className' | 'children'>;

const variantClasses: Record<NavItemVariant, string> = {
  icon: 'h-11 w-11 justify-center',
  default: 'w-full justify-start px-3 py-2 text-sm font-medium',
};

const NavItem = ({
  icon: Icon,
  label,
  ariaLabel,
  badge,
  variant = 'icon',
  className,
  ...props
}: NavItemProps) => (
  <NavLink
    {...props}
    aria-label={ariaLabel}
    title={typeof label === 'string' ? label : undefined}
    className={({ isActive }) =>
      cn(
        'group relative inline-flex items-center gap-2 rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:outline-blue-400',
        variantClasses[variant],
        isActive &&
          'bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-400/30',
        className,
      )
    }
  >
    <Icon className="h-5 w-5" aria-hidden="true" />
    {variant === 'default' ? (
      <span className="truncate text-sm font-medium text-inherit">{label}</span>
    ) : (
      <span className="sr-only">{label}</span>
    )}
    {badge ? (
      <span
        aria-hidden="true"
        className="absolute -top-1.5 -right-1.5 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[0.65rem] font-semibold text-white shadow ring-2 ring-white dark:bg-red-400 dark:ring-slate-900"
      >
        {badge}
      </span>
    ) : null}
  </NavLink>
);

export default NavItem;
