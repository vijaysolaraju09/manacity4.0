import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { BookmarkCheck, CalendarDays, MapPin, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AppDispatch, RootState } from '@/store'
import { fetchShops, type Shop } from '@/store/shops'
import { fetchServices } from '@/store/services'
import { createEventsQueryKey, fetchEvents } from '@/store/events.slice'
import HeroCarousel, { type HeroCarouselItem } from '@/app/components/HeroCarousel'
import { Badge, Button, Card, IconButton } from '@/app/components/primitives'
import { formatDateTime } from '@/utils/date'
import { paths } from '@/routes/paths'
import { http } from '@/lib/http'

type Announcement = {
  _id: string
  title: string
  text: string
  image?: string | null
  ctaText?: string | null
  ctaLink?: string | null
  active?: boolean
  highPriority?: boolean
}

const toShopStatus = (shop: Shop): { tone: 'success' | 'neutral' | 'accent'; label: string } => {
  if (shop.isOpen === false) return { tone: 'neutral', label: 'Closed' }
  if (shop.status === 'approved') return { tone: 'success', label: 'Open now' }
  if (shop.status === 'pending') return { tone: 'accent', label: 'Pending approval' }
  return { tone: 'neutral', label: 'Unavailable' }
}

const HomeScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementStatus, setAnnouncementStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const shopsState = useSelector((state: RootState) => state.shops)
  const servicesState = useSelector((state: RootState) => state.services)
  const eventsList = useSelector((state: RootState) => state.events.list)

  const loadAnnouncements = useCallback(async () => {
    setAnnouncementStatus('loading')
    try {
      const response = await http.get('/api/announcements')
      const items = (response?.data?.items ?? response?.data?.data ?? []) as Announcement[]
      setAnnouncements(Array.isArray(items) ? items.filter((item) => item.active !== false) : [])
      setAnnouncementStatus('succeeded')
    } catch (err) {
      console.error(err)
      setAnnouncements([])
      setAnnouncementStatus('failed')
    }
  }, [])

  useEffect(() => {
    if (announcementStatus === 'idle') {
      void loadAnnouncements()
    }

    if (shopsState.status === 'idle') {
      void dispatch(fetchShops({ pageSize: 12, sort: '-createdAt' }))
    }
  }, [announcementStatus, dispatch, loadAnnouncements, shopsState.status])

  useEffect(() => {
    if (servicesState.status === 'idle') {
      void dispatch(fetchServices(undefined))
    }
  }, [dispatch, servicesState.status])

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
    const items = announcements.slice(0, 4)
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

    return items.map((announcement) => ({
      id: announcement._id,
      highlight: announcement.highPriority ? 'Priority announcement' : 'Announcement',
      title: announcement.title,
      description: announcement.text,
      primaryAction: announcement.ctaLink
        ? {
            label: announcement.ctaText || 'View details',
            to: announcement.ctaLink.startsWith('/') ? announcement.ctaLink : undefined,
            onClick: announcement.ctaLink.startsWith('http')
              ? () => window.open(announcement.ctaLink ?? '#', '_blank', 'noopener')
              : undefined,
          }
        : undefined,
      secondaryAction: { label: 'Explore services', to: paths.services.catalog() },
    }))
  }, [announcements])

  const sortedShops = useMemo(() => {
    const items = shopsState.items ?? []
    return [...items].sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0))
  }, [shopsState.items])

  const trendingShops = useMemo(() => sortedShops.slice(0, 6), [sortedShops])
  const featuredShops = useMemo(() => trendingShops.slice(0, 3), [trendingShops])
  const featuredServices = useMemo(() => servicesState.items.slice(0, 3), [servicesState.items])
  const featuredEvents = useMemo(() => (eventsList.items ?? []).slice(0, 3), [eventsList.items])

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-6">
        <HeroCarousel items={heroItems} />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-primary">Featured shops</h2>
            <p className="text-sm text-muted">Neighbourhood favourites picked for you.</p>
          </div>
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0 sm:pr-0">
          {featuredShops.length === 0 ? (
            <div className="min-w-[85%] flex-shrink-0 snap-start sm:min-w-0 sm:snap-none">
              <Card className="rounded-3xl p-6">
                <p className="text-sm text-muted">No shops to display yet.</p>
              </Card>
            </div>
          ) : (
            featuredShops.map((shop) => {
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
        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => navigate(paths.shops())}>
            Explore more shops
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-primary">Events</h2>
            <p className="text-sm text-muted">Upcoming experiences curated by the admin team.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {featuredEvents.length === 0 ? (
            <Card className="rounded-3xl p-6">
              <p className="text-sm text-muted">No events available right now.</p>
            </Card>
          ) : (
            featuredEvents.map((event) => (
              <Card
                key={event._id}
                className="rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg-theme"
                role="button"
                tabIndex={0}
                onClick={() => navigate(paths.events.detail(event._id))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(paths.events.detail(event._id))
                  }
                }}
              >
                <div className="space-y-3">
                  <Badge tone="accent">{event.category || 'Event'}</Badge>
                  <h3 className="text-lg font-semibold text-primary">{event.title}</h3>
                  <p className="text-sm text-muted">{event.shortDescription || 'Join us for this featured experience.'}</p>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <CalendarDays className="h-4 w-4" />
                    <span>{formatDateTime(event.startAt, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <Button variant="outline" className="w-full">
                    View details
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => navigate(paths.events.list())}>
            Explore more events
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-primary">Services</h2>
            <p className="text-sm text-muted">Reliable help from trusted providers.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {featuredServices.length === 0 ? (
            <Card className="rounded-3xl p-6">
              <p className="text-sm text-muted">Services will appear once added by administrators.</p>
            </Card>
          ) : (
            featuredServices.map((service) => (
              <Card
                key={service._id}
                className="rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg-theme"
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
                  <IconButton
                    icon={BookmarkCheck}
                    label={`Save ${service.name}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      navigate(paths.services.request())
                    }}
                  />
                </div>
                {service.serviceArea ? (
                  <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{service.serviceArea}</span>
                  </div>
                ) : null}
              </Card>
            ))
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => navigate(paths.services.catalog())}>
            Explore more services
          </Button>
        </div>
      </section>
    </div>
  )
}

export default HomeScreen
