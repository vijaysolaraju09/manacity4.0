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
  icon:
    'h-11 w-11 justify-center rounded-xl text-md hover:text-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-0',
  default:
    'w-full justify-start rounded-xl px-3 py-2 text-sm font-medium text-md hover:text-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-0',
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
        'group relative inline-flex items-center gap-2 text-md transition-colors hover:text-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-0',
        variantClasses[variant],
        isActive &&
          'text-brand-500 ring-1 ring-brand-500/40',
        className,
      )
    }
  >
    <span className="relative inline-flex items-center justify-center">
      <Icon className="icon h-5 w-5 text-current" aria-hidden="true" />
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
