import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './ServiceProviders.module.scss';
import SkeletonList from '@/components/ui/SkeletonList';
import ErrorCard from '@/components/ui/ErrorCard';
import Button from '@/components/ui/button';
import ProviderCard from '@/components/services/ProviderCard';
import ServiceCard from '@/components/services/ServiceCard';
import { fetchServiceProviders, fetchServices } from '@/store/services';
import type { RootState, AppDispatch } from '@/store';
import { paths } from '@/routes/paths';

const ServiceProviders = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const servicesState = useSelector((state: RootState) => state.services);
  const entry = id ? servicesState.providers[id] : undefined;

  useEffect(() => {
    if (id) {
      dispatch(fetchServiceProviders(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (servicesState.status === 'idle') {
      dispatch(fetchServices(undefined));
    }
  }, [dispatch, servicesState.status]);

  const service = entry?.service;
  const providers = entry?.items ?? [];
  const fallbackProviders = entry?.fallback ?? [];
  const status = entry?.status ?? 'idle';
  const error = entry?.error;
  const isLoading = status === 'loading' || status === 'idle';

  const relatedServices = useMemo(() => {
    if (!service) return [] as typeof servicesState.items;
    return (servicesState.items || [])
      .filter((item) => item._id !== service._id && item.isActive !== false)
      .slice(0, 4);
  }, [servicesState.items, service]);

  const handleRequestService = () => {
    if (!id) {
      navigate(paths.services.request());
      return;
    }
    const params = new URLSearchParams({ serviceId: id });
    if (service?.name) params.set('name', service.name);
    navigate(`${paths.services.request()}?${params.toString()}`);
  };

  const handleRetry = () => {
    if (id) dispatch(fetchServiceProviders(id));
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{service?.name ?? 'Service providers'}</h1>
        <p className={styles.subtitle}>
          {service?.description || 'Discover professionals who can help. If no one is available, raise a request and we will follow up.'}
        </p>
        <button type="button" className={styles.inlineLink} onClick={handleRequestService}>
          Can’t find a provider? Create a request
        </button>
        <div className={styles.actions}>
          <Button onClick={handleRequestService}>Raise Service Request</Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonList count={4} withAvatar />
      ) : status === 'failed' ? (
        <ErrorCard message={error || 'Failed to load providers'} onRetry={handleRetry} />
      ) : providers.length === 0 && fallbackProviders.length === 0 ? (
        <div className={styles.empty}>
          <h2>No providers found</h2>
          <p>We could not find anyone mapped to this service yet.</p>
          <div className={styles.actions}>
            <Button onClick={handleRequestService}>Raise Service Request</Button>
          </div>
        </div>
      ) : (
        <div className={styles.list}>
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
          {providers.length === 0 && fallbackProviders.length > 0 ? (
            <div className={styles.empty}>
              <h2>Suggested verified professionals</h2>
              <p>These providers matched the previous verified directory for this service.</p>
              {fallbackProviders.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {relatedServices.length > 0 ? (
        <div>
          <h2 className={styles.subtitle}>You might also need</h2>
          <div className={styles.related}>
            {relatedServices.map((related) => (
              <ServiceCard
                key={related._id}
                service={related}
                onClick={() => navigate(paths.services.detail(related._id))}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ServiceProviders;
