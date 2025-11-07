import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import showToast from '@/components/ui/Toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchServiceById, fetchServiceProviders, createServiceRequest } from '@/store/services/actions';

export default function ServiceDetails() {
  const { serviceId = '' } = useParams();
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const detail = useAppSelector((s) => s.services.detail);
  const providersMap = useAppSelector((s) => s.services.providers);
  const svc = detail.currentService;
  const providers = detail.providers.length > 0 ? detail.providers : providersMap[serviceId]?.items ?? [];
  const [providerId, setProviderId] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (serviceId) {
      void dispatch(fetchServiceById(serviceId));
      void dispatch(fetchServiceProviders(serviceId));
    }
  }, [dispatch, serviceId]);

  return (
    <div className="container mx-auto px-4 py-6">
      <button onClick={() => nav(-1)} className="mb-3 text-accent-500" type="button">
        &larr; Back
      </button>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 rounded-2xl border border-borderc/40 bg-surface-1 p-4 shadow-inner-card">
          <h1 className="text-2xl font-bold mb-2">{svc?.title || svc?.name}</h1>
          {svc?.images?.length ? (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {svc.images.map((src: string, idx: number) => (
                <img key={idx} src={src} alt="" className="rounded-xl border border-borderc/30 object-cover w-full h-40" />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-borderc/40 bg-surface-2 h-40 grid place-items-center text-text-muted mb-4">
              No images available
            </div>
          )}
          <p className="text-text-secondary whitespace-pre-wrap">{svc?.description}</p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await dispatch(
                createServiceRequest({
                  serviceId,
                  providerId: providerId || undefined,
                  notes: notes.trim() || undefined,
                }) as any,
              );
              showToast('Service request submitted', 'success');
              nav('/services?tab=my');
            } catch (err: any) {
              showToast(err?.response?.data?.message || 'Failed to submit', 'error');
            }
          }}
          className="rounded-2xl border border-borderc/40 bg-surface-1 p-4 shadow-inner-card space-y-4"
        >
          <h2 className="text-lg font-semibold">Choose a provider</h2>
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="select select-bordered w-full"
          >
            <option value="">Assign later (admin will match)</option>
            {(providers ?? []).map((p: any) => (
              <option key={p._id} value={p._id}>
                {p.name || p.user?.name}
              </option>
            ))}
          </select>
          <div>
            <label className="block text-sm mb-1" htmlFor="service-notes">
              Notes (optional)
            </label>
            <textarea
              id="service-notes"
              className="w-full rounded-xl border border-borderc/40 bg-surface-1 p-3"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tell us anything helpful…"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl px-4 py-3 text-white bg-gradient-to-r from-accent-500 to-brand-500 shadow-elev-1 hover:shadow-elev-2"
          >
            Submit Request
          </button>
        </form>
      </div>
    </div>
  );
}
