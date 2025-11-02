import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import fallbackImage from '@/assets/no-image.svg';
import type { EventSummary } from '@/types/events';
import { formatDateTime, formatDate } from '@/utils/date';
import styles from './EventCard.module.scss';
import { cn } from '@/lib/utils';

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
  const registrationStart = event.regOpenAt ?? event.registrationOpenAt;
  const registrationEnd = event.regCloseAt ?? event.registrationCloseAt;
  const registrationLabel = `${registrationStart ? formatDate(registrationStart) : 'TBA'} → ${
    registrationEnd ? formatDate(registrationEnd) : 'TBA'
  }`;

  return (
    <button
      type="button"
      className={cn('card', styles.card)}
      onClick={() => navigate(`/events/${event._id}`)}
    >
      <div className={styles.media}>
        <img src={banner} alt={event.title} onError={(e) => (e.currentTarget.src = fallbackImage)} />
        <div className={styles.labels}>
          <span className={cn('chip chip--brand', styles.badge, styles[event.type])}>
            {toLabel(event.type)}
          </span>
          <span className={cn('chip', styles.badge)}>{toLabel(event.category)}</span>
          <span className={cn('chip', styles.badge, styles.status)}>
            {toLabel(event.lifecycleStatus || event.status)}
          </span>
        </div>
      </div>
      <div className={styles.content}>
        <h3>{event.title}</h3>
        <p className={styles.time}>Starts: {formatDateTime(event.startAt)}</p>
        {event.endAt && <p className={styles.time}>Ends: {formatDateTime(event.endAt)}</p>}
        <p className={styles.meta}>Registration: {registrationLabel}</p>
        <p className={styles.meta}>Slots filled: {slots}</p>
        <p className={styles.meta}>Format: {toLabel(event.format)}</p>
      </div>
    </button>
  );
};

export default EventCard;
