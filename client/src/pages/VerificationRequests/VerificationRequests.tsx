import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchVerificationRequests,
  acceptVerification,
  rejectVerification,
} from '../../api/admin';
import toast from '../../components/toast';
import './VerificationRequests.scss';

interface Request {
  _id: string;
  user: {
    _id: string;
    name: string;
    phone: string;
  };
  profession: string;
  bio: string;
  status: string;
  createdAt: string;
}

interface RequestResponse {
  requests: Request[];
  total: number;
  page: number;
  pages: number;
}

const VerificationRequests = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState(1);
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
        setPages(data.pages);
      } catch {
        setRequests([]);
        setPages(1);
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
      toast(
        `Request ${newStatus === 'approved' ? 'approved' : 'rejected'}`,
      );
    } catch {
      setRequests(prev);
      toast('Failed to update request', 'error');
    } finally {
      setActionId('');
    }
  };

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
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Profession</th>
              <th>Bio</th>
              <th>Requested At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req._id}>
                <td>{req.user.name}</td>
                <td>{req.user.phone}</td>
                <td>{req.profession}</td>
                <td>{req.bio}</td>
                <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                <td>{req.status}</td>
                <td>
                  <button
                    onClick={() => handleAction(req.user._id, 'approved')}
                    disabled={actionId === req.user._id}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleAction(req.user._id, 'rejected')}
                    disabled={actionId === req.user._id}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => changePage(page - 1)}>
          Prev
        </button>
        <span>
          {page} / {pages}
        </span>
        <button
          disabled={page >= pages}
          onClick={() => changePage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default VerificationRequests;

