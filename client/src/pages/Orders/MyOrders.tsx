import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/http';
import Shimmer from '../../components/Shimmer';
import OrderCard from '../../components/ui/OrderCard';
import fallbackImage from '../../assets/no-image.svg';
import { type Status } from '../../components/ui/StatusChip';
import styles from './MyOrders.module.scss';

interface Order {
  _id: string;
  product: { name: string; image?: string; price: number; shop?: { name: string } };
  quantity: number;
  status: Status;
  createdAt: string;
}

const MyOrders = () => {
  const [list, setList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/orders/my?${searchParams.toString()}`);
      setList(res.data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const clearFilters = (...keys: string[]) => {
    const params = new URLSearchParams(searchParams);
    keys.forEach((k) => params.delete(k));
    setSearchParams(params);
  };

  const cancel = async (id: string) => {
    await api.post(`/orders/cancel/${id}`);
    load();
  };

  const groups = useMemo(() => {
    const map = new Map<string, Order[]>();
    list.forEach((o) => {
      const month = new Date(o.createdAt).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      });
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(o);
    });
    return Array.from(map.entries());
  }, [list]);

  const status = searchParams.get('status') ?? '';
  const startDate = searchParams.get('startDate') ?? '';
  const endDate = searchParams.get('endDate') ?? '';

  const chips = [
    status && { label: `Status: ${status}`, onRemove: () => clearFilters('status') },
    (startDate || endDate) && {
      label:
        startDate && endDate
          ? `Date: ${startDate} - ${endDate}`
          : startDate
          ? `From: ${startDate}`
          : `Until: ${endDate}`,
      onRemove: () => clearFilters('startDate', 'endDate'),
    },
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  return (
    <div className={styles.myOrders}>
      <h2>My Orders</h2>
      <div className={styles.filters}>
        <select value={status} onChange={(e) => updateFilter('status', e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => updateFilter('startDate', e.target.value)}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => updateFilter('endDate', e.target.value)}
        />
      </div>
      {chips.length > 0 && (
        <div className={styles.chips}>
          {chips.map((c) => (
            <button key={c.label} className={styles.chip} onClick={c.onRemove}>
              {c.label} ✕
            </button>
          ))}
        </div>
      )}
      {loading ? (
        [1, 2, 3].map((n) => (
          <Shimmer key={n} className={`${styles.card} shimmer rounded`} style={{ height: 80 }} />
        ))
      ) : list.length === 0 ? (
        <div className={styles.empty}>
          <img src={fallbackImage} alt="No orders" />
          <p>You haven’t placed any orders yet.</p>
          <a href="/shops" className={styles.browse}>Browse Shops</a>
        </div>
      ) : (
        groups.map(([month, orders]) => (
          <div key={month} className={styles.group}>
            <div className={styles.month}>{month}</div>
            {orders.map((i) => (
              <OrderCard
                key={i._id}
                items={[
                  {
                    id: i._id,
                    title: i.product.name,
                    image: i.product.image || fallbackImage,
                  },
                ]}
                shop={i.product.shop?.name || ''}
                date={i.createdAt}
                status={i.status}
                quantity={i.quantity}
                total={i.product.price * i.quantity}
                onCancel={i.status === 'pending' ? () => cancel(i._id) : undefined}
                to={`/orders/${i._id}`}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default MyOrders;
