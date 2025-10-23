import { useEffect, useMemo, useState } from 'react';
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
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    setPage(1);
  }, [status, debouncedSearch]);

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

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

  const metrics = useMemo(
    () => ({
      total,
      live: items.filter((eventRow) => eventRow.status === 'ongoing').length,
      drafts: items.filter((eventRow) => eventRow.status === 'draft').length,
      completed: items.filter((eventRow) => eventRow.status === 'completed').length,
      registrations: items.reduce((acc, eventRow) => acc + (eventRow.registeredCount ?? 0), 0),
    }),
    [items, total],
  );

  const determinePhase = (event: AdminEventRow) => {
    const statusValue = (event.status ?? 'draft').toLowerCase();
    if (statusValue === 'ongoing') return 'Live';
    if (statusValue === 'published') return 'Registrations open';
    if (statusValue === 'completed') return 'Completed';
    if (statusValue === 'canceled') return 'Canceled';
    return 'Draft';
  };

  const formatCountdown = (event: AdminEventRow) => {
    const now = tick;
    const parseDate = (value?: string) => {
      if (!value) return Number.NaN;
      const date = Date.parse(value);
      return Number.isFinite(date) ? date : Number.NaN;
    };

    const statusValue = (event.status ?? '').toLowerCase();
    const registrationClose = parseDate(event.registrationCloseAt);
    const startAt = parseDate(event.startAt);
    if (statusValue === 'completed') return 'Event completed';
    if (statusValue === 'canceled') return 'Event canceled';
    if (statusValue === 'ongoing') {
      const endAt = parseDate(event?.registrationCloseAt ?? event.startAt);
      if (Number.isFinite(endAt) && endAt > now) {
        return `Live · ${formatDuration(endAt - now)} left`;
      }
      return 'Live now';
    }
    if (statusValue === 'published' && Number.isFinite(registrationClose) && registrationClose > now) {
      return `Reg closes in ${formatDuration(registrationClose - now)}`;
    }
    if (Number.isFinite(startAt) && startAt > now) {
      return `Starts in ${formatDuration(startAt - now)}`;
    }
    return determinePhase(event);
  };

  const formatDuration = (diff: number) => {
    const totalSeconds = Math.floor(Math.max(0, diff) / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${Math.max(minutes, 0)}m`;
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
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroHeadline}>
            <span className={styles.eyebrow}>Tournament control</span>
            <h1>Events operations hub</h1>
            <p>Track registrations, flip lifecycle switches, and launch new brackets in seconds.</p>
          </div>
          <div className={styles.heroMetrics}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Total events</span>
              <span className={styles.metricValue}>{metrics.total}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Live now</span>
              <span className={styles.metricValue}>{metrics.live}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Drafts</span>
              <span className={styles.metricValue}>{metrics.drafts}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Total registrations</span>
              <span className={styles.metricValue}>{metrics.registrations}</span>
            </div>
          </div>
        </div>
        <div className={styles.heroActions}>
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
        <div className={styles.searchPanel}>
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={(eventObj) => setSearch(eventObj.target.value)}
            placeholder="Search tournaments by name, status, or reward"
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
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`skeleton-${index}`} className={styles.skeletonCard}>
              <Loader2 className={styles.spin} />
              <span>Loading tournament</span>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.errorCard}>
          <h3>Unable to load events</h3>
          <p>{error}</p>
          <button type="button" className={styles.primaryBtn} onClick={() => setPage((prev) => prev)}>
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No tournaments yet</h3>
          <p>Spin up your first bracket or adjust filters to uncover archived runs.</p>
          <button type="button" className={styles.primaryBtn} onClick={() => navigate(paths.admin.events.create())}>
            <Plus size={16} /> Launch event
          </button>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {items.map((eventRow) => {
            const capacity = eventRow.maxParticipants ?? 0;
            const registered = eventRow.registeredCount ?? 0;
            const progress = capacity > 0 ? Math.min(100, Math.round((registered / capacity) * 100)) : 0;
            const slotsRemaining = capacity > 0 ? Math.max(0, capacity - registered) : null;
            return (
              <article key={eventRow._id} className={styles.eventCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTags}>
                    <span className={styles.category}>{eventRow.category ?? 'other'}</span>
                    <span className={statusBadgeClass(eventRow.status)}>{eventRow.status}</span>
                  </div>
                  <span className={styles.phase}>{determinePhase(eventRow)}</span>
                </div>
                <button
                  type="button"
                  className={styles.cardTitle}
                  onClick={() => navigate(paths.admin.events.detail(eventRow._id))}
                >
                  {eventRow.title}
                </button>
                <div className={styles.cardMetrics}>
                  <div>
                    <span className={styles.metricLabel}>Prize pool</span>
                    <strong>{eventRow.prizePool ?? 'TBA'}</strong>
                  </div>
                  <div>
                    <span className={styles.metricLabel}>Entry</span>
                    <strong>{entryFeeLabel(eventRow)}</strong>
                  </div>
                  <div>
                    <span className={styles.metricLabel}>Spots</span>
                    <strong>
                      {capacity > 0 ? `${registered}/${capacity}` : `${registered} / ∞`}
                    </strong>
                    {slotsRemaining !== null && (
                      <span className={styles.metricHint}>{slotsRemaining} remaining</span>
                    )}
                  </div>
                </div>
                <div className={styles.progressTrack}>
                  <span className={styles.progressValue} style={{ width: `${progress}%` }} />
                </div>
                <div className={styles.progressMeta}>
                  <span>{registered} registered</span>
                  <span>{formatCountdown(eventRow)}</span>
                </div>
                <div className={styles.timeline}>
                  <div>
                    <span className={styles.label}>Reg opens</span>
                    <strong>{formatDateTime(eventRow.registrationOpenAt)}</strong>
                  </div>
                  <div>
                    <span className={styles.label}>Reg closes</span>
                    <strong>{formatDateTime(eventRow.registrationCloseAt)}</strong>
                  </div>
                  <div>
                    <span className={styles.label}>Kick-off</span>
                    <strong>{formatDateTime(eventRow.startAt)}</strong>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => navigate(paths.admin.events.detail(eventRow._id))}
                  >
                    Manage event
                  </button>
                  {getLifecycleActions(eventRow.status).map((action) => (
                    <button
                      key={`${eventRow._id}-${action}`}
                      type="button"
                      className={styles.secondaryBtn}
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
              </article>
            );
          })}
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
