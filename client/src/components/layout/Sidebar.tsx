import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Home, Bell, Store, PackageOpen, Users, CalendarDays, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { paths } from '@/routes/paths';

type Item = { to: string; label: string; icon: LucideIcon; badge?: number };

const items: Item[] = [
  { to: paths.home(), label: 'Home', icon: Home },
  { to: paths.shops(), label: 'Shops', icon: Store },
  { to: paths.services.catalog(), label: 'Services', icon: PackageOpen },
  { to: paths.events.list(), label: 'Events', icon: CalendarDays },
  { to: paths.notifications(), label: 'Notifications', icon: Bell },
  { to: paths.profile(), label: 'Profile', icon: Users },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[84px] z-40">
      <div className="mx-3 my-4 flex h-[calc(100vh-2rem)] w-full flex-col items-center gap-3 rounded-2xl bg-surface-2 border border-borderc/40 shadow-elev-1 overflow-hidden">
        <NavLink
          to={paths.home()}
          className="mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-1 text-lg font-semibold text-text-primary shadow-inner-card"
          aria-label="Manacity home"
        >
          M
        </NavLink>
        <div className="flex-1 w-full overflow-y-auto no-scrollbar px-2 py-3 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    'group relative block w-full rounded-xl px-3 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
                    isActive ? 'bg-surface-1' : 'hover:bg-surface-1/60',
                  )
                }
              >
                {({ isActive }) => (
                  <span
                    className={cn(
                      'relative grid h-12 w-12 place-items-center rounded-2xl border border-borderc/30 transition-all',
                      isActive
                        ? 'shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)] ring-2 ring-brand-500/40'
                        : 'hover:ring-1 hover:ring-brand-500/30',
                    )}
                  >
                    <Icon className={cn('h-5 w-5 transition-colors', isActive ? 'text-white' : 'text-text-secondary')} />
                    {typeof item.badge === 'number' && item.badge > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-semibold text-white shadow-elev-2">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : null}
                    <span className="sr-only">{item.label}</span>
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
        <div className="w-full border-t border-borderc/30 bg-surface-1/60 px-2 py-3">
          <NavLink
            to={paths.settings()}
            aria-label="Settings"
            className={({ isActive }) =>
              cn(
                'group relative flex w-full justify-center rounded-xl px-3 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
                isActive ? 'bg-surface-1' : 'hover:bg-surface-1/60',
              )
            }
          >
            {({ isActive }) => (
              <span
                className={cn(
                  'grid h-12 w-12 place-items-center rounded-2xl border border-borderc/30 transition-all',
                  isActive
                    ? 'shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)] ring-2 ring-brand-500/40'
                    : 'hover:ring-1 hover:ring-brand-500/30',
                )}
              >
                <Settings className={cn('h-5 w-5 transition-colors', isActive ? 'text-white' : 'text-text-secondary')} />
                <span className="sr-only">Settings</span>
              </span>
            )}
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
