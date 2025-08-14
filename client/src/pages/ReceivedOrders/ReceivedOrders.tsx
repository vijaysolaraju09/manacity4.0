import { useEffect, useState } from 'react';
import api from '../../api/client';
import Shimmer from '../../components/Shimmer';
import { OrderCard } from '../../components/base';
import fallbackImage from '../../assets/no-image.svg';
import styles from './ReceivedOrders.module.scss';

interface Order {
  _id: string;
  user: { name: string; phone?: string };
  product: { name: string };
  quantity: number;
  status: string;
  createdAt: string;
}

const ReceivedOrders = () => {
  const [list, setList] = useState<Order[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      const res = await api.get(`/orders/received?${params.toString()}`);
      setList(res.data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status, search]);

  const act = async (id: string, action: 'accept' | 'reject') => {
    await api.post(`/orders/${action}/${id}`);
    load();
  };

  return (
    <div className={styles.receivedOrders}>
      <h2>Received Orders</h2>
      <div className={styles.filters}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="text"
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
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
            order={i}
            onAccept={i.status === 'pending' ? () => act(i._id, 'accept') : undefined}
            onReject={i.status === 'pending' ? () => act(i._id, 'reject') : undefined}
          />
        ))
      )}
    </div>
  );
};

export default ReceivedOrders;
