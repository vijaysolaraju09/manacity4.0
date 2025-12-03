import { NavLink } from 'react-router-dom'
import type { NavItem } from '@/components/types'
import { cn } from '@/utils/cn'

interface BottomTabsProps {
  items: NavItem[]
  currentPath: string
}

const BottomTabs = ({ items, currentPath }: BottomTabsProps) => {
  if (items.length === 0) return null
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-default bg-surface-1/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-surface-1/80 md:hidden">
      <div className="mx-auto flex w-full max-w-[520px] items-center justify-between">
        {items.map((item) => {
          const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path))
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'tab-indicator flex flex-1 flex-col items-center gap-1 text-xs font-medium text-muted',
                'transition-colors duration-200',
                isActive ? 'text-primary' : 'hover:text-primary/80',
              )}
              data-active={isActive}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.badge ? (
                  <span className="absolute -right-2 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-semibold text-white shadow-sm-theme">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export type { BottomTabsProps }
export default BottomTabs
