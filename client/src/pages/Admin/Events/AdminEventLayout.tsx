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
  const [tick, setTick] = useState(Date.now());

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

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

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

  const safeFormat = (value?: string) => {
    if (!value) return '—';
    return formatDateTime(value);
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

  const countdownLabel = useMemo(() => {
    if (!event) return 'Loading';
    const now = tick;
    const parseDate = (value?: string) => {
      if (!value) return Number.NaN;
      const parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    };
    const start = parseDate(event.startAt);
    const end = parseDate(event.endAt ?? event.registrationCloseAt ?? event.startAt);
    const regClose = parseDate(event.registrationCloseAt);
    const statusValue = (event.status ?? '').toLowerCase();
    if (statusValue === 'completed') return 'Event completed';
    if (statusValue === 'canceled') return 'Event canceled';
    if (statusValue === 'ongoing') {
      if (Number.isFinite(end) && end > now) {
        return `Live · ${formatDuration(end - now)} left`;
      }
      return 'Live now';
    }
    if (statusValue === 'published' && Number.isFinite(regClose) && regClose > now) {
      return `Registration closes in ${formatDuration(regClose - now)}`;
    }
    if (Number.isFinite(start) && start > now) {
      return `Starts in ${formatDuration(start - now)}`;
    }
    return 'Awaiting kickoff';
  }, [event, tick]);

  const registrationWindow = useMemo(
    () => ({
      open: safeFormat(event?.registrationOpenAt),
      close: safeFormat(event?.registrationCloseAt),
    }),
    [event?.registrationCloseAt, event?.registrationOpenAt],
  );

  const occupancy = useMemo(() => {
    const capacity = event?.maxParticipants ?? 0;
    const registered = event?.registeredCount ?? 0;
    if (!capacity || capacity <= 0) return { percent: null, registered };
    return {
      percent: Math.min(100, Math.round((registered / capacity) * 100)),
      registered,
      slots: Math.max(0, capacity - registered),
      capacity,
    };
  }, [event?.maxParticipants, event?.registeredCount]);

  const heroStyle = useMemo(() => {
    if (!event?.coverUrl) return undefined;
    return {
      backgroundImage: `linear-gradient(135deg, rgba(5, 7, 15, 0.92), rgba(5, 7, 15, 0.4)), url(${event.coverUrl})`,
    } as const;
  }, [event?.coverUrl]);

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
      <header className={styles.hero} style={heroStyle}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroBody}>
          <div className={styles.heroInfo}>
            <span className={styles.eyebrow}>{event?.category ?? 'tournament'}</span>
            <h1>{event?.title ?? 'Event'}</h1>
            <div className={styles.badgeRow}>
              <span className={statusBadgeClass(event?.status)}>{event?.status ?? 'draft'}</span>
              <span className={styles.countdown}>{countdownLabel}</span>
              <span className={styles.modeChip}>{event?.mode === 'venue' ? 'On-ground' : 'Online'}</span>
            </div>
            <div className={styles.heroMeta}>
              <div>
                <span className={styles.label}>Kick-off</span>
                <strong>{safeFormat(event?.startAt)}</strong>
              </div>
              <div>
                <span className={styles.label}>Entry</span>
                <strong>{entryFeeLabel()}</strong>
              </div>
              <div>
                <span className={styles.label}>Prize pool</span>
                <strong>{event?.prizePool ?? 'TBA'}</strong>
              </div>
            </div>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Registrations</span>
              <span className={styles.statValue}>
                {event?.registeredCount ?? 0}
                <span className={styles.statSub}>
                  {event?.maxParticipants ? `of ${event.maxParticipants}` : 'No cap'}
                </span>
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Team size</span>
              <span className={styles.statValue}>{event?.teamSize ?? 1}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Venue</span>
              <span className={styles.statValue}>{event?.mode === 'venue' ? event?.venue ?? 'TBD' : 'Virtual'}</span>
            </div>
          </div>
        </div>
        <div className={styles.heroActions}>
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

      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <span className={styles.label}>Registration pulse</span>
          {occupancy.percent !== null ? (
            <span className={styles.progressValue}>{occupancy.percent}% full</span>
          ) : (
            <span className={styles.progressValue}>Unlimited slots</span>
          )}
        </div>
        <div className={styles.progressTrack}>
          <span className={styles.progressBar} style={{ width: `${occupancy.percent ?? 100}%` }} />
        </div>
        <div className={styles.progressMeta}>
          <span>{occupancy.registered ?? 0} registered</span>
          {occupancy.slots !== undefined && occupancy.slots !== null && (
            <span>{occupancy.slots} slots remaining</span>
          )}
        </div>
      </div>

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

      <section className={styles.overview}>
        <div className={styles.timeline}>
          <div>
            <span className={styles.label}>Registration opens</span>
            <strong>{registrationWindow.open}</strong>
          </div>
          <div>
            <span className={styles.label}>Registration closes</span>
            <strong>{registrationWindow.close}</strong>
          </div>
          <div>
            <span className={styles.label}>Event ends</span>
            <strong>{safeFormat(event?.endAt)}</strong>
          </div>
        </div>
        <div className={styles.quickGrid}>
          <div className={styles.quickCard}>
            <span className={styles.label}>Mode</span>
            <strong>{event?.mode === 'venue' ? 'On-ground' : 'Online'}</strong>
          </div>
          <div className={styles.quickCard}>
            <span className={styles.label}>Venue</span>
            <strong>{event?.mode === 'venue' ? event?.venue ?? 'TBD' : 'Remote'}</strong>
          </div>
          <div className={styles.quickCard}>
            <span className={styles.label}>Format</span>
            <strong>{event?.format ?? 'Single match'}</strong>
          </div>
          <div className={styles.quickCard}>
            <span className={styles.label}>Type</span>
            <strong>{event?.type ?? 'Tournament'}</strong>
          </div>
        </div>
      </section>

      <Outlet context={{ event, refresh: loadEvent, loading }} />
    </div>
  );
};

export type { AdminEvent };
export default AdminEventLayout;
