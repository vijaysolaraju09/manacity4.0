import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CalendarDays, MapPin, Ticket } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AppDispatch, RootState } from '@/store'
import { createEventsQueryKey, fetchEvents } from '@/store/events.slice'
import { Badge, Button, Card, Chip } from '@/components/primitives'
import type { EventSummary } from '@/types/events'
import { formatDateTime } from '@/utils/date'
import { paths } from '@/routes/paths'

const EventsScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const eventsList = useSelector((state: RootState) => state.events.list)
  const [filter, setFilter] = useState<'all' | 'events' | 'tournaments' | 'registrations'>('all')

  const params = useMemo(() => ({ pageSize: 8, status: 'published' }), [])
  const queryKey = useMemo(() => createEventsQueryKey(params), [params])

  useEffect(() => {
    if (eventsList.loading) return
    const hasItems = (eventsList.items?.length ?? 0) > 0
    if (eventsList.queryKey !== queryKey || !hasItems) {
      void dispatch(fetchEvents(params))
    }
  }, [dispatch, eventsList.loading, eventsList.items?.length, eventsList.queryKey, params, queryKey])

  const isRegistered = useCallback((event: EventSummary) => {
    const status = event?.myRegistrationStatus ?? event?.registrationStatus ?? event?.registration?.status
    if (!status) return false
    return status !== 'withdrawn' && status !== 'canceled'
  }, [])

  const filteredEvents = useMemo(() => {
    const items = (eventsList.items ?? []) as EventSummary[]

    if (filter === 'events') {
      return items.filter((event) => event.type !== 'tournament')
    }
    if (filter === 'tournaments') {
      return items.filter((event) => event.type === 'tournament')
    }
    if (filter === 'registrations') {
      return items.filter((event) => isRegistered(event))
    }

    return items
  }, [eventsList.items, filter, isRegistered])

  const handleViewEvent = useCallback(
    (eventId: string) => {
      navigate(paths.events.detail(eventId))
    },
    [navigate],
  )

  const handleRegister = useCallback(
    (eventId: string) => {
      navigate(paths.events.register(eventId))
    },
    [navigate],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Events</h1>
        </div>
        <div className="flex w-full flex-nowrap gap-3 overflow-x-auto md:w-auto md:flex-wrap md:justify-end">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </Chip>
          <Chip active={filter === 'events'} onClick={() => setFilter('events')}>
            Events
          </Chip>
          <Chip active={filter === 'tournaments'} onClick={() => setFilter('tournaments')}>
            Tournaments
          </Chip>
          <Chip active={filter === 'registrations'} onClick={() => setFilter('registrations')}>
            My registrations
          </Chip>
        </div>
      </div>

      {eventsList.loading ? (
        <Card className="rounded-3xl p-6">
          <p className="text-sm text-muted">Loading…</p>
        </Card>
      ) : eventsList.error ? (
        <Card className="rounded-3xl p-6">
          <p className="text-sm text-danger">{eventsList.error}</p>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card className="rounded-3xl p-6">
          <p className="text-sm text-muted">No events are available right now.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredEvents.map((event) => (
            <Card
              key={event._id}
              className="rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary">{event.title}</p>
                  {event.shortDescription ? (
                    <p className="mt-2 text-sm text-default">{event.shortDescription}</p>
                  ) : null}
                </div>
                {isRegistered(event) ? (
                  <Badge tone="success">Registered</Badge>
                ) : event.highlightLabel ? (
                  <Badge tone="accent">{event.highlightLabel}</Badge>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {formatDateTime(event.startAt, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                {event.venue ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {event.venue}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  {event.type === 'tournament' ? 'Tournament' : 'Event'}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => handleViewEvent(event._id)}>
                  View details
                </Button>
                <Button variant="ghost" onClick={() => handleRegister(event._id)}>
                  Register
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default EventsScreen
