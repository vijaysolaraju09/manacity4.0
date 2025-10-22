import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import {
  fetchEvents as fetchAdminEvents,
  publishEvent as publishEventAdmin,
  startEvent as startEventAdmin,
  completeEvent as completeEventAdmin,
  cancelEvent as cancelEventAdmin,
} from '@/api/admin';
import { toErrorMessage } from '@/lib/response';
import { formatDateTime } from '@/utils/date';
import { formatINR } from '@/utils/currency';
import useDebounce from '@/hooks/useDebounce';
import showToast from '@/components/ui/Toast';
import { paths } from '@/routes/paths';
import styles from './AdminEvents.module.scss';

type AdminEventRow = {
  _id: string;
  title: string;
  status: string;
  startAt: string;
  registrationOpenAt?: string;
  registrationCloseAt?: string;
  registeredCount: number;
  maxParticipants: number;
  entryFeePaise?: number;
  prizePool?: string;
  category?: string;
};

type LifecycleAction = 'publish' | 'start' | 'complete' | 'cancel';

const statusFilters: Array<'all' | 'draft' | 'published' | 'ongoing' | 'completed' | 'canceled'> = [
  'all',
  'draft',
  'published',
  'ongoing',
  'completed',
  'canceled',
];

const getLifecycleActions = (status?: string): LifecycleAction[] => {
  switch ((status ?? '').toLowerCase()) {
    case 'draft':
      return ['publish'];
    case 'published':
      return ['start', 'cancel'];
    case 'ongoing':
      return ['complete', 'cancel'];
    default:
      return [];
  }
};

const lifecycleLabels: Record<LifecycleAction, string> = {
  publish: 'Publish',
  start: 'Start',
  complete: 'Complete',
  cancel: 'Cancel',
};

const lifecycleSuccess: Record<LifecycleAction, string> = {
  publish: 'Event published',
  start: 'Event started',
  complete: 'Event completed',
  cancel: 'Event canceled',
};

const normalizeEvent = (raw: any): AdminEventRow => ({
  _id: String(raw?._id ?? raw?.id ?? ''),
  title: raw?.title ?? 'Untitled event',
  status: (raw?.status ?? raw?.lifecycleStatus ?? 'draft').toLowerCase(),
  startAt: raw?.startAt ?? raw?.start_at ?? new Date().toISOString(),
  registrationOpenAt: raw?.registrationOpenAt ?? raw?.registration_open_at ?? raw?.startAt,
  registrationCloseAt: raw?.registrationCloseAt ?? raw?.registration_close_at ?? raw?.startAt,
  registeredCount: Number(raw?.registeredCount ?? raw?.registered ?? 0),
  maxParticipants: Number(raw?.maxParticipants ?? raw?.capacity ?? 0),
  entryFeePaise: Number.isFinite(Number(raw?.entryFeePaise ?? raw?.entry_fee_paise))
    ? Number(raw?.entryFeePaise ?? raw?.entry_fee_paise)
    : undefined,
  prizePool: raw?.prizePool ?? raw?.rewards ?? undefined,
  category: raw?.category ?? 'other',
});

const AdminEventsListPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<(typeof statusFilters)[number]>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim(), 400);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [status, debouncedSearch]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchAdminEvents({
          status: status === 'all' ? undefined : status,
          query: debouncedSearch || undefined,
          page,
          pageSize,
          sort: '-startAt',
        });
        const normalized = (response.items ?? []).map(normalizeEvent);
        setItems(normalized);
        setTotal(response.total ?? normalized.length ?? 0);
      } catch (err) {
        setError(toErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [status, debouncedSearch, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const entryFeeLabel = (event: AdminEventRow) => {
    if (!event.entryFeePaise) return 'FREE';
    return formatINR(event.entryFeePaise);
  };

  const handleLifecycle = async (eventId: string, action: LifecycleAction) => {
    setBusyAction(`${eventId}-${action}`);
    try {
      const map: Record<LifecycleAction, (id: string) => Promise<any>> = {
        publish: publishEventAdmin,
        start: startEventAdmin,
        complete: completeEventAdmin,
        cancel: cancelEventAdmin,
      };
      await map[action](eventId);
      showToast(lifecycleSuccess[action], 'success');
      const response = await fetchAdminEvents({
        status: status === 'all' ? undefined : status,
        query: debouncedSearch || undefined,
        page,
        pageSize,
        sort: '-startAt',
      });
      const normalized = (response.items ?? []).map(normalizeEvent);
      setItems(normalized);
      setTotal(response.total ?? normalized.length ?? 0);
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const statusBadgeClass = (value: string) => {
    switch (value) {
      case 'published':
        return `${styles.statusBadge} ${styles.badgePublished}`;
      case 'ongoing':
        return `${styles.statusBadge} ${styles.badgeOngoing}`;
      case 'completed':
        return `${styles.statusBadge} ${styles.badgeCompleted}`;
      case 'canceled':
        return `${styles.statusBadge} ${styles.badgeCanceled}`;
      default:
        return `${styles.statusBadge} ${styles.badgeDraft}`;
    }
  };

  const lifecycleBusy = (eventId: string, action: LifecycleAction) => busyAction === `${eventId}-${action}`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1>Events console</h1>
          <p>Manage tournaments, publish announcements, and oversee live leaderboards.</p>
        </div>
        <div className={styles.inlineActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setPage((prev) => Math.max(1, prev))}
            disabled={loading}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => navigate(paths.admin.events.create())}
          >
            <Plus size={16} /> New event
          </button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={16} />
          <input
            type="search"
            placeholder="Search events"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          {statusFilters.map((item) => (
            <button
              key={item}
              type="button"
              className={`${styles.chip} ${status === item ? styles.chipActive : ''}`}
              onClick={() => setStatus(item)}
            >
              {item === 'all' ? 'All statuses' : item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className={styles.errorCard}>{error}</div>
      ) : loading && items.length === 0 ? (
        <div className={styles.errorCard}>
          <Loader2 size={18} className={styles.spin} /> Loading events…
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>No events yet. Create your first tournament to get started.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Event</th>
                <th>Schedule</th>
                <th>Registrations</th>
                <th>Entry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((event) => (
                <tr key={event._id}>
                  <td>
                    <div className={styles.titleBlock}>
                      <strong>{event.title}</strong>
                      <span className={styles.chipMuted}>{event.category}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.list}>
                      <span>Start: {formatDateTime(event.startAt)}</span>
                      {event.registrationOpenAt && (
                        <span>Reg: {formatDateTime(event.registrationOpenAt)}</span>
                      )}
                    </div>
                  </td>
                  <td>{`${event.registeredCount}/${event.maxParticipants || '∞'}`}</td>
                  <td>{entryFeeLabel(event)}</td>
                  <td>
                    <span className={statusBadgeClass(event.status)}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.ghostBtn}
                        onClick={() => navigate(paths.admin.events.detail(event._id))}
                      >
                        Manage
                      </button>
                      {getLifecycleActions(event.status).map((action) => (
                        <button
                          key={action}
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => handleLifecycle(event._id, action)}
                          disabled={lifecycleBusy(event._id, action)}
                        >
                          {lifecycleBusy(event._id, action) ? 'Working…' : lifecycleLabels[action]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.pagination}>
        <span>
          Page {page} of {totalPages}
        </span>
        <div className={styles.inlineActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminEventsListPage;
