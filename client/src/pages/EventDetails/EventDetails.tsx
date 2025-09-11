import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchEventById, registerForEvent } from '@/store/events';
import fallbackImage from '@/assets/no-image.svg';
import { formatSchedule, getCountdown } from '@/utils/date';
import showToast from '@/components/ui/Toast';
import './EventDetails.scss';

const EventDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { item: event, status } = useSelector((s: RootState) => s.events);
  const user = useSelector((s: RootState) => s.auth.user);
  const [timer, setTimer] = useState(getCountdown(event?.startsAt || new Date()));

  useEffect(() => {
    if (id) dispatch(fetchEventById(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (!event) return;
    setTimer(getCountdown(event.startsAt));
    const interval = setInterval(() => {
      setTimer(getCountdown(event.startsAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [event]);

  if (status === 'loading' || !event) {
    return <div className="event-details" style={{ padding: '1rem' }}>Loading...</div>;
  }

  const schedule = formatSchedule(event.startsAt, event.endsAt);
  const isRegistered = !!user && event.registered.includes((user as any)._id || (user as any).id);
  const countdownLabel = `${timer.days}d ${timer.hours}h ${timer.minutes}m ${timer.seconds}s`;

  const handleRegister = async () => {
    if (!id) return;
    try {
      await dispatch(registerForEvent(id)).unwrap();
      showToast('Registered for event', 'success');
    } catch {
      showToast('Registration failed', 'error');
    }
  };

  return (
    <div className="event-details">
      <img
        src={event.cover || fallbackImage}
        alt={event.title}
        className="event-img"
        onError={(e) => (e.currentTarget.src = fallbackImage)}
      />
      <div className="info">
        <h1>{event.title}</h1>
        <p className="meta">{schedule}</p>
        <p className="meta">Status: {event.status}</p>
        {event.status === 'open' && <p className="countdown">Registration closes in: {countdownLabel}</p>}
        <p className="description">Price: {event.price ? `₹${event.price}` : 'Free'}</p>
        <p className="participants">Registered: {event.registered.length}</p>
        {event.status === 'open' && !isRegistered && (
          <button className="register-btn" onClick={handleRegister}>
            Register
          </button>
        )}
        {isRegistered && <p className="message">You're registered!</p>}
        {event.status === 'finished' && event.leaderboard && event.leaderboard.length > 0 && (
          <div className="leaderboard">
            <h3>Leaderboard</h3>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {event.leaderboard.map((entry, idx) => (
                  <tr key={entry.userId}>
                    <td>{idx + 1}</td>
                    <td>{entry.name || entry.userId}</td>
                    <td>{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
