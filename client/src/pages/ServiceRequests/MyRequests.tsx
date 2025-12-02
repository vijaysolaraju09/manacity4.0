import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Button from '@/components/ui/button';
import { paths } from '@/routes/paths';
import type { AppDispatch, RootState } from '@/store';
import { fetchMyServiceRequests, updateServiceRequest } from '@/store/serviceRequests';
import showToast from '@/components/ui/Toast';
import ModalSheet from '@/components/base/ModalSheet';
import type { ServiceRequest } from '@/types/services';

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
  const dispatch = useDispatch<AppDispatch>();
  const mine = useSelector((state: RootState) => state.serviceRequests.mine);
  const requests = mine.items;
  const loading = mine.status === 'loading';
  const error = mine.error;
  const [editing, setEditing] = useState<ServiceRequest | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPayment, setEditPayment] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (mine.status === 'idle') {
      void dispatch(fetchMyServiceRequests());
    }
  }, [dispatch, mine.status]);

  const handleRefresh = useCallback(() => {
    void dispatch(fetchMyServiceRequests());
  }, [dispatch]);

  const hasRequests = useMemo(() => requests.length > 0, [requests.length]);

  const canEditRequest = (request: ServiceRequest) =>
    (request.status === 'pending' || request.status === 'awaiting_approval') && !request.acceptedBy;

  const openEditModal = (request: ServiceRequest) => {
    setEditing(request);
    setEditTitle(request.title || request.customName || '');
    setEditDescription(request.details || request.description || request.message || '');
    setEditPayment(request.paymentOffer || '');
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    try {
      await dispatch(
        updateServiceRequest({
          id: editing._id,
          changes: {
            title: editTitle.trim(),
            description: editDescription.trim(),
            paymentOffer: editPayment.trim() || undefined,
          },
        }),
      ).unwrap();
      showToast('Request updated', 'success');
      setEditing(null);
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Failed to update request';
      showToast(message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

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
          <Button variant="outline" onClick={() => void handleRefresh()} disabled={loading}>
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
            <Button variant="outline" onClick={() => void handleRefresh()}>
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
                const summary = request.details || request.description || '';
                return (
                  <tr key={request._id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{title}</td>
                    <td className="px-4 py-3">
                      {summary ? summary.slice(0, 120) : '—'}
                      {summary.length > 120 ? '…' : ''}
                    </td>
                    <td className="px-4 py-3">{visibilityLabel}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {formatStatus(request.status)}
                      </span>
                    </td>
                <td className="px-4 py-3">{formatDate(request.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {canEditRequest(request) ? (
                      <Button variant="secondary" onClick={() => openEditModal(request)}>
                        Edit
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      onClick={() => navigate(paths.serviceRequests.detail(request._id))}
                    >
                      View details
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
          </table>
        </div>
      )}

      <ModalSheet open={Boolean(editing)} onClose={() => setEditing(null)}>
        <form className="flex flex-col gap-3" onSubmit={handleEditSubmit}>
          <h3 className="text-lg font-semibold text-slate-900">Edit request</h3>
          <div className="text-sm text-slate-600">
            Update the request title, description, or payment offer while it is pending approval.
          </div>
          <label className="text-sm font-medium text-slate-700" htmlFor="edit-title">
            Title
          </label>
          <input
            id="edit-title"
            type="text"
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            required
          />
          <label className="text-sm font-medium text-slate-700" htmlFor="edit-description">
            Description
          </label>
          <textarea
            id="edit-description"
            className="min-h-[120px] rounded-lg border border-slate-200 px-3 py-2"
            value={editDescription}
            onChange={(event) => setEditDescription(event.target.value)}
            required
          />
          <label className="text-sm font-medium text-slate-700" htmlFor="edit-payment">
            Payment offer (optional)
          </label>
          <input
            id="edit-payment"
            type="text"
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={editPayment}
            onChange={(event) => setEditPayment(event.target.value)}
            placeholder="e.g. ₹500"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </ModalSheet>
    </div>
  );
};

export default MyRequestsPage;
