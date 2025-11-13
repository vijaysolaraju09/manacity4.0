import { useState, type ReactNode } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import AddressManager from '@/pages/Profile/components/AddressManager'
import { paths } from '@/routes/paths'
import type { AppDispatch } from '@/store'
import { logoutUser } from '@/store/slices/authSlice'

type TabKey = 'account' | 'orders' | 'requests' | 'notifications'

type ButtonVariant = 'primary' | 'outline' | 'ghost'

type ButtonProps = {
  children: ReactNode
  variant?: ButtonVariant
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
}

type CardProps = {
  children: ReactNode
  className?: string
}

type InputProps = {
  label?: string
  placeholder?: string
  type?: string
}

type BadgeProps = {
  children: ReactNode
}

type ChipProps = {
  active?: boolean
  children: ReactNode
  onClick?: () => void
}

type ModalProps = {
  title: string
  children: ReactNode
  onClose: () => void
}

type StatProps = {
  label: string
  value: string | number
}

function cn(...cls: Array<string | false | undefined>) {
  return cls.filter(Boolean).join(' ')
}

function Button({
  children,
  variant = 'primary',
  leftIcon,
  rightIcon,
  className = '',
  onClick,
  type = 'button',
}: ButtonProps) {
  const styles: Record<ButtonVariant, string> = {
    primary:
      'bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white shadow-[var(--shadow-md)] hover:opacity-95',
    outline:
      'border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] hover:bg-[var(--surface-0)]',
    ghost: 'text-[var(--text-primary)]/80 hover:bg-[var(--surface-0)]',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
        styles[variant],
        className,
      )}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
}

function Card({ children, className = '' }: CardProps) {
  return (
    <div className={cn('rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-[var(--shadow-sm)]', className)}>
      {children}
    </div>
  )
}

function Input({ label, placeholder, type = 'text' }: InputProps) {
  return (
    <label className="block text-sm">
      {label && <div className="mb-1 text-[var(--text-muted)]">{label}</div>}
      <input
        type={type}
        placeholder={placeholder}
        className="focus-ring w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 outline-none"
      />
    </label>
  )
}

function Badge({ children }: BadgeProps) {
  return <span className="rounded-full bg-[var(--surface-0)] px-2 py-1 text-xs text-[var(--text-muted)]">{children}</span>
}

function Chip({ active, children, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-sm transition',
        active
          ? 'border-transparent bg-[var(--primary)]/15 text-[var(--text-primary)]'
          : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-0)]',
      )}
    >
      {children}
    </button>
  )
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
    </div>
  )
}

function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h3 className="font-semibold">{title}</h3>
          <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

const DEMO_ORDERS = [
  { id: 1523, date: 'Nov 02, 2025', total: 1299, status: 'Shipped' },
  { id: 1499, date: 'Oct 21, 2025', total: 872, status: 'Delivered' },
  { id: 1477, date: 'Oct 07, 2025', total: 540, status: 'Delivered' },
]

const DEMO_REQUESTS = [
  { id: 201, title: 'AC Repair – Split 1.5T', date: 'Nov 04, 2025', status: 'Scheduled' },
  { id: 198, title: 'Home Cleaning – 2BHK', date: 'Oct 28, 2025', status: 'Completed' },
  { id: 192, title: 'iPhone Battery Replacement', date: 'Oct 12, 2025', status: 'Completed' },
]

const NOTIFS = [
  { id: 1, title: 'Order #1523 shipped', time: '2h ago', type: 'Order' },
  { id: 2, title: 'New event near you', time: '1d ago', type: 'Events' },
  { id: 3, title: 'Price drop on your wishlist', time: '3d ago', type: 'Deals' },
]

const ProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'account', label: 'Account' },
    { key: 'orders', label: 'Orders' },
    { key: 'requests', label: 'Requests' },
    { key: 'notifications', label: 'Notifications' },
  ]
  const [active, setActive] = useState<TabKey>('account')
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)

  const ordersCount = DEMO_ORDERS.length
  const requestsCount = DEMO_REQUESTS.length
  const rating = 4.7

  const handleLogout = () => {
    void dispatch(logoutUser()).finally(() => {
      navigate(paths.auth.login(), { replace: true })
    })
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1541534401786-2077eed87a74?q=80&w=400&auto=format&fit=crop"
              alt="avatar"
              className="h-14 w-14 rounded-2xl object-cover"
            />
            <div>
              <h3 className="font-semibold">Aarav Sharma</h3>
              <p className="text-sm text-[var(--text-muted)]">Member since 2023</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <Stat label="Orders" value={ordersCount} />
            <Stat label="Requests" value={requestsCount} />
            <Stat label="Rating" value={`${rating}★`} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Chip key={t.key} active={active === t.key} onClick={() => setActive(t.key)}>
              {t.label}
            </Chip>
          ))}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {active === 'account' && (
            <>
              <Card className="p-4">
                <h4 className="mb-3 font-semibold">Account</h4>
                <div className="grid gap-3">
                  <Input label="Full name" placeholder="Aarav Sharma" />
                  <Input label="Email" placeholder="aarav@example.com" />
                  <Input label="Phone" placeholder="+91 98•• •• ••10" />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setShowAvatarModal(true)}>Change Avatar</Button>
                    <Button variant="outline" onClick={() => setShowAddressModal(true)}>
                      Manage Addresses
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-rose-500 transition hover:text-rose-600"
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <h4 className="mb-3 font-semibold">Security</h4>
                <div className="grid gap-3">
                  <Input label="Current password" type="password" placeholder="••••••••" />
                  <Input label="New password" type="password" placeholder="••••••••" />
                  <Button>Update Password</Button>
                </div>
              </Card>
            </>
          )}

          {active === 'orders' && (
            <>
              <Card className="p-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <h4 className="font-semibold">Stay on top of your orders</h4>
                    <p className="text-sm text-[var(--text-muted)]">
                      View order timelines, track delivery status and download invoices from the orders dashboard.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate(paths.orders.mine())}>View my orders</Button>
                    <Button variant="outline" onClick={() => navigate(paths.profileHistory())}>
                      Activity history
                    </Button>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <h4 className="font-semibold">Need help with a service?</h4>
                    <p className="text-sm text-[var(--text-muted)]">
                      Raise a service request or review your previous requests from the services hub.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate(paths.services.requestsMine())}>
                      My service requests
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(paths.services.catalog())}>
                      Explore services
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          )}

          {active === 'requests' && (
            <>
              {DEMO_REQUESTS.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-[var(--text-muted)]">{r.date}</div>
                    </div>
                    <Badge>{r.status}</Badge>
                  </div>
                </Card>
              ))}
            </>
          )}

          {active === 'notifications' && (
            <>
              {NOTIFS.map((n) => (
                <Card key={n.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="text-xs text-[var(--text-muted)]">{n.time}</div>
                    </div>
                    <Badge>{n.type}</Badge>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </Card>

      {showAvatarModal && (
        <Modal title="Update Avatar" onClose={() => setShowAvatarModal(false)}>
          <div className="grid gap-3 text-sm">
            <p className="text-[var(--text-muted)]">Upload a square image (recommended 512×512).</p>
            <Button>Upload</Button>
          </div>
        </Modal>
      )}
      {showAddressModal && (
        <Modal title="Manage Addresses" onClose={() => setShowAddressModal(false)}>
          <AddressManager />
        </Modal>
      )}
    </div>
  )
}

export default ProfileScreen
