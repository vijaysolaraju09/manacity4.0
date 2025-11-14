import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/button';
import showToast from '@/components/ui/Toast';
import { http } from '@/lib/http';
import { paths } from '@/routes/paths';
import type { ServiceRequest } from '@/types/services';

interface ServiceRequestsResponse {
  items: ServiceRequest[];
}

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

const MyRequestsPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get('/service-requests/me');
      const body: ServiceRequestsResponse | undefined = response?.data?.data ?? response?.data;
      const items = Array.isArray(body?.items) ? body?.items : [];
      setRequests(items);
      setError(null);
    } catch (err) {
      const message =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Failed to load requests';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const hasRequests = useMemo(() => requests.length > 0, [requests.length]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">My service requests</h1>
        <p className="text-sm text-slate-600">
          Track the progress of your service requests, check their visibility and open details for a
          complete history.
        </p>
      </header>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          {hasRequests
            ? `Showing ${requests.length} ${requests.length === 1 ? 'request' : 'requests'}`
            : 'No requests yet'}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void fetchRequests()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button onClick={() => navigate(paths.services.request())}>New request</Button>
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
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div className="font-medium">{error}</div>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => void fetchRequests()}>
              Try again
            </Button>
          </div>
        </div>
      ) : !hasRequests ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-600">
            You have not submitted any service requests yet. Create your first request to get started.
          </p>
          <Button className="mt-4" onClick={() => navigate(paths.services.request())}>
            Create a request
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
              {requests.map((request) => {
                const title = request.service?.name || request.customName || 'Service request';
                const visibilityLabel = request.visibility === 'private' ? 'Private' : 'Public';
                return (
                  <tr key={request._id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{title}</td>
                    <td className="px-4 py-3">
                      {request.description ? request.description.slice(0, 120) : '—'}
                      {request.description && request.description.length > 120 ? '…' : ''}
                    </td>
                    <td className="px-4 py-3">{visibilityLabel}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {formatStatus(request.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(request.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        onClick={() => navigate(paths.serviceRequests.detail(request._id))}
                      >
                        View details
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyRequestsPage;
