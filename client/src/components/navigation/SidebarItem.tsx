import type { ReactNode } from 'react';
import { NavLink, type NavLinkProps } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SidebarItemProps extends Omit<NavLinkProps, 'className' | 'children'> {
  icon: LucideIcon;
  label: ReactNode;
  badge?: ReactNode;
  className?: string;
}

const baseClasses =
  'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-500';

const SidebarItem = ({ icon: Icon, label, badge, className, ...props }: SidebarItemProps) => (
  <NavLink
    {...props}
    className={({ isActive }) =>
      cn(
        baseClasses,
        'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white',
        isActive && 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white',
        className,
      )
    }
    aria-label={typeof label === 'string' ? label : undefined}
  >
    <Icon className="h-5 w-5" aria-hidden="true" />
    <span className="truncate">{label}</span>
    {badge ? (
      <span
        className="ml-auto inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[0.7rem] font-semibold text-white shadow-sm ring-2 ring-white dark:bg-blue-500 dark:ring-slate-900"
        aria-hidden="true"
      >
        {badge}
      </span>
    ) : null}
  </NavLink>
);

export default SidebarItem;
