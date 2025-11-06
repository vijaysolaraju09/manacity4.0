import { useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  BookmarkCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Gift,
  Heart,
  Home,
  Inbox,
  ListChecks,
  MapPin,
  MessageCircle,
  Moon,
  PackageCheck,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Sun,
  Ticket,
  Trophy,
  User,
  Users,
} from 'lucide-react'
type ButtonVariant = 'primary' | 'outline' | 'ghost'

type NavItem = {
  label: string
  icon: LucideIcon
  path: string
  badge?: string
}

type HeroItem = {
  title: string
  description: string
  highlight: string
  cta: string
}

type Shop = {
  id: string
  name: string
  category: string
  rating: number
  reviews: number
  status: 'Open' | 'Closed'
  distance: string
  tags: string[]
}

type Product = {
  id: string
  name: string
  price: number
  quantity: number
  image: string
  vendor: string
}

type Service = {
  id: string
  name: string
  provider: string
  price: string
  category: string
  rating: number
  responseTime: string
  featured?: boolean
}

type LeaderboardEntry = {
  id: string
  participant: string
  score: number
  avatar: string
  progress: number
}

type Notification = {
  id: string
  title: string
  message: string
  time: string
  type: 'order' | 'event' | 'promotion' | 'system'
  unread?: boolean
}

type Order = {
  id: string
  reference: string
  total: string
  status: 'Processing' | 'Delivered' | 'Shipped'
  placedAt: string
}

type Request = {
  id: string
  title: string
  status: 'Pending' | 'Approved' | 'In progress'
  updatedAt: string
  category: string
}

type Tabs = 'account' | 'orders' | 'requests' | 'notifications'

type Countdown = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

const ThemeStyles = () => (
  <style>{`\
    :root {\
      color-scheme: light;\
    }\
\
    html {\
      min-height: 100%;\
      font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\
      background-color: var(--surface-0);\
      color: var(--text-primary);\
      scroll-behavior: smooth;\
    }\
\
    body {\
      margin: 0;\
      min-height: 100%;\
      background-color: var(--surface-0);\
      color: var(--text-primary);\
    }\
\
    html[data-theme='light'] {\
      --primary: #12c9b2;\
      --accent: #8b5cf6;\
      --surface-0: #f8fafc;\
      --surface-1: #ffffff;\
      --border: rgba(15, 23, 42, 0.08);\
      --text-primary: #0f172a;\
      --text-muted: rgba(15, 23, 42, 0.6);\
      --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.08);\
      --shadow-md: 0 12px 30px rgba(15, 23, 42, 0.1);\
      --shadow-lg: 0 25px 65px rgba(15, 23, 42, 0.16);\
      --ring: 0 0 0 2px color-mix(in srgb, var(--primary) 35%, transparent);\
    }\
\
    html[data-theme='dark'] {\
      color-scheme: dark;\
      --primary: #22d3ee;\
      --accent: #a78bfa;\
      --surface-0: #020617;\
      --surface-1: #0f172a;\
      --border: rgba(148, 163, 184, 0.18);\
      --text-primary: #e2e8f0;\
      --text-muted: rgba(148, 163, 184, 0.68);\
      --shadow-sm: 0 1px 3px rgba(2, 6, 23, 0.45);\
      --shadow-md: 0 12px 35px rgba(2, 6, 23, 0.55);\
      --shadow-lg: 0 30px 80px rgba(2, 6, 23, 0.65);\
      --ring: 0 0 0 2px color-mix(in srgb, var(--primary) 45%, transparent);\
    }\
\
    *, *::before, *::after {\
      box-sizing: border-box;\
    }\
\
    a {\
      color: inherit;\
      text-decoration: none;\
    }\
\
    button {\
      font-family: inherit;\
    }\
\
    .bg-surface-0 {\
      background-color: var(--surface-0);\
    }\
\
    .bg-surface-1 {\
      background-color: var(--surface-1);\
    }\
\
    .text-primary {\
      color: var(--text-primary);\
    }\
\
    .text-muted {\
      color: var(--text-muted);\
    }\
\
    .border-default {\
      border-color: var(--border);\
    }\
\
    .shadow-sm-theme {\
      box-shadow: var(--shadow-sm);\
    }\
\
    .shadow-md-theme {\
      box-shadow: var(--shadow-md);\
    }\
\
    .shadow-lg-theme {\
      box-shadow: var(--shadow-lg);\
    }\
\
    .ring-focus {\
      box-shadow: var(--ring);\
    }\
\
    .gradient-hero {\
      background-image: linear-gradient(135deg, color-mix(in srgb, var(--primary) 75%, transparent), color-mix(in srgb, var(--accent) 85%, transparent));\
    }\
\
    .gradient-card {\
      background-image: linear-gradient(135deg, color-mix(in srgb, var(--accent) 65%, transparent), color-mix(in srgb, var(--primary) 50%, transparent));\
    }\
\
    .tab-indicator {\
      position: relative;\
    }\
\
    .tab-indicator::after {\
      content: '';\
      position: absolute;\
      inset-inline: 0;\
      bottom: -0.65rem;\
      height: 3px;\
      border-radius: 9999px;\
      background: var(--primary);\
      opacity: 0;\
      transform: translateY(4px);\
      transition: opacity 0.2s ease, transform 0.2s ease;\
    }\
\
    .tab-indicator[data-active='true']::after {\
      opacity: 1;\
      transform: translateY(0);\
    }\
\
    .chip-active {\
      background: color-mix(in srgb, var(--primary) 14%, transparent);\
      color: var(--text-primary);\
      border-color: color-mix(in srgb, var(--primary) 45%, transparent);\
    }\
\
    .chip-inactive {\
      background: transparent;\
      color: var(--text-muted);\
      border-color: var(--border);\
    }\
\
    .scroll-card::-webkit-scrollbar {\
      height: 6px;\
    }\
\
    .scroll-card::-webkit-scrollbar-thumb {\
      background: color-mix(in srgb, var(--text-muted) 35%, transparent);\
      border-radius: 999px;\
    }\
  `}</style>
)

const ThemeToggle = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }
    const stored = window.localStorage.getItem('manacity-theme')
    return stored === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('manacity-theme', theme)
  }, [theme])

  const toggle = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))

  return (
    <button
      type="button"
      aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      onClick={toggle}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-default bg-surface-1 text-primary shadow-sm-theme transition-colors hover:bg-[color-mix(in_srgb,var(--surface-1)_75%,var(--surface-0))] focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--ring)]"
    >
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  )
}

const IconButton = ({
  icon: Icon,
  label,
  variant = 'ghost',
  badge,
}: {
  icon: LucideIcon
  label: string
  variant?: 'solid' | 'ghost'
  badge?: string
}) => (
  <button
    type="button"
    aria-label={label}
    className={cn(
      'relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--ring)]',
      variant === 'solid'
        ? 'border-transparent bg-[color-mix(in_srgb,var(--primary)_92%,var(--surface-1))] text-white shadow-md-theme hover:opacity-95'
        : 'border-default bg-surface-1 text-primary shadow-sm-theme hover:bg-[color-mix(in_srgb,var(--surface-1)_75%,var(--surface-0))]'
    )}
  >
    <Icon className="h-5 w-5" />
    {badge ? (
      <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-semibold text-white shadow-sm-theme">
        {badge}
      </span>
    ) : null}
  </button>
)

const Button = ({
  children,
  variant = 'primary',
  className,
  icon: Icon,
  trailingIcon: Trailing,
}: {
  children: React.ReactNode
  variant?: ButtonVariant
  className?: string
  icon?: LucideIcon
  trailingIcon?: LucideIcon
}) => (
  <button
    type="button"
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--ring)]',
      variant === 'primary' && 'bg-[var(--primary)] text-white shadow-md-theme hover:opacity-95',
      variant === 'outline' &&
        'border border-default bg-transparent text-primary hover:bg-[color-mix(in_srgb,var(--surface-1)_75%,var(--surface-0))]',
      variant === 'ghost' && 'text-primary hover:bg-[color-mix(in_srgb,var(--surface-1)_65%,var(--surface-0))]',
      className
    )}
  >
    {Icon ? <Icon className="h-4 w-4" /> : null}
    <span>{children}</span>
    {Trailing ? <Trailing className="h-4 w-4" /> : null}
  </button>
)

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div
    className={cn(
      'bg-surface-1 border border-default shadow-sm-theme backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--surface-1)_88%,transparent)]',
      'rounded-3xl',
      className
    )}
  >
    {children}
  </div>
)

const Input = ({ icon: Icon, placeholder }: { icon?: LucideIcon; placeholder: string }) => (
  <div className="flex items-center gap-3 rounded-full border border-default bg-surface-1 px-4 py-2.5 text-sm text-muted shadow-sm-theme">
    {Icon ? <Icon className="h-4 w-4" /> : null}
    <span>{placeholder}</span>
  </div>
)

const Badge = ({ children, tone = 'success' }: { children: React.ReactNode; tone?: 'success' | 'neutral' | 'accent' }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
      tone === 'success' && 'bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[color-mix(in_srgb,var(--primary)_85%,var(--text-primary))]',
      tone === 'neutral' && 'bg-[color-mix(in_srgb,var(--text-muted)_16%,transparent)] text-muted',
      tone === 'accent' && 'bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[color-mix(in_srgb,var(--accent)_90%,var(--text-primary))]'
    )}
  >
    {children}
  </span>
)

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--ring)]',
      active ? 'chip-active' : 'chip-inactive'
    )}
  >
    {children}
  </button>
)

const Sidebar = ({ items, currentPath }: { items: NavItem[]; currentPath: string }) => (
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
                : 'hover:bg-[color-mix(in_srgb,var(--surface-1)_78%,var(--surface-0))]'
            )}
          >
            <span className="flex items-center gap-3 text-sm">
              <item.icon className="h-5 w-5" />
              {item.label}
            </span>
            {item.badge ? <Badge tone="accent">{item.badge}</Badge> : null}
          </NavLink>
        )
      })}
    </nav>
    <div className="mt-8 space-y-3 rounded-3xl border border-dashed border-default p-5 text-xs">
      <p className="font-semibold text-primary">Upgrade to Manacity Pro</p>
      <p className="leading-relaxed text-muted">
        Unlock exclusive deals, concierge support, and premium services tailored for you.
      </p>
      <Button variant="outline">Explore benefits</Button>
    </div>
  </aside>
)

const BottomTabs = ({ items, currentPath }: { items: NavItem[]; currentPath: string }) => (
  <div className="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-surface-1 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--surface-1)_88%,transparent)] md:hidden">
    <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
      {items.map((item) => {
        const isActive = currentPath === item.path
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center gap-1 text-xs transition-colors',
              isActive ? 'text-primary' : 'text-muted'
            )}
          >
            <span
              className={cn(
                'inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm transition-all',
                isActive
                  ? 'border-transparent bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-primary shadow-sm-theme'
                  : 'border-transparent bg-transparent'
              )}
            >
              <item.icon className="h-5 w-5" />
            </span>
            {item.label}
          </NavLink>
        )
      })}
    </div>
  </div>
)

const Carousel = ({ items }: { items: HeroItem[] }) => {
  const [index, setIndex] = useState(0)
  const next = () => setIndex((prev) => (prev + 1) % items.length)
  const prev = () => setIndex((prev) => (prev - 1 + items.length) % items.length)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [items.length])

  return (
    <Card className="relative overflow-hidden rounded-[2.25rem] p-8 sm:p-10">
      <div className="absolute inset-0 gradient-hero opacity-90" aria-hidden />
      <div className="relative z-10 flex flex-col gap-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3 sm:max-w-lg">
          <Badge tone="accent">{items[index].highlight}</Badge>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {items[index].title}
          </h1>
          <p className="text-base leading-relaxed text-white/85">{items[index].description}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button variant="primary" className="bg-white/20 text-white shadow-lg-theme hover:bg-white/30">
              {items[index].cta}
            </Button>
            <Button variant="ghost" className="text-white hover:bg-white/15">
              View details
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-center">
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--ring)]"
            onClick={prev}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--ring)]"
            onClick={next}
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-2">
        {items.map((_, idx) => (
          <span
            key={idx}
            className={cn(
              'h-1.5 w-6 rounded-full transition-all',
              idx === index ? 'bg-white' : 'bg-white/40'
            )}
          />
        ))}
      </div>
    </Card>
  )
}

const useCountdown = (target: Date): Countdown => {
  const [diff, setDiff] = useState(() => target.getTime() - Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDiff(target.getTime() - Date.now())
    }, 1000)
    return () => window.clearInterval(interval)
  }, [target])

  const total = Math.max(diff, 0)
  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((total / (1000 * 60)) % 60)
  const seconds = Math.floor((total / 1000) % 60)

  return { days, hours, minutes, seconds }
}

const HERO_ITEMS: HeroItem[] = [
  {
    title: 'Shop smarter with curated local picks',
    description: 'Discover trending shops, exclusive pop-ups, and neighborhood gems with Manacity concierge insights.',
    highlight: 'Discover Manacity',
    cta: 'Start exploring',
  },
  {
    title: 'Book trusted services in minutes',
    description: 'From home repairs to personal wellness, connect with verified providers and track every request in one place.',
    highlight: 'Services hub',
    cta: 'Browse services',
  },
  {
    title: 'Join exclusive community events',
    description: 'Reserve seats, earn rewards, and experience the city with curated happenings tailored to your interests.',
    highlight: 'Events & experiences',
    cta: 'View events',
  },
]

const SERVICE_HERO = {
  title: 'Concierge-crafted services tailored for you',
  description:
    'Choose from vetted providers with transparent pricing, real-time updates, and premium support for every request.',
  stats: [
    { label: 'Avg. response', value: '12m' },
    { label: 'Verified partners', value: '280+' },
    { label: 'Satisfaction', value: '4.9/5' },
  ],
}

const DEMO_SHOPS: Shop[] = [
  {
    id: 'atelier-one',
    name: 'Atelier One',
    category: 'Lifestyle & Design',
    rating: 4.9,
    reviews: 328,
    status: 'Open',
    distance: '0.8 km',
    tags: ['Interior', 'Artisan'],
  },
  {
    id: 'bloom-co',
    name: 'Bloom & Co',
    category: 'Florist & Decor',
    rating: 4.8,
    reviews: 214,
    status: 'Open',
    distance: '1.4 km',
    tags: ['Same-day', 'Custom'],
  },
  {
    id: 'craft-roasters',
    name: 'Craft Roasters',
    category: 'Coffee & Pantry',
    rating: 4.7,
    reviews: 189,
    status: 'Closed',
    distance: '2.1 km',
    tags: ['Organic', 'Subscriptions'],
  },
  {
    id: 'studio-nova',
    name: 'Studio Nova',
    category: 'Fashion Collective',
    rating: 4.95,
    reviews: 412,
    status: 'Open',
    distance: '0.5 km',
    tags: ['Exclusive', 'Made-to-order'],
  },
  {
    id: 'peak-performance',
    name: 'Peak Performance',
    category: 'Fitness Boutique',
    rating: 4.85,
    reviews: 287,
    status: 'Open',
    distance: '1.9 km',
    tags: ['Premium', 'Classes'],
  },
  {
    id: 'urban-harvest',
    name: 'Urban Harvest',
    category: 'Gourmet Market',
    rating: 4.76,
    reviews: 156,
    status: 'Closed',
    distance: '3.2 km',
    tags: ['Farm-to-table', 'Seasonal'],
  },
]

const DEMO_PRODUCTS: Product[] = [
  {
    id: 'artisan-bag',
    name: 'Artisan Weekender Bag',
    price: 280,
    quantity: 1,
    image: '/images/products/weekender.jpg',
    vendor: 'Studio Nova',
  },
  {
    id: 'coffee-sub',
    name: 'Single-origin Coffee Subscription',
    price: 42,
    quantity: 2,
    image: '/images/products/coffee.jpg',
    vendor: 'Craft Roasters',
  },
  {
    id: 'wellness-pack',
    name: 'Wellness Retreat Pack',
    price: 195,
    quantity: 1,
    image: '/images/products/wellness.jpg',
    vendor: 'Peak Performance',
  },
]

const DEMO_SERVICES: Service[] = [
  {
    id: 'concierge-design',
    name: 'Concierge Interior Refresh',
    provider: 'Atelier One',
    price: 'from $420',
    category: 'Home & Living',
    rating: 4.96,
    responseTime: '2h response',
    featured: true,
  },
  {
    id: 'wellness-coach',
    name: 'Performance Wellness Coach',
    provider: 'Peak Performance',
    price: '$160/session',
    category: 'Health & Wellness',
    rating: 4.88,
    responseTime: 'Instant book',
  },
  {
    id: 'bespoke-florals',
    name: 'Bespoke Floral Concierge',
    provider: 'Bloom & Co',
    price: 'from $95',
    category: 'Events & Decor',
    rating: 4.9,
    responseTime: '45m response',
  },
  {
    id: 'tech-studio',
    name: 'On-demand Tech Studio',
    provider: 'Urban Harvest Collective',
    price: 'from $210',
    category: 'Creative & Media',
    rating: 4.82,
    responseTime: 'Same-day',
  },
  {
    id: 'signature-catering',
    name: 'Signature Catering Experience',
    provider: 'Gourmet Circle',
    price: 'custom quote',
    category: 'Events & Decor',
    rating: 4.94,
    responseTime: '1h response',
    featured: true,
  },
]

const LEADERBOARD: LeaderboardEntry[] = [
  {
    id: '1',
    participant: 'Aria Collins',
    score: 1280,
    avatar: '/images/avatars/aria.png',
    progress: 84,
  },
  {
    id: '2',
    participant: 'Maya Singh',
    score: 1165,
    avatar: '/images/avatars/maya.png',
    progress: 76,
  },
  {
    id: '3',
    participant: 'Noah Park',
    score: 1122,
    avatar: '/images/avatars/noah.png',
    progress: 70,
  },
]

const NOTIFS: Notification[] = [
  {
    id: 'notif-1',
    title: 'Order ready for pickup',
    message: 'Your Studio Nova tailoring is complete. Swing by anytime today before 8 PM.',
    time: '12m ago',
    type: 'order',
    unread: true,
  },
  {
    id: 'notif-2',
    title: 'Event reminder',
    message: 'Concierge wine tasting begins in 2 hours. Your reserved table awaits.',
    time: '1h ago',
    type: 'event',
  },
  {
    id: 'notif-3',
    title: 'Member exclusive',
    message: 'Unlock 15% off bespoke decor packages from Bloom & Co this weekend.',
    time: '3h ago',
    type: 'promotion',
  },
  {
    id: 'notif-4',
    title: 'System update',
    message: 'Dark theme refinements are now live. Enjoy improved contrast and clarity.',
    time: '1d ago',
    type: 'system',
  },
]

const DEMO_ORDERS: Order[] = [
  {
    id: 'order-01',
    reference: 'MC-48392',
    total: '$642.00',
    status: 'Processing',
    placedAt: 'Mar 28, 2025',
  },
  {
    id: 'order-02',
    reference: 'MC-48231',
    total: '$318.00',
    status: 'Delivered',
    placedAt: 'Mar 12, 2025',
  },
  {
    id: 'order-03',
    reference: 'MC-47824',
    total: '$198.00',
    status: 'Shipped',
    placedAt: 'Mar 04, 2025',
  },
]

const DEMO_REQUESTS: Request[] = [
  {
    id: 'request-01',
    title: 'Penthouse lounge redesign',
    status: 'In progress',
    updatedAt: 'Updated 2h ago',
    category: 'Home & Living',
  },
  {
    id: 'request-02',
    title: 'Concierge wellness plan',
    status: 'Pending',
    updatedAt: 'Updated yesterday',
    category: 'Health & Wellness',
  },
  {
    id: 'request-03',
    title: 'Boutique launch experience',
    status: 'Approved',
    updatedAt: 'Updated 3d ago',
    category: 'Events & Experiences',
  },
]


const HomeScreen = () => (
  <div className="flex flex-col gap-8">
    <Carousel items={HERO_ITEMS} />

    <section className="grid gap-6 md:grid-cols-2">
      <Card className="overflow-hidden rounded-[2rem] p-6">
        <div className="flex h-full flex-col gap-6">
          <div>
            <Badge tone="accent">Curated for you</Badge>
            <h2 className="mt-3 text-2xl font-semibold text-primary">Featured concierge picks</h2>
            <p className="mt-2 text-sm text-muted">
              Insider recommendations refreshed daily. Everything verified by Manacity curators.
            </p>
          </div>
          <div className="space-y-4">
            {DEMO_SHOPS.slice(0, 3).map((shop) => (
              <div key={shop.id} className="flex items-start gap-4 rounded-2xl border border-default/70 p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-primary">{shop.name}</h3>
                    <Badge tone={shop.status === 'Open' ? 'success' : 'neutral'}>
                      {shop.status === 'Open' ? 'Open now' : 'Opens soon'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{shop.category}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-[var(--accent)]" />
                      {shop.rating.toFixed(1)} • {shop.reviews} reviews
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {shop.distance}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" trailingIcon={ChevronRight}>
            View all curated shops
          </Button>
        </div>
      </Card>
      <Card className="gradient-card rounded-[2rem] p-6 text-white shadow-lg-theme">
        <div className="flex h-full flex-col justify-between gap-6">
          <div className="space-y-3">
            <Badge tone="accent">Premium services</Badge>
            <h2 className="text-2xl font-semibold tracking-tight">Concierge on demand</h2>
            <p className="text-sm text-white/85">
              Request anything from luxury reservations to bespoke gifting. Our concierge team is available 24/7.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            {SERVICE_HERO.stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/25 bg-white/10 p-3">
                <p className="text-lg font-semibold">{stat.value}</p>
                <p className="text-xs text-white/80">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="primary" className="bg-white text-[var(--primary)] shadow-lg-theme">
              Book concierge
            </Button>
            <Button variant="ghost" className="text-white hover:bg-white/15">
              Explore services
            </Button>
          </div>
        </div>
      </Card>
    </section>

    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-primary">Trending shops</h2>
          <p className="text-sm text-muted">Hand-picked experiences popular with Manacity insiders.</p>
        </div>
        <Button variant="ghost" trailingIcon={ChevronRight}>
          See marketplace
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_SHOPS.map((shop) => (
          <Card key={shop.id} className="rounded-3xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-primary">{shop.name}</h3>
                <p className="mt-1 text-sm text-muted">{shop.category}</p>
              </div>
              <Badge tone={shop.status === 'Open' ? 'success' : 'neutral'}>
                {shop.status === 'Open' ? 'Open now' : 'Closed'}
              </Badge>
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-[var(--accent)]" />
                {shop.rating.toFixed(2)} ({shop.reviews})
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {shop.distance}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {shop.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
            <Button variant="outline" className="mt-5 w-full">
              View details
            </Button>
          </Card>
        ))}
      </div>
    </section>
  </div>
)

const ShopsScreen = () => {
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'Lifestyle', 'Wellness', 'Gourmet', 'Fashion', 'Experiences']
  const filtered = useMemo(() => {
    if (filter === 'All') return DEMO_SHOPS
    return DEMO_SHOPS.filter((shop) => shop.category.toLowerCase().includes(filter.toLowerCase()))
  }, [filter])

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Explore curated shops</h1>
            <p className="text-sm text-muted">Book private appointments, reserve drops, and access limited editions.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {filters.map((name) => (
              <Chip key={name} active={filter === name} onClick={() => setFilter(name)}>
                {name}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((shop) => (
          <Card key={shop.id} className="rounded-3xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-primary">{shop.name}</h2>
                <p className="mt-1 text-sm text-muted">{shop.category}</p>
              </div>
              <Badge tone={shop.status === 'Open' ? 'success' : 'neutral'}>
                {shop.status === 'Open' ? 'Open now' : 'Closed'}
              </Badge>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-muted">
              <span className="inline-flex items-center gap-1 text-primary">
                <Star className="h-4 w-4 text-[var(--accent)]" />
                {shop.rating.toFixed(1)}
              </span>
              <span>{shop.reviews} reviews</span>
              <span>{shop.distance}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {shop.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <Button variant="primary">Visit shop</Button>
              <IconButton icon={BookmarkCheck} label="Save shop" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

const ServicesScreen = () => {
  const [active, setActive] = useState('All')
  const categories = ['All', 'Home & Living', 'Health & Wellness', 'Events & Decor', 'Creative & Media']
  const services = useMemo(() => {
    if (active === 'All') return DEMO_SERVICES
    return DEMO_SERVICES.filter((service) => service.category === active)
  }, [active])

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden rounded-[2rem]">
        <div className="grid gap-6 p-6 md:grid-cols-[1.15fr_0.85fr] md:p-8">
          <div className="space-y-4">
            <Badge tone="accent">Concierge services</Badge>
            <h1 className="text-2xl font-semibold text-primary">{SERVICE_HERO.title}</h1>
            <p className="text-sm text-muted">{SERVICE_HERO.description}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              {SERVICE_HERO.stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-default bg-surface-1 px-4 py-3 text-center">
                  <p className="text-lg font-semibold text-primary">{stat.value}</p>
                  <p className="text-xs text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" icon={Sparkles}>
                Submit a request
              </Button>
              <Button variant="outline">View service catalog</Button>
            </div>
          </div>
          <Card className="gradient-card rounded-[2rem] p-6 text-white shadow-md-theme">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Weekly highlight</h2>
                <p className="text-sm text-white/80">
                  Signature Catering Experience is booking out quickly. Reserve bespoke menus for your next event.
                </p>
              </div>
              <div className="space-y-4 text-sm">
                <p className="inline-flex items-center gap-2 text-white/85">
                  <Clock className="h-4 w-4" /> 1h guaranteed response time
                </p>
                <p className="inline-flex items-center gap-2 text-white/85">
                  <ShieldCheck className="h-4 w-4" /> Verified by Manacity Concierge
                </p>
                <p className="inline-flex items-center gap-2 text-white/85">
                  <Users className="h-4 w-4" /> Premium guest experience team
                </p>
              </div>
              <Button variant="primary" className="bg-white text-[var(--primary)] shadow-lg-theme">
                Reserve experience
              </Button>
            </div>
          </Card>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <Chip key={category} active={active === category} onClick={() => setActive(category)}>
            {category}
          </Chip>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <Card key={service.id} className="rounded-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-primary">{service.name}</h2>
                  {service.featured ? <Badge tone="accent">Featured</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted">{service.provider}</p>
              </div>
              <Button variant="ghost" className="text-sm text-primary">
                {service.price}
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-muted">
              <span className="inline-flex items-center gap-1 text-primary">
                <Star className="h-4 w-4 text-[var(--accent)]" />
                {service.rating.toFixed(2)}
              </span>
              <span>{service.responseTime}</span>
              <span>{service.category}</span>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <Button variant="primary" icon={Sparkles}>
                Request service
              </Button>
              <IconButton icon={MessageCircle} label="Chat concierge" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

const EventsScreen = () => {
  const target = useMemo(() => new Date(Date.now() + 1000 * 60 * 60 * 36), [])
  const countdown = useCountdown(target)

  return (
    <div className="flex flex-col gap-6">
      <Card className="gradient-card overflow-hidden rounded-[2rem] p-6 text-white shadow-lg-theme md:p-8">
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Badge tone="accent">Upcoming highlight</Badge>
            <h1 className="text-3xl font-semibold">Skyline Supper Club</h1>
            <p className="text-sm text-white/80">
              Intimate tasting with Michelin-awarded chefs, featuring seasonal pairings and live jazz under the stars.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-white/85">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Apr 18 · 7:30 PM
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" /> 58th Floor Terrace, Manacity Tower
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" className="bg-white text-[var(--primary)] shadow-lg-theme">
                Reserve seats
              </Button>
              <Button variant="ghost" className="text-white hover:bg-white/15">
                View full calendar
              </Button>
            </div>
          </div>
          <Card className="rounded-[2rem] border border-white/25 bg-white/10 p-6 text-center text-white/85 shadow-sm-theme">
            <p className="text-sm uppercase tracking-[0.2em]">Event begins in</p>
            <div className="mt-4 grid grid-cols-4 gap-3 text-sm">
              {Object.entries(countdown).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-white/15 p-3">
                  <p className="text-2xl font-semibold text-white">{value.toString().padStart(2, '0')}</p>
                  <p className="mt-1 text-xs capitalize text-white/80">{key}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-white/70">
              Seats are limited. Members earn double loyalty points for attending curated events this month.
            </p>
          </Card>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
        <Card className="rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-primary">Leaderboard</h2>
            <Badge tone="accent">Live updates</Badge>
          </div>
          <div className="mt-4 overflow-x-auto scroll-card">
            <table className="w-full min-w-[480px] table-fixed border-separate border-spacing-y-3 text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Participant</th>
                  <th className="px-4 py-2 font-medium">Score</th>
                  <th className="px-4 py-2 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {LEADERBOARD.map((entry) => (
                  <tr key={entry.id} className="rounded-2xl border border-default bg-surface-1/70 text-primary shadow-sm-theme">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <span>{entry.participant}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">{entry.score}</td>
                    <td className="px-4 py-3">
                      <div className="h-2 w-full rounded-full bg-[color-mix(in_srgb,var(--text-muted)_18%,transparent)]">
                        <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${entry.progress}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-primary">Upcoming experiences</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div className="rounded-2xl border border-default p-4">
              <p className="text-sm font-semibold text-primary">Boutique Gallery Night</p>
              <p className="mt-1 text-xs text-muted">Apr 22 · Soho District</p>
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted">
                <Ticket className="h-3.5 w-3.5" /> Exclusive invites remaining: 6
              </p>
            </div>
            <div className="rounded-2xl border border-default p-4">
              <p className="text-sm font-semibold text-primary">Wellness Sunrise Retreat</p>
              <p className="mt-1 text-xs text-muted">Apr 26 · Harbor Club</p>
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted">
                <Heart className="h-3.5 w-3.5" /> Limited spots · Concierge transport available
              </p>
            </div>
            <div className="rounded-2xl border border-default p-4">
              <p className="text-sm font-semibold text-primary">Chef's Table Residency</p>
              <p className="mt-1 text-xs text-muted">May 02 · Atelier One</p>
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted">
                <Gift className="h-3.5 w-3.5" /> Member loyalty bonus experiences
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}

const CartScreen = () => {
  const subtotal = DEMO_PRODUCTS.reduce((sum, product) => sum + product.price * product.quantity, 0)
  const serviceFee = subtotal * 0.04
  const total = subtotal + serviceFee

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Cart overview</h1>
            <p className="text-sm text-muted">Review your curated items and services before proceeding to checkout.</p>
          </div>
          <Badge tone="accent">Secure checkout</Badge>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="rounded-3xl p-6">
          <h2 className="text-lg font-semibold text-primary">Items & experiences</h2>
          <div className="mt-4 space-y-4">
            {DEMO_PRODUCTS.map((product) => (
              <div key={product.id} className="flex flex-col gap-4 rounded-2xl border border-default p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">{product.name}</p>
                    <p className="mt-1 text-xs text-muted">{product.vendor}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-primary">
                  <span className="rounded-full border border-default px-3 py-1 text-xs text-muted">
                    Qty {product.quantity}
                  </span>
                  <span className="font-semibold">${(product.price * product.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-primary">Order summary</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <div className="flex items-center justify-between text-primary">
                <span>Subtotal</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Concierge services</span>
                <span>${serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-default pt-3 text-primary">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-base font-semibold">${total.toFixed(2)}</span>
              </div>
            </div>
            <Button variant="primary" icon={CreditCard} className="mt-5 w-full">
              Proceed to pay
            </Button>
            <p className="mt-3 text-xs text-muted">
              Payments are processed securely. Concierge will confirm delivery windows within 10 minutes.
            </p>
          </Card>
          <Card className="rounded-3xl p-6 text-sm">
            <h3 className="text-sm font-semibold text-primary">Members get complimentary delivery</h3>
            <p className="mt-2 text-muted">
              Use your loyalty points at checkout for curated perks and next-day concierge support.
            </p>
            <Button variant="outline" className="mt-4 w-full" icon={Gift}>
              Redeem perks
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

const NotificationsScreen = () => (
  <div className="flex flex-col gap-6">
    <Card className="rounded-[2rem] p-6">
      <div className="flex flex-col gap-3">
        <Badge tone="accent">Inbox</Badge>
        <h1 className="text-2xl font-semibold text-primary">Notifications center</h1>
        <p className="text-sm text-muted">Stay updated with orders, events, and concierge announcements.</p>
      </div>
    </Card>

    <div className="space-y-4">
      {NOTIFS.map((notification) => (
        <Card key={notification.id} className="rounded-3xl border border-default/80 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm-theme',
                  notification.type === 'order' && 'bg-[var(--primary)]',
                  notification.type === 'event' && 'bg-[var(--accent)]',
                  notification.type === 'promotion' && 'bg-[color-mix(in_srgb,var(--accent)_68%,var(--primary))]',
                  notification.type === 'system' && 'bg-[color-mix(in_srgb,var(--text-muted)_45%,transparent)]',
                )}
              >
                {notification.type === 'order' ? (
                  <PackageCheck className="h-5 w-5" />
                ) : notification.type === 'event' ? (
                  <CalendarDays className="h-5 w-5" />
                ) : notification.type === 'promotion' ? (
                  <Gift className="h-5 w-5" />
                ) : (
                  <Inbox className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-primary">{notification.title}</h3>
                  {notification.unread ? <Badge tone="accent">New</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted">{notification.message}</p>
                <p className="mt-3 text-xs text-muted">{notification.time}</p>
              </div>
            </div>
            <IconButton icon={CheckCircle2} label="Mark notification" />
          </div>
        </Card>
      ))}
    </div>
  </div>
)

const ProfileScreen = () => {
  const [tab, setTab] = useState<Tabs>('account')

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-[2rem] p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)]">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-primary">Sofia Laurent</h1>
              <p className="text-sm text-muted">Concierge member since 2022 • Platinum tier</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" icon={Settings}>
              Account settings
            </Button>
            <Button variant="primary" icon={Sparkles}>
              Upgrade perks
            </Button>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="rounded-2xl border border-default px-4 py-3">
            <p className="text-xs text-muted">Loyalty balance</p>
            <p className="mt-1 text-lg font-semibold text-primary">12,450 pts</p>
          </div>
          <div className="rounded-2xl border border-default px-4 py-3">
            <p className="text-xs text-muted">Concierge credits</p>
            <p className="mt-1 text-lg font-semibold text-primary">$320</p>
          </div>
          <div className="rounded-2xl border border-default px-4 py-3">
            <p className="text-xs text-muted">Upcoming bookings</p>
            <p className="mt-1 text-lg font-semibold text-primary">3 events</p>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl p-6">
        <div className="flex flex-wrap items-center gap-4 border-b border-default pb-4">
          {(
            [
              { key: 'account', label: 'Account' },
              { key: 'orders', label: 'Orders' },
              { key: 'requests', label: 'Requests' },
              { key: 'notifications', label: 'Notifications' },
            ] satisfies { key: Tabs; label: string }[]
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'tab-indicator relative rounded-full px-4 py-2 text-sm font-medium transition-colors',
                tab === item.key ? 'text-primary' : 'text-muted hover:text-primary',
              )}
              data-active={tab === item.key}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-6 space-y-4">
          {tab === 'account' ? (
            <div className="space-y-4 text-sm">
              <p className="text-muted">
                Manage your profile, preferences, and concierge communication settings. Update delivery addresses and
                event preferences anytime.
              </p>
              <Button variant="outline" icon={ListChecks}>
                Edit preferences
              </Button>
            </div>
          ) : null}

          {tab === 'orders' ? (
            <div className="space-y-4">
              {DEMO_ORDERS.map((order) => (
                <div key={order.id} className="rounded-2xl border border-default p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary">Order {order.reference}</p>
                      <p className="text-xs text-muted">Placed {order.placedAt}</p>
                    </div>
                    <Badge tone="accent">{order.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted">Total</span>
                    <span className="font-semibold text-primary">{order.total}</span>
                  </div>
                  <Button variant="ghost" className="mt-3 px-0 text-sm text-primary">
                    View receipt
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {tab === 'requests' ? (
            <div className="space-y-4">
              {DEMO_REQUESTS.map((request) => (
                <div key={request.id} className="rounded-2xl border border-default p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary">{request.title}</p>
                      <p className="text-xs text-muted">{request.category}</p>
                    </div>
                    <Badge tone="accent">{request.status}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted">{request.updatedAt}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <Button variant="outline" icon={MessageCircle}>
                      Message concierge
                    </Button>
                    <Button variant="ghost" icon={BookmarkCheck}>
                      Save update
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {tab === 'notifications' ? (
            <div className="space-y-4">
              {NOTIFS.map((notification) => (
                <div key={notification.id} className="rounded-2xl border border-default p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary">{notification.title}</p>
                      <p className="mt-1 text-xs text-muted">{notification.message}</p>
                    </div>
                    <Badge tone="neutral">{notification.time}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
const NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Shops', icon: ShoppingBag, path: '/shops' },
  { label: 'Services', icon: Sparkles, path: '/services' },
  { label: 'Events', icon: CalendarDays, path: '/events' },
  { label: 'Cart', icon: ShoppingCart, path: '/cart', badge: '3' },
  { label: 'Notifications', icon: Bell, path: '/notifications', badge: '4' },
  { label: 'Profile', icon: User, path: '/profile' },
]

const Header = ({ currentPath }: { currentPath: string }) => (
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
          <span className="text-sm font-semibold text-muted">{NAV_ITEMS.find((item) => item.path === currentPath)?.label ?? 'Dashboard'}</span>
        </div>
        <div className="flex flex-1 justify-center md:justify-start">
          <Input icon={Search} placeholder="Search shops, services, events..." />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <IconButton icon={ShoppingCart} label="Open cart" badge="3" />
        <IconButton icon={Bell} label="Notifications" badge="4" />
        <IconButton icon={Inbox} label="Messages" />
        <ThemeToggle />
      </div>
    </div>
  </header>
)

const AppLayout = () => {
  const location = useLocation()
  return (
    <div className="bg-surface-0 text-primary">
      <Header currentPath={location.pathname} />
      <div className="mx-auto flex w-full max-w-[1120px] gap-6 px-4 pb-24 pt-6 md:px-8 md:pb-12">
        <Sidebar items={NAV_ITEMS} currentPath={location.pathname} />
        <div className="flex w-full flex-col">
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomTabs items={NAV_ITEMS} currentPath={location.pathname} />
    </div>
  )
}

const AppRoutes = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<HomeScreen />} />
      <Route path="shops" element={<ShopsScreen />} />
      <Route path="services" element={<ServicesScreen />} />
      <Route path="events" element={<EventsScreen />} />
      <Route path="cart" element={<CartScreen />} />
      <Route path="notifications" element={<NotificationsScreen />} />
      <Route path="profile" element={<ProfileScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
)

const ManacityApp = () => {
  useEffect(() => {
    const stored = window.localStorage.getItem('manacity-theme')
    if (!stored) {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.setAttribute('data-theme', stored)
    }
  }, [])

  return (
    <>
      <ThemeStyles />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  )
}

export {
  Badge,
  BottomTabs,
  Button,
  Card,
  Carousel,
  IconButton,
  Input,
  ManacityApp,
  Sidebar,
  ThemeStyles,
  ThemeToggle,
  useCountdown,
  AppRoutes,
}

export default ManacityApp

