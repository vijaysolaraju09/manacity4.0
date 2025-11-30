import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Star } from 'lucide-react';
import Button from '@/components/ui/button';
import showToast from '@/components/ui/Toast';
import { paths } from '@/routes/paths';
import { cancelServiceRequest, fetchServiceRequestById, selectServiceRequestDetailState } from '@/store/serviceRequests';
import type { AppDispatch, RootState } from '@/store';
import type { ServiceRequestHistoryEntry } from '@/types/services';

const historyLabels: Record<ServiceRequestHistoryEntry['type'], string> = {
  created: 'Created',
  offer: 'Offer update',
  assigned: 'Assigned',
  completed: 'Completed',
  closed: 'Closed',
  reopened: 'Reopened',
  admin_note: 'Admin note',
};

const formatStatus = (value: string) =>
  value
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const ServiceRequestDetail = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { requestId } = useParams<{ requestId: string }>();
  const detailState = useSelector(selectServiceRequestDetailState);
  const request = detailState.item;
  const currentUserId = useSelector((state: RootState) => state.auth.user?._id ?? state.auth.user?.id ?? null);
  const loading = detailState.status === 'loading';
  const error = detailState.error;
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (requestId) {
      void dispatch(fetchServiceRequestById(requestId));
    }
  }, [dispatch, requestId]);

  useEffect(() => {
    if (detailState.status === 'failed' && detailState.error) {
      showToast(detailState.error, 'error');
    }
  }, [detailState.status, detailState.error]);

  const isOwner = useMemo(() => request && currentUserId && request.userId === currentUserId, [request, currentUserId]);
  const canCancel = useMemo(() => isOwner && request?.status === 'pending', [isOwner, request?.status]);
  const canSeeContact = useMemo(
    () => Boolean(request?.requesterContactVisible || (request && request.userId === currentUserId)),
    [request?.requesterContactVisible, request?.userId, currentUserId]
  );

  const handleCancel = useCallback(async () => {
    if (!requestId || !request) return;
    const confirmed = window.confirm('Cancel this service request? This action cannot be undone.');
    if (!confirmed) return;

    setCanceling(true);
    try {
      await dispatch(cancelServiceRequest(requestId)).unwrap();
      showToast('Request cancelled', 'success');
    } catch (err) {
      const message =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Failed to cancel request';
      showToast(message, 'error');
    } finally {
      setCanceling(false);
    }
  }, [dispatch, requestId, request]);

  const history = useMemo(() => request?.history ?? [], [request?.history]);
  const detailText = useMemo(
    () => (request ? request.details || request.description || '' : ''),
    [request]
  );
  const preferredSchedule = useMemo(() => {
    if (!request) return 'Not specified';
    if (!request.preferredDate && !request.preferredTime) return 'Not specified';
    return `${request.preferredDate || ''} ${request.preferredTime || ''}`.trim();
  }, [request?.preferredDate, request?.preferredTime, request]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate(paths.serviceRequests.mine())}>
          &larr; Back to requests
        </Button>
        {canCancel ? (
          <Button variant="outline" onClick={() => void handleCancel()} disabled={canceling}>
            {canceling ? 'Cancelling…' : 'Cancel request'}
          </Button>
        ) : null}
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
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : !request ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
          Request not found.
        </div>
      ) : (
        <div className="grid gap-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-slate-900">
                {request.service?.name || request.customName || 'Service request'}
              </h2>
              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                <span>Status: {formatStatus(request.status)}</span>
                <span>Visibility: {request.visibility === 'private' ? 'Private' : 'Public'}</span>
                <span>Created: {formatDate(request.createdAt)}</span>
                {request.updatedAt ? <span>Updated: {formatDate(request.updatedAt)}</span> : null}
                {request.requesterDisplayName ? <span>Requester: {request.requesterDisplayName}</span> : null}
              </div>
            </div>

            {detailText ? (
              <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{detailText}</p>
            ) : null}

            <dl className="mt-6 grid grid-cols-1 gap-4 text-sm text-slate-600 md:grid-cols-2">
              <div>
                <dt className="font-medium text-slate-500">Preferred schedule</dt>
                <dd>{preferredSchedule}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Contact</dt>
                <dd>{request.phone || 'Not provided'}</dd>
                {!canSeeContact ? (
                  <p className="text-xs text-slate-500">Contact details are shared after you accept the request.</p>
                ) : null}
              </div>
              <div>
                <dt className="font-medium text-slate-500">Location</dt>
                <dd>{request.location || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Email</dt>
                <dd>{canSeeContact ? request.email || request.requester?.email || 'Not provided' : 'Hidden until acceptance'}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Assigned provider</dt>
                <dd>
                  {request.assignedProvider
                    ? `${request.assignedProvider.name || 'Provider'}${
                        request.assignedProvider.phone ? ` · ${request.assignedProvider.phone}` : ''
                      }`
                    : 'Not assigned'}
                </dd>
              </div>
              {request.acceptedHelper ? (
                <div>
                  <dt className="font-medium text-slate-500">Accepted by</dt>
                  <dd>{request.acceptedHelper.name || 'Helper'}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  if (canSeeContact && request.phone) window.location.href = `tel:${request.phone}`;
                }}
                disabled={!canSeeContact || !request.phone}
              >
                Call requester
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (canSeeContact && request.phone) window.location.href = `sms:${request.phone}`;
                }}
                disabled={!canSeeContact || !request.phone}
              >
                Message requester
              </Button>
            </div>

            {request.adminNotes ? (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="font-medium text-slate-600">Admin notes</div>
                <p className="mt-2 whitespace-pre-wrap">{request.adminNotes}</p>
              </div>
            ) : null}
          </section>

          {request.feedback && (request.feedback.rating || request.feedback.comment) ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Your feedback</h3>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                {request.feedback.rating ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Rating</p>
                    <div className="mt-1 flex items-center gap-2 text-amber-500">
                      <div className="flex items-center gap-0.5" aria-hidden="true">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className="h-4 w-4"
                            strokeWidth={1.5}
                            fill={index < (request.feedback?.rating ?? 0) ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-slate-900">
                        {request.feedback.rating} / 5
                      </span>
                    </div>
                  </div>
                ) : null}
                {request.feedback.comment ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Comment</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">{request.feedback.comment}</p>
                  </div>
                ) : null}
                {request.feedback.updatedAt ? (
                  <p className="text-xs text-slate-500">
                    Updated {formatDate(request.feedback.updatedAt)}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Status timeline</h3>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No history entries yet.</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {history.map((entry, index) => {
                  const label = historyLabels[entry.type] ?? formatStatus(entry.type);
                  return (
                    <li key={`${entry.at ?? index}-${entry.type}`} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900">{label}</span>
                        <span className="text-xs text-slate-500">{formatDate(entry.at)}</span>
                      </div>
                      {entry.message ? (
                        <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{entry.message}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default ServiceRequestDetail;
