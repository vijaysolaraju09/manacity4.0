import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchVerificationRequests,
  acceptVerification,
  rejectVerification,
} from '../../api/admin';
import DataTable, { type Column } from '../../components/admin/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import showToast from '../../components/ui/Toast';
import './VerificationRequests.scss';

interface Request {
  _id: string;
  user: { _id: string; name: string; phone: string };
  profession: string;
  bio: string;
  status: string;
  createdAt: string;
}

type RequestRow = Request & {
  name: string;
  phone: string;
  actions?: string;
};

interface RequestResponse {
  requests: Request[];
  total: number;
  page: number;
  pages: number;
}

const VerificationRequests = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [actionId, setActionId] = useState('');
  const [professionInput, setProfessionInput] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const status = searchParams.get('status') || '';
  const profession = searchParams.get('profession') || '';

  useEffect(() => {
    setProfessionInput(profession);
  }, [profession]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data: RequestResponse = await fetchVerificationRequests({
          page,
          status,
          profession,
        });
        setRequests(data.requests);
        setTotal(data.total);
      } catch {
        setRequests([]);
        setTotal(0);
        showToast('Failed to load verification requests', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, status, profession]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };

  const changePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  const handleAction = async (
    id: string,
    newStatus: 'approved' | 'rejected',
  ) => {
    const prev = [...requests];
    let updated = requests.map((r) =>
      r.user._id === id ? { ...r, status: newStatus } : r,
    );
    if (status && status !== newStatus) {
      updated = updated.filter((r) => r.user._id !== id);
    }
    setRequests(updated);
    setActionId(id);
    try {
      if (newStatus === 'approved') await acceptVerification(id);
      else await rejectVerification(id);
      showToast(`Request ${newStatus === 'approved' ? 'approved' : 'rejected'}`);
    } catch {
      setRequests(prev);
      showToast('Failed to update request', 'error');
    } finally {
      setActionId('');
    }
  };

  const rows: RequestRow[] = requests.map((r) => ({
    ...r,
    name: r.user.name,
    phone: r.user.phone,
  }));

  const columns: Column<RequestRow>[] = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'profession', label: 'Profession' },
    { key: 'bio', label: 'Bio' },
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
            onClick={() => handleAction(r.user._id, 'approved')}
            disabled={actionId === r.user._id}
          >
            Accept
          </button>
          <button
            onClick={() => handleAction(r.user._id, 'rejected')}
            disabled={actionId === r.user._id}
          >
            Reject
          </button>
        </>
      ),
    },
  ];

  return (
    <div className="verification-requests">
      <h1>Verification Requests</h1>
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
          placeholder="Profession"
          value={professionInput}
          onChange={(e) => setProfessionInput(e.target.value)}
          onBlur={() => updateParam('profession', professionInput)}
        />
      </div>
      <DataTable<RequestRow>
        columns={columns}
        rows={rows}
        page={page}
        pageSize={rows.length || 1}
        total={total}
        onPageChange={changePage}
        loading={loading}
      />
    </div>
  );
};

export default VerificationRequests;

