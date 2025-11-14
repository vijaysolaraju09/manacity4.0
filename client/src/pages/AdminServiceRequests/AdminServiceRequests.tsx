import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from '@/components/ui/button';
import showToast from '@/components/ui/Toast';
import './AdminServiceRequests.scss';
import {
  adminFetchServiceRequests,
  adminUpdateServiceRequest,
} from '@/store/serviceRequests';
import type { AppDispatch, RootState } from '@/store';

const statusOptions: Array<
  'all' | 'pending' | 'accepted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
> = ['all', 'pending', 'accepted', 'assigned', 'in_progress', 'completed', 'cancelled'];

type EditableState = {
  status: string;
  adminNotes: string;
  providerId: string;
};

const formatStatus = (value: string) =>
  value
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

const AdminServiceRequests = () => {
  const dispatch = useDispatch<AppDispatch>();
  const adminState = useSelector((state: RootState) => state.serviceRequests.admin);
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>('all');
  const [drafts, setDrafts] = useState<Record<string, EditableState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const params = statusFilter === 'all' ? {} : { status: statusFilter };
    dispatch(adminFetchServiceRequests(params));
  }, [dispatch, statusFilter]);

  useEffect(() => {
    const nextDrafts: Record<string, EditableState> = {};
    for (const request of adminState.items) {
      nextDrafts[request._id] = {
        status: request.status,
        adminNotes: request.adminNotes ?? '',
        providerId: request.assignedProviderId ?? '',
      };
    }
    setDrafts(nextDrafts);
  }, [adminState.items]);

  const handleDraftChange = (
    id: string,
    field: keyof EditableState,
    value: string,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { status: 'pending', adminNotes: '', providerId: '' }),
        [field]: value,
      },
    }));
  };

  const handleSave = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;

    const trimmedProvider = draft.providerId.trim();
    if (draft.status === 'assigned' && !trimmedProvider) {
      showToast('Enter a provider ID before assigning the request.', 'error');
      return;
    }

    setSavingId(id);
    try {
      await dispatch(
        adminUpdateServiceRequest({
          id,
          status: draft.status,
          notes: draft.adminNotes,
          providerId: trimmedProvider || null,
        })
      ).unwrap();
      showToast('Service request updated', 'success');
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
          ? error.message
          : 'Failed to update service request';
      showToast(message, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const items = useMemo(() => adminState.items ?? [], [adminState.items]);

  return (
    <div className="admin-service-requests">
      <div className="admin-service-requests__filters">
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as (typeof statusOptions)[number])}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {formatStatus(option)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            const params = statusFilter === 'all' ? {} : { status: statusFilter };
            dispatch(adminFetchServiceRequests(params));
          }}
        >
          Refresh
        </button>
      </div>

      {adminState.error ? (
        <div className="admin-service-requests__error">{adminState.error}</div>
      ) : null}

      <div className="admin-service-requests__list">
        {items.length === 0 ? (
          <p>No service requests found.</p>
        ) : (
          items.map((request) => {
            const draft = drafts[request._id] ?? {
              status: request.status,
              adminNotes: request.adminNotes ?? '',
              providerId: request.assignedProviderId ?? '',
            };
            const statusLabel = formatStatus(request.status);
            return (
              <div key={request._id} className="admin-service-requests__item">
                <div>
                  <strong>{request.service?.name || request.customName || 'Service request'}</strong>
                  <div className="admin-service-requests__status">Current status: {statusLabel}</div>
                </div>
                <label>
                  Update status
                  <select
                    value={draft.status}
                    onChange={(event) => handleDraftChange(request._id, 'status', event.target.value)}
                  >
                    {statusOptions
                      .filter((option) => option !== 'all')
                      .map((option) => (
                        <option key={option} value={option}>
                          {formatStatus(option)}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Admin notes
                  <textarea
                    value={draft.adminNotes}
                    onChange={(event) => handleDraftChange(request._id, 'adminNotes', event.target.value)}
                  />
                </label>
                <label>
                  Assigned provider ID
                  <input
                    type="text"
                    value={draft.providerId}
                    onChange={(event) => handleDraftChange(request._id, 'providerId', event.target.value)}
                    placeholder="User ID"
                  />
                </label>
                <div className="admin-service-requests__actions">
                  <Button type="button" onClick={() => void handleSave(request._id)} disabled={savingId === request._id}>
                    {savingId === request._id ? 'Saving…' : 'Save updates'}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminServiceRequests;
