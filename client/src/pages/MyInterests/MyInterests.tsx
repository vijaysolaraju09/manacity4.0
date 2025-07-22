import { useEffect, useState } from 'react';
import api from '../../api/client';
import styles from './MyInterests.module.scss';

interface Interest {
  _id: string;
  productId: { name: string };
  quantity: number;
  status: string;
}

const MyInterests = () => {
  const [list, setList] = useState<Interest[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      const res = await api.get(`/interests/my?${params.toString()}`);
      setList(res.data);
    } catch {
      setList([]);
    }
  };

  useEffect(() => {
    load();
  }, [status, search]);

  const cancel = async (id: string) => {
    await api.post(`/interests/${id}/cancel`);
    load();
  };

  return (
    <div className={styles.myInterests}>
      <h2>My Interests</h2>
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
      {list.map((i) => (
        <div key={i._id} className={styles.card}>
          <p>
            {i.productId?.name} - Qty {i.quantity} ({i.status})
          </p>
          {i.status === 'pending' && (
            <button onClick={() => cancel(i._id)}>Cancel</button>
          )}
        </div>
      ))}
    </div>
  );
};

export default MyInterests;
