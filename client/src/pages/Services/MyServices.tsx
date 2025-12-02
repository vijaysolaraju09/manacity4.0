import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from '@/components/ui/button';
import showToast from '@/components/ui/Toast';
import type { AppDispatch, RootState } from '@/store';
import {
  fetchAssignedServiceRequests,
  updateServiceRequestStatus,
  acceptDirectRequest,
  rejectDirectRequest,
} from '@/store/serviceRequests';
import type { ServiceRequestStatus } from '@/types/services';

const statusLabel = (value: string) =>
  value
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

const MyServices = () => {
  const dispatch = useDispatch<AppDispatch>();
  const assigned = useSelector((state: RootState) => state.serviceRequests.assigned);
  const [updating, setUpdating] = useState<string | null>(null);
  const [providerNotes, setProviderNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (assigned.status === 'idle') {
      dispatch(fetchAssignedServiceRequests());
    }
  }, [assigned.status, dispatch]);

  const handleRefresh = () => {
    dispatch(fetchAssignedServiceRequests());
  };

  const handleStatusUpdate = async (id: string, status: ServiceRequestStatus) => {
    setUpdating(`${id}-${status}`);
    try {
      await dispatch(updateServiceRequestStatus({ id, status })).unwrap();
      showToast('Request updated successfully', 'success');
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Failed to update request';
      showToast(message, 'error');
    } finally {
      setUpdating(null);
    }
  };

  const handleDirectAction = async (
    id: string,
    action: 'accept' | 'reject',
    providerNote?: string
  ) => {
    setUpdating(`${id}-${action}`);
    try {
      if (action === 'accept') {
        await dispatch(acceptDirectRequest({ id, providerNote })).unwrap();
        showToast('Direct request accepted', 'success');
      } else {
        await dispatch(rejectDirectRequest({ id })).unwrap();
        showToast('Direct request rejected', 'info');
      }
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Failed to update request';
      showToast(message, 'error');
    } finally {
      setUpdating(null);
    }
  };

  const requests = useMemo(() => assigned.items ?? [], [assigned.items]);
  const loading = assigned.status === 'loading';
  const empty = !loading && requests.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">My services</h1>
        <p className="text-sm text-slate-600">
          Direct requests and accepted jobs will appear here. Update progress and view requester
          contact details when available.
        </p>
      </header>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          {requests.length ? `Showing ${requests.length} request${requests.length === 1 ? '' : 's'}` : 'No accepted requests yet'}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((index) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      ) : assigned.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div className="font-medium">{assigned.error}</div>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              Try again
            </Button>
          </div>
        </div>
      ) : empty ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-600">
            You have not received or accepted any service requests yet. Visit the public requests tab
            to help neighbors.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const title = request.service?.name || request.customName || 'Service request';
            const description = request.details || request.description || request.message || '';
            const normalizedStatus = (request.status as string)?.toLowerCase?.() ?? request.status;
            const canMarkInProgress = ['accepted', 'in_progress', 'assigned'].includes(
              normalizedStatus as any,
            );
            const canComplete = ['in_progress', 'assigned', 'accepted'].includes(
              normalizedStatus as any,
            );
            const requesterContact =
              request.requesterContactVisible && (request.requester?.phone || request.phone);
            const noteToSeeker = request.providerNote;
            const myOffer = request.myOffer;
            const awaitingDecision = request.type === 'direct' && request.status === 'awaiting_approval';
            const noteValue = providerNotes[request._id] ?? '';
            const payment = request.paymentOffer;

            return (
              <div key={request._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{title}</div>
                    {description ? (
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{description}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {request.location ? <span>Location: {request.location}</span> : null}
                      {request.preferredDate ? <span>Date: {request.preferredDate}</span> : null}
                      {request.preferredTime ? <span>Time: {request.preferredTime}</span> : null}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                        {statusLabel(request.status)}
                      </span>
                    </div>
                      {requesterContact ? (
                        <div className="mt-2 text-sm text-slate-700">Contact: {requesterContact}</div>
                      ) : null}
                      {payment ? (
                        <div className="mt-1 text-sm text-slate-700">Payment offer: {payment}</div>
                      ) : null}
                      {myOffer ? (
                        <div className="mt-2 text-sm text-slate-700">
                          My offer: {myOffer.expectedReturn || 'Shared'}
                          {myOffer.helperNote ? ` · ${myOffer.helperNote}` : ''}
                        </div>
                      ) : null}
                      {noteToSeeker ? (
                        <div className="mt-2 text-sm text-slate-700">Your note: {noteToSeeker}</div>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2">
                      {awaitingDecision ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            rows={2}
                            value={noteValue}
                            onChange={(event) =>
                              setProviderNotes((prev) => ({ ...prev, [request._id]: event.target.value }))
                            }
                            placeholder="Add a note for the requester (optional)"
                          />
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                              variant="outline"
                              onClick={() => handleDirectAction(request._id, 'reject')}
                              disabled={updating === `${request._id}-reject`}
                            >
                              {updating === `${request._id}-reject` ? 'Updating…' : 'Reject request'}
                            </Button>
                            <Button
                              onClick={() => handleDirectAction(request._id, 'accept', noteValue.trim() || undefined)}
                              disabled={updating === `${request._id}-accept`}
                            >
                              {updating === `${request._id}-accept` ? 'Updating…' : 'Accept request'}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      {canMarkInProgress ? (
                        <Button
                          variant="outline"
                          onClick={() => handleStatusUpdate(request._id, 'in_progress')}
                          disabled={updating === `${request._id}-in_progress`}
                        >
                          {updating === `${request._id}-in_progress` ? 'Updating…' : 'Mark in progress'}
                        </Button>
                      ) : null}
                      {canComplete ? (
                        <Button
                          onClick={() => handleStatusUpdate(request._id, 'completed')}
                          disabled={updating === `${request._id}-completed`}
                        >
                          {updating === `${request._id}-completed` ? 'Updating…' : 'Mark completed'}
                        </Button>
                      ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyServices;
