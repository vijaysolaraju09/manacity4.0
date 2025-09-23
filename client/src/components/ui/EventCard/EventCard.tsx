import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import fallbackImage from '@/assets/no-image.svg';
import type { EventSummary } from '@/store/events';
import { formatDateTime, formatDate } from '@/utils/date';
import styles from './EventCard.module.scss';

interface Props {
  event: EventSummary;
}

const toLabel = (value: string) => value.replace(/_/g, ' ');

const EventCard = ({ event }: Props) => {
  const navigate = useNavigate();
  const banner = event.bannerUrl || fallbackImage;
  const slots = useMemo(() => {
    const max = event.maxParticipants;
    if (!max || max <= 0) return `${event.registeredCount}`;
    return `${Math.min(event.registeredCount, max)}/${max}`;
  }, [event.registeredCount, event.maxParticipants]);

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => navigate(`/events/${event._id}`)}
    >
      <div className={styles.media}>
        <img src={banner} alt={event.title} onError={(e) => (e.currentTarget.src = fallbackImage)} />
        <div className={styles.labels}>
          <span className={`${styles.badge} ${styles[event.type]}`}>{toLabel(event.type)}</span>
          <span className={styles.badge}>{toLabel(event.category)}</span>
          <span className={`${styles.badge} ${styles.status}`}>
            {toLabel(event.lifecycleStatus || event.status)}
          </span>
        </div>
      </div>
      <div className={styles.content}>
        <h3>{event.title}</h3>
        <p className={styles.time}>Starts: {formatDateTime(event.startAt)}</p>
        {event.endAt && <p className={styles.time}>Ends: {formatDateTime(event.endAt)}</p>}
        <p className={styles.meta}>
          Registration: {formatDate(event.registrationOpenAt)} → {formatDate(event.registrationCloseAt)}
        </p>
        <p className={styles.meta}>Slots filled: {slots}</p>
        <p className={styles.meta}>Format: {toLabel(event.format)}</p>
      </div>
    </button>
  );
};

export default EventCard;
