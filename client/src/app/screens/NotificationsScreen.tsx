import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CalendarDays, CheckCircle2, Gift, Inbox, PackageCheck, Trash2 } from 'lucide-react'
import type { AppDispatch, RootState } from '@/store'
import { fetchNotifs, markNotifRead, removeNotif, type Notif } from '@/store/notifs'
import { Badge, Button, Card, Chip, IconButton } from '@/app/components/primitives'
import { formatDateTime } from '@/utils/date'
import showToast from '@/components/ui/Toast'
import { toErrorMessage } from '@/lib/response'
import { http } from '@/lib/http'

const FILTERS: Array<{ key: 'all' | Notif['type']; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'order', label: 'Orders' },
  { key: 'event', label: 'Events' },
  { key: 'promotion', label: 'Promotions' },
]

const iconForType = (type: string | undefined) => {
  switch (type) {
    case 'order':
      return PackageCheck
    case 'event':
      return CalendarDays
    case 'promotion':
      return Gift
    default:
      return Inbox
  }
}

const toneForType = (type: string | undefined): 'success' | 'accent' | 'neutral' => {
  switch (type) {
    case 'order':
      return 'success'
    case 'event':
      return 'accent'
    default:
      return 'neutral'
  }
}

const NotificationsScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const notifsState = useSelector((state: RootState) => state.notifs)
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]['key']>('all')

  useEffect(() => {
    if (notifsState.status === 'idle') {
      void dispatch(fetchNotifs({ page: 1, limit: 20 }))
    }
  }, [dispatch, notifsState.status])

  const sortedItems = useMemo(() => {
    const items = notifsState.items ?? []
    return [...items].sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''))
  }, [notifsState.items])

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return sortedItems
    return sortedItems.filter((notif) => notif.type === activeFilter)
  }, [activeFilter, sortedItems])

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Notif[]>()
    filteredItems.forEach((notif) => {
      const dateKey = formatDateTime(notif.createdAt, { dateStyle: 'long' })
      const current = groups.get(dateKey) ?? []
      current.push(notif)
      groups.set(dateKey, current)
    })
    return Array.from(groups.entries())
  }, [filteredItems])

  const unreadCount = useMemo(() => filteredItems.filter((notif) => !notif.read).length, [filteredItems])

  const handleReload = useCallback(() => {
    void dispatch(fetchNotifs({ page: 1, limit: 20 }))
  }, [dispatch])

  const handleMarkAllRead = useCallback(async () => {
    const unread = filteredItems.filter((notif) => !notif.read)
    if (unread.length === 0) return
    const responses = await Promise.allSettled(unread.map((notif) => dispatch(markNotifRead(notif._id)).unwrap()))
    const failed = responses.some((result) => result.status === 'rejected')
    showToast(
      failed ? 'Some notifications could not be marked as read. Please try again.' : 'All notifications marked as read.',
      failed ? 'error' : 'success',
    )
  }, [dispatch, filteredItems])

  const handleClearAll = useCallback(async () => {
    try {
      await http.delete('api/notifications')
      showToast('All notifications cleared', 'success')
      void dispatch(fetchNotifs({ page: 1, limit: 20 }))
    } catch (err) {
      showToast(toErrorMessage(err) || 'Unable to clear notifications', 'error')
    }
  }, [dispatch])

  const handleLoadMore = useCallback(() => {
    if (!notifsState.hasMore || notifsState.status === 'loading') return
    void dispatch(fetchNotifs({ page: notifsState.page + 1, limit: 20 }))
  }, [dispatch, notifsState.hasMore, notifsState.page, notifsState.status])

  const handleMarkRead = useCallback(
    async (id: string) => {
      try {
        await dispatch(markNotifRead(id)).unwrap()
      } catch (err) {
        showToast(toErrorMessage(err) || 'Unable to mark notification as read', 'error')
      }
    },
    [dispatch],
  )

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await dispatch(removeNotif(id)).unwrap()
        showToast('Notification removed', 'success')
      } catch (err) {
        showToast(toErrorMessage(err) || 'Unable to remove notification', 'error')
      }
    },
    [dispatch],
  )

  const loading = notifsState.status === 'loading' && notifsState.items.length === 0
  const hasError = notifsState.status === 'failed'
  const hasNotifications = filteredItems.length > 0

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-[2rem] p-6">
        <div className="flex flex-col gap-3">
          <Badge tone="accent">Inbox</Badge>
          <h1 className="text-2xl font-semibold text-primary">Notifications center</h1>
          <p className="text-sm text-muted">Stay updated with orders, events, and concierge announcements.</p>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Notification filters">
            {FILTERS.map((filter) => (
              <Chip
                key={filter.key}
                active={activeFilter === filter.key}
                onClick={() => setActiveFilter(filter.key)}
                role="tab"
                aria-selected={activeFilter === filter.key}
              >
                {filter.label}
              </Chip>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 ? (
              <Button variant="outline" onClick={handleMarkAllRead}>
                Mark all as read ({unreadCount})
              </Button>
            ) : null}
            {notifsState.items.length > 0 ? (
              <Button variant="outline" onClick={handleClearAll}>
                Clear all
              </Button>
            ) : null}
            <Button variant="ghost" onClick={handleReload}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="rounded-3xl p-6 text-sm text-muted">
          <p>Loading notifications…</p>
        </Card>
      ) : hasError && !hasNotifications ? (
        <Card className="rounded-3xl p-6 text-sm text-muted">
          <p className="font-medium text-primary">We couldn't load your notifications.</p>
          <Button variant="primary" className="mt-4" onClick={handleReload}>
            Try again
          </Button>
        </Card>
      ) : !hasNotifications ? (
        <Card className="rounded-3xl p-6 text-sm text-muted">
          <p>You have no notifications yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([date, notifications]) => (
            <section key={date} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">{date}</h2>
              {notifications.map((notification) => {
                const Icon = iconForType(notification.type)
                const tone = toneForType(notification.type)
                return (
                  <Card key={notification._id} className="rounded-3xl border border-default/80 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm-theme ${
                            tone === 'success'
                              ? 'bg-[var(--primary)]'
                              : tone === 'accent'
                              ? 'bg-[var(--accent)]'
                              : 'bg-[color-mix(in_srgb,var(--text-muted)_45%,transparent)]'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-primary">{notification.message}</h3>
                            {!notification.read ? <Badge tone="accent">New</Badge> : null}
                          </div>
                          <p className="text-xs text-muted">
                            {formatDateTime(notification.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.read ? (
                          <IconButton
                            icon={CheckCircle2}
                            label="Mark notification as read"
                            onClick={() => void handleMarkRead(notification._id)}
                          />
                        ) : null}
                        <IconButton
                          icon={Trash2}
                          label="Remove notification"
                          onClick={() => void handleRemove(notification._id)}
                        />
                      </div>
                    </div>
                  </Card>
                )
              })}
            </section>
          ))}
          {notifsState.hasMore ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={notifsState.status === 'loading'}>
                {notifsState.status === 'loading' ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default NotificationsScreen
