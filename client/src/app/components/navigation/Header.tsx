import { Bell, Inbox, Search, ShoppingCart, Sparkles } from 'lucide-react'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { NavItem } from '@/app/types'
import { Input, IconButton } from '../primitives'
import ThemeToggle from '../ThemeToggle'
import { paths } from '@/routes/paths'

interface HeaderProps {
  currentPath: string
  items: NavItem[]
  cartCount?: number
  notificationCount?: number
}

const Header = ({ currentPath, items, cartCount, notificationCount }: HeaderProps) => {
  const active = items.find((item) => item.path === currentPath)
  const navigate = useNavigate()

  const handleCartClick = useCallback(() => {
    navigate(paths.cart())
  }, [navigate])

  const handleNotificationsClick = useCallback(() => {
    navigate(paths.notifications())
  }, [navigate])

  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-surface-0/80 px-4 py-5 backdrop-blur supports-[backdrop-filter]:bg-surface-0/70 md:px-8">
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 md:hidden">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[var(--primary)] shadow-sm-theme">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold text-primary">Manacity</span>
        </div>
        <div className="flex flex-1 items-center gap-4">
          <div className="hidden md:flex">
            <span className="text-sm font-semibold text-muted">{active?.label ?? 'Dashboard'}</span>
          </div>
          <div className="hidden flex-1 justify-center lg:flex lg:justify-start">
            <Input icon={Search} placeholder="Search shops, services, events..." />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <IconButton
              icon={ShoppingCart}
              label="Open cart"
              badge={cartCount && cartCount > 0 ? cartCount : undefined}
              onClick={handleCartClick}
            />
            <IconButton
              icon={Bell}
              label="Notifications"
              badge={notificationCount && notificationCount > 0 ? notificationCount : undefined}
              onClick={handleNotificationsClick}
            />
            <div className="hidden lg:flex">
              <IconButton icon={Inbox} label="Messages" />
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export type { HeaderProps }
export default Header
