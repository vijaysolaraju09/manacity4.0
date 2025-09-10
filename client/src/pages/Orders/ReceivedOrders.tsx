import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/config/api';
import Shimmer from '../../components/Shimmer';
import OrderCard from '../../components/ui/OrderCard';
import fallbackImage from '../../assets/no-image.svg';
import { type Status } from '../../components/ui/StatusChip';
import showToast from '../../components/ui/Toast';
import styles from './ReceivedOrders.module.scss';

interface Order {
  _id: string;
  user: { name: string; phone?: string };
  product: { name: string; price: number; image?: string };
  quantity: number;
  status: Status;
  createdAt: string;
}

const ReceivedOrders = () => {
  const [list, setList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/orders/received?${searchParams.toString()}`);
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

  const act = async (id: string, action: 'accept' | 'reject') => {
    const prev = list;
    setList((curr) =>
      curr.map((o) =>
        o._id === id
          ? { ...o, status: action === 'accept' ? 'accepted' : 'cancelled' }
          : o
      )
    );
    try {
      const res = await api.post(`/orders/${action}/${id}`);
      setList((curr) => curr.map((o) => (o._id === id ? { ...o, ...res.data } : o)));
      showToast(
        action === 'accept' ? 'Order accepted' : 'Order cancelled',
        'success'
      );
    } catch {
      showToast(`Failed to ${action} order`, 'error');
      setList(prev);
    }
  };

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
    <div className={styles.receivedOrders}>
      <h2>Received Orders</h2>
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
          <p>You haven't received any orders yet.</p>
        </div>
      ) : (
        list.map((i) => (
          <OrderCard
            key={i._id}
            items={[
              {
                id: i._id,
                title: i.product.name,
                image: i.product.image || fallbackImage,
              },
            ]}
            shop={i.user.name}
            date={i.createdAt}
            status={i.status}
            quantity={i.quantity}
            total={i.product.price * i.quantity}
            onAccept={i.status === 'pending' ? () => act(i._id, 'accept') : undefined}
            onReject={i.status === 'pending' ? () => act(i._id, 'reject') : undefined}
            phone={i.user.phone}
            onCall={
              i.status === 'accepted' && i.user.phone
                ? () => (window.location.href = `tel:${i.user.phone}`)
                : undefined
            }
            to={`/orders/${i._id}`}
          />
        ))
      )}
    </div>
  );
};

export default ReceivedOrders;
