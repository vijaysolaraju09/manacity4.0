import { Bell, CalendarDays, Home, ShoppingBag, ShoppingCart, Sparkles, User } from 'lucide-react'
import type { NavItem } from './types'

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Shops', icon: ShoppingBag, path: '/shops' },
  { label: 'Services', icon: Sparkles, path: '/services' },
  { label: 'Events', icon: CalendarDays, path: '/events' },
  { label: 'Cart', icon: ShoppingCart, path: '/cart' },
  { label: 'Notifications', icon: Bell, path: '/notifications' },
  { label: 'Profile', icon: User, path: '/profile' },
]

export default NAV_ITEMS
