import './Notifications.scss';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchNotifications,
  type Notification,
} from '../../api/notifications';
import NotificationCard, {
  SkeletonNotificationCard,
} from '../../components/ui/NotificationCard';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import { markNotifRead as markNotifReadAction } from '@/store/notifs';

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
  }, [activeFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNotifications({ page })
      .then((data) => {
        if (cancelled) return;
        const items =
          activeFilter === 'all'
            ? data.notifications
            : data.notifications.filter((n) => n.type === activeFilter);
        setNotifications((prev) =>
          page === 1 ? items : [...prev, ...items],
        );
        setHasMore(data.hasMore);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setInitialLoading(false);
        }
      });
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

  const groups = notifications.reduce<Record<string, Notification[]>>(
    (acc, n) => {
      const date = new Date(n.createdAt).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(n);
      return acc;
    },
    {},
  );

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
      {initialLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <SkeletonNotificationCard key={i} />
        ))
      ) : Object.keys(groups).length === 0 ? (
        <div className="empty-state">No notifications</div>
      ) : (
        <>
          {Object.entries(groups).map(([date, items]) => (
            <div key={date} className="notif-group">
              <h4 className="group-date">{date}</h4>
              {items.map((n) => (
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
          {loading && <SkeletonNotificationCard />}
          <div ref={loaderRef} />
        </>
      )}
    </div>
  );
};

export default Notifications;

