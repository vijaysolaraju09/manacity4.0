import { useEffect, useState } from 'react';
import { fetchBusinessRequests, approveShop, rejectShop } from '../../api/admin';
import './AdminPanel.scss';

interface Shop {
  _id: string;
  name: string;
  category: string;
  location: string;
  address: string;
}

const AdminPanel = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchBusinessRequests({ status: 'pending' });
        const items = Array.isArray(result.items)
          ? (result.items as Shop[])
          : [];
        setShops(items);
      } catch {
        setShops([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setActionId(id);
      await approveShop(id);
      setShops((prev) => prev.filter((s) => s._id !== id));
    } catch {
      // ignore
    } finally {
      setActionId('');
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionId(id);
      await rejectShop(id);
      setShops((prev) => prev.filter((s) => s._id !== id));
    } catch {
      // ignore
    } finally {
      setActionId('');
    }
  };

  return (
    <div className="admin-panel">
      <h1>Pending Shops</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {shops.map((shop) => (
            <li key={shop._id}>
              <div>
                <strong>{shop.name}</strong> - {shop.category} ({shop.location})
              </div>
              <button
                onClick={() => handleApprove(shop._id)}
                disabled={actionId === shop._id}
              >
                {actionId === shop._id ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => handleReject(shop._id)}
                disabled={actionId === shop._id}
              >
                {actionId === shop._id ? 'Processing...' : 'Reject'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminPanel;
