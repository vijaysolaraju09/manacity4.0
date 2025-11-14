import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import Button from '@/components/ui/button';
import showToast from '@/components/ui/Toast';
import { http } from '@/lib/http';
import { paths } from '@/routes/paths';
import type { ServiceRequest, ServiceRequestHistoryEntry } from '@/types/services';

interface ServiceRequestResponse {
  request?: ServiceRequest;
}

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
  const { requestId } = useParams<{ requestId: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  const fetchRequest = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const response = await http.get(`/service-requests/${requestId}`);
      const body: ServiceRequestResponse | undefined = response?.data?.data ?? response?.data;
      if (!body?.request) throw new Error('Service request not found');
      setRequest(body.request);
      setError(null);
    } catch (err) {
      const message =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Failed to load request';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void fetchRequest();
  }, [fetchRequest]);

  const canCancel = useMemo(() => request?.status === 'pending', [request?.status]);

  const handleCancel = async () => {
    if (!requestId || !request) return;
    const confirmed = window.confirm('Cancel this service request? This action cannot be undone.');
    if (!confirmed) return;

    setCanceling(true);
    try {
      const response = await http.post(`/service-requests/${requestId}/cancel`);
      const body: ServiceRequestResponse | undefined = response?.data?.data ?? response?.data;
      if (!body?.request) throw new Error('Failed to cancel request');
      setRequest(body.request);
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
  };

  const history = useMemo(() => request?.history ?? [], [request?.history]);
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
              </div>
            </div>

            {request.description ? (
              <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{request.description}</p>
            ) : null}

            <dl className="mt-6 grid grid-cols-1 gap-4 text-sm text-slate-600 md:grid-cols-2">
              <div>
                <dt className="font-medium text-slate-500">Preferred schedule</dt>
                <dd>{preferredSchedule}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Contact</dt>
                <dd>{request.phone || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Location</dt>
                <dd>{request.location || 'Not provided'}</dd>
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
            </dl>

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
