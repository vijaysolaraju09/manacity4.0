import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { CalendarClock, Clock, MapPin, Share2, Trophy, X, Sparkles } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store';
import {
  fetchEventById,
  fetchRegistrations,
  fetchMyRegistration,
  fetchEventUpdates,
  fetchLeaderboard,
  registerForEvent,
  unregisterFromEvent,
  resetEventDetail,
} from '@/store/events.slice';
import type { EventSummary } from '@/types/events';
import { formatDateTime } from '@/utils/date';
import { formatINR } from '@/utils/currency';
import EventsSkeleton from '@/components/common/EventsSkeleton';
import ErrorCard from '@/components/common/ErrorCard';
import showToast from '@/components/ui/Toast';
import fallbackImage from '@/assets/no-image.svg';
import styles from './EventDetails.module.scss';

type TabKey = 'overview' | 'rules' | 'rewards' | 'updates' | 'participants' | 'leaderboard';
type EventStage = 'upcoming' | 'live' | 'completed';

const safeImage = (url?: string | null) => (typeof url === 'string' && url.trim().length > 0 ? url : fallbackImage);

const determineStage = (event: EventSummary, now: number): EventStage => {
  const lifecycle = event.lifecycleStatus ?? 'upcoming';
  if (lifecycle === 'ongoing' || event.status === 'ongoing') return 'live';
  if (lifecycle === 'past' || event.status === 'completed' || event.status === 'canceled') return 'completed';
  const start = Date.parse(event.startAt);
  const end = event.endAt ? Date.parse(event.endAt) : Number.NaN;
  if (Number.isFinite(start) && start <= now && (!Number.isFinite(end) || end >= now)) return 'live';
  if (Number.isFinite(end) && end < now) return 'completed';
  return 'upcoming';
};

const formatCountdown = (target: number, now: number) => {
  if (!Number.isFinite(target)) return 'TBA';
  const diff = Math.max(0, target - now);
  const seconds = Math.floor(diff / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(minutes, 0)}m`;
};

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const detail = useSelector((state: RootState) => state.events.detail);
  const registrations = useSelector((state: RootState) => state.events.registrations);
  const myRegistration = useSelector((state: RootState) => state.events.myRegistration);
  const updates = useSelector((state: RootState) => state.events.updates);
  const leaderboard = useSelector((state: RootState) => state.events.leaderboard);
  const actions = useSelector((state: RootState) => state.events.actions);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [now, setNow] = useState(Date.now());
  const [showRegistration, setShowRegistration] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [memberInputs, setMemberInputs] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

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
    if (!id) return;
    if (activeTab === 'participants' && !registrations.loading && registrations.items.length === 0) {
      dispatch(fetchRegistrations(id));
    }
    if (activeTab === 'updates' && !updates.loading && updates.items.length === 0) {
      dispatch(fetchEventUpdates(id));
    }
    if (activeTab === 'leaderboard' && !leaderboard.loading && leaderboard.items.length === 0) {
      dispatch(fetchLeaderboard(id));
    }
  }, [activeTab, dispatch, id, registrations.loading, registrations.items.length, updates.loading, updates.items.length, leaderboard.loading, leaderboard.items.length]);

  useEffect(() => {
    if (!id) return;
    const interval = window.setInterval(() => {
      dispatch(fetchEventById(id));
      if (activeTab === 'participants') dispatch(fetchRegistrations(id));
      if (activeTab === 'leaderboard') dispatch(fetchLeaderboard(id));
      if (activeTab === 'updates') dispatch(fetchEventUpdates(id));
    }, 30000);
    return () => window.clearInterval(interval);
  }, [dispatch, id, activeTab]);

  const availableTabs = useMemo(() => {
    const tabs: Array<{ key: TabKey; label: string }> = [{ key: 'overview', label: 'Overview' }];
    if ((event?.rules ?? '').trim().length > 0) {
      tabs.push({ key: 'rules', label: 'Rules' });
    }
    if ((event?.rewards?.length ?? 0) > 0 || (event?.prizePool ?? '').trim().length > 0) {
      tabs.push({ key: 'rewards', label: 'Rewards' });
    }
    tabs.push({ key: 'participants', label: `Participants${registrations.total ? ` (${registrations.total})` : ''}` });
    tabs.push({ key: 'updates', label: `Updates${updates.total ? ` (${updates.total})` : ''}` });
    tabs.push({ key: 'leaderboard', label: 'Leaderboard' });
    return tabs;
  }, [event, registrations.total, updates.total]);

  useEffect(() => {
    if (availableTabs.some((tab) => tab.key === activeTab)) return;
    if (availableTabs.length > 0) {
      setActiveTab(availableTabs[0].key);
    }
  }, [activeTab, availableTabs]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (!hash) return;
      if (hash === 'register') {
        setShowRegistration(true);
        return;
      }
      const matchedTab = availableTabs.find((tab) => tab.key === hash);
      if (matchedTab) {
        setActiveTab(matchedTab.key);
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [availableTabs]);

  const stage = event ? determineStage(event, now) : 'upcoming';
  const countdown = useMemo(() => {
    if (!event) return '';
    const startAt = Date.parse(event.startAt);
    const endAt = event.endAt ? Date.parse(event.endAt) : Number.NaN;
    if (stage === 'live' && Number.isFinite(endAt)) return `Ends in ${formatCountdown(endAt, now)}`;
    if (stage === 'upcoming' && Number.isFinite(startAt)) return `Starts in ${formatCountdown(startAt, now)}`;
    if (stage === 'completed' && Number.isFinite(endAt)) {
      const ended = formatDateTime(new Date(endAt).toISOString());
      return `Ended ${ended}`;
    }
    return stage === 'live' ? 'Happening now' : 'Schedule coming soon';
  }, [event, now, stage]);

  const registrationWindow = useMemo(() => {
    if (!event) return { open: false, closeIn: '', openTime: '', closeTime: '' };
    const openTime = Date.parse(event.registrationOpenAt);
    const closeTime = Date.parse(event.registrationCloseAt);
    const isOpen = (() => {
      const withinWindow =
        (!Number.isFinite(openTime) || openTime <= now) && (!Number.isFinite(closeTime) || closeTime >= now);
      if (typeof event.isRegistrationOpen === 'boolean') {
        return event.isRegistrationOpen && withinWindow;
      }
      return withinWindow;
    })();
    const closeLabel = Number.isFinite(closeTime) ? `Closes in ${formatCountdown(closeTime, now)}` : 'Closes soon';
    return {
      open: isOpen,
      closeIn: closeLabel,
      openTime: formatDateTime(event.registrationOpenAt),
      closeTime: formatDateTime(event.registrationCloseAt),
    };
  }, [event, now]);

  const capacityFull = Boolean(
    event?.maxParticipants && event.maxParticipants > 0 && event.registeredCount >= event.maxParticipants,
  );
  const isRegistered = Boolean(myRegistration.data && myRegistration.data.status !== 'withdrawn');
  const waitlisted = myRegistration.data?.status === 'waitlisted';

  const openRegistrationModal = () => {
    if (!event) return;
    setTeamName('');
    setNotes('');
    setFormError(null);
    const teammateSlots = Math.max(0, (event.teamSize ?? 1) - 1);
    setMemberInputs(Array.from({ length: teammateSlots }, () => ''));
    setShowRegistration(true);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !event) return;
    setFormError(null);
    if (event.teamSize > 1 && teamName.trim().length === 0) {
      setFormError('Team name is required');
      return;
    }
    const members = memberInputs
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .map((name) => ({ name }));
    try {
      await dispatch(
        registerForEvent({
          eventId: id,
          payload: {
            teamName: event.teamSize > 1 ? teamName.trim() : undefined,
            members,
            metadata: notes.trim().length > 0 ? { notes: notes.trim() } : undefined,
          },
        }),
      ).unwrap();
      setShowRegistration(false);
      showToast('Registration confirmed', 'success');
      dispatch(fetchEventById(id));
      dispatch(fetchRegistrations(id));
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Unable to register for this event';
      setFormError(message);
      showToast(message, 'error');
    }
  };

  const handleUnregister = async () => {
    if (!id) return;
    try {
      await dispatch(unregisterFromEvent(id)).unwrap();
      showToast('Registration cancelled', 'success');
      dispatch(fetchEventById(id));
      dispatch(fetchRegistrations(id));
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Unable to cancel registration';
      showToast(message, 'error');
    }
  };

  const handleShare = () => {
    if (!event || typeof navigator === 'undefined') return;
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      clipboard?: Clipboard;
    };
    const shareData: ShareData = {
      title: event.title,
      text: `Join me at ${event.title} on Manacity!`,
      url: window.location.href,
    };
    if (typeof nav.share === 'function') {
      void nav.share(shareData).catch(() => {
        showToast('Unable to share right now', 'error');
      });
    } else if (nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      nav.clipboard
        .writeText(window.location.href)
        .then(() => showToast('Link copied to clipboard', 'success'))
        .catch(() => showToast('Unable to copy link', 'error'));
    }
  };

  if (detail.loading && !detail.data) {
    return <EventsSkeleton />;
  }

  if (detail.error || !event) {
    return (
      <ErrorCard
        msg={detail.error || 'Event not found'}
        onRetry={() => id && dispatch(fetchEventById(id))}
      />
    );
  }

  const entryFeeLabel = (() => {
    const paise =
      typeof event.entryFeePaise === 'number' && Number.isFinite(event.entryFeePaise)
        ? event.entryFeePaise
        : undefined;
    if (typeof paise === 'number' && paise > 0) return formatINR(paise);
    const rupees =
      typeof event.entryFee === 'number' && Number.isFinite(event.entryFee) ? event.entryFee : undefined;
    return typeof rupees === 'number' && rupees > 0 ? `₹${Math.round(rupees)}` : 'FREE';
  })();

  const prizeLabel = event.prizePool && event.prizePool.trim().length > 0 ? event.prizePool : 'Announced soon';

  const registrationStatusLabel = (() => {
    if (isRegistered) return myRegistration.data?.status === 'checked_in' ? 'Checked in' : 'Registered';
    if (waitlisted) return 'Waitlisted';
    if (capacityFull) return 'Full';
    return registrationWindow.open ? 'Open' : 'Closed';
  })();

  const participantsCount = event.maxParticipants
    ? `${Math.min(event.registeredCount, event.maxParticipants)}/${event.maxParticipants}`
    : `${event.registeredCount}`;

  const canRegister = stage === 'upcoming' && registrationWindow.open && !capacityFull && !isRegistered && !waitlisted;
  const canUnregister = isRegistered && stage !== 'completed' && actions.unregister !== 'loading';

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div
          className={styles.heroMedia}
          style={{ backgroundImage: `url(${safeImage(event.coverUrl || event.bannerUrl)})` }}
          aria-hidden="true"
        />
        <div className={styles.heroContent}>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>{event.category}</span>
            <span
              className={`${styles.badge} ${
                stage === 'live' ? styles.badgeLive : stage === 'upcoming' ? styles.badgeUpcoming : styles.badgeClosed
              }`}
            >
              {stage === 'live' ? 'Live' : stage === 'upcoming' ? 'Upcoming' : 'Completed'}
            </span>
            <span className={styles.badge}>{registrationStatusLabel}</span>
            <span className={styles.badge}>{entryFeeLabel}</span>
          </div>
          <h1 className={styles.heroTitle}>{event.title}</h1>
          {event.shortDescription && <p className={styles.heroSummary}>{event.shortDescription}</p>}
          <span className={styles.countdown}>{countdown}</span>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Prize Pool</span>
              <span className={styles.statValue}>{prizeLabel}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Participants</span>
              <span className={styles.statValue}>{participantsCount}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Starts</span>
              <span className={styles.statValue}>{formatDateTime(event.startAt)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Format</span>
              <span className={styles.statValue}>{event.format.replace(/_/g, ' ')}</span>
            </div>
          </div>
          <div id="register" className={styles.ctaGroup}>
            {canRegister && (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={openRegistrationModal}
                disabled={actions.register === 'loading'}
              >
                {actions.register === 'loading' ? 'Processing…' : 'Register'}
              </button>
            )}
            {canUnregister && (
              <button type="button" className={styles.secondaryBtn} onClick={handleUnregister}>
                Cancel registration
              </button>
            )}
            <button type="button" className={styles.ghostBtn} onClick={handleShare}>
              <Share2 size={16} /> Share
            </button>
          </div>
          {waitlisted && <span className={styles.notice}>You are currently waitlisted. We will notify you if a slot opens.</span>}
          {capacityFull && !isRegistered && (
            <span className={styles.notice}>All slots are filled. Check back in case of last-minute openings.</span>
          )}
        </div>
      </section>

      <nav className={styles.tabBar}>
        {availableTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${tab.key === activeTab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.content}>
        {activeTab === 'overview' && (
          <>
            <section className={styles.sectionCard}>
              <h2>Registration timeline</h2>
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                  <div>
                    <strong>Opens</strong>
                    <p>{formatDateTime(event.registrationOpenAt)}</p>
                  </div>
                  <CalendarClock size={18} />
                </div>
                <div className={styles.timelineItem}>
                  <div>
                    <strong>Closes</strong>
                    <p>{formatDateTime(event.registrationCloseAt)}</p>
                  </div>
                  <Clock size={18} />
                </div>
                <div className={styles.timelineItem}>
                  <div>
                    <strong>Kick-off</strong>
                    <p>{formatDateTime(event.startAt)}</p>
                  </div>
                  <Sparkles size={18} />
                </div>
                {event.endAt && (
                  <div className={styles.timelineItem}>
                    <div>
                      <strong>Final whistle</strong>
                      <p>{formatDateTime(event.endAt)}</p>
                    </div>
                    <Trophy size={18} />
                  </div>
                )}
              </div>
            </section>

            <section className={styles.sectionCard}>
              <h2>Event structure</h2>
              <p>
                {event.structure
                  ? `This is a ${event.structure} format with team size of ${event.teamSize}.`
                  : `This event supports ${event.teamSize > 1 ? 'team-based play' : 'solo participants'}.`}
              </p>
              <p>
                Matches will follow the {event.format.replace(/_/g, ' ')} format in {event.mode === 'venue' ? 'venue' : 'online'} mode.
              </p>
              {event.mode === 'venue' && event.venue && (
                <p className={styles.notice}>
                  <MapPin size={16} /> {event.venue}
                </p>
              )}
            </section>
          </>
        )}

        {activeTab === 'rules' && (
          <section className={styles.sectionCard}>
            <h2>Rules</h2>
            <p>{event.rules || 'Detailed rules will be shared before the event begins.'}</p>
          </section>
        )}

        {activeTab === 'rewards' && (
          <section className={styles.sectionCard}>
            <h2>Rewards</h2>
            {event.rewards && event.rewards.length > 0 ? (
              <ul className={styles.list}>
                {event.rewards.map((reward, index) => (
                  <li key={`${reward}-${index}`} className={styles.updateCard}>
                    <span>{reward}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Prize pool: {prizeLabel}</p>
            )}
          </section>
        )}

        {activeTab === 'updates' && (
          <section className={styles.sectionCard}>
            <h2>Live updates</h2>
            {updates.loading ? (
              <p>Fetching updates…</p>
            ) : updates.error ? (
              <div className={styles.errorState}>{updates.error}</div>
            ) : updates.items.length === 0 ? (
              <div className={styles.emptyState}>No updates posted yet.</div>
            ) : (
              <div className={styles.list}>
                {updates.items.map((update) => (
                  <article key={update._id} className={styles.updateCard}>
                    <header className={styles.updateHeader}>
                      <span>{update.type.toUpperCase()}</span>
                      <time>{formatDateTime(update.createdAt)}</time>
                    </header>
                    <p>{update.message}</p>
                    {update.postedBy && <span className={styles.helperText}>by {update.postedBy}</span>}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'participants' && (
          <section className={styles.sectionCard}>
            <h2>Participants</h2>
            {registrations.loading ? (
              <p>Loading participants…</p>
            ) : registrations.error ? (
              <div className={styles.errorState}>{registrations.error}</div>
            ) : registrations.items.length === 0 ? (
              <div className={styles.emptyState}>No registrations yet. Be the first to join!</div>
            ) : (
              <div className={styles.list}>
                {registrations.items.map((item) => (
                  <div key={item._id} className={styles.participantCard}>
                    <span>{item.teamName || item.user?.name || 'Participant'}</span>
                    <span className={styles.participantStatus}>{item.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'leaderboard' && (
          <section className={styles.sectionCard}>
            <h2>Leaderboard</h2>
            {leaderboard.loading ? (
              <p>Loading leaderboard…</p>
            ) : leaderboard.error ? (
              <div className={styles.errorState}>{leaderboard.error}</div>
            ) : leaderboard.items.length === 0 ? (
              <div className={styles.emptyState}>Leaderboard will appear once results flow in.</div>
            ) : (
              <table className={styles.leaderboardTable}>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Participant</th>
                    <th>Points</th>
                    <th>Wins</th>
                    <th>Losses</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.items.map((entry, index) => (
                    <tr key={entry._id ?? `${entry.participantId}-${index}`}>
                      <td>{entry.rank ?? index + 1}</td>
                      <td>{entry.teamName || entry.user || entry.participantId || '—'}</td>
                      <td>{entry.points ?? 0}</td>
                      <td>{entry.wins ?? 0}</td>
                      <td>{entry.losses ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </div>

      {showRegistration && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.ctaGroup} style={{ justifyContent: 'space-between' }}>
              <h3>Register for {event.title}</h3>
              <button type="button" className={styles.ghostBtn} onClick={() => setShowRegistration(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRegister}>
              {event.teamSize > 1 && (
                <label>
                  Team name
                  <input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Champions"
                    required
                  />
                </label>
              )}
              {memberInputs.map((value, index) => (
                <label key={`member-${index}`}>
                  Teammate {index + 1} name
                  <input
                    value={value}
                    onChange={(e) =>
                      setMemberInputs((prev) =>
                        prev.map((item, idx) => (idx === index ? e.target.value : item)),
                      )
                    }
                    placeholder="Player name"
                  />
                </label>
              ))}
              <label>
                Notes (optional)
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Share roster IDs or preferred lobby"
                />
              </label>
              {formError && <span className={styles.errorState}>{formError}</span>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowRegistration(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={actions.register === 'loading'}>
                  {actions.register === 'loading' ? 'Submitting…' : 'Confirm entry'}
                </button>
              </div>
              <span className={styles.helperText}>
                {event.teamSize > 1
                  ? `Up to ${event.teamSize} players per team. Share final rosters before check-in.`
                  : 'Solo slots are first-come-first-serve.'}
              </span>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;
