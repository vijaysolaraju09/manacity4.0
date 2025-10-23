import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarClock, Clock, Gauge, Loader2, Trash2, Trophy, Users } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store';
import {
  fetchEventById,
  fetchMyRegistration,
  fetchRegistrations,
  registerForEvent,
  resetEventDetail,
  unregisterFromEvent,
} from '@/store/events.slice';
import { formatDateTime } from '@/utils/date';
import { formatINR } from '@/utils/currency';
import showToast from '@/components/ui/Toast';
import EventsSkeleton from '@/components/common/EventsSkeleton';
import ErrorCard from '@/components/common/ErrorCard';
import styles from './Register.module.scss';

const RegisterPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const detail = useSelector((state: RootState) => state.events.detail);
  const myRegistration = useSelector((state: RootState) => state.events.myRegistration);
  const actions = useSelector((state: RootState) => state.events.actions);

  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const event = detail.data;

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
    if (!event) return;
    if (event.teamSize > 1) {
      const teammateSlots = Math.max(0, event.teamSize - 1);
      setMembers((prev) => {
        if (prev.length === teammateSlots) return prev;
        const next = [...prev];
        if (next.length < teammateSlots) {
          while (next.length < teammateSlots) next.push('');
        } else {
          next.length = teammateSlots;
        }
        return next;
      });
    } else {
      setMembers([]);
    }
  }, [event?.teamSize]);

  const now = Date.now();

  const registrationWindow = useMemo(() => {
    if (!event) return { isOpen: false, closesAt: '', opensAt: '' };
    const openTime = Date.parse(event.registrationOpenAt);
    const closeTime = Date.parse(event.registrationCloseAt);
    const withinWindow =
      (!Number.isFinite(openTime) || openTime <= now) && (!Number.isFinite(closeTime) || closeTime >= now);
    return {
      isOpen: withinWindow && event.status !== 'completed' && event.status !== 'canceled',
      opensAt: formatDateTime(event.registrationOpenAt),
      closesAt: formatDateTime(event.registrationCloseAt),
    };
  }, [event, now]);

  const capacityFull = Boolean(
    event?.maxParticipants && event.maxParticipants > 0 && event.registeredCount >= event.maxParticipants,
  );

  const entryLabel = useMemo(() => {
    if (!event) return 'Free';
    if (typeof event.entryFeePaise === 'number' && event.entryFeePaise > 0) {
      return formatINR(event.entryFeePaise);
    }
    if (typeof event.entryFee === 'number' && event.entryFee > 0) {
      return `₹${Math.round(event.entryFee)}`;
    }
    return 'Free';
  }, [event]);

  const occupancyPercent = useMemo(() => {
    if (!event?.maxParticipants || event.maxParticipants <= 0) return null;
    return Math.min(100, Math.round((event.registeredCount / event.maxParticipants) * 100));
  }, [event?.maxParticipants, event?.registeredCount]);

  const isRegistered = Boolean(myRegistration.data && myRegistration.data.status !== 'withdrawn');

  const handleSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!id || !event) return;
    setError(null);
    if (!registrationWindow.isOpen) {
      setError('Registrations are currently closed.');
      return;
    }
    if (capacityFull) {
      setError('Event capacity has been reached.');
      return;
    }
    if (event.teamSize > 1 && teamName.trim().length === 0) {
      setError('Team name is required.');
      return;
    }
    const payload: {
      teamName?: string;
      members?: Array<{ name: string }>;
    } = {};
    if (event.teamSize > 1) {
      payload.teamName = teamName.trim();
      const memberEntries = members
        .map((member) => member.trim())
        .filter((name) => name.length > 0)
        .map((name) => ({ name }));
      payload.members = memberEntries;
      if (memberEntries.length < event.teamSize - 1) {
        setError('Please provide details for all teammates.');
        return;
      }
    }

    try {
      await dispatch(registerForEvent({ eventId: id, payload })).unwrap();
      showToast('Registration successful', 'success');
      await dispatch(fetchEventById(id));
      await dispatch(fetchMyRegistration(id));
      await dispatch(fetchRegistrations(id));
      navigate(`/events/${id}`, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to register.';
      setError(message);
      showToast(message, 'error');
    }
  };

  const handleUnregister = async () => {
    if (!id) return;
    try {
      await dispatch(unregisterFromEvent(id)).unwrap();
      showToast('You have been unregistered', 'success');
      await dispatch(fetchEventById(id));
      await dispatch(fetchMyRegistration(id));
      await dispatch(fetchRegistrations(id));
      navigate(`/events/${id}`, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to unregister';
      showToast(message, 'error');
    }
  };

  if (detail.loading && !event) {
    return <EventsSkeleton />;
  }

  if (detail.error && !event) {
    return (
      <div className={styles.page}>
        <ErrorCard title="Unable to load event" message={detail.error} />
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
        <div className={styles.heroTop}>
          <button type="button" className={styles.backLink} onClick={() => navigate(-1)}>
            ← Back to event
          </button>
          <span className={`${styles.heroBadge} ${registrationWindow.isOpen ? styles.heroBadgeOpen : ''}`}>
            {registrationWindow.isOpen ? 'Registrations open' : 'Registrations closed'}
          </span>
        </div>
        <h1>Join {event.title}</h1>
        <p className={styles.heroSubtitle}>
          Secure your spot in this experience. Complete your details and submit before the window
          closes.
        </p>
        <div className={styles.heroSummary}>
          <div>
            <span className={styles.summaryLabel}>Entry</span>
            <strong>{entryLabel}</strong>
          </div>
          <div>
            <span className={styles.summaryLabel}>Prize pool</span>
            <strong>{event.prizePool || 'Announcing soon'}</strong>
          </div>
          <div>
            <span className={styles.summaryLabel}>Team size</span>
            <strong>{event.teamSize}</strong>
          </div>
        </div>
        <div className={styles.heroDetails}>
          <div>
            <span className={styles.detailLabel}>Opens</span>
            <strong>{registrationWindow.opensAt || 'TBA'}</strong>
          </div>
          <div>
            <span className={styles.detailLabel}>Closes</span>
            <strong>{registrationWindow.closesAt || 'TBA'}</strong>
          </div>
          <div className={styles.heroProgress}>
            <span className={styles.detailLabel}>
              <Gauge size={16} /> Occupancy
            </span>
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
            <span className={styles.progressHint}>
              {event.maxParticipants
                ? `${event.registeredCount}/${event.maxParticipants} seats taken`
                : `${event.registeredCount} participants so far`}
            </span>
          </div>
        </div>
      </section>

      <section className={styles.layout}>
        <div className={styles.mainColumn}>
          {isRegistered ? (
            <div className={styles.registeredCard}>
              <div className={styles.registeredIcon}>
                <Users size={20} />
              </div>
              <div>
                <h2>You are confirmed</h2>
                <p>
                  You can still withdraw before the event begins if plans change. We will notify you
                  about bracket details soon.
                </p>
              </div>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleUnregister}
                disabled={actions.unregister === 'loading'}
              >
                {actions.unregister === 'loading' ? <Loader2 className={styles.spin} /> : 'Unregister'}
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <header className={styles.formHeader}>
                <h2>Team details</h2>
                <p>
                  Fill in the information exactly as you want it to appear on leaderboards and event
                  updates.
                </p>
              </header>

              {event.teamSize > 1 && (
                <div className={styles.field}>
                  <label htmlFor="team-name">Team name</label>
                  <input
                    id="team-name"
                    type="text"
                    value={teamName}
                    onChange={(evt) => setTeamName(evt.target.value)}
                    placeholder="Enter your squad name"
                    required
                  />
                </div>
              )}

              {members.map((member, index) => (
                <div key={`member-${index}`} className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor={`member-${index}`}>Member {index + 2}</label>
                    <input
                      id={`member-${index}`}
                      type="text"
                      value={member}
                      onChange={(evt) => {
                        const next = [...members];
                        next[index] = evt.target.value;
                        setMembers(next);
                      }}
                      placeholder="Name"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => {
                      const next = [...members];
                      next[index] = '';
                      setMembers(next);
                    }}
                    aria-label={`Clear member ${index + 2}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {event.teamSize <= 1 && (
                <p className={styles.note}>Solo registration – confirm your participation below.</p>
              )}

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.actions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => navigate(-1)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={actions.register === 'loading' || !registrationWindow.isOpen || capacityFull}
                >
                  {actions.register === 'loading' ? <Loader2 className={styles.spin} /> : 'Confirm registration'}
                </button>
              </div>

              {!registrationWindow.isOpen && (
                <p className={styles.note}>Registrations are closed for this event right now.</p>
              )}
              {capacityFull && <p className={styles.note}>Capacity full – you can join the waitlist from the event page.</p>}
            </form>
          )}
        </div>
        <aside className={styles.sideColumn}>
          <div className={styles.sideCard}>
            <h3>Event snapshot</h3>
            <ul>
              <li>
                <CalendarClock size={16} /> {formatDateTime(event.startAt)}
              </li>
              {event.endAt && (
                <li>
                  <Clock size={16} /> Ends {formatDateTime(event.endAt)}
                </li>
              )}
              <li>
                <Users size={16} /> {event.registeredCount} registered
              </li>
              <li>
                <Trophy size={16} /> {event.prizePool || 'Rewards reveal soon'}
              </li>
            </ul>
            <div className={styles.sideProgress}>
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
                {event.maxParticipants
                  ? `${event.registeredCount}/${event.maxParticipants} spots`
                  : 'Unlimited spots'}
              </span>
            </div>
          </div>
          {event.registrationChecklist && event.registrationChecklist.length > 0 && (
            <div className={styles.sideCard}>
              <h3>Registration checklist</h3>
              <ul className={styles.checklist}>
                {event.registrationChecklist.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <div className={styles.sideCard}>
            <h3>Need help?</h3>
            <p>
              Reach out to the event organisers via the event page updates if you have any questions
              about participation.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default RegisterPage;
