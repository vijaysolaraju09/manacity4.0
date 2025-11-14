import { useCallback, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CalendarDays, Gift, Heart, MapPin, Ticket, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AppDispatch, RootState } from '@/store'
import { createEventsQueryKey, fetchEvents, fetchLeaderboard } from '@/store/events.slice'
import { Badge, Button, Card } from '@/app/components/primitives'
import { formatDateTime } from '@/utils/date'
import useCountdown from '@/app/hooks/useCountdown'
import { paths } from '@/routes/paths'

const EventsScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const eventsList = useSelector((state: RootState) => state.events.list)
  const leaderboard = useSelector((state: RootState) => state.events.leaderboard)

  const params = useMemo(() => ({ pageSize: 8, status: 'published' }), [])
  const queryKey = useMemo(() => createEventsQueryKey(params), [params])

  useEffect(() => {
    if (eventsList.loading) return
    const hasItems = (eventsList.items?.length ?? 0) > 0
    if (eventsList.queryKey !== queryKey || !hasItems) {
      void dispatch(fetchEvents(params))
    }
  }, [dispatch, eventsList.loading, eventsList.items?.length, eventsList.queryKey, params, queryKey])

  const highlight = eventsList.items?.[0] ?? null

  useEffect(() => {
    if (!highlight?._id) return
    void dispatch(fetchLeaderboard(highlight._id))
  }, [dispatch, highlight?._id])

  const handleViewCalendar = useCallback(() => {
    navigate(paths.events.list())
  }, [navigate])

  const handleEventClick = useCallback(
    (eventId: string) => {
      navigate(paths.events.detail(eventId))
    },
    [navigate],
  )

  const countdown = useCountdown(highlight?.startAt ?? null)
  const otherEvents = useMemo(() => (eventsList.items ?? []).slice(1, 5), [eventsList.items])

  return (
    <div className="flex flex-col gap-6">
      <Card className="gradient-card overflow-hidden rounded-[2rem] p-6 text-white shadow-lg-theme md:p-8">
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Badge tone="accent">Upcoming highlight</Badge>
            <h1 className="text-3xl font-semibold">{highlight?.title ?? 'Events are being curated'}</h1>
            <p className="text-sm text-white/80">
              {highlight?.shortDescription ||
                highlight?.category ||
                'Stay tuned for upcoming experiences curated by the Manacity concierge team.'}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-white/85">
              {highlight ? (
                <>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {formatDateTime(highlight.startAt, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  {highlight.venue ? (
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {highlight.venue}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  New events will be announced soon
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                className="bg-white text-[var(--primary)] shadow-lg-theme"
                onClick={handleViewCalendar}
              >
                View calendar
              </Button>
              <Button
                variant="ghost"
                className="text-white hover:bg-white/15"
                onClick={() => highlight?._id && navigate(paths.events.register(highlight._id))}
                disabled={!highlight?._id}
              >
                Register now
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
              Concierge will share updates and logistics once registrations open.
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
            {leaderboard.loading ? (
              <p className="px-4 py-6 text-sm text-muted">Loading leaderboard...</p>
            ) : (leaderboard.items?.length ?? 0) === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">Leaderboard data will appear once available.</p>
            ) : (
              <table className="w-full min-w-[480px] table-fixed border-separate border-spacing-y-3 text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Participant</th>
                    <th className="px-4 py-2 font-medium">Score</th>
                    <th className="px-4 py-2 font-medium">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.items?.map((entry) => (
                    <tr
                      key={entry._id ?? `${entry.participantId}-${entry.teamName}`}
                      className="rounded-2xl border border-default bg-surface-1/70 text-primary shadow-sm-theme"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]">
                            <Trophy className="h-5 w-5" />
                          </div>
                          <span>{entry.teamName || entry.user || 'Participant'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{entry.score ?? entry.points ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">{entry.rank ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
        <Card className="rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-primary">Upcoming experiences</h2>
          <div className="mt-4 space-y-4 text-sm">
            {otherEvents.length === 0 ? (
              <p className="text-sm text-muted">Additional events will be listed once published.</p>
            ) : (
              otherEvents.map((event) => (
                <div
                  key={event._id}
                  className="rounded-2xl border border-default p-4 transition hover:-translate-y-0.5 hover:shadow-lg-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleEventClick(event._id)}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                      keyboardEvent.preventDefault()
                      handleEventClick(event._id)
                    }
                  }}
                >
                  <p className="text-sm font-semibold text-primary">{event.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateTime(event.startAt, { dateStyle: 'medium', timeStyle: 'short' })}
                    {event.venue ? ` · ${event.venue}` : ''}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted">
                    <Ticket className="h-3.5 w-3.5" /> {event.highlightLabel || 'Limited seats'}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <Card className="rounded-3xl p-6">
        <h2 className="text-xl font-semibold text-primary">Concierge notes</h2>
        <div className="mt-4 space-y-3 text-sm text-muted">
          <p className="inline-flex items-center gap-2">
            <Gift className="h-4 w-4" /> Members receive curated perks for attending featured events.
          </p>
          <p className="inline-flex items-center gap-2">
            <Heart className="h-4 w-4" /> Early RSVPs unlock additional hospitality benefits.
          </p>
        </div>
      </Card>
    </div>
  )
}

export default EventsScreen
