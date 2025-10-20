import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchVerificationRequests,
  updateVerificationRequest,
} from '../../api/admin';
import DataTable, { type Column } from '../../components/admin/DataTable';
import showToast from '../../components/ui/Toast';
import { toItem, toErrorMessage } from '../../lib/response';
import styles from './VerificationRequests.module.scss';

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

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data: RequestResponse = await fetchVerificationRequests({
        page,
        status,
        profession,
      });
      setRequests(data.requests);
      setTotal(data.total);
    } catch (err) {
      setRequests([]);
      setTotal(0);
      showToast(toErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [page, status, profession]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

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

  const handleAction = useCallback(
    async (id: string, newStatus: 'approved' | 'rejected') => {
      const current = requests.find((request) => request._id === id);
      if (current && current.status === newStatus) {
        showToast(`Request is already ${newStatus}`);
        return;
      }

      setActionId(id);
      try {
        const res = await updateVerificationRequest(id, newStatus);
        const updated = toItem(res) as Request | undefined;
        const resolvedStatus = updated?.status || newStatus;
        showToast(
          `Request ${resolvedStatus === 'approved' ? 'approved' : 'rejected'}`,
        );
        await loadRequests();
      } catch (error) {
        showToast(toErrorMessage(error), 'error');
      } finally {
        setActionId('');
      }
    },
    [requests, loadRequests],
  );

  const rows: RequestRow[] = useMemo(
    () =>
      (requests ?? []).map((r) => ({
        ...r,
        name: r.user.name,
        phone: r.user.phone,
      })),
    [requests],
  );

  const statusClassMap = useMemo(
    () => ({
      approved: styles.statusApproved,
      pending: styles.statusPending,
      rejected: styles.statusRejected,
    }),
    [],
  );

  const columns: Column<RequestRow>[] = useMemo(
    () => [
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
              disabled={actionId === r._id || r.status === 'approved'}
            >
              Accept
            </button>
            <button
              onClick={() => handleAction(r._id, 'rejected')}
              disabled={actionId === r._id || r.status === 'rejected'}
            >
              Reject
            </button>
          </>
        ),
      },
    ],
    [actionId, handleAction, statusClassMap],
  );

  return (
    <div className={`${styles.page} space-y-6 px-4`}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Verification Requests</h1>
        <p className="text-sm text-gray-600">
          Approve trusted professionals quickly by reviewing their submissions here.
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
            placeholder="Profession"
            value={professionInput}
            onChange={(e) => setProfessionInput(e.target.value)}
            onBlur={() => updateParam('profession', professionInput)}
            className="w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
          />
        </div>
        <span className="text-sm text-gray-500">Page {page}</span>
      </div>

      <DataTable<RequestRow>
        columns={columns}
        rows={rows}
        page={page}
        pageSize={Math.max(rows.length, 1)}
        total={total}
        onPageChange={changePage}
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

      {rows.length ? (
        <div className={styles.tableFooter}>
          <span>
            Showing {rows.length} of {total}
          </span>
          <span>Navigate with the controls below</span>
        </div>
      ) : null}
    </div>
  );
};

export default VerificationRequests;
