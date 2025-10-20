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

const toLabel = (value: string) => value.replace(/_/g, ' ');

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

  const registrationBusy = registration.status === 'loading';
  const isRegistered = !!registration.data && registration.data.status !== 'withdrawn';
  const waitlisted = registration.data?.status === 'waitlisted';
  const registrationOpenTime = Date.parse(event.registrationOpenAt);
  const registrationCloseTime = Date.parse(event.registrationCloseAt);
  const now = Date.now();
  const withinRegistrationWindow =
    Number.isFinite(registrationOpenTime) && Number.isFinite(registrationCloseTime)
      ? registrationOpenTime <= now && now <= registrationCloseTime
      : true;
  const backendWindowOpen =
    typeof event.isRegistrationOpen === 'boolean' ? event.isRegistrationOpen : withinRegistrationWindow;
  const hasCapacity =
    !event.maxParticipants || event.maxParticipants <= 0 || event.registeredCount < event.maxParticipants;
  const showRegisterButton =
    event.status === 'published' && withinRegistrationWindow && backendWindowOpen && hasCapacity && !isRegistered && !waitlisted;
  const canUnregister = isRegistered && registration.status !== 'loading';

  const handleRegister = async () => {
    if (!id || registrationBusy || !showRegisterButton) return;
    try {
      await dispatch(registerForEvent(id)).unwrap();
      try {
        await dispatch(fetchEventById(id)).unwrap();
      } catch (refreshErr) {
        console.error(refreshErr);
      }
      if (activeTab === 'participants') {
        dispatch(fetchEventRegistrations(id));
      }
      showToast('Registration submitted', 'success');
    } catch (err) {
      showToast(typeof err === 'string' ? err : 'Registration failed', 'error');
    }
  };

  const handleUnregister = async () => {
    if (!id || registrationBusy) return;
    try {
      await dispatch(unregisterFromEvent(id)).unwrap();
      try {
        await dispatch(fetchEventById(id)).unwrap();
      } catch (refreshErr) {
        console.error(refreshErr);
      }
      if (activeTab === 'participants') {
        dispatch(fetchEventRegistrations(id));
      }
      showToast('Registration cancelled', 'success');
    } catch (err) {
      showToast(typeof err === 'string' ? err : 'Unable to unregister', 'error');
    }
  };

  const countdownLabel = `${startCountdown.days}d ${startCountdown.hours}h ${startCountdown.minutes}m ${startCountdown.seconds}s`;
  const registrationClosesIn = `${regCountdown.days}d ${regCountdown.hours}h ${regCountdown.minutes}m ${regCountdown.seconds}s`;

  return (
    <div className={styles.wrapper}>
      <div className={styles.hero}>
        <img src={event.coverUrl || event.bannerUrl || fallbackImage} alt={event.title} />
        <div className={styles.header}>
          <div className={styles.badges}>
            <span>{toLabel(event.type)}</span>
            <span>{toLabel(event.category)}</span>
            <span>{toLabel(event.status)}</span>
          </div>
          <h1 className={styles.title}>{event.title}</h1>
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
          <div className={styles.register}>
            {showRegisterButton && (
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
          <div className={styles.infoGrid}>
            <section className={styles.about}>
            <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {event.description || 'No description provided.'}
            </p>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm text-gray-700 mt-3">
              <div>
                <dt className="font-medium text-gray-800">Registration window</dt>
                <dd>
                  {formatDate(event.registrationOpenAt)} → {formatDate(event.registrationCloseAt)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-800">Timezone</dt>
                <dd>{event.timezone}</dd>
              </div>
              {event.prizePool && (
                <div>
                  <dt className="font-medium text-gray-800">Prize Pool</dt>
                  <dd>{event.prizePool}</dd>
                </div>
              )}
            </dl>
            </section>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className={styles.infoGrid}>
            <section className={styles.rules}>
            <h2 className="text-lg font-semibold text-gray-900">Rules</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {event.rules || 'Rules will be shared soon.'}
            </p>
            </section>
          </div>
        )}

        {activeTab === 'updates' && (
          <div className={styles.infoGrid}>
            <section className={styles.updates}>
            <h2 className="text-lg font-semibold text-gray-900">Updates</h2>
            {updates.status === 'loading' && <p className="text-sm text-gray-500">Loading updates…</p>}
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
                  <header className="flex items-center justify-between gap-2 text-xs text-gray-600">
                    <span className={styles.badge}>{toLabel(update.type)}</span>
                    <time>{formatDateTime(update.createdAt)}</time>
                  </header>
                  <p className="text-sm text-gray-700 leading-relaxed">{update.message}</p>
                </li>
              ))}
            </ul>
            </section>
          </div>
        )}

        {activeTab === 'participants' && (
          <section className={styles.leaderboard}>
            <h2 className="text-lg font-semibold text-gray-900">Participants</h2>
            {registrations.status === 'loading' && <p className="text-sm text-gray-500">Loading participants…</p>}
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
                  <small className="text-xs text-gray-500 uppercase">{item.status}</small>
                </li>
              ))}
            </ul>
            {registrations.preview && (
              <p className={styles.notice}>Showing a preview of registrations.</p>
            )}
          </section>
        )}

        {activeTab === 'leaderboard' && (
          <section className={styles.leaderboard}>
            <h2 className="text-lg font-semibold text-gray-900">Leaderboard</h2>
            {leaderboard.status === 'loading' && <p className="text-sm text-gray-500">Loading leaderboard…</p>}
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
          <section className={styles.leaderboard}>
            <h2 className="text-lg font-semibold text-gray-900">Bracket</h2>
            {bracket.status === 'loading' && <p className="text-sm text-gray-500">Loading bracket…</p>}
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
                  <h3 className="text-sm font-semibold text-gray-800">Round {round.round}</h3>
                  <ul>
                    {round.matches.map((match) => (
                      <li key={match.id}>
                        <div className="flex items-center justify-between">
                          <span>{match.participantA?.displayName || 'TBD'}</span>
                          <strong>{match.scoreA ?? '-'}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{match.participantB?.displayName || 'TBD'}</span>
                          <strong>{match.scoreB ?? '-'}</strong>
                        </div>
                        <small className="text-xs text-gray-500">Status: {toLabel(match.status)}</small>
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
