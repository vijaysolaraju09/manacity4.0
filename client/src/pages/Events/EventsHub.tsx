import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, Clock, Loader2, RefreshCw, Target, Trophy, Users } from 'lucide-react';
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

  const stageSummary = useMemo(
    () =>
      items.reduce(
        (acc, event) => {
          const stage = determineStage(event, tick);
          acc[stage] += 1;
          acc.totalRegistrations += event.registeredCount ?? 0;
          const cap = Number.isFinite(event.maxParticipants ?? Number.NaN)
            ? Math.max(0, Number(event.maxParticipants))
            : 0;
          if (cap > 0) {
            acc.totalCapacity += cap;
          }
          return acc;
        },
        {
          live: 0,
          upcoming: 0,
          completed: 0,
          totalRegistrations: 0,
          totalCapacity: 0,
        },
      ),
    [items, tick],
  );

  const spotlightEvent = useMemo(() => {
    if (featuredEvents.length > 0) {
      const live = featuredEvents.find((event) => determineStage(event, tick) === 'live');
      if (live) return live;
      const upcomingMatch = featuredEvents.find((event) => determineStage(event, tick) === 'upcoming');
      if (upcomingMatch) return upcomingMatch;
      return featuredEvents[0];
    }
    const sorted = [...items].sort((a, b) => {
      const aTime = Date.parse(a.startAt);
      const bTime = Date.parse(b.startAt);
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;
      return aTime - bTime;
    });
    return (
      sorted.find((event) => determineStage(event, tick) !== 'completed') ?? sorted[0] ?? null
    );
  }, [featuredEvents, items, tick]);

  const highlightEvents = useMemo(() => {
    if (!spotlightEvent) return featuredEvents;
    return featuredEvents.filter((event) => event._id !== spotlightEvent._id).slice(0, 3);
  }, [featuredEvents, spotlightEvent]);

  const gridEvents = useMemo(() => {
    if (!spotlightEvent || items.length <= 1) return items;
    return items.filter((event) => event._id !== spotlightEvent._id);
  }, [items, spotlightEvent]);

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
    const baseClass = styles.primaryAction;
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
          className={styles.secondaryAction}
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

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBody}>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={handleRefresh}
              disabled={busy}
            >
              {busy ? <Loader2 size={16} className={styles.spin} /> : <RefreshCw size={16} />}
              Refresh feed
            </button>
            <button
              type="button"
              className={`${styles.ghostAction} ${mine ? styles.ghostActionActive : ''}`}
              onClick={() => setMine((prev) => !prev)}
            >
              {mine ? 'Showing events I joined' : 'Show only my registrations'}
            </button>
          </div>
        </div>
      </section>

      <section className={styles.controlBar}>
        <div className={styles.tabList}>
          {categories.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`${styles.tabButton} ${category === tab ? styles.tabButtonActive : ''}`}
              onClick={() => setCategory(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className={styles.filterRow}>
          <div className={styles.filterSegment}>
            <span className={styles.segmentLabel}>Status</span>
            <div className={styles.segmentButtons}>
              {statusFilters.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.segmentButton} ${status === option ? styles.segmentButtonActive : ''}`}
                  onClick={() => setStatus(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.filterSegment}>
            <span className={styles.segmentLabel}>Entry</span>
            <div className={styles.segmentButtons}>
              {entryFilters.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.segmentButton} ${entry === option ? styles.segmentButtonActive : ''}`}
                  onClick={() => setEntry(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {spotlightEvent && (
        <section className={styles.spotlight}>
          <article className={styles.spotlightCard}>
            <div
              className={styles.spotlightMedia}
              style={{ backgroundImage: `url(${safeImage(spotlightEvent.bannerUrl)})` }}
              aria-hidden="true"
            />
            <div className={styles.spotlightContent}>
              <header className={styles.spotlightHeader}>
                <div className={styles.spotlightChips}>
                  <span className={styles.categoryChip}>{spotlightEvent.category}</span>
                  {renderStatusBadge(spotlightEvent)}
                  <span className={styles.entryChip}>{formatEntryFee(spotlightEvent)}</span>
                </div>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => navigate(`/events/${spotlightEvent._id}`)}
                >
                  <ArrowRight size={18} />
                </button>
              </header>
              <h2 className={styles.spotlightTitle}>{spotlightEvent.title}</h2>
              <p className={styles.spotlightSubtitle}>{renderCountdown(spotlightEvent)}</p>
              <div className={styles.spotlightStats}>
                <span className={styles.statChip}>
                  <Trophy size={14} /> {spotlightEvent.prizePool || 'Prize reveal soon'}
                </span>
                <span className={styles.statChip}>
                  <Users size={14} />
                  {spotlightEvent.registeredCount}/{spotlightEvent.maxParticipants || '∞'} players
                </span>
              </div>
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: spotlightEvent.maxParticipants
                        ? `${Math.min(
                            100,
                            Math.round(
                              (spotlightEvent.registeredCount / spotlightEvent.maxParticipants) * 100,
                            ),
                          )}%`
                        : '100%',
                    }}
                  />
                </div>
                <span className={styles.progressLabel}>
                  {spotlightEvent.maxParticipants
                    ? `${spotlightEvent.registeredCount}/${spotlightEvent.maxParticipants} seats taken`
                    : `${spotlightEvent.registeredCount} teams already in`}
                </span>
              </div>
              <div className={styles.spotlightActions}>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => navigate(`/events/${spotlightEvent._id}`)}
                >
                  Event details
                </button>
                {renderPrimaryCta(spotlightEvent)}
              </div>
            </div>
          </article>
          {highlightEvents.length > 0 && (
            <div className={styles.highlightList}>
              {highlightEvents.map((event) => (
                <article key={event._id} className={styles.highlightCard}>
                  <div className={styles.highlightHeader}>
                    <span className={styles.categoryChip}>{event.category}</span>
                    {renderStatusBadge(event)}
                  </div>
                  <h3>{event.title}</h3>
                  <p>{renderCountdown(event)}</p>
                  <div className={styles.highlightStats}>
                    <span>
                      <Trophy size={14} /> {event.prizePool || 'Prize TBD'}
                    </span>
                    <span>
                      <Users size={14} /> {event.registeredCount}/{event.maxParticipants || '∞'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.ghostAction}
                    onClick={() => navigate(`/events/${event._id}`)}
                  >
                    View event
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {loading ? (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={styles.skeletonCard} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.feedbackCard}>
          <h3>Unable to load events</h3>
          <p>{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.feedbackCard}>
          <h3>No events available yet</h3>
          <p>
            We are lining up the next wave of community experiences. Check back soon or explore a
            different category above.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.gridHeader}>
            <div>
              <h3>Browse all events</h3>
              <p>
                {gridEvents.length} experiences match your filters. Pick one to view the details and
                register.
              </p>
            </div>
            <div className={styles.gridHints}>
              <span>
                <Target size={14} /> Filters active: {status !== 'All' || entry !== 'All' ? 'Yes' : 'No'}
              </span>
              <span>
                <Users size={14} /> {stageSummary.totalRegistrations.toLocaleString()} total registrants
              </span>
            </div>
          </div>
          <div className={styles.cardsGrid}>
            {gridEvents.map((event) => {
              const cover = safeImage(event.bannerUrl);
              const participantsLabel = event.maxParticipants
                ? `${Math.min(event.registeredCount, event.maxParticipants)}/${event.maxParticipants}`
                : `${event.registeredCount}`;
              return (
                <article key={event._id} className={styles.card}>
                  <div className={styles.cardMedia} style={{ backgroundImage: `url(${cover})` }} aria-hidden="true">
                    {event.highlightLabel && <span className={styles.highlightBadge}>{event.highlightLabel}</span>}
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardChips}>
                      <span className={styles.categoryChip}>{event.category}</span>
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
            <button type="button" className={styles.loadMore} onClick={handleLoadMore} disabled={busy}>
              {busy ? <Loader2 size={16} className={styles.spin} /> : 'Load more events'}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default EventsHub;
