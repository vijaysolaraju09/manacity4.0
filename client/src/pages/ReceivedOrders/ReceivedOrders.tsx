import { useEffect, useState } from 'react';
import { FiPhone, FiUser, FiPackage } from 'react-icons/fi';
import api from '../../api/client';
import Shimmer from '../../components/Shimmer';
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
          <div key={i._id} className={styles.card}>
            <div className={styles.info}>
              <p className={styles.field}><FiPackage /> {i.product?.name}</p>
              <p className={styles.field}><FiUser /> {i.user?.name}</p>
              <p className={styles.field}>Qty: {i.quantity}</p>
              <p className={styles.field}>{new Date(i.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`${styles.status} ${styles[i.status]}`}>{i.status}</span>
            {i.status === 'accepted' && i.user?.phone && (
              <a href={`tel:${i.user.phone}`} className={styles.call}>
                <FiPhone /> {i.user.phone}
              </a>
            )}
            {i.status === 'pending' && (
              <div className={styles.actions}>
                <button className={styles.accept} onClick={() => act(i._id, 'accept')}>Accept</button>
                <button className={styles.reject} onClick={() => act(i._id, 'reject')}>Reject</button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default ReceivedOrders;
