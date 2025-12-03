import { Outlet, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { NAV_ITEMS } from '@/components/navigationItems'
import { BottomTabs, Header, Sidebar } from '@/components/navigation'

const AppLayout = () => {
  const location = useLocation()
  const cartCount = useSelector((state: RootState) =>
    state.cart.items.reduce((total, item) => total + item.qty, 0),
  )
  const notificationCount = useSelector((state: RootState) => state.notifs.unread)

  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => {
        if (item.path === '/cart') {
          return { ...item, badge: cartCount > 0 ? cartCount : undefined }
        }
        if (item.path === '/notifications') {
          return { ...item, badge: notificationCount > 0 ? notificationCount : undefined }
        }
        return item
      }),
    [cartCount, notificationCount],
  )

  const bottomNavItems = useMemo(
    () => navItems.filter((item) => item.path !== '/cart' && item.path !== '/notifications'),
    [navItems],
  )

  return (
    <div className="bg-surface-0 text-primary">
      <Header currentPath={location.pathname} items={navItems} cartCount={cartCount} notificationCount={notificationCount} />
      <div className="mx-auto flex w-full max-w-[1120px] gap-6 px-4 pb-24 pt-6 md:px-8 md:pb-12">
        <Sidebar items={navItems} currentPath={location.pathname} />
        <div className="flex w-full flex-col">
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomTabs items={bottomNavItems} currentPath={location.pathname} />
    </div>
  )
}

export default AppLayout
