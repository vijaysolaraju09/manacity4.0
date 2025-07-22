import { useEffect, useState } from 'react';
import api from '../../api/client';
import styles from './ReceivedInterests.module.scss';

interface Interest {
  _id: string;
  userId: { name: string; phone?: string };
  productId: { name: string };
  quantity: number;
  status: string;
}

const ReceivedInterests = () => {
  const [list, setList] = useState<Interest[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      const res = await api.get(`/interests/received?${params.toString()}`);
      setList(res.data);
    } catch {
      setList([]);
    }
  };

  useEffect(() => {
    load();
  }, [status, search]);

  const act = async (id: string, action: 'accept' | 'reject') => {
    await api.post(`/interests/${id}/${action}`);
    load();
  };

  return (
    <div className={styles.receivedInterests}>
      <h2>Received Interests</h2>
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
          <p>{i.userId?.name} interested in {i.productId?.name}</p>
          <p>Qty: {i.quantity}</p>
          {i.status === 'accepted' && i.userId?.phone && (
            <a href={`tel:${i.userId.phone}`} className={styles.call}>
              Call: {i.userId.phone}
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

export default ReceivedInterests;
