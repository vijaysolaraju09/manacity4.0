import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from './ServicesCatalog.module.scss';
import SkeletonList from '@/components/ui/SkeletonList';
import ErrorCard from '@/components/ui/ErrorCard';
import Button from '@/components/ui/button';
import ServiceCard from '@/components/services/ServiceCard';
import { fetchServices } from '@/store/services';
import type { RootState, AppDispatch } from '@/store';
import { paths } from '@/routes/paths';

const ServicesCatalog = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const servicesState = useSelector((state: RootState) => state.services);

  useEffect(() => {
    if (servicesState.status === 'idle') {
      dispatch(fetchServices(undefined));
    }
  }, [servicesState.status, dispatch]);

  const items = Array.isArray(servicesState.items) ? servicesState.items : [];

  const handleRetry = () => {
    dispatch(fetchServices(undefined));
  };

  const handleRequestService = () => {
    navigate(paths.services.request());
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Services</h1>
        <p className={styles.subtitle}>
          Browse the service catalog curated by the Manacity admin team or raise a request for something custom.
        </p>
        <div className={styles.actions}>
          <Button onClick={handleRequestService}>Request a Service</Button>
        </div>
      </div>

      {servicesState.status === 'loading' ? (
        <SkeletonList count={6} />
      ) : servicesState.status === 'failed' ? (
        <ErrorCard message={servicesState.error || 'Failed to load services'} onRetry={handleRetry} />
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <p>No services have been added yet.</p>
          <div className={styles.actions}>
            <Button onClick={handleRequestService}>Request a Service</Button>
            <Button variant="secondary" onClick={handleRetry}>
              Refresh
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((service) => (
            <ServiceCard
              key={service._id}
              service={service}
              onClick={() => navigate(paths.services.detail(service._id))}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesCatalog;
