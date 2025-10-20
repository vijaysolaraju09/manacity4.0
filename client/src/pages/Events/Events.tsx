import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import EventsSkeleton from '@/components/common/EventsSkeleton';
import ErrorCard from '@/components/common/ErrorCard';
import Empty from '@/components/common/Empty';
import { createEventsQueryKey, fetchEvents } from '@/store/events';
import type { RootState, AppDispatch } from '@/store';
import { formatDateTime, formatDate } from '@/utils/date';
import fallbackImage from '@/assets/no-image.svg';
import styles from './Events.module.scss';

const Events = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list } = useSelector((state: RootState) => state.events);
  const navigate = useNavigate();
  const defaultQueryKey = useMemo(() => createEventsQueryKey(), []);

  useEffect(() => {
    if (list.status === 'loading') return;

    if (list.status === 'idle' || list.lastQueryKey !== defaultQueryKey) {
      const promise = dispatch(fetchEvents());
      return () => {
        promise.abort?.();
      };
    }
    return undefined;
  }, [dispatch, list.status, list.lastQueryKey, defaultQueryKey]);

  const items = Array.isArray(list.items) ? list.items : [];

  const reload = () => {
    dispatch(fetchEvents());
  };

  if (list.status === 'loading' || list.status === 'idle') return <EventsSkeleton />;
  if (list.status === 'failed')
    return (
      <ErrorCard
        msg={list.error || 'Failed to load events'}
        onRetry={reload}
      />
    );
  if (list.status === 'succeeded' && items.length === 0)
    return (
      <Empty
        msg="No events available right now."
        ctaText="Refresh"
        onCta={reload}
      />
    );

  const toLabel = (value: string) => value.replace(/_/g, ' ');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2>Events &amp; Tournaments</h2>
        <p>Browse upcoming competitions and community activities.</p>
      </header>
      <div className={styles.grid}>
        {items.map((event) => {
          const banner = event.bannerUrl || fallbackImage;
          const slots = event.maxParticipants > 0
            ? `${Math.min(event.registeredCount, event.maxParticipants)}/${event.maxParticipants}`
            : `${event.registeredCount}`;
          const lifecycle = toLabel(event.lifecycleStatus || event.status);
          return (
            <button
              key={event._id}
              type="button"
              className={styles.card}
              onClick={() => navigate(`/events/${event._id}`)}
            >
              <img
                className={styles.thumb}
                src={banner}
                alt={event.title}
                loading="lazy"
                onError={(e) => (e.currentTarget.src = fallbackImage)}
              />
              <div className={styles.badges}>
                <span>{toLabel(event.type)}</span>
                <span>{toLabel(event.category)}</span>
                <span>{lifecycle}</span>
              </div>
              <h3 className={styles.cardTitle}>{event.title}</h3>
              <div className={styles.meta}>
                <p>Starts: {formatDateTime(event.startAt)}</p>
                {event.endAt && <p>Ends: {formatDateTime(event.endAt)}</p>}
                <p>
                  Registration: {formatDate(event.registrationOpenAt)} → {formatDate(event.registrationCloseAt)}
                </p>
                <p>Slots filled: {slots}</p>
                <p>Format: {toLabel(event.format)}</p>
              </div>
              <div className={styles.actions}>
                <span>Team size: {event.teamSize}</span>
                <span>Mode: {toLabel(event.mode)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Events;
