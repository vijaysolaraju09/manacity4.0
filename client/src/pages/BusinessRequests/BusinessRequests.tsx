import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchBusinessRequests,
  approveShop,
  rejectShop,
  type BusinessRequestParams,
} from '../../api/admin';
import showToast from '../../components/ui/Toast';
import './BusinessRequests.scss';

interface ShopRequest {
  _id: string;
  name: string;
  category: string;
  location: string;
  address: string;
  status: string;
  createdAt: string;
  owner: {
    _id: string;
    name: string;
    phone: string;
  };
}

const BusinessRequests = () => {
  const [requests, setRequests] = useState<ShopRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status') || '';
  const category = searchParams.get('category') || '';
  const location = searchParams.get('location') || '';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params: BusinessRequestParams = {};
        if (status) params.status = status;
        if (category) params.category = category;
        if (location) params.location = location;
        const data: ShopRequest[] = await fetchBusinessRequests(params);
        setRequests(data);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [status, category, location]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const handleAction = async (
    id: string,
    newStatus: 'approved' | 'rejected',
  ) => {
    const prev = [...requests];
    let updated = requests.map((r) =>
      r._id === id ? { ...r, status: newStatus } : r,
    );
    if (status && status !== newStatus) {
      updated = updated.filter((r) => r._id !== id);
    }
    setRequests(updated);
    setActionId(id);
    try {
      if (newStatus === 'approved') await approveShop(id);
      else await rejectShop(id);
      showToast(
        `Request ${newStatus === 'approved' ? 'approved' : 'rejected'}`,
      );
    } catch {
      setRequests(prev);
      showToast('Failed to update request', 'error');
    } finally {
      setActionId('');
    }
  };

  return (
    <div className="business-requests">
      <h1>Business Requests</h1>
      <div className="filters">
        <select
          value={status}
          onChange={(e) => updateParam('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="text"
          placeholder="Category"
          value={category}
          onChange={(e) => updateParam('category', e.target.value)}
        />
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => updateParam('location', e.target.value)}
        />
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Shop Name</th>
              <th>Category</th>
              <th>Location</th>
              <th>Address</th>
              <th>Requested At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req._id}>
                <td>{req.owner?.name}</td>
                <td>{req.name}</td>
                <td>{req.category}</td>
                <td>{req.location}</td>
                <td>{req.address}</td>
                <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                <td>{req.status}</td>
                <td>
                  <button
                    onClick={() => handleAction(req._id, 'approved')}
                    disabled={actionId === req._id}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(req._id, 'rejected')}
                    disabled={actionId === req._id}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BusinessRequests;

