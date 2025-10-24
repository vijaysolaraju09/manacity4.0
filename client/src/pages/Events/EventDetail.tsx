import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Clock,
  Gauge,
  Loader2,
  MapPin,
  Share2,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import type { AppDispatch, RootState } from '@/store';
import {
  fetchEventById,
  fetchEventUpdates,
  fetchLeaderboard,
  fetchMyRegistration,
  fetchRegistrations,
  resetEventDetail,
  unregisterFromEvent,
} from '@/store/events.slice';
import type { EventDetail, EventRegistrationSummary } from '@/types/events';
import { formatDateTime } from '@/utils/date';
import { formatINR } from '@/utils/currency';
import { formatCountdown } from '@/utils/time';
import fallbackImage from '@/assets/no-image.svg';
import EventsSkeleton from '@/components/common/EventsSkeleton';
import ErrorCard from '@/components/common/ErrorCard';
import showToast from '@/components/ui/Toast';
import styles from './EventDetail.module.scss';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'about', label: 'About' },
  { key: 'rules', label: 'Rules' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'structure', label: 'Structure' },
  { key: 'participants', label: 'Participants' },
  { key: 'updates', label: 'Updates' },
  { key: 'leaderboard', label: 'Leaderboard' },
];

type TabKey =
  | 'about'
  | 'rules'
  | 'rewards'
  | 'structure'
  | 'participants'
  | 'updates'
  | 'leaderboard';

type Stage = 'upcoming' | 'live' | 'completed';

type CountdownKind = 'start' | 'end' | 'none';

const safeImage = (url?: string | null) =>
  typeof url === 'string' && url.trim().length > 0 ? url : fallbackImage;

const determineStage = (event: EventDetail, now: number): Stage => {
  const start = Date.parse(event.startAt);
  const end = event.endAt ? Date.parse(event.endAt) : Number.NaN;
  if (event.status === 'completed' || event.status === 'canceled' || (Number.isFinite(end) && end < now)) {
    return 'completed';
  }
  if (
    event.status === 'ongoing' ||
    (Number.isFinite(start) && start <= now && (!Number.isFinite(end) || end >= now))
  ) {
    return 'live';
  }
  return 'upcoming';
};

const getEntryLabel = (event?: EventDetail | null): string => {
  if (!event) return 'Free';
  if (typeof event.entryFeePaise === 'number' && event.entryFeePaise > 0) {
    return formatINR(event.entryFeePaise);
  }
  if (typeof event.entryFee === 'number' && event.entryFee > 0) {
    return `₹${Math.round(event.entryFee)}`;
  }
  return 'Free';
};

const toInitials = (value?: string | null) => {
  if (!value) return 'NA';
  const trimmed = value.trim();
  if (trimmed.length === 0) return 'NA';
  const segments = trimmed.split(/\s+/);
  if (segments.length === 1) return segments[0].slice(0, 2).toUpperCase();
  return `${segments[0][0] ?? ''}${segments[segments.length - 1][0] ?? ''}`.toUpperCase();
};

const shareEvent = (event?: EventDetail | null) => {
  if (!event || typeof navigator === 'undefined') return;
  const shareData = {
    title: event.title,
    text: `${event.title} on Manacity`,
    url: window.location.href,
  };
  if (navigator.share) {
    void navigator.share(shareData);
  } else if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(shareData.url);
    showToast('Link copied to clipboard', 'success');
  }
};

const EventDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const detail = useSelector((state: RootState) => state.events.detail);
  const registrations = useSelector((state: RootState) => state.events.registrations);
  const updates = useSelector((state: RootState) => state.events.updates);
  const leaderboard = useSelector((state: RootState) => state.events.leaderboard);
  const myRegistration = useSelector((state: RootState) => state.events.myRegistration);
  const actions = useSelector((state: RootState) => state.events.actions);

  const [activeTab, setActiveTab] = useState<TabKey>('about');
  const [now, setNow] = useState(Date.now());
  const [expandedUpdates, setExpandedUpdates] = useState<Record<string, boolean>>({});
  const [lastLoadedTab, setLastLoadedTab] = useState<Record<TabKey, boolean>>({
    about: true,
    rules: false,
    rewards: false,
    structure: false,
    participants: false,
    updates: false,
    leaderboard: false,
  });

  const tabContentRef = useRef<HTMLDivElement | null>(null);

  const event = detail.data;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!id) return;
    const promise = dispatch(fetchEventById(id));
    dispatch(fetchMyRegistration(id));
    return () => {
      promise.abort?.();
      dispatch(resetEventDetail());
    };
  }, [dispatch, id]);

  useEffect(() => {
    const hash = location.hash.replace('#', '').toLowerCase();
    if (!hash) return;
    if (hash === 'register') {
      navigate(`/events/${id}/register`, { replace: true });
      return;
    }
    const matched = tabs.find((tab) => tab.key === hash);
    if (matched) {
      setActiveTab(matched.key);
    }
  }, [location.hash, id, navigate]);

  useEffect(() => {
    if (!id) return;
    if (activeTab === 'participants' && !lastLoadedTab.participants) {
      dispatch(fetchRegistrations({ eventId: id }));
      setLastLoadedTab((prev) => ({ ...prev, participants: true }));
    }
    if (activeTab === 'updates' && !lastLoadedTab.updates) {
      dispatch(fetchEventUpdates(id));
      setLastLoadedTab((prev) => ({ ...prev, updates: true }));
    }
    if (activeTab === 'leaderboard' && !lastLoadedTab.leaderboard) {
      dispatch(fetchLeaderboard(id));
      setLastLoadedTab((prev) => ({ ...prev, leaderboard: true }));
    }
  }, [activeTab, dispatch, id, lastLoadedTab]);

  useEffect(() => {
    if (!id || !event) return undefined;
    const status = event.status;
    if (['completed', 'canceled'].includes(status)) return undefined;
    const interval = window.setInterval(() => {
      dispatch(fetchEventById(id));
      if (activeTab === 'participants') {
        dispatch(fetchRegistrations({ eventId: id }));
      }
      if (activeTab === 'updates') {
        dispatch(fetchEventUpdates(id));
      }
      if (activeTab === 'leaderboard') {
        dispatch(fetchLeaderboard(id));
      }
    }, 25000);
    return () => window.clearInterval(interval);
  }, [dispatch, id, event, activeTab]);

  const stage: Stage = useMemo(() => {
    if (!event) return 'upcoming';
    return determineStage(event, now);
  }, [event, now]);

  const countdown = useMemo(() => {
    if (!event) return { kind: 'none' as CountdownKind, label: '' };
    const start = Date.parse(event.startAt);
    const end = event.endAt ? Date.parse(event.endAt) : Number.NaN;
    if (stage === 'upcoming' && Number.isFinite(start)) {
      const parts = formatCountdown(start);
      const label = `${parts.d > 0 ? `${parts.d}d ` : ''}${parts.h > 0 ? `${parts.h}h ` : ''}${parts.m}m`;
      return { kind: 'start' as CountdownKind, label: `Starts in ${label.trim()}` };
    }
    if (stage === 'live' && Number.isFinite(end)) {
      const parts = formatCountdown(end);
      const label = `${parts.d > 0 ? `${parts.d}d ` : ''}${parts.h > 0 ? `${parts.h}h ` : ''}${parts.m}m`;
      return { kind: 'end' as CountdownKind, label: `Ends in ${label.trim()}` };
    }
    if (stage === 'completed') {
      const endedAt = Number.isFinite(end) ? formatDateTime(new Date(end).toISOString()) : '';
      return { kind: 'none' as CountdownKind, label: endedAt ? `Completed on ${endedAt}` : 'Event completed' };
    }
    return { kind: 'none' as CountdownKind, label: stage === 'live' ? 'Live now' : 'Schedule TBA' };
  }, [event, stage]);

  const registrationWindow = useMemo(() => {
    if (!event) {
      return {
        isOpen: false,
        opensAt: '',
        closesAt: '',
        closesIn: '',
      };
    }
    const openTime = Date.parse(event.registrationOpenAt);
    const closeTime = Date.parse(event.registrationCloseAt);
    const withinWindow =
      (!Number.isFinite(openTime) || openTime <= now) && (!Number.isFinite(closeTime) || closeTime >= now);
    const closesIn = Number.isFinite(closeTime)
      ? (() => {
          const parts = formatCountdown(closeTime);
          if (parts.d > 0) return `${parts.d}d ${parts.h}h`;
          if (parts.h > 0) return `${parts.h}h ${parts.m}m`;
          return `${parts.m}m`;
        })()
      : '';
    return {
      isOpen: withinWindow && stage === 'upcoming',
      opensAt: formatDateTime(event.registrationOpenAt),
      closesAt: formatDateTime(event.registrationCloseAt),
      closesIn: closesIn ? `Closes in ${closesIn}` : 'Closes soon',
    };
  }, [event, now, stage]);

  const capacityFull = Boolean(
    event?.maxParticipants && event.maxParticipants > 0 && event.registeredCount >= event.maxParticipants,
  );

  const occupancyPercent = useMemo(() => {
    if (!event?.maxParticipants || event.maxParticipants <= 0) return null;
    const ratio = event.registeredCount / event.maxParticipants;
    return Math.min(100, Math.round(ratio * 100));
  }, [event?.maxParticipants, event?.registeredCount]);

  const participantList = useMemo(() => (registrations.items ?? []) as EventRegistrationSummary[], [registrations.items]);

  const updatesList = useMemo(() => updates.items ?? [], [updates.items]);

  const leaderboardRows = useMemo(() => leaderboard.items ?? [], [leaderboard.items]);

  const isRegistered = Boolean(myRegistration.data && myRegistration.data.status !== 'withdrawn');
  const waitlisted = myRegistration.data?.status === 'waitlisted';

  const canRegister = registrationWindow.isOpen && !capacityFull && !isRegistered;
  const canUnregister = isRegistered && stage === 'upcoming';

  const entryLabel = getEntryLabel(event);

  const goToTab = (key: TabKey) => {
    setActiveTab(key);
    window.requestAnimationFrame(() => {
      const target = tabContentRef.current;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const handleUnregister = async () => {
    if (!id) return;
    try {
      await dispatch(unregisterFromEvent(id)).unwrap();
      showToast('You have been unregistered', 'success');
      await dispatch(fetchEventById(id));
      await dispatch(fetchMyRegistration(id));
      await dispatch(fetchRegistrations({ eventId: id }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to unregister';
      showToast(message, 'error');
    }
  };

  const heroBanner = safeImage(event?.coverUrl ?? event?.bannerUrl);

  const toggleUpdate = (updateId: string) => {
    setExpandedUpdates((prev) => ({ ...prev, [updateId]: !prev[updateId] }));
  };

  const renderTabContent = () => {
    if (!event) return null;
    switch (activeTab) {
      case 'about':
        return (
          <div className={styles.aboutSection}>
            <div className={styles.aboutGrid}>
              <div className={styles.infoCard}>
                <h3>Schedule</h3>
                <div className={styles.infoRow}>
                  <CalendarClock size={16} />
                  <span>
                    {formatDateTime(event.startAt)}
                    {event.endAt ? ` – ${formatDateTime(event.endAt)}` : ''}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <Clock size={16} />
                  <span>{countdown.label || 'Schedule TBA'}</span>
                </div>
                <div className={styles.infoRow}>
                  <Users size={16} />
                  <span>
                    {event.registeredCount}/{event.maxParticipants || '∞'} slots
                  </span>
                </div>
                {event.mode === 'venue' && event.venue && (
                  <div className={styles.infoRow}>
                    <MapPin size={16} />
                    <span>{event.venue}</span>
                  </div>
                )}
              </div>
              <div className={styles.infoCard}>
                <h3>Registration window</h3>
                <div className={styles.infoRow}>
                  <span className={styles.inlineLabel}>Opens</span>
                  <span>{registrationWindow.opensAt || 'TBA'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.inlineLabel}>Closes</span>
                  <span>{registrationWindow.closesAt || 'TBA'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.inlineLabel}>Status</span>
                  <span>{registrationWindow.isOpen ? registrationWindow.closesIn : 'Closed'}</span>
                </div>
              </div>
              <div className={styles.infoCard}>
                <h3>Prize pool & entry</h3>
                <div className={styles.infoRow}>
                  <Trophy size={16} />
                  <span>{event.prizePool || 'Announcing soon'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.inlineLabel}>Entry</span>
                  <span>{entryLabel}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.inlineLabel}>Format</span>
                  <span>{event.format}</span>
                </div>
              </div>
            </div>
            <article className={styles.richText}>
              {event.description && event.description.trim().length > 0 ? (
                event.description.split(/\n+/).map((paragraph, index) => (
                  <p key={`about-${index}`}>{paragraph}</p>
                ))
              ) : (
                <p>No description yet.</p>
              )}
            </article>
          </div>
        );
      case 'rules':
        return (
          <article className={styles.richText}>
            {event.rules && event.rules.trim().length > 0 ? (
              event.rules.split(/\n+/).map((rule, index) => <p key={`rule-${index}`}>{rule}</p>)
            ) : (
              <p>No rules provided.</p>
            )}
          </article>
        );
      case 'rewards':
        return (
          <div className={styles.listSection}>
            {event.rewards && event.rewards.length > 0 ? (
              <ul>
                {event.rewards.map((reward, index) => (
                  <li key={index}>{reward}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.mutedText}>Rewards will be announced soon.</p>
            )}
          </div>
        );
      case 'structure':
        return (
          <div className={styles.listSection}>
            <ul>
              <li>Team size: {event.teamSize}</li>
              <li>Mode: {event.mode === 'venue' ? 'On-ground' : 'Online'}</li>
              <li>Visibility: {event.visibility}</li>
              {event.structure && <li>Structure: {event.structure}</li>}
              {event.registrationChecklist && event.registrationChecklist.length > 0 && (
                <li>
                  Registration requirements:
                  <ul className={styles.innerList}>
                    {event.registrationChecklist.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          </div>
        );
      case 'participants':
        if (registrations.loading) {
          return (
            <div className={styles.loadingState}>
              <Loader2 className={styles.spin} /> Loading participants
            </div>
          );
        }
        if (registrations.error) {
          return (
            <ErrorCard
              title="Unable to load participants"
              message={registrations.error}
              onRetry={() => id && dispatch(fetchRegistrations({ eventId: id }))}
            />
          );
        }
        if (participantList.length === 0) {
          return <p className={styles.mutedText}>No registrations yet. Be the first to join!</p>;
        }
        return (
          <div className={styles.participantsGrid}>
            {participantList.map((participant) => {
              const name = participant.teamName || participant.user?.name || 'Unnamed team';
              return (
                <div key={participant._id} className={styles.participantCard}>
                  <div className={styles.avatar}>{toInitials(name)}</div>
                  <div className={styles.participantMeta}>
                    <span className={styles.participantName}>{name}</span>
                    <span className={styles.participantStatus}>{participant.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      case 'updates':
        if (updates.loading) {
          return (
            <div className={styles.loadingState}>
              <Loader2 className={styles.spin} /> Fetching updates
            </div>
          );
        }
        if (updates.error) {
          return (
            <ErrorCard
              title="Updates unavailable"
              message={updates.error}
              onRetry={() => id && dispatch(fetchEventUpdates(id))}
            />
          );
        }
        if (updatesList.length === 0) {
          return <p className={styles.mutedText}>Updates will appear here during the event.</p>;
        }
        return (
          <div className={styles.updatesList}>
            {updatesList.map((update) => {
              const expanded = expandedUpdates[update._id] ?? false;
              const Icon = expanded ? ChevronUp : ChevronDown;
              return (
                <article key={update._id} className={styles.updateCard}>
                  <header>
                    <span className={`${styles.updateType} ${styles[`updateType${update.type}`] || ''}`}>
                      {update.type.toUpperCase()}
                    </span>
                    <time>{formatDateTime(update.createdAt)}</time>
                  </header>
                  <p className={expanded ? styles.updateTextExpanded : styles.updateText}>{update.message}</p>
                  <footer>
                    {update.postedBy && <span className={styles.updateAuthor}>By {update.postedBy}</span>}
                    <button type="button" className={styles.updateToggle} onClick={() => toggleUpdate(update._id)}>
                      <Icon size={14} />
                      {expanded ? 'Show less' : 'Show more'}
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
        );
      case 'leaderboard':
        if (leaderboard.loading) {
          return (
            <div className={styles.loadingState}>
              <Loader2 className={styles.spin} /> Loading leaderboard
            </div>
          );
        }
        if (leaderboard.error) {
          return (
            <ErrorCard
              title="Leaderboard unavailable"
              message={leaderboard.error}
              onRetry={() => id && dispatch(fetchLeaderboard(id))}
            />
          );
        }
        if (leaderboardRows.length === 0) {
          return <p className={styles.mutedText}>Leaderboard will appear once the event starts.</p>;
        }
        return (
          <div className={styles.leaderboardTable}>
            <div className={styles.tableRow}>
              <span>Rank</span>
              <span>Name / Team</span>
              <span>Points</span>
            </div>
            {leaderboardRows.map((entry, index) => (
              <div key={entry.participantId ?? `${index}-${entry.teamName ?? entry.user}`} className={styles.tableRow}>
                <span>{entry.rank ?? index + 1}</span>
                <span>{entry.teamName ?? entry.user ?? 'Participant'}</span>
                <span>{entry.points ?? 0}</span>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  if (detail.loading && !detail.data) {
    return <EventsSkeleton />;
  }

  if (detail.error && !detail.data) {
    return (
      <div className={styles.page}>
        <ErrorCard
          title="Unable to load event"
          message={detail.error}
          onRetry={() => id && dispatch(fetchEventById(id))}
        />
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.page}>
        <ErrorCard title="Event unavailable" message="This event could not be found." />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroMedia} style={{ backgroundImage: `url(${heroBanner})` }} aria-hidden="true">
          <div className={styles.heroMediaOverlay} />
          {stage === 'live' && (
            <span className={styles.liveBadge}>
              <Sparkles size={14} /> Live now
            </span>
          )}
        </div>
        <div className={styles.heroMain}>
          <div className={styles.heroHeader}>
            <div className={styles.heroTags}>
              <span className={styles.categoryChip}>{event.category}</span>
              <span
                className={`${styles.stageChip} ${
                  stage === 'live'
                    ? styles.stageLive
                    : stage === 'completed'
                    ? styles.stageCompleted
                    : styles.stageUpcoming
                }`}
              >
                {stage === 'live' ? 'Live' : stage === 'completed' ? 'Completed' : 'Upcoming'}
              </span>
              <span className={styles.entryChip}>{entryLabel}</span>
            </div>
            <button type="button" className={styles.iconButton} onClick={() => shareEvent(event)}>
              <Share2 size={16} />
            </button>
          </div>
          <h1 className={styles.title}>{event.title}</h1>
          {event.shortDescription && <p className={styles.subtitle}>{event.shortDescription}</p>}
          <div className={styles.heroSummary}>
            <div className={styles.heroStat}>
              <CalendarClock size={18} />
              <div>
                <span className={styles.heroStatLabel}>Schedule</span>
                <span className={styles.heroStatValue}>{formatDateTime(event.startAt)}</span>
              </div>
            </div>
            <div className={styles.heroStat}>
              <Users size={18} />
              <div>
                <span className={styles.heroStatLabel}>Participants</span>
                <span className={styles.heroStatValue}>
                  {event.registeredCount}/{event.maxParticipants || '∞'} joined
                </span>
              </div>
            </div>
            <div className={styles.heroStat}>
              <Trophy size={18} />
              <div>
                <span className={styles.heroStatLabel}>Prize pool</span>
                <span className={styles.heroStatValue}>{event.prizePool || 'Prize reveal soon'}</span>
              </div>
            </div>
          </div>
          {countdown.label && (
            <div
              className={`${styles.countdown} ${
                stage === 'live' ? styles.countdownLive : stage === 'completed' ? styles.countdownPast : ''
              }`}
            >
              <Clock size={16} /> {countdown.label}
            </div>
          )}
          <div className={styles.heroInsights}>
            <div className={styles.insightCard}>
              <div className={styles.insightHeader}>
                <CalendarClock size={16} />
                <span>Registration window</span>
              </div>
              <div className={styles.insightBody}>
                <div className={styles.insightLine}>
                  <span>Opens</span>
                  <strong>{registrationWindow.opensAt || 'TBA'}</strong>
                </div>
                <div className={styles.insightLine}>
                  <span>Closes</span>
                  <strong>{registrationWindow.closesAt || 'TBA'}</strong>
                </div>
                <span className={styles.insightPill}>
                  {registrationWindow.isOpen ? registrationWindow.closesIn : 'Registrations closed'}
                </span>
              </div>
            </div>
            <div className={styles.insightCard}>
              <div className={styles.insightHeader}>
                <Gauge size={16} />
                <span>Capacity</span>
              </div>
              <div className={styles.insightBody}>
                <div className={styles.insightLine}>
                  <span>Joined</span>
                  <strong>{event.registeredCount}</strong>
                </div>
                <div className={styles.insightLine}>
                  <span>Slots</span>
                  <strong>{event.maxParticipants || 'Unlimited'}</strong>
                </div>
                <div className={styles.insightProgress}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width:
                          occupancyPercent !== null
                            ? `${occupancyPercent}%`
                            : `${Math.min(100, Math.round(event.registeredCount || 0))}%`,
                      }}
                    />
                  </div>
                  <span>
                    {occupancyPercent !== null ? `${occupancyPercent}% full` : 'Open slots available'}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.insightCard}>
              <div className={styles.insightHeader}>
                <MapPin size={16} />
                <span>{event.mode === 'venue' ? 'On-ground venue' : 'Online experience'}</span>
              </div>
              <div className={styles.insightBody}>
                <div className={styles.insightLine}>
                  <span>Mode</span>
                  <strong>{event.mode === 'venue' ? 'On-ground' : 'Online'}</strong>
                </div>
                <div className={styles.insightLine}>
                  <span>Format</span>
                  <strong>{event.format}</strong>
                </div>
                {event.venue && <p className={styles.insightNote}>{event.venue}</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.tabHeader}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tabButton} ${tab.key === activeTab ? styles.tabActive : ''}`}
            onClick={() => goToTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent} ref={tabContentRef}>
        {renderTabContent()}
      </div>

      <div className={styles.spacer} />

      <aside className={styles.actionRail}>
        <div className={styles.actionCard}>
          <div className={styles.actionContext}>
            <div>
              <span className={styles.actionEyebrow}>
                {capacityFull ? 'Waitlist in effect' : registrationWindow.isOpen ? 'Spots available' : 'Registrations closed'}
              </span>
              <p>
                Team size {event.teamSize}{' '}
                {waitlisted ? '· You are currently waitlisted' : ''}
              </p>
            </div>
            {waitlisted && <span className={styles.waitlistedChip}>Waitlisted</span>}
          </div>
          <div className={styles.actionButtons}>
            {canRegister && (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => navigate(`/events/${id}/register`)}
                disabled={actions.register === 'loading'}
              >
                {actions.register === 'loading' ? <Loader2 className={styles.spin} /> : 'Register now'}
              </button>
            )}
            {canUnregister && (
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleUnregister}
                disabled={actions.unregister === 'loading'}
              >
                {actions.unregister === 'loading' ? <Loader2 className={styles.spin} /> : 'Unregister'}
              </button>
            )}
            {stage !== 'upcoming' && (
              <button type="button" className={styles.secondaryBtn} onClick={() => goToTab('leaderboard')}>
                View leaderboard
              </button>
            )}
            {stage !== 'completed' && (
              <button type="button" className={styles.ghostBtn} onClick={() => goToTab('structure')}>
                View bracket
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className={styles.mobileActions}>
        <div className={styles.mobileContext}>
          <span className={styles.actionEyebrow}>
            {capacityFull ? 'Waitlist active' : registrationWindow.isOpen ? 'Open for registrations' : 'Registrations closed'}
          </span>
          <span className={styles.mobileHint}>Team size {event.teamSize}</span>
        </div>
        {canRegister ? (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => navigate(`/events/${id}/register`)}
            disabled={actions.register === 'loading'}
          >
            {actions.register === 'loading' ? <Loader2 className={styles.spin} /> : 'Register now'}
          </button>
        ) : canUnregister ? (
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleUnregister}
            disabled={actions.unregister === 'loading'}
          >
            {actions.unregister === 'loading' ? <Loader2 className={styles.spin} /> : 'Unregister'}
          </button>
        ) : (
          <button type="button" className={styles.secondaryBtn} onClick={() => goToTab('leaderboard')}>
            View leaderboard
          </button>
        )}
      </div>
    </div>
  );
};

export default EventDetailPage;
