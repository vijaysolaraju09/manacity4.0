import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import {
  fetchNotifs,
  markNotifRead,
  removeNotif,
  type Notif,
} from '@/store/notifs';
import NotificationCard from '../../components/ui/NotificationCard';
import EmptyState from '@/components/ui/EmptyState';
import ErrorCard from '@/components/ui/ErrorCard';
import SkeletonList from '@/components/ui/SkeletonList';
import showToast from '@/components/ui/Toast';
import styles from './Notifications.module.scss';

const filterLabels: Record<string, string> = {
  all: 'All',
  order: 'Orders',
  offer: 'Offers',
  system: 'System',
  event: 'Events',
};

const filters = Object.keys(filterLabels);

const Notifications = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, status, error, hasMore, page } = useSelector(
    (state: RootState) => state.notifs
  );
  const [activeFilter, setActiveFilter] = useState('all');
  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchNotifs({ page: 1 }));
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (!hasMore || status === 'loading') return;
    const node = loaderRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        dispatch(fetchNotifs({ page: page + 1 }));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [dispatch, hasMore, status, page]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return items;
    return items.filter((notif) => notif.type === activeFilter);
  }, [items, activeFilter]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, Notif[]>>((acc, notif) => {
      const date = new Date(notif.createdAt).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(notif);
      return acc;
    }, {});
  }, [filtered]);

  const handleMarkRead = async (id: string) => {
    try {
      await dispatch(markNotifRead(id)).unwrap();
    } catch (err) {
      showToast((err as Error)?.message || 'Failed to mark notification as read', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(removeNotif(id)).unwrap();
      showToast('Notification removed', 'success');
    } catch (err) {
      showToast((err as Error)?.message || 'Failed to delete notification', 'error');
    }
  };

  const handleReload = () => {
    dispatch(fetchNotifs({ page: 1 }));
  };

  const isLoading = status === 'loading';
  const showInitialSkeleton = isLoading && items.length === 0;
  const hasNotifications = filtered.length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.filters} role="tablist">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={activeFilter === filter}
            className={cn(styles.filterButton, {
              [styles.active]: activeFilter === filter,
            })}
            onClick={() => setActiveFilter(filter)}
          >
            {filterLabels[filter]}
          </button>
        ))}
      </div>

      {showInitialSkeleton ? (
        <SkeletonList count={4} lines={2} withAvatar />
      ) : !hasNotifications && status === 'failed' ? (
        <ErrorCard message={error || 'Failed to load notifications'} onRetry={handleReload} />
      ) : !hasNotifications ? (
        <EmptyState
          title="You're all caught up"
          message="There aren't any notifications to show right now. We'll let you know when something new arrives."
          ctaLabel="Refresh"
          onCtaClick={handleReload}
        />
      ) : (
        <>
          {Object.entries(grouped).map(([date, dayItems]) => (
            <div key={date} className={styles.group}>
              <h4 className={cn(styles.title, 'text-gray-700')}>{date}</h4>
              {dayItems.map((notif) => (
                <div key={notif._id} className={styles.card}>
                  <div className={styles.content}>
                    <NotificationCard
                      message={notif.message}
                      timestamp={notif.createdAt}
                      read={notif.read}
                      onSwipeLeft={() => handleMarkRead(notif._id)}
                    />
                  </div>
                  <div className={cn(styles.meta, styles.actions)}>
                    {!notif.read && (
                      <button type="button" onClick={() => handleMarkRead(notif._id)}>
                        Mark read
                      </button>
                    )}
                    <button
                      type="button"
                      className="hover:text-red-600"
                      onClick={() => handleDelete(notif._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {isLoading && hasNotifications && <SkeletonList count={1} lines={2} withAvatar />}
          {status === 'failed' && hasNotifications && (
            <ErrorCard message={error || 'Failed to load notifications'} onRetry={handleReload} />
          )}
          <div ref={loaderRef} />
        </>
      )}
    </div>
  );
};

export default Notifications;

