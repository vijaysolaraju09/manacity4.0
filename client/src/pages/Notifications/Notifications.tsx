import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { fetchNotifs, markNotifRead, removeNotif, type Notif } from '@/store/notifs';
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

const PAGE_SIZE = 50;

const Notifications = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, status, error, hasMore, page } = useSelector(
    (state: RootState) => state.notifs
  );
  const [activeFilter, setActiveFilter] = useState('all');
  const [pageIndex, setPageIndex] = useState(0);
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

  const sortedItems = useMemo(() => {
    if (!Array.isArray(items)) return [] as Notif[];
    return [...items].sort((a, b) => {
      const timeA = Date.parse(a.createdAt ?? '') || 0;
      const timeB = Date.parse(b.createdAt ?? '') || 0;
      return timeB - timeA;
    });
  }, [items]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return sortedItems;
    return sortedItems.filter((notif) => notif.type === activeFilter);
  }, [sortedItems, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPageIndex(0);
  }, [activeFilter]);

  useEffect(() => {
    if (pageIndex >= totalPages) {
      setPageIndex(totalPages - 1);
    }
  }, [pageIndex, totalPages]);

  const pageItems = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageIndex]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Notif[]>();
    pageItems.forEach((notif) => {
      const date = new Date(notif.createdAt).toDateString();
      const existing = groups.get(date) ?? [];
      existing.push(notif);
      groups.set(date, existing);
    });
    return Array.from(groups.entries());
  }, [pageItems]);

  const unreadCount = useMemo(() => filtered.filter((notif) => !notif.read).length, [filtered]);

  const handleMarkRead = async (id: string) => {
    try {
      await dispatch(markNotifRead(id)).unwrap();
    } catch (err) {
      showToast('We couldn\'t mark that notification as read. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(removeNotif(id)).unwrap();
      showToast('Notification removed', 'success');
    } catch (err) {
      showToast('We couldn\'t delete that notification. Please try again.', 'error');
    }
  };

  const handleReload = () => {
    dispatch(fetchNotifs({ page: 1 }));
  };

  const handleMarkAllRead = useCallback(async () => {
    const unread = filtered.filter((notif) => !notif.read);
    if (unread.length === 0) return;
    const results = await Promise.allSettled(
      unread.map((notif) => dispatch(markNotifRead(notif._id)).unwrap()),
    );
    const failed = results.some((result) => result.status === 'rejected');
    if (failed) {
      showToast('Some notifications could not be marked as read. Please try again.', 'error');
    } else {
      showToast('All notifications marked as read.', 'success');
    }
  }, [dispatch, filtered]);

  const isLoading = status === 'loading';
  const showInitialSkeleton = isLoading && items.length === 0;
  const hasNotifications = filtered.length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
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
        {unreadCount > 0 && (
          <button
            type="button"
            className={styles.markAllButton}
            onClick={handleMarkAllRead}
            disabled={isLoading}
          >
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {showInitialSkeleton ? (
        <SkeletonList count={4} lines={2} withAvatar />
      ) : !hasNotifications && status === 'failed' ? (
        <ErrorCard
          message={error || "Couldn't load notifications. Please try again."}
          onRetry={handleReload}
        />
      ) : !hasNotifications ? (
        <EmptyState
          title="You're all caught up"
          message="There aren't any notifications to show right now. We'll let you know when something new arrives."
          ctaLabel="Refresh"
          onCtaClick={handleReload}
        />
      ) : (
        <>
          {grouped.map(([date, dayItems]) => (
            <div key={date} className={styles.group}>
              <h4 className={cn(styles.title, 'text-text-secondary')}>{date}</h4>
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
                      <button
                        type="button"
                        className={cn(styles.actionButton, styles.markReadButton)}
                        onClick={() => handleMarkRead(notif._id)}
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      type="button"
                      className={cn(styles.actionButton, styles.deleteButton)}
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
            <ErrorCard
              message={error || "Couldn't load notifications. Please try again."}
              onRetry={handleReload}
            />
          )}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.paginationButton}
                onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                disabled={pageIndex === 0}
              >
                Previous
              </button>
              <span className={styles.paginationInfo}>
                Page {pageIndex + 1} of {totalPages}
              </span>
              <button
                type="button"
                className={styles.paginationButton}
                onClick={() => setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={pageIndex + 1 >= totalPages}
              >
                Next
              </button>
            </div>
          )}
          <div ref={loaderRef} />
        </>
      )}
    </div>
  );
};

export default Notifications;

