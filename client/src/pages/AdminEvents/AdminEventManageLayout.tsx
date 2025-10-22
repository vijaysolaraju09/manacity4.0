import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  fetchEventByIdAdmin,
  publishEvent as publishEventAdmin,
  startEvent as startEventAdmin,
  completeEvent as completeEventAdmin,
  cancelEvent as cancelEventAdmin,
} from '@/api/admin';
import { formatDateTime } from '@/utils/date';
import { formatINR } from '@/utils/currency';
import showToast from '@/components/ui/Toast';
import { toErrorMessage } from '@/lib/response';
import { paths } from '@/routes/paths';
import styles from './AdminEvents.module.scss';

type LifecycleAction = 'publish' | 'start' | 'complete' | 'cancel';

type AdminEvent = {
  _id: string;
  title: string;
  status: string;
  startAt: string;
  endAt?: string;
  registrationOpenAt?: string;
  registrationCloseAt?: string;
  registeredCount?: number;
  maxParticipants?: number;
  teamSize?: number;
  entryFeePaise?: number;
  prizePool?: string;
  category?: string;
  type?: string;
  format?: string;
  description?: string;
  rules?: string;
  mode?: 'online' | 'venue';
  venue?: string | null;
  structure?: string | null;
  rewards?: string[];
  registrationChecklist?: string[];
  isRegistrationOpen?: boolean;
  timezone?: string;
  bannerUrl?: string | null;
  coverUrl?: string | null;
};

export interface AdminEventContext {
  event: AdminEvent | null;
  refresh: () => Promise<void>;
  loading: boolean;
}

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

const normalizeAdminEvent = (raw: any): AdminEvent => ({
  _id: String(raw?._id ?? raw?.id ?? ''),
  title: raw?.title ?? 'Untitled event',
  status: (raw?.status ?? raw?.lifecycleStatus ?? 'draft').toLowerCase(),
  startAt: raw?.startAt ?? raw?.start_at ?? new Date().toISOString(),
  endAt: raw?.endAt ?? raw?.end_at ?? undefined,
  registrationOpenAt: raw?.registrationOpenAt ?? raw?.registration_open_at ?? raw?.startAt,
  registrationCloseAt: raw?.registrationCloseAt ?? raw?.registration_close_at ?? raw?.startAt,
  registeredCount: Number(raw?.registeredCount ?? raw?.registered ?? 0),
  maxParticipants: Number(raw?.maxParticipants ?? raw?.capacity ?? 0),
  teamSize: Number(raw?.teamSize ?? 1),
  entryFeePaise: Number.isFinite(Number(raw?.entryFeePaise ?? raw?.entry_fee_paise))
    ? Number(raw?.entryFeePaise ?? raw?.entry_fee_paise)
    : undefined,
  prizePool: raw?.prizePool ?? raw?.rewards ?? undefined,
  category: raw?.category ?? 'other',
  type: raw?.type ?? 'tournament',
  format: raw?.format ?? 'single_match',
  description: raw?.description ?? '',
  rules: raw?.rules ?? '',
  mode: raw?.mode === 'venue' ? 'venue' : 'online',
  venue: raw?.venue ?? raw?.location ?? null,
  structure: raw?.structure ?? null,
  rewards: Array.isArray(raw?.rewards) ? raw.rewards : undefined,
  registrationChecklist: Array.isArray(raw?.registrationChecklist)
    ? raw.registrationChecklist
    : undefined,
  isRegistrationOpen: Boolean(raw?.isRegistrationOpen ?? raw?.registrationOpen),
  timezone: raw?.timezone ?? 'Asia/Kolkata',
  bannerUrl: raw?.bannerUrl ?? raw?.banner ?? null,
  coverUrl: raw?.coverUrl ?? raw?.cover ?? null,
});

const AdminEventManageLayout = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<LifecycleAction | null>(null);

  const loadEvent = async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEventByIdAdmin(eventId);
      setEvent(normalizeAdminEvent(data));
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvent();
  }, [eventId]);

  const statusBadgeClass = (value?: string) => {
    switch ((value ?? '').toLowerCase()) {
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

  const entryFeeLabel = () => {
    if (!event?.entryFeePaise) return 'FREE';
    return formatINR(event.entryFeePaise);
  };

  const tabs = useMemo(() => {
    if (!eventId) return [];
    return [
      { label: 'Details', path: paths.admin.events.detail(eventId) },
      { label: 'Registrations', path: paths.admin.events.registrations(eventId) },
      { label: 'Leaderboard', path: paths.admin.events.leaderboard(eventId) },
    ];
  }, [eventId]);

  const handleLifecycle = async (action: LifecycleAction) => {
    if (!eventId) return;
    setBusyAction(action);
    try {
      const map: Record<LifecycleAction, (id: string) => Promise<any>> = {
        publish: publishEventAdmin,
        start: startEventAdmin,
        complete: completeEventAdmin,
        cancel: cancelEventAdmin,
      };
      await map[action](eventId);
      showToast(lifecycleSuccess[action], 'success');
      await loadEvent();
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    } finally {
      setBusyAction(null);
    }
  };

  if (loading && !event) {
    return (
      <div className={styles.errorCard}>
        <Loader2 size={18} className={styles.spin} /> Loading event…
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorCard}>
        <p>{error}</p>
        <button type="button" className={styles.primaryBtn} onClick={() => void loadEvent()}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  if (!event) {
    return <div className={styles.errorCard}>Event not found.</div>;
  }

  const availableActions = getLifecycleActions(event.status);

  return (
    <div className={styles.page}>
      <div className={styles.manageHeader}>
        <div className={styles.titleBlock}>
          <h1>{event.title}</h1>
          <p>
            {event.category} • {formatDateTime(event.startAt)}
          </p>
        </div>
        <div className={styles.manageMeta}>
          <span className={statusBadgeClass(event.status)}>
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </span>
          <span className={styles.chipMuted}>Registrations: {event.registeredCount ?? 0}</span>
          <span className={styles.chipMuted}>Capacity: {event.maxParticipants || '∞'}</span>
          <span className={styles.chipMuted}>Entry: {entryFeeLabel()}</span>
          {event.isRegistrationOpen !== undefined && (
            <span className={styles.chipMuted}>
              {event.isRegistrationOpen ? 'Registrations open' : 'Registrations closed'}
            </span>
          )}
        </div>
        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Registration window</span>
            <span className={styles.detailValue}>
              {event.registrationOpenAt ? formatDateTime(event.registrationOpenAt) : '—'}
            </span>
            <span className={styles.detailMeta}>
              closes {event.registrationCloseAt ? formatDateTime(event.registrationCloseAt) : '—'}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Format</span>
            <span className={styles.detailValue}>
              {event.structure ? event.structure : `${event.teamSize ?? 1} player`}
            </span>
            <span className={styles.detailMeta}>Team size {event.teamSize ?? 1}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Mode</span>
            <span className={styles.detailValue}>{event.mode === 'venue' ? 'Venue' : 'Online'}</span>
            {event.mode === 'venue' && event.venue && (
              <span className={styles.detailMeta}>{event.venue}</span>
            )}
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Prize pool</span>
            <span className={styles.detailValue}>{event.prizePool ?? 'TBD'}</span>
          </div>
        </div>
        <div className={styles.inlineActions}>
          {availableActions.map((action) => (
            <button
              key={action}
              type="button"
              className={styles.secondaryBtn}
              onClick={() => handleLifecycle(action)}
              disabled={busyAction === action}
            >
              {busyAction === action ? 'Working…' : lifecycleLabels[action]}
            </button>
          ))}
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => void loadEvent()}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <nav className={styles.subnav}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `${styles.subnavLink} ${isActive ? styles.subnavActive : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.panel}>
        <Outlet context={{ event, refresh: loadEvent, loading } as AdminEventContext} />
      </div>
    </div>
  );
};

export default AdminEventManageLayout;
