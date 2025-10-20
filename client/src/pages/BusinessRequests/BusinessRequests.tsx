import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchBusinessRequests,
  approveShop,
  rejectShop,
  type BusinessRequestParams,
} from '../../api/admin';
import DataTable, { type Column } from '../../components/admin/DataTable';
import showToast from '../../components/ui/Toast';
import styles from './BusinessRequests.module.scss';

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

  const statusClassMap: Record<string, string> = {
    approved: styles.statusApproved,
    pending: styles.statusPending,
    rejected: styles.statusRejected,
  };

  const columns: Column<RequestRow>[] = [
    {
      key: 'owner',
      label: 'User',
      render: (r) => r.owner?.name ?? '—',
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
      render: (r) => {
        const normalized = (r.status || '').toLowerCase();
        const className = statusClassMap[normalized] ?? styles.statusPending;
        const label = normalized
          ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
          : 'Unknown';
        return (
          <span className={`${styles.statusChip} ${className}`}>
            {label}
          </span>
        );
      },
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

  const hasRequests = (requests ?? []).length > 0;

  return (
    <div className={`${styles.page} space-y-6 px-4`}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Business Requests</h1>
        <p className="text-sm text-gray-600">
          Review new shop submissions and approve or reject requests with a single click.
        </p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filtersGroup}>
          <select
            value={status}
            onChange={(e) => updateParam('status', e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
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
            className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
          />
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => updateParam('location', e.target.value)}
            className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
          />
        </div>
        <span className="text-sm text-gray-500">Total requests: {total}</span>
      </div>

      <DataTable<RequestRow>
        columns={columns}
        rows={(requests ?? []) as RequestRow[]}
        page={1}
        pageSize={Math.max((requests ?? []).length, 1)}
        total={total}
        onPageChange={() => {}}
        loading={loading}
        classNames={{
          tableWrap: styles.tableWrap,
          table: styles.table,
          th: styles.th,
          td: styles.td,
          row: styles.row,
          actions: styles.actions,
          empty: styles.td,
        }}
      />

      {hasRequests ? (
        <div className={styles.tableFooter}>
          <span>
            Showing {Math.min((requests ?? []).length, total)} of {total}
          </span>
          <span>Updated just now</span>
        </div>
      ) : null}
    </div>
  );
};

export default BusinessRequests;
