import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type ReactNode,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MapPin, Phone, Mail } from 'lucide-react'
import type { AppDispatch, RootState } from '@/store'
import { fetchProfile, updateProfile } from '@/store/user'
import showToast from '@/components/ui/Toast'
import { toErrorMessage } from '@/lib/response'
import type { User } from '@/types/user'

type TabKey = 'account' | 'orders' | 'requests' | 'notifications'

type ThemeButtonVariant = 'primary' | 'outline' | 'ghost'

type ThemeButtonProps = {
  children: ReactNode
  variant?: ThemeButtonVariant
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}

type ThemeCardProps = {
  children: ReactNode
  className?: string
}

type ThemeInputProps = {
  label?: string
  placeholder?: string
  type?: string
  value?: string
  name?: string
  disabled?: boolean
  autoComplete?: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
}

type ThemeBadgeProps = {
  children: ReactNode
}

type ThemeChipProps = {
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

const cn = (...cls: Array<string | false | undefined>) => cls.filter(Boolean).join(' ')

const Button = ({
  children,
  variant = 'primary',
  leftIcon,
  rightIcon,
  className = '',
  onClick,
  type = 'button',
  disabled = false,
}: ThemeButtonProps) => {
  const styles = {
    primary:
      'bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white shadow-[var(--shadow-md)] hover:opacity-95',
    outline:
      'border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] hover:bg-[var(--surface-0)]',
    ghost: 'text-[var(--text-primary)]/80 hover:bg-[var(--surface-0)]',
  } satisfies Record<ThemeButtonVariant, string>

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
        styles[variant],
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
}

const Card = ({ children, className = '' }: ThemeCardProps) => (
  <div className={cn('rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-[var(--shadow-sm)]', className)}>
    {children}
  </div>
)

const Input = ({
  label,
  placeholder,
  type = 'text',
  value,
  name,
  disabled,
  autoComplete,
  onChange,
  onBlur,
}: ThemeInputProps) => (
  <label className="block text-sm">
    {label ? <div className="mb-1 text-[var(--text-muted)]">{label}</div> : null}
    <input
      type={type}
      placeholder={placeholder}
      name={name}
      value={value}
      disabled={disabled}
      autoComplete={autoComplete}
      onChange={onChange}
      onBlur={onBlur}
      className="focus-ring w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 outline-none"
    />
  </label>
)

const Badge = ({ children }: ThemeBadgeProps) => (
  <span className="rounded-full bg-[var(--surface-0)] px-2 py-1 text-xs text-[var(--text-muted)]">{children}</span>
)

const Chip = ({ active, children, onClick }: ThemeChipProps) => (
  <button
    type="button"
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

const Stat = ({ label, value }: StatProps) => (
  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 text-center">
    <div className="text-lg font-semibold">{value}</div>
    <div className="text-xs text-[var(--text-muted)]">{label}</div>
  </div>
)

const Modal = ({ title, children, onClose }: ModalProps) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
    <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-[var(--shadow-lg)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
        <h3 className="font-semibold">{title}</h3>
        <button
          type="button"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </div>
)

const DEMO_ORDERS = [
  { id: 1523, date: 'Nov 02, 2025', total: 1299, status: 'Shipped' },
  { id: 1499, date: 'Oct 21, 2025', total: 872, status: 'Delivered' },
  { id: 1477, date: 'Oct 07, 2025', total: 540, status: 'Delivered' },
] as const

const DEMO_REQUESTS = [
  { id: 201, title: 'AC Repair – Split 1.5T', date: 'Nov 04, 2025', status: 'Scheduled' },
  { id: 198, title: 'Home Cleaning – 2BHK', date: 'Oct 28, 2025', status: 'Completed' },
  { id: 192, title: 'iPhone Battery Replacement', date: 'Oct 12, 2025', status: 'Completed' },
] as const

const NOTIFS = [
  { id: 1, title: 'Order #1523 shipped', time: '2h ago', type: 'Order' },
  { id: 2, title: 'New event near you', time: '1d ago', type: 'Events' },
  { id: 3, title: 'Price drop on your wishlist', time: '3d ago', type: 'Deals' },
] as const

const ProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const profileState = useSelector((state: RootState) => state.userProfile)
  const authState = useSelector((state: RootState) => state.auth)
  const profile = (profileState.item ?? authState.user ?? null) as (User & { createdAt?: string; rating?: number; ordersCount?: number; requestsCount?: number }) | null

  const tabs = [
    { key: 'account' as TabKey, label: 'Account' },
    { key: 'orders' as TabKey, label: 'Orders' },
    { key: 'requests' as TabKey, label: 'Requests' },
    { key: 'notifications' as TabKey, label: 'Notifications' },
  ]

  const [active, setActive] = useState<TabKey>('account')
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [pendingField, setPendingField] = useState<keyof FormState | null>(null)

  const [formState, setFormState] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    if (profileState.status === 'idle') {
      void dispatch(fetchProfile())
    }
  }, [dispatch, profileState.status])

  useEffect(() => {
    if (!profile) return
    setFormState({
      name: profile.name ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
    })
  }, [profile?.name, profile?.email, profile?.phone])

  const handleChange = useCallback(
    (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setFormState((prev) => ({ ...prev, [field]: value }))
    },
    [],
  )

  const handleBlur = useCallback(
    (field: keyof FormState) => async (event: FocusEvent<HTMLInputElement>) => {
      if (!profile) return
      const fieldMap: Record<keyof FormState, keyof User> = {
        name: 'name',
        email: 'email',
        phone: 'phone',
      }
      const payloadKey = fieldMap[field]
      const newValue = event.target.value
      const previousValue = ((profile?.[payloadKey] ?? '') as string | null) ?? ''
      if (newValue === previousValue) return
      setPendingField(field)
      try {
        await dispatch(updateProfile({ [payloadKey]: newValue })).unwrap()
        showToast('Profile updated successfully', 'success')
      } catch (err) {
        showToast(toErrorMessage(err) || 'Unable to update profile', 'error')
        setFormState((prev) => ({ ...prev, [field]: previousValue }))
      } finally {
        setPendingField(null)
      }
    },
    [dispatch, profile],
  )

  const ordersCount = useMemo(() => profile?.ordersCount ?? DEMO_ORDERS.length, [profile?.ordersCount])
  const requestsCount = useMemo(() => profile?.requestsCount ?? DEMO_REQUESTS.length, [profile?.requestsCount])
  const rating = useMemo(() => profile?.rating ?? 4.7, [profile?.rating])
  const isLoading = profileState.status === 'loading' && !profile
  const memberSinceLabel = useMemo(() => {
    const created = profile?.createdAt
    if (!created) return 'Member since 2023'
    const date = new Date(created)
    if (Number.isNaN(date.getTime())) return 'Member since 2023'
    return `Member since ${date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
  }, [profile?.createdAt])

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
              <h3 className="font-semibold">{profile?.name || 'Your profile'}</h3>
              <p className="text-sm text-[var(--text-muted)]">{memberSinceLabel}</p>
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
          {active === 'account' ? (
            <>
              <Card className="p-4">
                <h4 className="mb-3 font-semibold">Account</h4>
                <div className="grid gap-3">
                  <Input
                    label="Full name"
                    placeholder="Aarav Sharma"
                    name="name"
                    value={formState.name}
                    disabled={isLoading || pendingField === 'name'}
                    onChange={handleChange('name')}
                    onBlur={handleBlur('name')}
                  />
                  <Input
                    label="Email"
                    placeholder="aarav@example.com"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={formState.email}
                    disabled={isLoading || pendingField === 'email'}
                    onChange={handleChange('email')}
                    onBlur={handleBlur('email')}
                  />
                  <Input
                    label="Phone"
                    placeholder="+91 98•• •• ••10"
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    value={formState.phone}
                    disabled={isLoading || pendingField === 'phone'}
                    onChange={handleChange('phone')}
                    onBlur={handleBlur('phone')}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setShowAvatarModal(true)} disabled={isLoading}>
                      Change Avatar
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddressModal(true)} disabled={isLoading}>
                      Manage Addresses
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
          ) : null}

          {active === 'orders'
            ? DEMO_ORDERS.map((o) => (
                <Card key={o.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Order #{o.id}</div>
                      <div className="text-xs text-[var(--text-muted)]">{o.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">₹{o.total}</div>
                      <Badge>{o.status}</Badge>
                    </div>
                  </div>
                </Card>
              ))
            : null}

          {active === 'requests'
            ? DEMO_REQUESTS.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-[var(--text-muted)]">{r.date}</div>
                    </div>
                    <Badge>{r.status}</Badge>
                  </div>
                </Card>
              ))
            : null}

          {active === 'notifications'
            ? NOTIFS.map((n) => (
                <Card key={n.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="text-xs text-[var(--text-muted)]">{n.time}</div>
                    </div>
                    <Badge>{n.type}</Badge>
                  </div>
                </Card>
              ))
            : null}
        </div>
      </Card>

      {showAvatarModal ? (
        <Modal title="Update Avatar" onClose={() => setShowAvatarModal(false)}>
          <div className="grid gap-3 text-sm">
            <p className="text-[var(--text-muted)]">Upload a square image (recommended 512×512).</p>
            <Button>Upload</Button>
          </div>
        </Modal>
      ) : null}
      {showAddressModal ? (
        <Modal title="Manage Addresses" onClose={() => setShowAddressModal(false)}>
          <div className="grid gap-3 text-sm">
            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="font-medium">Home</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <MapPin className="h-4 w-4" /> {profile?.address || '11, City Center, Manacity'}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Phone className="h-4 w-4" /> {profile?.phone || '+91 98765 43210'}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Mail className="h-4 w-4" /> {profile?.email || 'hello@manacity.example'}
              </div>
            </div>
            <Button>Add New Address</Button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

export default ProfileScreen

type FormState = {
  name: string
  email: string
  phone: string
}
