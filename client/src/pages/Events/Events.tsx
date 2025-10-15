import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import EventsSkeleton from '@/components/common/EventsSkeleton';
import ErrorCard from '@/components/common/ErrorCard';
import Empty from '@/components/common/Empty';
import EventCard from '@/components/ui/EventCard/EventCard';
import { createEventsQueryKey, fetchEvents } from '@/store/events';
import type { RootState, AppDispatch } from '@/store';
import styles from './Events.module.scss';

const Events = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list } = useSelector((state: RootState) => state.events);
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

  return (
    <div className={styles.events}>
      <header className={styles.header}>
        <h2>Events &amp; Tournaments</h2>
        <p>Browse upcoming competitions and community activities.</p>
      </header>
      <div className={styles.grid}>
        {items.map((event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>
    </div>
  );
};

export default Events;
