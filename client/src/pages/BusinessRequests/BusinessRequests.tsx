import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchBusinessRequests,
  approveShop,
  rejectShop,
  type BusinessRequestParams,
} from '../../api/admin';
import DataTable, { type Column } from '../../components/admin/DataTable';
import StatusChip from '../../components/ui/StatusChip';
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

type RequestRow = ShopRequest & { actions?: string };

const BusinessRequests = () => {
  const [requests, setRequests] = useState<ShopRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState('');
  const [total, setTotal] = useState(0);
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
        const result = await fetchBusinessRequests(params);
        const items = Array.isArray(result.items)
          ? (result.items as ShopRequest[])
          : Array.isArray((result as any).requests)
          ? ((result as any).requests as ShopRequest[])
          : [];
        setRequests(items);
        setTotal(typeof result.total === 'number' ? result.total : items.length);
      } catch {
        setRequests([]);
        setTotal(0);
        showToast('Failed to load requests', 'error');
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
    const prevTotal = total;
    let updated = requests.map((r) =>
      r._id === id ? { ...r, status: newStatus } : r,
    );
    if (status && status !== newStatus) {
      updated = updated.filter((r) => r._id !== id);
    }
    setRequests(updated);
    setActionId(id);
    if (status && status !== newStatus) {
      setTotal((t) => Math.max(0, t - 1));
    }
    try {
      if (newStatus === 'approved') await approveShop(id);
      else await rejectShop(id);
      showToast(
        `Request ${newStatus === 'approved' ? 'approved' : 'rejected'}`,
      );
    } catch {
      setRequests(prev);
      setTotal(prevTotal);
      showToast('Failed to update request', 'error');
    } finally {
      setActionId('');
    }
  };

  const columns: Column<RequestRow>[] = [
    {
      key: 'owner',
      label: 'User',
      render: (r) => r.owner?.name,
    },
    { key: 'name', label: 'Shop Name' },
    { key: 'category', label: 'Category' },
    { key: 'location', label: 'Location' },
    { key: 'address', label: 'Address' },
    {
      key: 'createdAt',
      label: 'Requested At',
      render: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusChip status={r.status as any} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <>
          <button
            onClick={() => handleAction(r._id, 'approved')}
            disabled={actionId === r._id}
          >
            Approve
          </button>
          <button
            onClick={() => handleAction(r._id, 'rejected')}
            disabled={actionId === r._id}
          >
            Reject
          </button>
        </>
      ),
    },
  ];

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
      <DataTable<RequestRow>
        columns={columns}
        rows={requests as RequestRow[]}
        page={1}
        pageSize={requests.length || 1}
        total={total}
        onPageChange={() => {}}
        loading={loading}
      />
    </div>
  );
};

export default BusinessRequests;

