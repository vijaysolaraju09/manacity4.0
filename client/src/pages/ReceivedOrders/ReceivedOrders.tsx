import { useEffect, useState } from 'react';
import api from '../../api/client';
import styles from './ReceivedOrders.module.scss';

interface Order {
  _id: string;
  user: { name: string; phone?: string };
  product: { name: string };
  quantity: number;
  status: string;
}

const ReceivedOrders = () => {
  const [list, setList] = useState<Order[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      const res = await api.get(`/orders/received?${params.toString()}`);
      setList(res.data);
    } catch {
      setList([]);
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
      {list.map((i) => (
        <div key={i._id} className={styles.card}>
          <p>{i.user?.name} ordered {i.product?.name}</p>
          <p>Qty: {i.quantity}</p>
          {i.status === 'accepted' && i.user?.phone && (
            <a href={`tel:${i.user.phone}`} className={styles.call}>
              Call: {i.user.phone}
            </a>
          )}
          {i.status === 'pending' && (
            <div className={styles.actions}>
              <button onClick={() => act(i._id, 'accept')}>Accept</button>
              <button onClick={() => act(i._id, 'reject')}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReceivedOrders;
