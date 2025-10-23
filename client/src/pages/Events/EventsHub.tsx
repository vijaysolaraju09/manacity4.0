import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, RefreshCw, Users, Trophy, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '@/store';
import {
  createEventsQueryKey,
  fetchEvents,
} from '@/store/events.slice';
import type { EventSummary } from '@/types/events';
import fallbackImage from '@/assets/no-image.svg';
import { formatINR } from '@/utils/currency';
import styles from './EventsHub.module.scss';

const categories = [
  'all',
  'Free Fire',
  'PUBG',
  'Cricket',
  'Volleyball',
  'Quiz',
  'Campfire',
  'Movie',
  'Food Fest',
  'Other',
];

const statusFilters = ['All', 'Live', 'Upcoming', 'Completed'] as const;
const entryFilters = ['All', 'Free', 'Paid'] as const;

type StatusFilter = (typeof statusFilters)[number];
type EntryFilter = (typeof entryFilters)[number];

type EventStage = 'live' | 'upcoming' | 'completed';

const toParamValue = (value: string) => value.toLowerCase().replace(/\s+/g, '_');

const normalizeCategory = (value: string) => {
  if (!value) return 'other';
  const key = value.toLowerCase();
  const mapped: Record<string, string> = {
    freefire: 'free_fire',
    'free fire': 'free_fire',
    pubg: 'pubg',
    cricket: 'cricket',
    volleyball: 'volleyball',
    quiz: 'quiz',
    campfire: 'campfire',
    movie: 'movie',
    film: 'movie',
    food: 'food_fest',
    fest: 'food_fest',
    other: 'other',
  };
  return mapped[key] ?? key;
};

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

const safeImage = (url?: string | null) => (typeof url === 'string' && url.trim().length > 0 ? url : fallbackImage);

const EventsHub = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const eventsState = useSelector((state: RootState) => state.events.list);
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [entry, setEntry] = useState<EntryFilter>('All');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [category, status, entry, mine]);

  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      page,
      pageSize: 12,
    };
    if (category !== 'all') {
      params.category = toParamValue(normalizeCategory(category));
    }
    if (status !== 'All') {
      params.status = toParamValue(status);
    }
    if (entry === 'Free') {
      params.entry = 'free';
    } else if (entry === 'Paid') {
      params.entry = 'paid';
    }
    if (mine) {
      params.mine = true;
    }
    return params;
  }, [category, status, entry, mine, page]);

  const queryKey = useMemo(() => createEventsQueryKey(queryParams), [queryParams]);

  useEffect(() => {
    const promise = dispatch(fetchEvents(queryParams));
    return () => promise.abort?.();
  }, [dispatch, queryKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || page > 1) return undefined;
    const interval = window.setInterval(() => {
      dispatch(fetchEvents({ ...queryParams }));
    }, 45000);
    return () => window.clearInterval(interval);
  }, [dispatch, page, queryParams, queryKey]);

  const loading = eventsState.loading && (eventsState.items?.length ?? 0) === 0;
  const busy = eventsState.loading;
  const error = eventsState.error;
  const items = Array.isArray(eventsState.items) ? eventsState.items : [];

  const featuredEvents = useMemo(() => {
    const liveOrUpcoming = items.filter((event) => {
      const stage = determineStage(event, tick);
      return event.featured || stage !== 'completed';
    });
    return liveOrUpcoming.slice(0, 6);
  }, [items, tick]);

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

  const handleRefresh = () => {
    setPage(1);
    dispatch(fetchEvents({ ...queryParams, page: 1 }));
  };

  const handleLoadMore = () => {
    if (busy || !eventsState.hasMore) return;
    setPage((prev) => prev + 1);
  };

  const renderStatusBadge = (event: EventSummary) => {
    const stage = determineStage(event, tick);
    const classList = [styles.badge];
    let label = 'Upcoming';
    if (stage === 'live') {
      classList.push(styles.badgeLive);
      label = 'Live';
    } else if (stage === 'completed') {
      classList.push(styles.badgeClosed);
      label = event.status === 'completed' ? 'Results' : 'Closed';
    } else {
      classList.push(styles.badgeUpcoming);
      label = 'Upcoming';
    }
    return <span className={classList.join(' ')}>{label}</span>;
  };

  const renderCountdown = (event: EventSummary) => {
    const stage = determineStage(event, tick);
    const startAt = Date.parse(event.startAt);
    const endAt = event.endAt ? Date.parse(event.endAt) : Number.NaN;
    if (stage === 'live' && Number.isFinite(endAt)) {
      return `Ends in ${formatCountdown(endAt, tick)}`;
    }
    if (stage === 'upcoming' && Number.isFinite(startAt)) {
      return `Starts in ${formatCountdown(startAt, tick)}`;
    }
    if (stage === 'completed' && Number.isFinite(endAt)) {
      const date = new Date(endAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      return `Ended ${date}`;
    }
    return stage === 'live' ? 'Happening now' : 'Schedule TBA';
  };

  const renderPrimaryCta = (event: EventSummary) => {
    const stage = determineStage(event, tick);
    const baseClass = styles.primaryBtn;
    if (stage === 'live') {
      return (
        <button
          type="button"
          className={baseClass}
          onClick={() => navigate(`/events/${event._id}`)}
        >
          Watch Live
        </button>
      );
    }
    if (stage === 'completed') {
      return (
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => navigate(`/events/${event._id}`)}
        >
          View Results
        </button>
      );
    }
    return (
      <button
        type="button"
        className={baseClass}
        onClick={() => navigate(`/events/${event._id}#register`)}
      >
        Register Now
      </button>
    );
  };

  // Temporarily disable filter controls until refined filter options are ready.
  const showFilters = false;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headingRow}>
          <div className={styles.titleBlock}>
            <h1>Events &amp; Tournaments</h1>
            <p>
              Compete, connect, and celebrate. Discover live tournaments, weekend fests, and skill-based
              challenges curated for the Manacity community.
            </p>
          </div>
          <button type="button" className={styles.refreshBtn} onClick={handleRefresh} disabled={busy}>
            {busy ? <Loader2 size={16} className={styles.spin} /> : <RefreshCw size={16} />}
            Refresh
          </button>
        </div>
        <div className={styles.tabs}>
          {categories.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`${styles.tab} ${category === tab ? styles.tabActive : ''}`}
              onClick={() => setCategory(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        {showFilters && (
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Status</span>
              {statusFilters.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.filterButton} ${status === option ? styles.filterButtonActive : ''}`}
                  onClick={() => setStatus(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Entry</span>
              {entryFilters.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.filterButton} ${entry === option ? styles.filterButtonActive : ''}`}
                  onClick={() => setEntry(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>My Events</span>
              <button
                type="button"
                className={`${styles.filterButton} ${mine ? styles.filterButtonActive : ''}`}
                onClick={() => setMine((prev) => !prev)}
              >
                {mine ? 'Showing mine' : 'All events'}
              </button>
            </div>
          </div>
        )}
      </header>

      {featuredEvents.length > 0 && (
        <section className={styles.featureSection}>
          <div className={styles.headingRow}>
            <div className={styles.titleBlock}>
              <h1 style={{ fontSize: '1.35rem' }}>Featured arenas</h1>
              <p>Jump into marquee tournaments and premium experiences with boosted prize pools.</p>
            </div>
          </div>
          <div className={styles.carousel}>
            {featuredEvents.map((event) => {
              const stage = determineStage(event, tick);
              const cover = safeImage(event.bannerUrl);
              return (
                <article key={event._id} className={styles.featureCard}>
                  <div
                    className={styles.featureBanner}
                    style={{ backgroundImage: `url(${cover})` }}
                    aria-hidden="true"
                  >
                    {event.highlightLabel && <span className={styles.featureBadge}>{event.highlightLabel}</span>}
                  </div>
                  <div className={styles.featureContent}>
                    <div className={styles.featureMeta}>
                      <span className={styles.badge}>{event.category}</span>
                      {renderStatusBadge(event)}
                      <span className={styles.badge}>{formatEntryFee(event)}</span>
                    </div>
                    <h3 className={styles.featureTitle}>{event.title}</h3>
                    <p className={styles.tileSubtitle}>{renderCountdown(event)}</p>
                    <div className={styles.statRow}>
                      <span className={styles.statChip}>
                        <Trophy size={14} />
                        {event.prizePool ? event.prizePool : 'Prize on reveal'}
                      </span>
                      <span className={styles.statChip}>
                        <Users size={14} />
                        {event.registeredCount}/{event.maxParticipants || '∞'}
                      </span>
                    </div>
                    <div className={styles.ctaRow}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => navigate(`/events/${event._id}`)}
                      >
                        View Details
                      </button>
                      {renderPrimaryCta(event)}
                    </div>
                    {stage === 'live' && (
                      <span className={styles.badgeLive} style={{ alignSelf: 'flex-start' }}>
                        <Sparkles size={12} /> Live action
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {loading ? (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={styles.skeletonCard} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.errorCard}>
          <h3>Unable to load events</h3>
          <p>{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No events yet</h3>
          <p>We are crafting the next wave of tournaments. Check back soon or explore other categories.</p>
        </div>
      ) : (
        <>
          <div className={styles.cardsGrid}>
            {items.map((event) => {
              const cover = safeImage(event.bannerUrl);
              const participantsLabel = event.maxParticipants
                ? `${Math.min(event.registeredCount, event.maxParticipants)}/${event.maxParticipants}`
                : `${event.registeredCount}`;
              return (
                <article key={event._id} className={styles.tile}>
                  <div
                    className={styles.tileBanner}
                    style={{ backgroundImage: `url(${cover})` }}
                    aria-hidden="true"
                  />
                  <div className={styles.tileContent}>
                    <div className={styles.featureMeta}>
                      <span className={styles.badge}>{event.category}</span>
                      {renderStatusBadge(event)}
                      <span className={styles.badge}>{formatEntryFee(event)}</span>
                    </div>
                    <h3 className={styles.tileTitle}>{event.title}</h3>
                    {event.shortDescription && (
                      <p className={styles.tileSubtitle}>{event.shortDescription}</p>
                    )}
                    <div className={styles.statRow}>
                      <span className={styles.statChip}>
                        <Clock size={14} />
                        {renderCountdown(event)}
                      </span>
                      <span className={styles.statChip}>
                        <Users size={14} />
                        {participantsLabel}
                      </span>
                      <span className={styles.statChip}>
                        <Trophy size={14} />
                        {event.prizePool ? event.prizePool : 'TBD'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.ctaRow}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => navigate(`/events/${event._id}`)}
                    >
                      View <ArrowRight size={16} />
                    </button>
                    {renderPrimaryCta(event)}
                  </div>
                </article>
              );
            })}
          </div>
          {eventsState.hasMore && (
            <button type="button" className={styles.loadMore} onClick={handleLoadMore} disabled={busy}>
              {busy ? <Loader2 size={16} className={styles.spin} /> : 'Load more'}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default EventsHub;
