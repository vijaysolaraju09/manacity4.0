import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Trash2, Users } from 'lucide-react';
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
      <header className={styles.header}>
        <div>
          <button type="button" className={styles.backLink} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1>Register for {event.title}</h1>
          <p>
            Registration window: {registrationWindow.opensAt} – {registrationWindow.closesAt}
          </p>
        </div>
        <div className={styles.metaCard}>
          <div>
            <span className={styles.metaLabel}>Entry</span>
            <strong>{entryLabel}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Prize pool</span>
            <strong>{event.prizePool || 'Announcing soon'}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Slots</span>
            <strong>
              {event.registeredCount}/{event.maxParticipants || '∞'}
            </strong>
          </div>
        </div>
      </header>

      {isRegistered ? (
        <div className={styles.registeredCard}>
          <Users size={18} />
          <div>
            <h2>You are already registered</h2>
            <p>You can unregister before the event begins if you can no longer participate.</p>
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
  );
};

export default RegisterPage;
