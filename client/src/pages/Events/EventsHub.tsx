import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Clock, Loader2, RefreshCw, Trophy, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '@/store';
import { createEventsQueryKey, fetchEvents } from '@/store/events.slice';
import type { EventSummary } from '@/types/events';
import fallbackImage from '@/assets/no-image.svg';
import { formatINR } from '@/utils/currency';
import styles from './EventsHub.module.scss';

type TabKey = 'all' | 'events' | 'tournaments' | 'registrations';

type ExtendedEventSummary = EventSummary & {
  myRegistrationStatus?: string | null;
  registrationStatus?: string | null;
  registration?: { status?: string | null } | null;
};

type EventStage = 'live' | 'upcoming' | 'completed';

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

const formatCountdown = (target: number, now: number) => {
  const diff = Math.max(0, target - now);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${Math.max(minutes, 0)}m`;
};

const safeImage = (url?: string | null) =>
  typeof url === 'string' && url.trim().length > 0 ? url : fallbackImage;

const TABS: Array<{ id: TabKey; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'events', label: 'Events' },
  { id: 'tournaments', label: 'Tournaments' },
  { id: 'registrations', label: 'My Registrations' },
];

const isRegistered = (event: ExtendedEventSummary) => {
  const status = event.myRegistrationStatus ?? event.registrationStatus ?? event.registration?.status;
  if (!status) return false;
  return status !== 'withdrawn' && status !== 'canceled';
};

const EventsHub = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const eventsState = useSelector((state: RootState) => state.events.list);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const queryParams = useMemo(() => ({ page: 1, pageSize: 50 }), []);
  const queryKey = useMemo(() => createEventsQueryKey(queryParams), [queryParams]);

  useEffect(() => {
    const promise = dispatch(fetchEvents(queryParams));
    return () => promise.abort?.();
  }, [dispatch, queryKey, queryParams]);

  const items = useMemo(() => {
    return Array.isArray(eventsState.items) ? (eventsState.items as ExtendedEventSummary[]) : [];
  }, [eventsState.items]);
  const loading = eventsState.loading && items.length === 0;
  const error = eventsState.error;

  const registeredItems = useMemo(() => items.filter((item) => isRegistered(item)), [items]);
  const registeredIds = useMemo(
    () => new Set(registeredItems.map((item) => item._id)),
    [registeredItems],
  );

  const groupedItems = useMemo(() => {
    const base = items.filter((item) => !registeredIds.has(item._id));
    return {
      all: base,
      events: base.filter((item) => item.type !== 'tournament'),
      tournaments: base.filter((item) => item.type === 'tournament'),
      registrations: registeredItems,
    } satisfies Record<TabKey, ExtendedEventSummary[]>;
  }, [items, registeredItems, registeredIds]);

  const handleRefresh = () => {
    dispatch(fetchEvents({ ...queryParams }));
  };

  const handleLoadMore = async () => {
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
  };

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
      return `Ends in ${formatCountdown(endAt, now)}`;
    }
    if (stage === 'upcoming' && Number.isFinite(startAt)) {
      return `Starts in ${formatCountdown(startAt, now)}`;
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

  const renderList = (list: ExtendedEventSummary[]) => {
    const gridEvents = list;
    const stageSummary = gridEvents.reduce(
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

    return loading ? (
      <div className={styles.skeletonGrid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={styles.skeletonCard} />
        ))}
      </div>
    ) : error && gridEvents.length === 0 ? (
      <div className={styles.feedbackCard}>
        <h3>Unable to load events</h3>
        <p>{error}</p>
      </div>
    ) : gridEvents.length === 0 ? (
      <div className={styles.feedbackCard}>
        <h3>No events available yet</h3>
        <p>
          We are lining up the next wave of community experiences. Check back soon for new
          tournaments and meetups.
        </p>
      </div>
    ) : (
      <>
        <div className={styles.gridHeader}>
          <div>
            <h3>Browse all events</h3>
            <p>
              {gridEvents.length} experiences are currently open. Pick one to view the details and
              register.
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
        {eventsState.hasMore && (
          <button
            type="button"
            className={styles.loadMore}
            onClick={handleLoadMore}
            disabled={busy}
          >
            {busy ? <Loader2 size={16} className={styles.spin} /> : 'Load more events'}
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

      <nav className={styles.tabs} aria-label="Events filters">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className={styles.tabContent} aria-live="polite">
        {renderList(groupedItems[activeTab])}
      </section>
    </div>
  );
};

export default EventsHub;
