import { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import Shimmer from '../../components/Shimmer';
import { OrderCard } from '../../components/base';
import fallbackImage from '../../assets/no-image.svg';
import styles from './MyOrders.module.scss';

interface Order {
  _id: string;
  product: { name: string; image?: string; shop?: { name: string } };
  quantity: number;
  status: string;
  createdAt: string;
}

const MyOrders = () => {
  const [list, setList] = useState<Order[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      const res = await api.get(`/orders/my?${params.toString()}`);
      setList(res.data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async (id: string) => {
    await api.post(`/orders/cancel/${id}`);
    load();
  };

  return (
    <div className={styles.myOrders}>
      <h2>My Orders</h2>
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
          placeholder="Search"
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
          <p>You haven\u2019t placed any orders yet.</p>
          <a href="/shops" className={styles.browse}>Browse Shops</a>
        </div>
      ) : (
        list.map((i) => (
          <OrderCard key={i._id} order={i} onCancel={i.status === 'pending' ? () => cancel(i._id) : undefined} />
        ))
      )}
    </div>
  );
};

export default MyOrders;
