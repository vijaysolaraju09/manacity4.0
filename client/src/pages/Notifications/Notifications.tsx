import './Notifications.scss';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchNotifications,
  type Notification,
} from '../../api/notifications';
import NotificationCard from '../../components/ui/NotificationCard';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import { markNotifRead as markNotifReadAction } from '@/store/notifs';
import EmptyState from '@/components/ui/EmptyState';
import ErrorCard from '@/components/ui/ErrorCard';
import SkeletonList from '@/components/ui/SkeletonList';

const filterLabels: Record<string, string> = {
  all: 'All',
  order: 'Orders',
  offer: 'Offers',
  system: 'System',
  event: 'Events',
};

const filters = Object.keys(filterLabels);

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const urlFilter = searchParams.get('type');
    if (urlFilter && filters.includes(urlFilter)) setActiveFilter(urlFilter);
  }, [searchParams]);

  useEffect(() => {
    setNotifications([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
    setError(null);
  }, [activeFilter]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      if (page === 1) {
        setError(null);
      }
      try {
        const data = await fetchNotifications({ page });
        if (cancelled) return;
        const allItems = data?.notifications ?? [];
        const items =
          activeFilter === 'all'
            ? allItems
            : allItems.filter((n) => n.type === activeFilter);
        setNotifications((prev) => (page === 1 ? items : [...prev, ...items]));
        setHasMore(Boolean(data?.hasMore));
      } catch {
        if (cancelled) return;
        if (page === 1) {
          setNotifications([]);
        }
        setError('Failed to load notifications');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [page, activeFilter]);

  useEffect(() => {
    if (!hasMore || loading) return;
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage((p) => p + 1);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
    );
    try {
      await dispatch(markNotifReadAction(id));
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: false } : n)),
      );
    }
  };

  const groups = (notifications ?? []).reduce<Record<string, Notification[]>>(
    (acc, n) => {
      const date = new Date(n.createdAt).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(n);
      return acc;
    },
    {},
  );

  const reload = () => {
    setNotifications([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
    setError(null);
  };

  const groupedEntries = Object.entries(groups);
  const hasNotifications = groupedEntries.length > 0;
  const showInitialSkeleton = initialLoading && loading;

  return (
    <div className="notifications-page">
      <div className="notif-filters">
        {filters.map((f) => (
          <button
            key={f}
            className={activeFilter === f ? 'active' : ''}
            onClick={() => {
              setActiveFilter(f);
              if (f === 'all') setSearchParams({});
              else setSearchParams({ type: f });
            }}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>
      {showInitialSkeleton ? (
        <SkeletonList count={4} lines={2} withAvatar />
      ) : !hasNotifications && error && !loading ? (
        <ErrorCard message={error} onRetry={reload} />
      ) : !hasNotifications && !loading ? (
        <EmptyState
          title="You're all caught up"
          message="There aren't any notifications to show right now. We'll let you know when something new arrives."
          ctaLabel="Refresh"
          onCtaClick={reload}
        />
      ) : (
        <>
          {groupedEntries.map(([date, items]) => (
            <div key={date} className="notif-group">
              <h4 className="group-date">{date}</h4>
              {(items ?? []).map((n) => (
                <NotificationCard
                  key={n._id}
                  message={n.message}
                  timestamp={n.createdAt}
                  read={n.read}
                  onSwipeLeft={() => handleMarkRead(n._id)}
                />
              ))}
            </div>
          ))}
          {loading && hasNotifications && <SkeletonList count={1} lines={2} withAvatar />}
          {!loading && error && hasNotifications && (
            <ErrorCard message={error} onRetry={reload} />
          )}
          <div ref={loaderRef} />
        </>
      )}
    </div>
  );
};

export default Notifications;

