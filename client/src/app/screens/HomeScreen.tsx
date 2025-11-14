import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { BookmarkCheck, MapPin, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AppDispatch, RootState } from '@/store'
import { fetchShops, type Shop } from '@/store/shops'
import { fetchServices } from '@/store/services'
import { createEventsQueryKey, fetchEvents } from '@/store/events.slice'
import { fetchSpecialProducts } from '@/store/products'
import HeroCarousel, { type HeroCarouselItem } from '@/app/components/HeroCarousel'
import { Badge, Button, Card, IconButton } from '@/app/components/primitives'
import type { Product } from '@/store/products'
import { formatDateTime } from '@/utils/date'
import { useCountdown } from '@/app/hooks/useCountdown'
import { paths } from '@/routes/paths'

const toShopStatus = (shop: Shop): { tone: 'success' | 'neutral' | 'accent'; label: string } => {
  if (shop.isOpen === false) return { tone: 'neutral', label: 'Closed' }
  if (shop.status === 'approved') return { tone: 'success', label: 'Open now' }
  if (shop.status === 'pending') return { tone: 'accent', label: 'Pending approval' }
  return { tone: 'neutral', label: 'Unavailable' }
}

const toINR = (paise: number | undefined) => {
  if (!paise || !Number.isFinite(paise)) return '—'
  const value = paise / 100
  return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
}

const HomeScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const shopsState = useSelector((state: RootState) => state.shops)
  const servicesState = useSelector((state: RootState) => state.services)
  const eventsList = useSelector((state: RootState) => state.events.list)
  const catalog = useSelector((state: RootState) => state.catalog)

  useEffect(() => {
    if (shopsState.status === 'idle') {
      void dispatch(fetchShops({ pageSize: 12, sort: '-createdAt' }))
    }
  }, [dispatch, shopsState.status])

  useEffect(() => {
    if (servicesState.status === 'idle') {
      void dispatch(fetchServices(undefined))
    }
  }, [dispatch, servicesState.status])

  useEffect(() => {
    if (catalog.status === 'idle') {
      void dispatch(fetchSpecialProducts({ pageSize: 8 }))
    }
  }, [dispatch, catalog.status])

  const eventsParams = useMemo(() => ({ pageSize: 5, status: 'published' }), [])
  const eventsKey = useMemo(() => createEventsQueryKey(eventsParams), [eventsParams])

  useEffect(() => {
    const itemsCount = eventsList.items?.length ?? 0
    if (eventsList.loading) return
    if (eventsList.queryKey !== eventsKey || itemsCount === 0) {
      void dispatch(fetchEvents(eventsParams))
    }
  }, [dispatch, eventsParams, eventsKey, eventsList.items?.length, eventsList.loading, eventsList.queryKey])

  const heroItems: HeroCarouselItem[] = useMemo(() => {
    const items = eventsList.items ?? []
    if (items.length === 0) {
      return [
        {
          id: 'discover-city',
          title: 'Discover verified shops and services',
          description: 'Browse curated merchants, concierge-grade services, and exclusive experiences around you.',
          primaryAction: { label: 'Start exploring', to: paths.shops() },
          secondaryAction: { label: 'View services', to: paths.services.catalog() },
        },
      ]
    }
      return items.slice(0, 4).map((event) => ({
        id: event._id,
        highlight: event.highlightLabel ?? event.category,
        title: event.title,
        description:
          event.shortDescription ||
          `Starts ${formatDateTime(event.startAt, { dateStyle: 'medium', timeStyle: 'short' })}`,
        primaryAction: { label: 'View details', to: paths.events.detail(event._id) },
        secondaryAction: { label: 'Register now', to: paths.events.register(event._id) },
      }))
  }, [eventsList.items])

  const sortedShops = useMemo(() => {
    const items = shopsState.items ?? []
    return [...items].sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0))
  }, [shopsState.items])

  const curatedShops = useMemo(() => sortedShops.slice(0, 3), [sortedShops])
  const trendingShops = useMemo(() => sortedShops.slice(0, 6), [sortedShops])
  const featuredService = servicesState.items[0]
  const serviceStats = useMemo(
    () => [
      { label: 'Curated shops', value: shopsState.items?.length ?? 0 },
      { label: 'Active services', value: servicesState.items.length },
      { label: 'Upcoming events', value: eventsList.items?.length ?? 0 },
    ],
    [shopsState.items?.length, servicesState.items.length, eventsList.items?.length],
  )

  const serviceCategories = useMemo(() => {
    const set = new Set<string>()
    servicesState.items.forEach((service) => {
      if (service.description) {
        service.description
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
          .forEach((value) => set.add(value))
      }
    })
    return Array.from(set).slice(0, 6)
  }, [servicesState.items])

  const [nextEvent] = eventsList.items ?? []
  const countdown = useCountdown(nextEvent?.startAt ?? null)

  const curatedProducts = useMemo(() => (catalog.items ?? []).slice(0, 4), [catalog.items])

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-6">
        <HeroCarousel items={heroItems} />
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[2rem] p-6">
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-primary">Concierge curated shops</h2>
                <p className="text-sm text-muted">Verified partners recommended by our concierge team this week.</p>
              </div>
              <div className="space-y-4">
                {curatedShops.length === 0 ? (
                  <p className="text-sm text-muted">No shops available yet. Check back soon.</p>
                ) : (
                  curatedShops.map((shop) => {
                    const status = toShopStatus(shop)
                    return (
                      <div key={shop._id} className="flex items-start justify-between gap-3 rounded-2xl border border-default px-4 py-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-primary">{shop.name}</p>
                          <p className="text-xs text-muted">{shop.category || 'Independent merchant'}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted">
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-[var(--accent)]" />
                              {(shop.ratingAvg ?? 0).toFixed(1)}
                              {shop.ratingCount ? ` • ${shop.ratingCount} reviews` : null}
                            </span>
                            {shop.location ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {shop.location}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={status.tone}>{status.label}</Badge>
                          <IconButton icon={BookmarkCheck} label={`Save ${shop.name}`} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </Card>
          <Card className="gradient-card rounded-[2rem] p-6 text-white shadow-lg-theme">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="space-y-3">
                <Badge tone="accent">Concierge services</Badge>
                <h2 className="text-2xl font-semibold tracking-tight">{featuredService?.name ?? 'Concierge on demand'}</h2>
                <p className="text-sm text-white/85">
                  {featuredService?.description ||
                    'Request trusted providers, track offers, and secure premium support for your lifestyle needs.'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                {serviceStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/25 bg-white/10 p-3">
                    <p className="text-lg font-semibold">{stat.value}</p>
                    <p className="text-xs text-white/80">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="bg-white text-[var(--primary)] shadow-lg-theme"
                  onClick={() => navigate(paths.services.request())}
                >
                  Submit a request
                </Button>
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/15"
                  onClick={() => navigate(paths.services.catalog())}
                >
                  Explore services
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-primary">Trending shops</h2>
            <p className="text-sm text-muted">Top-rated merchants from our latest approvals.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate(paths.shops())}>
            See marketplace
          </Button>
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 sm:pr-0 lg:grid-cols-3">
          {trendingShops.length === 0 ? (
            <div className="min-w-[85%] flex-shrink-0 snap-start sm:min-w-0 sm:snap-none">
              <Card className="rounded-3xl p-6">
                <p className="text-sm text-muted">No shops to display yet.</p>
              </Card>
            </div>
          ) : (
            trendingShops.map((shop) => {
              const status = toShopStatus(shop)
              return (
                <div
                  key={shop._id}
                  className="min-w-[85%] flex-shrink-0 snap-start sm:min-w-0 sm:snap-none"
                >
                  <Card
                    className="rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(paths.shop(shop._id))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(paths.shop(shop._id))
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-primary">{shop.name}</h3>
                        <p className="mt-1 text-sm text-muted">{shop.category || 'Independent merchant'}</p>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-[var(--accent)]" />
                        {(shop.ratingAvg ?? 0).toFixed(1)}
                      </span>
                      {shop.ratingCount ? <span>{shop.ratingCount} reviews</span> : null}
                      {shop.location ? <span>{shop.location}</span> : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge tone="neutral">{shop.status}</Badge>
                      {shop.address ? <Badge tone="neutral">{shop.address.split(',')[0]}</Badge> : null}
                    </div>
                    <Button
                      variant="outline"
                      className="mt-5 w-full"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(paths.shop(shop._id))
                      }}
                    >
                      View details
                    </Button>
                  </Card>
                </div>
              )
            })
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-primary">Featured services</h2>
            <p className="text-sm text-muted">Book trusted providers with transparent timelines.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate(paths.services.catalog())}>
            View service catalog
          </Button>
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-4 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 md:pr-0">
          {servicesState.items.length === 0 ? (
            <div className="min-w-[85%] flex-shrink-0 snap-start md:min-w-0 md:snap-none">
              <Card className="rounded-3xl p-6">
                <p className="text-sm text-muted">Services will appear once added by administrators.</p>
              </Card>
            </div>
          ) : (
            servicesState.items.slice(0, 6).map((service) => (
              <div
                key={service._id}
                className="min-w-[85%] flex-shrink-0 snap-start md:min-w-0 md:snap-none"
              >
                <Card
                  className="rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(paths.services.detail(service._id))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(paths.services.detail(service._id))
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-primary">{service.name}</h3>
                        <Badge tone={service.isActive === false ? 'neutral' : 'accent'}>
                          {service.isActive === false ? 'Inactive' : 'Active'}
                        </Badge>
                      </div>
                      {service.description ? (
                        <p className="mt-1 text-sm text-muted">{service.description}</p>
                      ) : (
                        <p className="mt-1 text-sm text-muted">Managed by our concierge team.</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      className="text-sm text-primary"
                      onClick={(event) => {
                        event.stopPropagation()
                        const params = new URLSearchParams()
                        if (service._id) params.set('serviceId', service._id)
                        if (service.name) params.set('name', service.name)
                        const target = params.toString()
                          ? `${paths.services.request()}?${params.toString()}`
                          : paths.services.request()
                        navigate(target)
                      }}
                    >
                      Request
                    </Button>
                  </div>
                  {serviceCategories.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {serviceCategories.slice(0, 3).map((category) => (
                        <Badge key={`${service._id}-${category}`} tone="neutral">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {service.serviceArea || service.startingPricePaise ? (
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
                      {service.serviceArea ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {service.serviceArea}
                        </span>
                      ) : null}
                      {service.startingPricePaise ? (
                        <span className="inline-flex items-center gap-1">
                          Starting {toINR(service.startingPricePaise)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
        <Card className="rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-primary">Next experience countdown</h2>
            <Badge tone="accent">Upcoming</Badge>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3 text-center text-sm">
            {Object.entries(countdown).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-default bg-surface-1 px-3 py-4">
                <p className="text-xl font-semibold text-primary">{value.toString().padStart(2, '0')}</p>
                <p className="mt-1 text-xs capitalize text-muted">{key}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-muted">
            Stay tuned for confirmations from the concierge team. Registrations and waitlists update in real time.
          </p>
        </Card>
        <Card className="rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-primary">Curated specials</h2>
          <div className="mt-4 space-y-3 text-sm">
            {curatedProducts.length === 0 ? (
              <p className="text-sm text-muted">No special products published yet.</p>
            ) : (
              curatedProducts.map((product: Product) => (
                <div
                  key={product._id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-default px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-primary">{product.name}</p>
                    <p className="mt-1 text-xs text-muted">{product.description ?? product.category ?? 'Limited release'}</p>
                  </div>
                  <div className="text-right text-xs text-primary">
                    <p className="font-semibold">{toINR(product.pricePaise)}</p>
                    {product.ctaLabel ? <p className="mt-1 text-muted">{product.ctaLabel}</p> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  )
}

export default HomeScreen
