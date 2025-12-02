import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ServiceRequestForm from '@/components/services/ServiceRequestForm';
import Button from '@/components/ui/button';
import SkeletonList from '@/components/ui/SkeletonList';
import showToast from '@/components/ui/Toast';
import { paths } from '@/routes/paths';
import { fetchServices } from '@/store/services';
import {
  createServiceRequest,
  fetchMyServiceRequests,
} from '@/store/serviceRequests';
import type { CreateServiceRequestPayload } from '@/types/services';
import type { AppDispatch, RootState } from '@/store';
import styles from './ServiceRequestForm.module.scss';

const ServiceRequestFormPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const servicesState = useSelector((state: RootState) => state.services);
  const requestsState = useSelector((state: RootState) => state.serviceRequests);
  const profile = useSelector((state: RootState) => state.userProfile.item);

  useEffect(() => {
    if (servicesState.status === 'idle') {
      dispatch(fetchServices(undefined));
    }
  }, [dispatch, servicesState.status]);

  const handleSubmit = async (payload: CreateServiceRequestPayload) => {
    try {
      await dispatch(createServiceRequest(payload)).unwrap();
      showToast('Request submitted successfully', 'success');
      dispatch(fetchMyServiceRequests());
      navigate(paths.serviceRequests.mine());
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Failed to submit request';
      showToast(message, 'error');
    }
  };

  const initialServiceId = searchParams.get('serviceId') ?? undefined;
  const initialCustomName = searchParams.get('name') ?? undefined;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Request a service</h1>
        <p className={styles.subtitle}>
          Share what you need, pick a visibility level, and we will notify matching providers and admins.
        </p>
      </div>
      <div className={styles.formSection}>
        {servicesState.status === 'loading' && servicesState.items.length === 0 ? (
          <SkeletonList count={1} />
        ) : (
          <ServiceRequestForm
            services={servicesState.items}
            onSubmit={handleSubmit}
            submitting={requestsState.createStatus === 'loading'}
            error={requestsState.createError}
            initialServiceId={initialServiceId}
            initialCustomName={initialCustomName}
            initialPhone={profile?.phone ?? undefined}
          />
        )}
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => navigate(paths.services.available())}>
          Back to services catalog
        </Button>
      </div>
    </div>
  );
};

export default ServiceRequestFormPage;
