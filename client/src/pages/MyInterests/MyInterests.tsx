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

  const load = async () => {
    try {
      const res = await api.get('/interests/my');
      setList(res.data);
    } catch {
      setList([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (id: string) => {
    await api.post(`/interests/${id}/cancel`);
    load();
  };

  return (
    <div className={styles.myInterests}>
      <h2>My Interests</h2>
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
