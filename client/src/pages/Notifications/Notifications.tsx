import './Notifications.scss';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  fetchNotifications,
  markNotificationRead,
  type Notification,
} from '../../api/notifications';
import Shimmer from '../../components/Shimmer';

const filterLabels: Record<string, string> = {
  all: 'All',
  orders: 'Orders',
  admin: 'Admin',
  offers: 'Offers',
  system: 'System',
};

const filters = Object.keys(filterLabels);

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const touchStart = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    const urlFilter = searchParams.get('type');
    if (urlFilter && filters.includes(urlFilter)) setActiveFilter(urlFilter);
  }, [searchParams]);

  useEffect(() => {
    fetchNotifications()
      .then((data) => setNotifications(data))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );
    try {
      await markNotificationRead(id);
    } catch {
      // revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: false } : n)),
      );
    }
  };

  const filtered = notifications.filter(
    (n) => activeFilter === 'all' || n.type === activeFilter,
  );

  const groups = filtered.reduce<Record<string, Notification[]>>((acc, n) => {
    const date = new Date(n.createdAt).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(n);
    return acc;
  }, {});

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
      {loading ? (
        <div className="notif-skeletons">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="notif-item">
              <Shimmer width={40} height={40} className="rounded" />
              <div className="info">
                <Shimmer style={{ height: 14, width: '60%', marginBottom: 6 }} />
                <Shimmer style={{ height: 12, width: '80%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : Object.keys(groups).length === 0 ? (
        <div className="empty-state">No notifications</div>
      ) : (
        Object.entries(groups).map(([date, items]) => (
          <div key={date} className="notif-group">
            <h4 className="group-date">{date}</h4>
            {items.map((n) => (
              <div
                key={n._id}
                className={`notif-item ${n.isRead ? 'read' : ''}`}
                onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
                onTouchEnd={(e) => {
                  const diff = touchStart.current - e.changedTouches[0].clientX;
                  if (diff > 50) handleMarkRead(n._id);
                }}
              >
                {n.image && (
                  <img
                    src={n.image}
                    alt=""
                    onClick={() => n.link && navigate(n.link)}
                  />
                )}
                <div className="info" onClick={() => n.link && navigate(n.link)}>
                  <h5>{n.title}</h5>
                  <p>{n.message}</p>
                </div>
                <button
                  className="mark-btn"
                  onClick={() => handleMarkRead(n._id)}
                >
                  Mark read
                </button>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default Notifications;
