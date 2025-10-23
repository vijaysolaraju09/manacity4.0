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
import styles from './AdminEventsList.module.scss';

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

const AdminEventsList = () => {
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
            <Plus size={16} /> Create event
          </button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={(eventObj) => setSearch(eventObj.target.value)}
            placeholder="Search events"
          />
        </div>
        <div className={styles.filters}>
          {statusFilters.map((option) => (
            <button
              key={option}
              type="button"
              className={`${styles.chip} ${status === option ? styles.chipActive : ''}`}
              onClick={() => setStatus(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className={styles.skeleton}>
          <Loader2 className={styles.spin} /> Loading events
        </div>
      ) : error ? (
        <div className={styles.errorCard}>
          <h3>Unable to load events</h3>
          <p>{error}</p>
          <button type="button" className={styles.secondaryBtn} onClick={() => setPage((prev) => prev)}>
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No events found</h3>
          <p>Create your first tournament or adjust the filters to view events.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Registration</th>
                <th>Start date</th>
                <th>Entries</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((eventRow) => (
                <tr key={eventRow._id}>
                  <td>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => navigate(paths.admin.events.detail(eventRow._id))}
                    >
                      {eventRow.title}
                    </button>
                    <div className={styles.tableMeta}>{eventRow.category}</div>
                  </td>
                  <td>
                    <span className={statusBadgeClass(eventRow.status)}>{eventRow.status}</span>
                  </td>
                  <td>
                    <div className={styles.tableMeta}>{formatDateTime(eventRow.registrationOpenAt)}</div>
                    <div className={styles.tableMeta}>{formatDateTime(eventRow.registrationCloseAt)}</div>
                  </td>
                  <td>{formatDateTime(eventRow.startAt)}</td>
                  <td>
                    <div className={styles.tableMeta}>{entryFeeLabel(eventRow)}</div>
                    <div className={styles.tableMeta}>
                      {eventRow.registeredCount}/{eventRow.maxParticipants || '∞'}
                    </div>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => navigate(paths.admin.events.detail(eventRow._id))}
                      >
                        Manage
                      </button>
                      {getLifecycleActions(eventRow.status).map((action) => (
                        <button
                          key={`${eventRow._id}-${action}`}
                          type="button"
                          className={styles.ghostBtn}
                          onClick={() => handleLifecycle(eventRow._id, action)}
                          disabled={lifecycleBusy(eventRow._id, action)}
                        >
                          {lifecycleBusy(eventRow._id, action) ? (
                            <Loader2 size={16} className={styles.spin} />
                          ) : (
                            lifecycleLabels[action]
                          )}
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

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className={styles.pageIndicator}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminEventsList;
