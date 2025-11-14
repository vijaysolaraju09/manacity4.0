import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, Trophy, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '@/store';
import { createEventsQueryKey, fetchEvents } from '@/store/events.slice';
import type { EventSummary } from '@/types/events';
import { formatINR } from '@/utils/currency';
import { formatCountdown } from '@/utils/time';
import { formatDateTime, formatTimeAgo } from '@/utils/date';
import { cn } from '@/utils/cn';
import fallbackImage from '@/assets/no-image.svg';
import styles from './EventsHub.module.scss';

type TabKey = 'all' | 'events' | 'tournaments' | 'registrations';

type ExtendedEventSummary = EventSummary;

type EventStage = 'live' | 'upcoming' | 'completed';

const PAGE_SIZE = 24;

const determineStage = (event: EventSummary, now: number): EventStage => {
  const lifecycle = event.lifecycleStatus ?? 'upcoming';
  if (lifecycle === 'ongoing' || event.status === 'ongoing') {
    return 'live';
  }
  if (lifecycle === 'past' || event.status === 'completed' || event.status === 'canceled') {
    return 'completed';
  }
  const startAt = Date.parse(event.startAt);
  const endAt = event.endAt ? Date.parse(event.endAt) : Number.NaN;
  if (Number.isFinite(startAt) && startAt <= now && (!Number.isFinite(endAt) || endAt >= now)) {
    return 'live';
  }
  if (Number.isFinite(endAt) && endAt < now) {
    return 'completed';
  }
  return 'upcoming';
};

const safeImage = (url?: string | null) =>
  typeof url === 'string' && url.trim().length > 0 ? url : fallbackImage;

const TABS: Array<{ id: TabKey; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'events', label: 'Events' },
  { id: 'tournaments', label: 'Tournaments' },
  { id: 'registrations', label: 'My Registrations' },
];

const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  registered: 'Registered',
  waitlisted: 'Waitlisted',
  checked_in: 'Checked in',
  checkedin: 'Checked in',
  withdrawn: 'Withdrawn',
  disqualified: 'Disqualified',
  submitted: 'Submitted',
  rejected: 'Rejected',
};

const isRegistered = (event: ExtendedEventSummary) => {
  const status = event.myRegistrationStatus ?? event.registrationStatus ?? event.registration?.status;
  if (!status) return false;
  return status !== 'withdrawn' && status !== 'canceled';
};

const formatCountdownLabel = (timestamp: number, prefix: 'Starts' | 'Ends') => {
  const parts = formatCountdown(timestamp);
  const segments: string[] = [];
  if (parts.d > 0) {
    segments.push(`${parts.d}d`);
  }
  if (parts.h > 0 || parts.d > 0) {
    segments.push(`${parts.h}h`);
  }
  segments.push(`${parts.m}m`);
  return `${prefix} in ${segments.join(' ')}`;
};

const EventsHub = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const eventsState = useSelector((state: RootState) => state.events.list);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [q, setQ] = useState('');

  const availableTabs = useMemo(
    () => (authUser ? TABS : TABS.filter((tab) => tab.id !== 'registrations')),
    [authUser],
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const hash = location.hash.replace('#', '').toLowerCase();
    if (!hash) return;
    const mapping: Partial<Record<string, TabKey>> = {
      registrations: 'registrations',
      events: 'events',
      tournaments: 'tournaments',
      all: 'all',
    };
    const resolved = mapping[hash];
    if (resolved) {
      setActiveTab(resolved);
    }
  }, [location.hash]);

  useEffect(() => {
    if (!authUser && activeTab === 'registrations') {
      setActiveTab('all');
    }
  }, [authUser, activeTab]);

  const queryParams = useMemo(() => ({ page: 1, pageSize: 50 }), []);
  const queryKey = useMemo(() => createEventsQueryKey(queryParams), [queryParams]);

  useEffect(() => {
    const promise = dispatch(fetchEvents(queryParams));
    return () => promise.abort?.();
  }, [dispatch, queryKey, queryParams]);

  const items = useMemo(() => {
    return Array.isArray(eventsState.items) ? (eventsState.items as ExtendedEventSummary[]) : [];
  }, [eventsState.items]);

  const filteredEvents = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return items;
    return items.filter((event) => {
      const label = (event?.title || event?.name || '').toLowerCase();
      return label.includes(search);
    });
  }, [items, q]);

  const loading = eventsState.loading && items.length === 0;
  const error = eventsState.error;

  const registeredItems = useMemo(() => filteredEvents.filter((item) => isRegistered(item)), [filteredEvents]);
  const registeredIds = useMemo(() => new Set(registeredItems.map((item) => item._id)), [registeredItems]);

  const groupedItems = useMemo(() => {
    const base = filteredEvents.filter((item) => !registeredIds.has(item._id));
    return {
      all: base,
      events: base.filter((item) => item.type !== 'tournament'),
      tournaments: base.filter((item) => item.type === 'tournament'),
      registrations: registeredItems,
    } satisfies Record<TabKey, ExtendedEventSummary[]>;
  }, [filteredEvents, registeredItems, registeredIds]);

  const activeList = useMemo(() => groupedItems[activeTab] ?? [], [groupedItems, activeTab]);

  const paginatedList = useMemo(
    () => (activeTab === 'registrations' ? activeList : activeList.slice(0, visibleCount)),
    [activeList, activeTab, visibleCount],
  );

  const hasLocalMore = activeTab !== 'registrations' && activeList.length > paginatedList.length;
  const canFetchMore = activeTab !== 'registrations' && Boolean(eventsState.hasMore);
  const showLoadMoreButton = activeTab !== 'registrations' && (hasLocalMore || canFetchMore);

  const handleRefresh = () => {
    dispatch(fetchEvents({ ...queryParams }));
  };

  const fetchMoreEvents = useCallback(async () => {
    if (busy || !eventsState.hasMore) return;
    const nextPage = (eventsState.page ?? 1) + 1;
    setBusy(true);
    try {
      await dispatch(fetchEvents({ ...queryParams, page: nextPage })).unwrap();
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  }, [busy, dispatch, eventsState.hasMore, eventsState.page, queryParams]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, q]);

  const handleShowMore = useCallback(async () => {
    if (activeTab === 'registrations') return;
    const nextVisible = visibleCount + PAGE_SIZE;
    if (nextVisible <= activeList.length) {
      setVisibleCount(nextVisible);
      return;
    }

    if (!canFetchMore || busy) {
      setVisibleCount(Math.min(nextVisible, activeList.length));
      return;
    }

    setVisibleCount(activeList.length);
    await fetchMoreEvents();
    setVisibleCount((current) => current + PAGE_SIZE);
  }, [activeTab, activeList.length, busy, canFetchMore, fetchMoreEvents, visibleCount]);

  const formatEntryFee = (event: EventSummary) => {
    const paise =
      typeof event.entryFeePaise === 'number' && Number.isFinite(event.entryFeePaise)
        ? event.entryFeePaise
        : undefined;
    if (typeof paise === 'number' && paise > 0) {
      return formatINR(paise);
    }
    const rupees =
      typeof event.entryFee === 'number' && Number.isFinite(event.entryFee) ? event.entryFee : undefined;
    if (typeof rupees === 'number' && rupees > 0) {
      return `₹${Math.round(rupees)}`;
    }
    return 'FREE';
  };

  const renderStatusBadge = (event: EventSummary) => {
    const stage = determineStage(event, now);
    const stageClass =
      stage === 'live'
        ? styles.stageLive
        : stage === 'completed'
        ? styles.stageCompleted
        : styles.stageUpcoming;
    const label = stage === 'live' ? 'Live' : stage === 'completed' ? 'Completed' : 'Upcoming';
    return <span className={`${styles.stageBadge} ${stageClass}`}>{label}</span>;
  };

  const renderCountdown = (event: EventSummary) => {
    const stage = determineStage(event, now);
    const startAt = Date.parse(event.startAt);
    const endAt = event.endAt ? Date.parse(event.endAt) : Number.NaN;
    if (stage === 'live' && Number.isFinite(endAt)) {
      return formatCountdownLabel(endAt, 'Ends');
    }
    if (stage === 'upcoming' && Number.isFinite(startAt)) {
      return formatCountdownLabel(startAt, 'Starts');
    }
    if (stage === 'completed' && Number.isFinite(endAt)) {
      const date = new Date(endAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      return `Ended ${date}`;
    }
    return stage === 'live' ? 'Happening now' : 'Schedule TBA';
  };

  const renderPrimaryCta = (event: EventSummary) => {
    const stage = determineStage(event, now);
    if (stage === 'completed') {
      return (
        <button
          type="button"
          className={styles.secondaryAction}
          onClick={() => navigate(`/events/${event._id}`)}
        >
          View results
        </button>
      );
    }

    const handleClick = () => {
      if (stage === 'live') {
        navigate(`/events/${event._id}`);
      } else {
        navigate({ pathname: `/events/${event._id}`, hash: 'register' });
      }
    };

    return (
      <button type="button" className={styles.primaryAction} onClick={handleClick}>
        {stage === 'live' ? 'Watch live' : 'Register now'}
      </button>
    );
  };

  const renderRegistrationList = (list: ExtendedEventSummary[]) => {
    if (loading && list.length === 0) {
      return (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`registration-skeleton-${index}`} className={styles.skeletonCard} />
          ))}
        </div>
      );
    }

    if (error && list.length === 0) {
      return (
        <div className={styles.feedbackCard}>
          <h3>Unable to load registrations</h3>
          <p>{error}</p>
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className={styles.feedbackCard}>
          <h3>No registrations yet</h3>
          <p>
            When you register for an event, the confirmation will appear here with payment status and
            quick links back to the details.
          </p>
        </div>
      );
    }

    const sorted = [...list].sort((a, b) => {
      const aSubmittedRaw = Date.parse(a.registration?.submittedAt ?? '');
      const bSubmittedRaw = Date.parse(b.registration?.submittedAt ?? '');
      const aFallback = Date.parse(a.startAt);
      const bFallback = Date.parse(b.startAt);
      const aTime = Number.isFinite(aSubmittedRaw) ? aSubmittedRaw : Number.isFinite(aFallback) ? aFallback : 0;
      const bTime = Number.isFinite(bSubmittedRaw) ? bSubmittedRaw : Number.isFinite(bFallback) ? bFallback : 0;
      return bTime - aTime;
    });

    return (
      <>
        <div className={styles.registrationsHeader}>
          <div>
            <h3>My registrations</h3>
            <p>Track your event sign-ups, payment proofs, and upcoming dates in one place.</p>
          </div>
          <span className={styles.registrationsHint}>
            {list.length} active {list.length === 1 ? 'registration' : 'registrations'}
          </span>
        </div>
        <div className={styles.registrationsList}>
          {sorted.map((event) => {
            const statusRaw =
              event.myRegistrationStatus ?? event.registrationStatus ?? event.registration?.status ?? '';
            const statusKey = statusRaw?.toLowerCase()?.replace(/[\s-]+/g, '_') ?? '';
            const statusLabel = REGISTRATION_STATUS_LABELS[statusKey] ?? (statusRaw || 'Registered');
            const statusClass =
              statusKey === 'waitlisted'
                ? styles.statusWaitlisted
                : statusKey === 'checked_in'
                ? styles.statusCheckedIn
                : statusKey === 'withdrawn'
                ? styles.statusWithdrawn
                : statusKey === 'disqualified'
                ? styles.statusDisqualified
                : styles.statusRegistered;
            const proofUrl = event.registration?.paymentProofUrl;
            const paymentRequired = event.registration?.paymentRequired;
            const proofLabel = proofUrl
              ? 'Payment proof uploaded'
              : paymentRequired
              ? 'Payment proof pending'
              : 'No payment required';
            const proofClass = proofUrl
              ? styles.proofComplete
              : paymentRequired
              ? styles.proofPending
              : styles.proofOptional;
            const eventDateLabel = formatDateTime(event.startAt);
            const submittedAt = event.registration?.submittedAt;
            const submittedLabel = submittedAt
              ? `Registered ${formatDateTime(submittedAt)} · ${formatTimeAgo(submittedAt)}`
              : null;
            const statusIcon =
              statusKey === 'registered' || statusKey === 'checked_in'
                ? <CheckCircle2 size={14} />
                : <AlertCircle size={14} />;

            return (
              <article key={event._id} className={styles.registrationCard}>
                <div className={styles.registrationInfo}>
                  <h4>{event.title}</h4>
                  <div className={styles.registrationMeta}>
                    <span>{eventDateLabel}</span>
                    {submittedLabel && <span>{submittedLabel}</span>}
                  </div>
                </div>
                <div className={styles.registrationBadges}>
                  <span className={cn(styles.statusBadge, statusClass)}>
                    {statusIcon} {statusLabel}
                  </span>
                  <span className={cn(styles.proofBadge, proofClass)}>
                    {proofUrl ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {proofLabel}
                  </span>
                </div>
                <div className={styles.registrationActions}>
                  <button
                    type="button"
                    className={styles.secondaryAction}
                    onClick={() => navigate(`/events/${event._id}`)}
                  >
                    View details
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </>
    );
  };

  const renderList = (
    fullList: ExtendedEventSummary[],
    paginated: ExtendedEventSummary[],
  ) => {
    if (activeTab === 'registrations') {
      return renderRegistrationList(fullList);
    }

    const gridEvents = paginated;
    const stageSummary = fullList.reduce(
      (acc, event) => {
        const stage = determineStage(event, now);
        if (stage === 'live') {
          acc.live += 1;
        } else if (stage === 'upcoming') {
          acc.upcoming += 1;
        } else if (stage === 'completed') {
          acc.completed += 1;
        }
        acc.totalRegistrations += event.registeredCount ?? 0;
        return acc;
      },
      { live: 0, upcoming: 0, completed: 0, totalRegistrations: 0 },
    );

    if (loading && fullList.length === 0) {
      return (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={styles.skeletonCard} />
          ))}
        </div>
      );
    }

    if (error && fullList.length === 0) {
      return (
        <div className={styles.feedbackCard}>
          <h3>Unable to load events</h3>
          <p>{error}</p>
        </div>
      );
    }

    if (fullList.length === 0) {
      return (
        <div className={styles.feedbackCard}>
          <h3>No events available yet</h3>
          <p>
            We are lining up the next wave of community experiences. Check back soon for new tournaments and meetups.
          </p>
        </div>
      );
    }

    return (
      <>
        <div className={styles.gridHeader}>
          <div>
            <h3>Browse all events</h3>
            <p>
              {gridEvents.length} experiences are currently open. Pick one to view the details and register.
            </p>
          </div>
          <div className={styles.gridHints}>
            <span>
              <Users size={14} /> {stageSummary.totalRegistrations.toLocaleString()} total registrants
            </span>
            <span>
              <Clock size={14} /> {stageSummary.live + stageSummary.upcoming} live or upcoming events
            </span>
          </div>
        </div>
        <div className={styles.cardsGrid}>
          {gridEvents.map((event) => {
            const participantsLabel = event.maxParticipants
              ? `${Math.min(event.registeredCount ?? 0, event.maxParticipants)}/${event.maxParticipants}`
              : `${event.registeredCount ?? 0}`;

            return (
              <article key={event._id} className={styles.card}>
                <div
                  className={styles.cardMedia}
                  style={{ backgroundImage: `url(${safeImage(event.bannerUrl)})` }}
                  aria-hidden="true"
                >
                  {event.highlightLabel && (
                    <span className={styles.highlightBadge}>{event.highlightLabel}</span>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardChips}>
                    {event.category && <span className={styles.categoryChip}>{event.category}</span>}
                    {renderStatusBadge(event)}
                    <span className={styles.entryChip}>{formatEntryFee(event)}</span>
                  </div>
                  <h3 className={styles.cardTitle}>{event.title}</h3>
                  {event.shortDescription && (
                    <p className={styles.cardSubtitle}>{event.shortDescription}</p>
                  )}
                  <div className={styles.cardStats}>
                    <span>
                      <Clock size={14} /> {renderCountdown(event)}
                    </span>
                    <span>
                      <Users size={14} /> {participantsLabel}
                    </span>
                    <span>
                      <Trophy size={14} /> {event.prizePool || 'Prize TBD'}
                    </span>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    className={styles.ghostAction}
                    onClick={() => navigate(`/events/${event._id}`)}
                  >
                    View details
                  </button>
                  {renderPrimaryCta(event)}
                </div>
              </article>
            );
          })}
        </div>
        {showLoadMoreButton && (
          <button
            type="button"
            className={styles.loadMore}
            onClick={handleShowMore}
            disabled={busy && !hasLocalMore}
          >
            {busy && !hasLocalMore ? <Loader2 size={16} className={styles.spin} /> : 'Load more events'}
          </button>
        )}
      </>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Events</h1>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={handleRefresh}
          disabled={eventsState.loading}
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </header>

      <div className={styles.searchWrapper}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search events…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          aria-label="Search events"
        />
      </div>

      <nav className={styles.tabs} aria-label="Events filters">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? styles.activeTab : styles.tab}
            onClick={() => {
              setActiveTab(tab.id);
              const hash = tab.id === 'all' ? '' : `#${tab.id}`;
              if (hash) {
                navigate({ pathname: '/events', hash }, { replace: true });
              } else {
                navigate('/events', { replace: true });
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className={styles.tabContent} aria-live="polite">
        {renderList(activeList, paginatedList)}
      </section>
    </div>
  );
};

export default EventsHub;
