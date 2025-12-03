import { Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { NavItem } from '@/app/types'
import { cn } from '@/utils/cn'

interface SidebarProps {
  items: NavItem[]
  currentPath: string
}

const Sidebar = ({ items, currentPath }: SidebarProps) => (
  <aside className="sticky top-0 hidden h-screen w-[18rem] flex-col border-r border-default bg-surface-1 px-6 pb-8 pt-10 text-sm text-muted shadow-lg-theme md:flex">
    <div className="flex items-center gap-3 pb-8">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[var(--primary)] shadow-sm-theme">
        <Sparkles className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold tracking-tight text-primary">Manacity</p>
        <p className="text-xs text-muted">Discover your city, effortlessly</p>
      </div>
    </div>
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item) => {
        const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path))
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center justify-between rounded-2xl px-4 py-3 font-medium transition-colors',
              isActive
                ? 'bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-primary'
                : 'hover:bg-[color-mix(in_srgb,var(--surface-1)_78%,var(--surface-0))]',
            )}
          >
            <span className="flex items-center gap-3 text-sm">
              <item.icon className="h-5 w-5" />
              {item.label}
            </span>
            {item.badge ? (
              <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] px-2 text-xs font-semibold text-primary">
                {item.badge}
              </span>
            ) : null}
          </NavLink>
        )
      })}
    </nav>
    <div className="mt-8 space-y-2 rounded-2xl border border-dashed border-default/70 p-4 text-xs text-muted">
      <p className="font-semibold text-primary">Concierge tip</p>
      <p>Track orders, manage concierge requests, and access member perks from the tabs below.</p>
    </div>
  </aside>
)

export type { SidebarProps }
export default Sidebar
