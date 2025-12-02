import { useEffect, useMemo, useState, type FormEventHandler } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import type { RootState, AppDispatch } from '@/store';
import { fetchServiceById, fetchServiceProviders } from '@/store/services';
import { createDirectServiceRequest, createServiceRequest } from '@/store/serviceRequests';
import type { CreateServiceRequestPayload, Service, ServiceProvider } from '@/types/services';
import { paths } from '@/routes/paths';
import ProviderCard from '@/components/services/ProviderCard';
import showToast from '@/components/ui/Toast';

const ServiceDetails = () => {
  const { serviceId = '' } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const detail = useSelector((state: RootState) => state.services.detail);
  const providersByService = useSelector((state: RootState) => state.services.providers);
  const entry = serviceId ? providersByService[serviceId] : undefined;

  const [notes, setNotes] = useState('');
  const [submittingPublic, setSubmittingPublic] = useState(false);
  const [directTarget, setDirectTarget] = useState<ServiceProvider | null>(null);
  const [directNotes, setDirectNotes] = useState('');
  const [directPayment, setDirectPayment] = useState('');
  const [submittingDirect, setSubmittingDirect] = useState(false);
  const [showProviderProfile, setShowProviderProfile] = useState<ServiceProvider | null>(null);

  useEffect(() => {
    if (!serviceId) return;
    void dispatch(fetchServiceById(serviceId));
    void dispatch(fetchServiceProviders(serviceId));
  }, [dispatch, serviceId]);

  useEffect(() => {
    setNotes('');
    setDirectTarget(null);
    setDirectNotes('');
    setDirectPayment('');
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

  const onSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!serviceId) return;

    setSubmittingPublic(true);

    const payload: CreateServiceRequestPayload = {
      serviceId,
      description: notes.trim() || undefined,
      details: notes.trim() || undefined,
      visibility: 'public',
      type: 'public',
    };

    try {
      await dispatch(createServiceRequest(payload)).unwrap();
      navigate(paths.serviceRequests.mine());
    } catch (err) {
      const message =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Failed to submit request';
      showToast(message, 'error');
    } finally {
      setSubmittingPublic(false);
    }
  };

  const openDirectRequest = (provider: ServiceProvider) => {
    setDirectTarget(provider);
    setDirectNotes('');
    setDirectPayment('');
  };

  const submitDirect: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!serviceId || !directTarget) return;

    setSubmittingDirect(true);
    const trimmedNotes = directNotes.trim();
    const providerId = directTarget.user?._id || directTarget.id;
    if (!providerId) {
      showToast('Unable to determine the selected provider. Please try again.', 'error');
      setSubmittingDirect(false);
      return;
    }
    const payload: CreateServiceRequestPayload = {
      serviceId,
      providerId,
      type: 'direct',
      visibility: 'direct',
      description: trimmedNotes || undefined,
      details: trimmedNotes || undefined,
      message: trimmedNotes || undefined,
      paymentOffer: directPayment.trim() || undefined,
    };

    try {
      await dispatch(createDirectServiceRequest(payload)).unwrap();
      navigate(paths.serviceRequests.mine());
    } catch (err) {
      const message =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Failed to send direct request';
      showToast(message, 'error');
    } finally {
      setSubmittingDirect(false);
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
  const category = svc?.category;
  const town = svc?.town || svc?.serviceArea;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 rounded-2xl border border-borderc/40 bg-surface-1 p-4 shadow-inner-card">
          <h1 className="mb-2 text-2xl font-bold">{serviceName}</h1>
          {(category || town) && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              {category ? (
                <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">{category}</span>
              ) : null}
              {town ? (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-text-secondary">{town}</span>
              ) : null}
            </div>
          )}
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
          <h2 className="text-lg font-semibold">Ask for this service</h2>
          <p className="text-sm text-text-secondary">
            Pick a provider to send a direct request, or submit a public request and we&apos;ll match you.
          </p>

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
                  <div className="truncate">
                    <div className="font-medium">{providerName}</div>
                    {providerCategory ? (
                      <div className="text-sm text-text-muted">{providerCategory}</div>
                    ) : null}
                    <div className="text-sm text-text-secondary">
                      Completed {completed} service{completed === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="flex-1 rounded-lg border border-borderc/50 px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
                      onClick={() => openDirectRequest(provider)}
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
          </div>

          <div className="rounded-xl border border-borderc/60 bg-white/70 p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-base font-semibold">Open to all providers</div>
                <div className="text-sm text-text-secondary">We&apos;ll notify available helpers.</div>
              </div>
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
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-accent-500 to-brand-500 px-4 py-3 text-white shadow-elev-1 hover:shadow-elev-2"
              disabled={submittingPublic}
            >
              {submittingPublic ? 'Submitting…' : 'Submit public request'}
            </button>
          </div>
        </form>
      </div>

      {directTarget ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4 py-10">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-4 shadow-lg">
            <button
              type="button"
              className="absolute right-3 top-3 text-sm text-text-secondary"
              onClick={() => setDirectTarget(null)}
            >
              Close
            </button>
            <h3 className="mb-1 text-lg font-semibold">Request {directTarget.user?.name || 'this provider'}</h3>
            <p className="mb-3 text-sm text-text-secondary">
              Share any details and the payment offer you have in mind. Your contact details will be shared after the
              provider accepts.
            </p>
            <form className="space-y-3" onSubmit={submitDirect}>
              <div>
                <label className="mb-1 block text-sm">Notes</label>
                <textarea
                  className="w-full rounded-xl border border-borderc/40 bg-surface-1 p-3"
                  rows={3}
                  value={directNotes}
                  onChange={(event) => setDirectNotes(event.target.value)}
                  placeholder="Describe the help you need…"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Payment offer (optional)</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-borderc/40 bg-surface-1 p-3"
                  value={directPayment}
                  onChange={(event) => setDirectPayment(event.target.value)}
                  placeholder="e.g. $40 or barter"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-borderc/50 px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-1"
                  onClick={() => setDirectTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-gradient-to-r from-accent-500 to-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-elev-1 hover:shadow-elev-2"
                  disabled={submittingDirect}
                >
                  {submittingDirect ? 'Sending…' : 'Send request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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
                  setShowProviderProfile(null);
                  openDirectRequest(showProviderProfile);
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
