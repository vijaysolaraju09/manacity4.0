import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '@/store';
import {
  fetchEventById,
  registerForEvent,
  unregisterFromEvent,
} from '@/store/events';
import {
  fetchEventUpdates,
  clearEventUpdates,
} from '@/store/eventUpdates';
import {
  fetchEventRegistrations,
  clearEventRegistrations,
} from '@/store/eventRegistrations';
import {
  fetchEventLeaderboard,
  clearEventLeaderboard,
} from '@/store/eventLeaderboard';
import { fetchEventBracket, clearEventBracket } from '@/store/eventBracket';
import { getCountdown, formatDateTime, formatDate } from '@/utils/date';
import showToast from '@/components/ui/Toast';
import EventsSkeleton from '@/components/common/EventsSkeleton';
import ErrorCard from '@/components/common/ErrorCard';
import Empty from '@/components/common/Empty';
import fallbackImage from '@/assets/no-image.svg';
import styles from './EventDetails.module.scss';

const TAB_KEYS = ['about', 'rules', 'updates', 'participants', 'leaderboard', 'bracket'] as const;

type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  about: 'About',
  rules: 'Rules',
  updates: 'Updates',
  participants: 'Participants',
  leaderboard: 'Leaderboard',
  bracket: 'Bracket',
};

const EventDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { detail, registration } = useSelector((state: RootState) => state.events);
  const updates = useSelector((state: RootState) => state.eventUpdates);
  const registrations = useSelector((state: RootState) => state.eventRegistrations);
  const leaderboard = useSelector((state: RootState) => state.eventLeaderboard);
  const bracket = useSelector((state: RootState) => state.eventBracket);

  const [activeTab, setActiveTab] = useState<TabKey>('about');
  const [startCountdown, setStartCountdown] = useState(getCountdown(new Date()));
  const [regCountdown, setRegCountdown] = useState(getCountdown(new Date()));

  const event = detail.item;

  useEffect(() => {
    if (!id) return;
    dispatch(fetchEventById(id));
    return () => {
      dispatch(clearEventUpdates());
      dispatch(clearEventRegistrations());
      dispatch(clearEventLeaderboard());
      dispatch(clearEventBracket());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (!event) return;
    setStartCountdown(getCountdown(event.startAt));
    setRegCountdown(getCountdown(event.registrationCloseAt));
    const interval = setInterval(() => {
      setStartCountdown(getCountdown(event.startAt));
      setRegCountdown(getCountdown(event.registrationCloseAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [event?.startAt, event?.registrationCloseAt]);

  useEffect(() => {
    if (!id) return;
    if (activeTab === 'updates' && updates.status === 'idle') dispatch(fetchEventUpdates(id));
    if (activeTab === 'participants' && registrations.status === 'idle')
      dispatch(fetchEventRegistrations(id));
    if (activeTab === 'leaderboard' && leaderboard.status === 'idle')
      dispatch(fetchEventLeaderboard(id));
    if (activeTab === 'bracket' && bracket.status === 'idle') dispatch(fetchEventBracket(id));
  }, [activeTab, id, dispatch, updates.status, registrations.status, leaderboard.status, bracket.status]);

  const isLoadingDetail = detail.status === 'loading';
  const hasError = detail.status === 'failed';

  const displayTabs = useMemo(() => {
    if (!event) return TAB_KEYS.filter((key) => key !== 'bracket');
    return TAB_KEYS.filter((key) => (key === 'bracket' ? event.type === 'tournament' : true));
  }, [event]);

  if (isLoadingDetail) {
    return <EventsSkeleton />;
  }

  if (hasError || !event) {
    return (
      <ErrorCard
        msg={detail.error || 'Event not found'}
        onRetry={() => id && dispatch(fetchEventById(id))}
      />
    );
  }

  const isRegistered = !!registration.data && registration.data.status !== 'withdrawn';
  const waitlisted = registration.data?.status === 'waitlisted';
  const canRegister = event.isRegistrationOpen && !isRegistered && !waitlisted;
  const canUnregister = isRegistered && registration.status !== 'loading';
  const registrationBusy = registration.status === 'loading';

  const handleRegister = async () => {
    if (!id) return;
    try {
      await dispatch(registerForEvent(id)).unwrap();
      showToast('Registration submitted', 'success');
    } catch (err) {
      showToast(typeof err === 'string' ? err : 'Registration failed', 'error');
    }
  };

  const handleUnregister = async () => {
    if (!id) return;
    try {
      await dispatch(unregisterFromEvent(id)).unwrap();
      showToast('Registration cancelled', 'success');
    } catch (err) {
      showToast(typeof err === 'string' ? err : 'Unable to unregister', 'error');
    }
  };

  const countdownLabel = `${startCountdown.days}d ${startCountdown.hours}h ${startCountdown.minutes}m ${startCountdown.seconds}s`;
  const registrationClosesIn = `${regCountdown.days}d ${regCountdown.hours}h ${regCountdown.minutes}m ${regCountdown.seconds}s`;

  return (
    <div className={styles.wrapper}>
      <div className={styles.banner}>
        <img src={event.coverUrl || event.bannerUrl || fallbackImage} alt={event.title} />
      </div>
      <div className={styles.header}>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles[event.type]}`}>{event.type}</span>
          <span className={styles.badge}>{event.category}</span>
          <span className={`${styles.badge} ${styles.status}`}>{event.status}</span>
        </div>
        <h1>{event.title}</h1>
        <p className={styles.schedule}>
          Starts {formatDateTime(event.startAt)} · Ends {event.endAt ? formatDateTime(event.endAt) : 'TBD'}
        </p>
        <div className={styles.stats}>
          <div>
            <strong>{event.registeredCount}</strong>
            <span>Registered</span>
          </div>
          <div>
            <strong>{event.maxParticipants || '—'}</strong>
            <span>Capacity</span>
          </div>
          <div>
            <strong>{event.teamSize}</strong>
            <span>Team size</span>
          </div>
          <div>
            <strong>{countdownLabel}</strong>
            <span>Until start</span>
          </div>
          <div>
            <strong>{registrationClosesIn}</strong>
            <span>Registration closes</span>
          </div>
        </div>
        <div className={styles.actions}>
          {canRegister && (
            <button onClick={handleRegister} disabled={registrationBusy}>
              {registrationBusy ? 'Processing…' : 'Register'}
            </button>
          )}
          {waitlisted && <span className={styles.notice}>You are on the waitlist</span>}
          {canUnregister && (
            <button className={styles.secondary} onClick={handleUnregister} disabled={registrationBusy}>
              {registrationBusy ? 'Processing…' : 'Cancel Registration'}
            </button>
          )}
        </div>
        {event.mode === 'venue' && event.venue && (
          <p className={styles.venue}>Venue: {event.venue}</p>
        )}
      </div>

      <nav className={styles.tabs}>
        {displayTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tab} ${tab === activeTab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </nav>

      <div className={styles.tabContent}>
        {activeTab === 'about' && (
          <section>
            <h2>Overview</h2>
            <p className={styles.description}>{event.description || 'No description provided.'}</p>
            <dl className={styles.metaGrid}>
              <div>
                <dt>Registration window</dt>
                <dd>
                  {formatDate(event.registrationOpenAt)} → {formatDate(event.registrationCloseAt)}
                </dd>
              </div>
              <div>
                <dt>Timezone</dt>
                <dd>{event.timezone}</dd>
              </div>
              {event.prizePool && (
                <div>
                  <dt>Prize Pool</dt>
                  <dd>{event.prizePool}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {activeTab === 'rules' && (
          <section>
            <h2>Rules</h2>
            <p className={styles.description}>{event.rules || 'Rules will be shared soon.'}</p>
          </section>
        )}

        {activeTab === 'updates' && (
          <section>
            <h2>Updates</h2>
            {updates.status === 'loading' && <p>Loading updates…</p>}
            {updates.status === 'failed' && (
              <ErrorCard
                msg={updates.error || 'Failed to load updates'}
                onRetry={() => id && dispatch(fetchEventUpdates(id))}
              />
            )}
            {updates.status === 'succeeded' && updates.items.length === 0 && (
              <Empty msg="No updates yet." />
            )}
            <ul className={styles.updateList}>
              {updates.items.map((update) => (
                <li key={update._id}>
                  <header>
                    <span className={styles.badge}>{update.type}</span>
                    <time>{formatDateTime(update.createdAt)}</time>
                  </header>
                  <p>{update.message}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {activeTab === 'participants' && (
          <section>
            <h2>Participants</h2>
            {registrations.status === 'loading' && <p>Loading participants…</p>}
            {registrations.status === 'failed' && (
              <ErrorCard
                msg={registrations.error || 'Failed to load participants'}
                onRetry={() => id && dispatch(fetchEventRegistrations(id))}
              />
            )}
            {registrations.status === 'succeeded' && registrations.items.length === 0 && (
              <Empty msg="No registrations yet." />
            )}
            <ul className={styles.participantList}>
              {registrations.items.map((item) => (
                <li key={item._id}>
                  <span>{item.teamName || item.user?.name || 'Participant'}</span>
                  <small>{item.status}</small>
                </li>
              ))}
            </ul>
            {registrations.preview && (
              <p className={styles.notice}>Showing a preview of registrations.</p>
            )}
          </section>
        )}

        {activeTab === 'leaderboard' && (
          <section>
            <h2>Leaderboard</h2>
            {leaderboard.status === 'loading' && <p>Loading leaderboard…</p>}
            {leaderboard.status === 'failed' && (
              <ErrorCard
                msg={leaderboard.error || 'Failed to load leaderboard'}
                onRetry={() => id && dispatch(fetchEventLeaderboard(id))}
              />
            )}
            {leaderboard.status === 'succeeded' && leaderboard.entries.length === 0 && (
              <Empty msg="Leaderboard coming soon." />
            )}
            {leaderboard.entries.length > 0 && (
              <table className={styles.table}>
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
                  {leaderboard.entries.map((entry, index) => (
                    <tr key={entry._id || `${entry.participantId}-${index}`}>
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

        {activeTab === 'bracket' && (
          <section>
            <h2>Bracket</h2>
            {bracket.status === 'loading' && <p>Loading bracket…</p>}
            {bracket.status === 'failed' && (
              <ErrorCard
                msg={bracket.error || 'Failed to load bracket'}
                onRetry={() => id && dispatch(fetchEventBracket(id))}
              />
            )}
            {bracket.status === 'succeeded' && bracket.rounds.length === 0 && (
              <Empty msg="Bracket has not been seeded yet." />
            )}
            <div className={styles.bracket}>
              {bracket.rounds.map((round) => (
                <div key={round.round} className={styles.round}>
                  <h3>Round {round.round}</h3>
                  <ul>
                    {round.matches.map((match) => (
                      <li key={match.id}>
                        <div>
                          <span>{match.participantA?.displayName || 'TBD'}</span>
                          <strong>{match.scoreA ?? '-'}</strong>
                        </div>
                        <div>
                          <span>{match.participantB?.displayName || 'TBD'}</span>
                          <strong>{match.scoreB ?? '-'}</strong>
                        </div>
                        <small>Status: {match.status}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
