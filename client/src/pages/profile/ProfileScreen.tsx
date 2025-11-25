import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Building2, LogOut, Mail, MapPin, PencilLine, Phone } from 'lucide-react'
import { z } from 'zod'

import AddressManager from '@/pages/Profile/components/AddressManager'
import Button from '@/components/ui/button'
import EmptyState from '@/components/ui/EmptyState'
import ErrorCard from '@/components/ui/ErrorCard'
import { Skeleton } from '@/components/ui/skeleton'
import ModalSheet from '@/components/base/ModalSheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from '@/components/ui/form'
import Input from '@/components/ui/input'
import Textarea from '@/components/ui/textarea'
import { toErrorMessage } from '@/lib/response'
import { createZodResolver } from '@/lib/createZodResolver'
import { formatINR } from '@/utils/currency'
import { formatDateTime } from '@/utils/date'
import {
  getCurrentUser,
  getMyServiceRequests,
  getUserOrders,
  type PaginatedOrders,
  type PaginatedServiceRequests,
  type ServiceRequestSummary,
  requestBusiness,
} from '@/api/profile'
import type { Order } from '@/store/orders'
import type { AppDispatch, RootState } from '@/store'
import { logoutUser, setUser } from '@/store/slices/authSlice'
import { paths } from '@/routes/paths'
import type { User } from '@/types/user'
import type { Address } from '@/api/addresses'
import showToast from '@/components/ui/Toast'

type TabKey = 'account' | 'orders' | 'requests' | 'notifications'

type RequestState = 'idle' | 'loading' | 'succeeded' | 'failed'

type ListMeta = { page: number; hasMore: boolean }

const businessRequestSchema = z.object({
  name: z.string().trim().min(2, 'Business name is required'),
  category: z.string().trim().min(2, 'Category is required'),
  location: z.string().trim().min(2, 'Location is required'),
  address: z.string().trim().min(5, 'Business address is required'),
  description: z
    .string()
    .trim()
    .max(500, 'Description is too long')
    .optional()
    .or(z.literal('')),
  image: z.string().trim().url('Image must be a valid URL').optional().or(z.literal('')),
})

type BusinessRequestFormValues = z.infer<typeof businessRequestSchema>

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'account', label: 'Account' },
  { key: 'orders', label: 'Orders' },
  { key: 'requests', label: 'Requests' },
  { key: 'notifications', label: 'Notifications' },
]

const cn = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ')

const ProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const authUser = useSelector((state: RootState) => state.auth.user)

  const [activeTab, setActiveTab] = useState<TabKey>('account')
  const [profile, setProfile] = useState<User | null>(authUser ?? null)
  const [profileStatus, setProfileStatus] = useState<RequestState>('idle')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [addressCount, setAddressCount] = useState<number>(0)
  const [businessRequestStatus, setBusinessRequestStatus] = useState<RequestState>('idle')
  const [isBusinessSheetOpen, setIsBusinessSheetOpen] = useState(false)
  const businessForm = useForm<BusinessRequestFormValues>({
    resolver: createZodResolver(businessRequestSchema),
    defaultValues: {
      name: '',
      category: '',
      location: profile?.location ?? '',
      address: profile?.address ?? '',
      description: '',
      image: '',
    },
  })

  const [orders, setOrders] = useState<Order[]>([])
  const [ordersStatus, setOrdersStatus] = useState<RequestState>('idle')
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [ordersMeta, setOrdersMeta] = useState<ListMeta>({ page: 1, hasMore: false })

  const [requests, setRequests] = useState<ServiceRequestSummary[]>([])
  const [requestsStatus, setRequestsStatus] = useState<RequestState>('idle')
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [requestsMeta, setRequestsMeta] = useState<ListMeta>({ page: 1, hasMore: false })

  const handleEditProfile = useCallback(() => {
    navigate(paths.settings())
  }, [navigate])

  const handleRequestBusiness = useCallback(() => {
    businessForm.reset({
      name: '',
      category: '',
      location: profile?.location ?? '',
      address: profile?.address ?? '',
      description: '',
      image: '',
    })
    setBusinessRequestStatus('idle')
    setIsBusinessSheetOpen(true)
  }, [businessForm, profile?.address, profile?.location])

  const closeBusinessSheet = useCallback(() => {
    setBusinessRequestStatus('idle')
    setIsBusinessSheetOpen(false)
  }, [])

  const handleLogout = useCallback(() => {
    void dispatch(logoutUser()).finally(() => {
      navigate(paths.auth.login(), { replace: true })
    })
  }, [dispatch, navigate])

  const loadProfile = useCallback(async () => {
    setProfileStatus('loading')
    setProfileError(null)
    try {
      const user = await getCurrentUser()
      setProfile(user)
      dispatch(setUser(user))
      setProfileStatus('succeeded')
    } catch (err) {
      setProfileStatus('failed')
      setProfileError(toErrorMessage(err))
    }
  }, [dispatch])

  const handleBusinessSubmit = businessForm.handleSubmit(async (values) => {
    setBusinessRequestStatus('loading')
    try {
      await requestBusiness({
        name: values.name.trim(),
        category: values.category.trim(),
        location: values.location.trim(),
        address: values.address.trim(),
        description: values.description?.trim() || undefined,
        image: values.image?.trim() || undefined,
      })
      await loadProfile()
      setBusinessRequestStatus('succeeded')
      showToast('Business verification request sent to admin', 'success')
      setIsBusinessSheetOpen(false)
    } catch (err) {
      setBusinessRequestStatus('failed')
      showToast(toErrorMessage(err), 'error')
    }
  })

  const loadOrders = useCallback(
    async (page = 1) => {
      setOrdersStatus('loading')
      setOrdersError(null)
      try {
        const response: PaginatedOrders = await getUserOrders({ page, pageSize: 5 })
        setOrders((current) => (page === 1 ? response.items : [...current, ...response.items]))
        setOrdersMeta({ page: response.page, hasMore: response.hasMore })
        setOrdersStatus('succeeded')
      } catch (err) {
        setOrdersStatus('failed')
        setOrdersError(toErrorMessage(err))
      }
    },
    [],
  )

  const loadRequests = useCallback(
    async (page = 1) => {
      setRequestsStatus('loading')
      setRequestsError(null)
      try {
        const response: PaginatedServiceRequests = await getMyServiceRequests({ page, pageSize: 5 })
        setRequests((current) => (page === 1 ? response.items : [...current, ...response.items]))
        setRequestsMeta({ page: response.page, hasMore: response.hasMore })
        setRequestsStatus('succeeded')
      } catch (err) {
        setRequestsStatus('failed')
        setRequestsError(toErrorMessage(err))
      }
    },
    [],
  )

  useEffect(() => {
    if (profileStatus === 'idle') {
      void loadProfile()
    }
  }, [profileStatus, loadProfile])

  useEffect(() => {
    businessForm.reset({
      name: '',
      category: '',
      location: profile?.location ?? '',
      address: profile?.address ?? '',
      description: '',
      image: '',
    })
  }, [businessForm, profile?.address, profile?.location])

  useEffect(() => {
    if (activeTab === 'orders' && ordersStatus === 'idle') {
      void loadOrders()
    }
  }, [activeTab, ordersStatus, loadOrders])

  useEffect(() => {
    if (activeTab === 'requests' && requestsStatus === 'idle') {
      void loadRequests()
    }
  }, [activeTab, requestsStatus, loadRequests])

  const primaryContact = useMemo(() => {
    if (!profile) return null
    return [profile.email, profile.phone, profile.location].filter(Boolean).join(' • ')
  }, [profile])

  const stats = useMemo(
    () => [
      { label: 'Orders', value: orders.length },
      { label: 'Requests', value: requests.length },
      { label: 'Saved addresses', value: addressCount },
    ],
    [orders.length, requests.length, addressCount],
  )

  const businessStatus = profile?.businessStatus ?? 'none'
  const businessStatusLabel = useMemo(() => {
    if (businessStatus === 'approved') return 'Approved business profile'
    if (businessStatus === 'pending') return 'Business verification pending'
    if (businessStatus === 'rejected') return 'Business request rejected'
    return 'Request business verification'
  }, [businessStatus])

  const businessStatusClass = useMemo(() => {
    if (businessStatus === 'approved') return 'bg-emerald-100 text-emerald-700'
    if (businessStatus === 'pending') return 'bg-amber-100 text-amber-700'
    if (businessStatus === 'rejected') return 'bg-rose-100 text-rose-700'
    return 'bg-slate-100 text-slate-700'
  }, [businessStatus])

  const renderAccountTab = () => {
    if (profileStatus === 'loading' && !profile) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      )
    }

    if (profileStatus === 'failed') {
      return (
        <ErrorCard
          message={profileError || 'We could not load your profile details.'}
          onRetry={() => void loadProfile()}
        />
      )
    }

    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Signed in as</p>
              <p className="text-2xl font-semibold text-slate-900">{profile?.name || 'Guest'}</p>
              <p className="text-sm text-slate-600">{primaryContact || 'No contact info on file'}</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2 text-sm">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </Button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-800">
                <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                {profile?.email || 'Not shared'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-800">
                <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                {profile?.phone || 'Not shared'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-800">
                <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                {profile?.location || 'Not specified'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
            <AddressManager onChange={(items: Address[]) => setAddressCount(items.length)} />
          </div>
      </div>
    )
  }

  const renderOrdersTab = () => {
    if (ordersStatus === 'loading' && orders.length === 0) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
        </div>
      )
    }

    if (ordersStatus === 'failed' && orders.length === 0) {
      return (
        <ErrorCard message={ordersError || 'Unable to load orders.'} onRetry={() => void loadOrders()} />
      )
    }

    if (orders.length === 0) {
      return (
        <EmptyState
          title="No orders yet"
          message="Browse neighbourhood shops and add items to your cart to place your first order."
          ctaLabel="Shop now"
          onCtaClick={() => navigate(paths.shops())}
        />
      )
    }

    return (
      <div className="space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Order</p>
                <p className="text-lg font-semibold text-slate-900">#{order.id.slice(-6)}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <dl className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Placed</dt>
                <dd className="text-sm text-slate-800">
                  {formatDateTime(order.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shop</dt>
                <dd className="text-sm text-slate-800">{order.shop?.name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</dt>
                <dd className="text-sm font-semibold text-slate-900">
                  {formatINR(order.totals?.grandPaise ?? 0)}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate(paths.orders.detail(order.id))}>
                View details
              </Button>
            </div>
          </article>
        ))}
        {ordersStatus === 'failed' && orders.length > 0 ? (
          <ErrorCard message={ordersError || 'Unable to refresh orders.'} onRetry={() => void loadOrders(ordersMeta.page)} />
        ) : null}
        {ordersMeta.hasMore ? (
          <div className="flex justify-center">
            <Button
              variant="secondary"
              onClick={() => void loadOrders(ordersMeta.page + 1)}
              disabled={ordersStatus === 'loading'}
            >
              {ordersStatus === 'loading' ? 'Loading…' : 'Load more orders'}
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  const renderRequestsTab = () => {
    if (requestsStatus === 'loading' && requests.length === 0) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
        </div>
      )
    }

    if (requestsStatus === 'failed' && requests.length === 0) {
      return (
        <ErrorCard message={requestsError || 'Unable to load requests.'} onRetry={() => void loadRequests()} />
      )
    }

    if (requests.length === 0) {
      return (
        <EmptyState
          title="No service requests"
          message="Submit a request to reach verified professionals in your area."
          ctaLabel="Request a service"
          onCtaClick={() => navigate(paths.serviceRequests.mine())}
        />
      )
    }

    return (
      <div className="space-y-4">
        {requests.map((request) => (
          <article key={request.id} className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Request</p>
                <p className="text-lg font-semibold text-slate-900">{request.title}</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700">
                {request.status}
              </span>
            </div>
            <dl className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</dt>
                <dd className="text-sm text-slate-800">
                  {formatDateTime(request.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</dt>
                <dd className="text-sm text-slate-800">{request.location || 'Not shared'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</dt>
                <dd className="text-sm text-slate-800">#{request.id.slice(-6)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate(paths.serviceRequests.detail(request.id))}>
                View details
              </Button>
            </div>
          </article>
        ))}
        {requestsStatus === 'failed' && requests.length > 0 ? (
          <ErrorCard
            message={requestsError || 'Unable to refresh requests.'}
            onRetry={() => void loadRequests(requestsMeta.page)}
          />
        ) : null}
        {requestsMeta.hasMore ? (
          <div className="flex justify-center">
            <Button
              variant="secondary"
              onClick={() => void loadRequests(requestsMeta.page + 1)}
              disabled={requestsStatus === 'loading'}
            >
              {requestsStatus === 'loading' ? 'Loading…' : 'Load more requests'}
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  const renderNotificationsTab = () => (
    <div className="space-y-4">
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <h3 className="text-lg font-semibold">Promotions & alerts</h3>
        <p className="mt-2 text-sm">
          High-priority announcements now arrive as notification cards with images and call-to-action buttons.
          Visit the notifications center to review promotions, mark items as read, or follow CTA links.
        </p>
      </div>
      <Button size="lg" onClick={() => navigate(paths.notifications())}>
        Go to notifications
      </Button>
    </div>
  )

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-sm text-slate-500">Manage your identity, saved locations, orders, and concierge activity.</p>
              <h1 className="text-3xl font-semibold text-slate-900">Profile overview</h1>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full px-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  onClick={handleEditProfile}
                >
                  <PencilLine className="h-4 w-4" aria-hidden="true" /> Edit profile
                </Button>
                <Button
                  size="sm"
                  className="rounded-full px-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  onClick={handleRequestBusiness}
                  disabled={businessStatus === 'pending' || businessStatus === 'approved'}
                >
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  {businessStatus === 'pending'
                    ? 'Request submitted'
                    : businessStatus === 'approved'
                    ? 'Business approved'
                    : 'Request business verification'}
                </Button>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${businessStatusClass}`}
                >
                  <span className="h-2 w-2 rounded-full bg-current opacity-70" aria-hidden="true" />
                  {businessStatusLabel}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 px-4 py-3 text-center">
                  <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/80 shadow-sm">
          <div className="flex flex-wrap border-b border-slate-100">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={cn(
                  'flex-1 rounded-t-2xl border-b-2 px-4 py-3 text-sm font-semibold uppercase tracking-wide transition',
                  activeTab === tab.key
                    ? 'border-[color:var(--brand-500)] bg-gradient-to-br from-[color:var(--brand-50)] to-white text-[color:var(--brand-700)] shadow-inner'
                    : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                )}
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={activeTab === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-4 md:p-6">
            {activeTab === 'account' && renderAccountTab()}
            {activeTab === 'orders' && renderOrdersTab()}
            {activeTab === 'requests' && renderRequestsTab()}
            {activeTab === 'notifications' && renderNotificationsTab()}
          </div>
        </section>
      </div>

      <ModalSheet open={isBusinessSheetOpen} onClose={closeBusinessSheet}>
        <div className="space-y-4 p-4 sm:p-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Business verification</p>
            <h2 className="text-xl font-semibold text-slate-900">Submit your shop details</h2>
            <p className="text-sm text-slate-600">
              Send your business information to the admin team. Once approved, your account will switch
              to a business profile with access to shop, product, and order management tools.
            </p>
          </div>

          <Form {...businessForm}>
            <form onSubmit={handleBusinessSubmit} className="space-y-4">
              <FormField
                control={businessForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business name</FormLabel>
                    <FormControl>
                      <Input placeholder="Skyline Mart" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={businessForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="Groceries, electronics, fashion" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={businessForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Mumbai, Maharashtra" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={businessForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Market Street, Andheri East" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={businessForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Tell us about your shop, specialties, and service areas."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={businessForm.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo or banner URL (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/logo.png" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeBusinessSheet}>
                  Cancel
                </Button>
                <Button type="submit" disabled={businessRequestStatus === 'loading'}>
                  {businessRequestStatus === 'loading' ? 'Sending request…' : 'Send request'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </ModalSheet>
    </>
  )
}

export default ProfileScreen
