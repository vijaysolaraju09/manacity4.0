import { useEffect, useState } from 'react';
import {
  fetchVerificationRequests,
  acceptVerification,
  rejectVerification,
} from '../../api/admin';
import './VerificationRequests.scss';

interface Request {
  _id: string;
  user: { _id: string; name: string; phone: string; profession: string; bio: string; };
  createdAt: string;
}

const VerificationRequests = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchVerificationRequests();
        setRequests(data);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAccept = async (id: string) => {
    try {
      setActionId(id);
      await acceptVerification(id);
      setRequests((prev) => prev.filter((r) => r.user._id !== id));
    } finally {
      setActionId('');
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionId(id);
      await rejectVerification(id);
      setRequests((prev) => prev.filter((r) => r.user._id !== id));
    } finally {
      setActionId('');
    }
  };

  return (
    <div className="verification-requests">
      <h1>Verification Requests</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {requests.map((req) => (
            <li key={req._id}>
              <div>
                <strong>{req.user.name}</strong> - {req.user.phone}
                <div>{req.user.profession}</div>
                <div>{req.user.bio}</div>
              </div>
              <div className="actions">
                <button onClick={() => handleAccept(req.user._id)} disabled={actionId === req.user._id}>
                  {actionId === req.user._id ? '...' : 'Accept'}
                </button>
                <button onClick={() => handleReject(req.user._id)} disabled={actionId === req.user._id}>
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default VerificationRequests;
