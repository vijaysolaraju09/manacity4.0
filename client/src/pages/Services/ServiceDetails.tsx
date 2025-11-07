import { useEffect, useMemo, useState, type FormEventHandler } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import type { RootState, AppDispatch } from '@/store';
import { fetchServiceById, fetchServiceProviders, createServiceRequest } from '@/store/services';
import type { Service, ServiceProvider } from '@/types/services';
import { paths } from '@/routes/paths';

const ServiceDetails = () => {
  const { serviceId = '' } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const detail = useSelector((state: RootState) => state.services.detail);
  const providersByService = useSelector((state: RootState) => state.services.providers);
  const entry = serviceId ? providersByService[serviceId] : undefined;

  const [selectedProviderId, setSelectedProviderId] = useState<string | 'assign-later'>('assign-later');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!serviceId) return;
    void dispatch(fetchServiceById(serviceId));
    void dispatch(fetchServiceProviders(serviceId));
  }, [dispatch, serviceId]);

  useEffect(() => {
    setSelectedProviderId('assign-later');
    setNotes('');
  }, [serviceId]);

  const svc: (Service & { title?: string; images?: string[] }) | null =
    detail.currentService ?? entry?.service ?? null;
  const providerCandidates: ServiceProvider[] = detail.providers.length > 0
    ? detail.providers
    : entry?.items ?? [];
  const providerList = useMemo(
    () => (Array.isArray(providerCandidates) ? providerCandidates : []),
    [providerCandidates],
  );

  const loading = (detail.loading || entry?.status === 'loading') && !svc;
  const error = detail.error ?? entry?.error ?? null;

  const onSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!serviceId) return;

    const payload = {
      serviceId,
      providerId: selectedProviderId === 'assign-later' ? undefined : selectedProviderId,
      notes: notes.trim() || undefined,
    };

    try {
      await dispatch(createServiceRequest(payload)).unwrap();
      navigate(paths.services.requests());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('createServiceRequest failed', err);
    }
  };

  if (loading && !svc) {
    return <div className="p-6">Loading…</div>;
  }

  if (error && !svc) {
    return <div className="p-6 text-red-500">Failed to load service.</div>;
  }

  const serviceName = svc?.title || svc?.name || 'Service details';
  const images = Array.isArray(svc?.images) ? svc?.images : [];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 rounded-2xl border border-borderc/40 bg-surface-1 p-4 shadow-inner-card">
          <h1 className="mb-2 text-2xl font-bold">{serviceName}</h1>
          {images.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-3">
              {images.map((src, index) => (
                <img
                  key={`${src}-${index}`}
                  src={src}
                  alt=""
                  className="h-40 w-full rounded-xl border border-borderc/30 object-cover"
                />
              ))}
            </div>
          ) : null}
          <p className="whitespace-pre-wrap text-text-secondary">{svc?.description}</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-borderc/40 bg-surface-1 p-4 shadow-inner-card"
        >
          <h2 className="text-lg font-semibold">Choose a provider</h2>
          <div className="max-h-64 space-y-2 overflow-auto pr-1">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="provider"
                value="assign-later"
                checked={selectedProviderId === 'assign-later'}
                onChange={() => setSelectedProviderId('assign-later')}
              />
              <span className="text-text-secondary">Assign later (Admin will match a provider)</span>
            </label>
            {providerList.map((provider) => {
              const providerName = provider.user?.name || provider.profession || 'Service provider';
              const providerCategory = provider.profession || provider.user?.profession;
              return (
                <label key={provider.id} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="provider"
                    value={provider.id}
                    checked={selectedProviderId === provider.id}
                    onChange={() => setSelectedProviderId(provider.id)}
                  />
                  <span className="truncate">
                    <span className="font-medium">{providerName}</span>
                    {providerCategory ? (
                      <span className="ml-2 text-text-muted">{providerCategory}</span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>

          <div>
            <label className="mb-1 block text-sm">Notes (optional)</label>
            <textarea
              className="w-full rounded-xl border border-borderc/40 bg-surface-1 p-3"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Tell us anything helpful…"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-accent-500 to-brand-500 px-4 py-3 text-white shadow-elev-1 hover:shadow-elev-2"
          >
            Submit Request
          </button>
        </form>
      </div>
    </div>
  );
};

export default ServiceDetails;
