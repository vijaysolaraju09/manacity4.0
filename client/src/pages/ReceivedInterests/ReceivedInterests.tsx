import { useEffect, useState } from 'react';
import api from '../../api/client';
import styles from './ReceivedInterests.module.scss';

interface Interest {
  _id: string;
  userId: { name: string };
  productId: { name: string };
  quantity: number;
  status: string;
}

const ReceivedInterests = () => {
  const [list, setList] = useState<Interest[]>([]);

  const load = async () => {
    try {
      const res = await api.get('/interests/received');
      setList(res.data);
    } catch {
      setList([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, action: 'accept' | 'reject') => {
    await api.post(`/interests/${id}/${action}`);
    load();
  };

  return (
    <div className={styles.receivedInterests}>
      <h2>Received Interests</h2>
      {list.map((i) => (
        <div key={i._id} className={styles.card}>
          <p>{i.userId?.name} interested in {i.productId?.name}</p>
          <p>Qty: {i.quantity}</p>
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
