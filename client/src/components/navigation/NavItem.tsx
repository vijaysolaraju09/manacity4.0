import type { ReactNode } from 'react';
import { NavLink, type NavLinkProps } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './NavItem.module.scss';

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
        'group relative inline-flex items-center gap-2 rounded-xl text-ink-500 transition-colors hover:bg-brand-500/10 hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-ink-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:outline-accent-500',
        variantClasses[variant],
        isActive &&
          'bg-brand-500/15 text-brand-600 ring-1 ring-brand-300 dark:bg-brand-500/20 dark:text-brand-300 dark:ring-brand-400/30',
        className,
      )
    }
  >
    <span className="relative inline-flex items-center justify-center">
      <Icon className="h-5 w-5 text-current" aria-hidden="true" />
      {badge ? (
        <span aria-hidden="true" className={styles.badge}>
          {badge}
        </span>
      ) : null}
    </span>
    {variant === 'default' ? (
      <span className="truncate text-sm font-medium text-inherit">{label}</span>
    ) : (
      <span className="sr-only">{label}</span>
    )}
  </NavLink>
);

export default NavItem;
