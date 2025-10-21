import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './AdminServiceRequests.scss';
import {
  adminFetchServiceRequests,
  adminUpdateServiceRequest,
} from '@/store/serviceRequests';
import type { AppDispatch, RootState } from '@/store';

const statusOptions: Array<'all' | 'open' | 'offered' | 'assigned' | 'completed' | 'closed'> = [
  'all',
  'open',
  'offered',
  'assigned',
  'completed',
  'closed',
];

type EditableState = {
  status: string;
  adminNotes: string;
  assignedProviderIds: string;
};

const AdminServiceRequests = () => {
  const dispatch = useDispatch<AppDispatch>();
  const adminState = useSelector((state: RootState) => state.serviceRequests.admin);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'offered' | 'assigned' | 'completed' | 'closed'>('all');
  const [drafts, setDrafts] = useState<Record<string, EditableState>>({});

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
        assignedProviderIds: (request.assignedProviderIds ?? []).join(', '),
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
        ...(prev[id] ?? { status: 'open', adminNotes: '', assignedProviderIds: '' }),
        [field]: value,
      },
    }));
  };

  const handleSave = (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    const assigned = draft.assignedProviderIds
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);
    dispatch(
      adminUpdateServiceRequest({
        id,
        payload: {
          status: draft.status as any,
          adminNotes: draft.adminNotes,
          assignedProviderIds: assigned,
        },
      })
    );
  };

  const items = useMemo(() => adminState.items ?? [], [adminState.items]);

  return (
    <div className="admin-service-requests">
      <div className="admin-service-requests__filters">
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
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
              assignedProviderIds: (request.assignedProviderIds ?? []).join(', '),
            };
            const statusLabel = request.status.charAt(0).toUpperCase() + request.status.slice(1);
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
                          {option.charAt(0).toUpperCase() + option.slice(1)}
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
                  Assigned provider IDs
                  <input
                    type="text"
                    value={draft.assignedProviderIds}
                    onChange={(event) =>
                      handleDraftChange(request._id, 'assignedProviderIds', event.target.value)
                    }
                    placeholder="Comma separated user IDs"
                  />
                </label>
                <div className="admin-service-requests__actions">
                  <button type="button" onClick={() => handleSave(request._id)}>
                    Save updates
                  </button>
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
