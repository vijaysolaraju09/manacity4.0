import './Notifications.scss';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  fetchNotifications,
  markNotificationRead,
  type Notification,
} from '../../api/notifications';
import NotificationCard, {
  SkeletonNotificationCard,
} from '../../components/ui/NotificationCard';

const filterLabels: Record<string, string> = {
  all: 'All',
  orders: 'Orders',
  offers: 'Offers',
  system: 'System',
};

const filters = Object.keys(filterLabels);

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

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
    fetchNotifications({
      page,
      type: activeFilter === 'all' ? undefined : activeFilter,
    })
      .then((data) => {
        if (cancelled) return;
        setNotifications((prev) =>
          page === 1 ? data.notifications : [...prev, ...data.notifications],
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
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );
    try {
      await markNotificationRead(id);
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: false } : n)),
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
                  title={n.title}
                  message={n.body}
                  timestamp={n.createdAt}
                  read={n.isRead}
                  ctaLabel={n.cta?.label}
                  onClick={() => n.cta && navigate(n.cta.href)}
                  onCtaClick={() => n.cta && navigate(n.cta.href)}
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

