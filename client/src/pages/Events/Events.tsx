import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import EventsSkeleton from '@/components/common/EventsSkeleton';
import ErrorCard from '@/components/common/ErrorCard';
import Empty from '@/components/common/Empty';
import EventCard from '@/components/ui/EventCard/EventCard';
import { fetchEvents } from '@/store/events';
import type { RootState, AppDispatch } from '@/store';
import styles from './Events.module.scss';

const Events = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list } = useSelector((state: RootState) => state.events);

  useEffect(() => {
    if (list.status === 'idle') {
      dispatch(fetchEvents({ status: 'upcoming' }));
    }
  }, [list.status, dispatch]);

  if (list.status === 'loading') return <EventsSkeleton />;
  if (list.status === 'failed')
    return (
      <ErrorCard
        msg={list.error || 'Failed to load events'}
        onRetry={() => dispatch(fetchEvents({ status: 'upcoming' }))}
      />
    );
  if (list.status === 'succeeded' && list.items.length === 0)
    return (
      <Empty
        msg="No events available right now."
        ctaText="Refresh"
        onCta={() => dispatch(fetchEvents({ status: 'upcoming' }))}
      />
    );

  return (
    <div className={styles.events}>
      <header className={styles.header}>
        <h2>Events &amp; Tournaments</h2>
        <p>Browse upcoming competitions and community activities.</p>
      </header>
      <div className={styles.grid}>
        {list.items.map((event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>
    </div>
  );
};

export default Events;
