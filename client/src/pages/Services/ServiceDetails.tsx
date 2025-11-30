import { useEffect, useMemo, useState, type FormEventHandler } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import type { RootState, AppDispatch } from '@/store';
import { fetchServiceById, fetchServiceProviders } from '@/store/services';
import { createServiceRequest } from '@/store/serviceRequests';
import type { Service, ServiceProvider } from '@/types/services';
import { paths } from '@/routes/paths';
import ProviderCard from '@/components/services/ProviderCard';

const ServiceDetails = () => {
  const { serviceId = '' } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const detail = useSelector((state: RootState) => state.services.detail);
  const providersByService = useSelector((state: RootState) => state.services.providers);
  const entry = serviceId ? providersByService[serviceId] : undefined;

  const [selectedProviderId, setSelectedProviderId] = useState<string | 'assign-later'>('assign-later');
  const [notes, setNotes] = useState('');
  const [showProviderProfile, setShowProviderProfile] = useState<ServiceProvider | null>(null);

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
    : entry?.items && entry.items.length > 0
    ? entry.items
    : entry?.fallback ?? [];
  const providerList = useMemo(
    () => (Array.isArray(providerCandidates) ? providerCandidates : []),
    [providerCandidates],
  );

  const loading = (detail.loading || entry?.status === 'loading') && !svc;
  const error = detail.error ?? entry?.error ?? null;
  const hasProviders = providerList.length > 0;

  const selectProviderAndScroll = (id: string) => {
    setSelectedProviderId(id);
    const formEl = document.getElementById('service-request-form');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!serviceId) return;

    const payload = {
      serviceId,
      providerId: selectedProviderId === 'assign-later' ? undefined : selectedProviderId,
      description: notes.trim() || undefined,
      details: notes.trim() || undefined,
      visibility: selectedProviderId === 'assign-later' ? 'public' : 'private',
      type: selectedProviderId === 'assign-later' ? 'public' : 'direct',
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
          id="service-request-form"
          className="space-y-4 rounded-2xl border border-borderc/40 bg-surface-1 p-4 shadow-inner-card"
        >
          <h2 className="text-lg font-semibold">Choose a provider</h2>
          <div className="space-y-2">
            {providerList.map((provider) => {
              const providerName = provider.user?.name || provider.profession || 'Service provider';
              const providerCategory = provider.profession || provider.user?.profession;
              const completed = provider.completedCount ?? provider.ratingCount ?? 0;
              return (
                <div
                  key={provider.id}
                  className="flex flex-col gap-3 rounded-xl border border-borderc/60 bg-white/70 p-3 shadow-sm"
                >
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="provider"
                      value={provider.id}
                      checked={selectedProviderId === provider.id}
                      onChange={() => setSelectedProviderId(provider.id)}
                    />
                    <div className="truncate">
                      <div className="font-medium">{providerName}</div>
                      {providerCategory ? (
                        <div className="text-sm text-text-muted">{providerCategory}</div>
                      ) : null}
                      <div className="text-sm text-text-secondary">
                        Completed {completed} service{completed === 1 ? '' : 's'}
                      </div>
                    </div>
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="flex-1 rounded-lg border border-borderc/50 px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
                      onClick={() => selectProviderAndScroll(provider.id)}
                    >
                      Request this provider
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-lg border border-borderc/40 bg-white px-3 py-2 text-sm font-semibold text-text-secondary hover:border-borderc"
                      onClick={() => setShowProviderProfile(provider)}
                    >
                      View profile
                    </button>
                  </div>
                </div>
              );
            })}
            {!hasProviders ? (
              <div className="rounded-lg border border-dashed border-borderc/60 p-3 text-sm text-text-secondary">
                No providers found for this service yet. You can still submit a request and an admin will assign one.
              </div>
            ) : null}
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

      {showProviderProfile ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4 py-10">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-4 shadow-lg">
            <button
              type="button"
              className="absolute right-3 top-3 text-sm text-text-secondary"
              onClick={() => setShowProviderProfile(null)}
            >
              Close
            </button>
            <ProviderCard provider={showProviderProfile} />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-borderc/50 px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
                onClick={() => {
                  setSelectedProviderId(showProviderProfile.id);
                  setShowProviderProfile(null);
                  selectProviderAndScroll(showProviderProfile.id);
                }}
              >
                Request this provider
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-borderc/40 bg-surface-1 px-3 py-2 text-sm font-semibold text-text-secondary"
                onClick={() => setShowProviderProfile(null)}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ServiceDetails;
