import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CalendarDays, CheckCircle2, Gift, Inbox, PackageCheck } from 'lucide-react'
import type { AppDispatch, RootState } from '@/store'
import { fetchNotifs, markNotifRead } from '@/store/notifs'
import { Badge, Card, IconButton } from '@/app/components/primitives'
import { formatDateTime } from '@/utils/date'

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

  useEffect(() => {
    if (notifsState.status === 'idle') {
      void dispatch(fetchNotifs({ page: 1, limit: 20 }))
    }
  }, [dispatch, notifsState.status])

  const handleMarkRead = (id: string) => {
    void dispatch(markNotifRead(id))
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-[2rem] p-6">
        <div className="flex flex-col gap-3">
          <Badge tone="accent">Inbox</Badge>
          <h1 className="text-2xl font-semibold text-primary">Notifications center</h1>
          <p className="text-sm text-muted">Stay updated with orders, events, and concierge announcements.</p>
        </div>
      </Card>

      <div className="space-y-4">
        {notifsState.status === 'loading' ? (
          <Card className="rounded-3xl p-5">
            <p className="text-sm text-muted">Loading notifications...</p>
          </Card>
        ) : notifsState.items.length === 0 ? (
          <Card className="rounded-3xl p-5">
            <p className="text-sm text-muted">You have no notifications yet.</p>
          </Card>
        ) : (
          notifsState.items.map((notification) => {
            const Icon = iconForType(notification.type)
            const tone = toneForType(notification.type)
            return (
              <Card key={notification._id} className="rounded-3xl border border-default/80 p-5">
                <div className="flex items-start justify-between gap-4">
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
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-primary">{notification.message}</h3>
                        {!notification.read ? <Badge tone="accent">New</Badge> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {formatDateTime(notification.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                  {!notification.read ? (
                    <IconButton
                      icon={CheckCircle2}
                      label="Mark notification"
                      onClick={() => handleMarkRead(notification._id)}
                    />
                  ) : null}
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

export default NotificationsScreen
