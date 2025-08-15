import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import Shimmer from '../../components/Shimmer';
import { OrderCard } from '../../components/base';
import fallbackImage from '../../assets/no-image.svg';
import { type Status } from '../../components/ui/StatusChip';
import toast from '../../components/toast';
import styles from './ReceivedOrders.module.scss';

interface Order {
  _id: string;
  user: { name: string; phone?: string };
  product: { name: string; price: number; image?: string; category?: string };
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

  const act = async (id: string, action: 'accept' | 'reject') => {
    const prev = list;
    setList((curr) =>
      curr.map((o) =>
        o._id === id
          ? { ...o, status: action === 'accept' ? 'accepted' : 'rejected' }
          : o
      )
    );
    try {
      const res = await api.post(`/orders/${action}/${id}`);
      setList((curr) =>
        curr.map((o) => (o._id === id ? { ...o, ...res.data } : o))
      );
      toast(
        action === 'accept' ? 'Order accepted' : 'Order rejected',
        'success'
      );
    } catch {
      toast(`Failed to ${action} order`, 'error');
      setList(prev);
    }
  };

  const status = searchParams.get('status') ?? '';
  const category = searchParams.get('category') ?? '';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';

  const chips = [
    status && { label: `Status: ${status}`, onRemove: () => updateFilter('status', '') },
    category && { label: `Category: ${category}`, onRemove: () => updateFilter('category', '') },
    minPrice && {
      label: `Min Price ≥ ${minPrice}`,
      onRemove: () => updateFilter('minPrice', ''),
    },
    maxPrice && {
      label: `Max Price ≤ ${maxPrice}`,
      onRemove: () => updateFilter('maxPrice', ''),
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
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="text"
          placeholder="Category"
          value={category}
          onChange={(e) => updateFilter('category', e.target.value)}
        />
        <input
          type="number"
          placeholder="Min Price"
          value={minPrice}
          onChange={(e) => updateFilter('minPrice', e.target.value)}
        />
        <input
          type="number"
          placeholder="Max Price"
          value={maxPrice}
          onChange={(e) => updateFilter('maxPrice', e.target.value)}
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
          />
        ))
      )}
    </div>
  );
};

export default ReceivedOrders;
