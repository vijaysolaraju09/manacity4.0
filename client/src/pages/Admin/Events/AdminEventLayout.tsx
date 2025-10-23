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
import styles from './AdminEventLayout.module.scss';

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

const AdminEventLayout = () => {
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
      <div className={styles.stateCard}>
        <Loader2 size={18} className={styles.spin} /> Loading event…
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateCard}>
        <p>{error}</p>
        <button type="button" className={styles.secondaryBtn} onClick={() => loadEvent()}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <h1>{event?.title ?? 'Event'}</h1>
          <div className={styles.metaRow}>
            <span className={statusBadgeClass(event?.status)}>{event?.status ?? 'draft'}</span>
            <span>{formatDateTime(event?.startAt)}</span>
            <span>{entryFeeLabel()}</span>
          </div>
        </div>
        <div className={styles.actions}>
          {getLifecycleActions(event?.status).map((action) => (
            <button
              key={action}
              type="button"
              className={styles.ghostBtn}
              onClick={() => handleLifecycle(action)}
              disabled={busyAction === action}
            >
              {busyAction === action ? <Loader2 size={16} className={styles.spin} /> : lifecycleLabels[action]}
            </button>
          ))}
          <button type="button" className={styles.secondaryBtn} onClick={() => loadEvent()}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </header>

      <nav className={styles.tabs}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <section className={styles.summary}>
        <div>
          <span className={styles.label}>Registrations</span>
          <strong>
            {event?.registeredCount}/{event?.maxParticipants || '∞'}
          </strong>
        </div>
        <div>
          <span className={styles.label}>Team size</span>
          <strong>{event?.teamSize ?? 1}</strong>
        </div>
        <div>
          <span className={styles.label}>Mode</span>
          <strong>{event?.mode === 'venue' ? 'On-ground' : 'Online'}</strong>
        </div>
        <div>
          <span className={styles.label}>Venue</span>
          <strong>{event?.venue ?? 'N/A'}</strong>
        </div>
      </section>

      <Outlet context={{ event, refresh: loadEvent, loading }} />
    </div>
  );
};

export type { AdminEvent };
export default AdminEventLayout;
