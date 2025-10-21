import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './ServiceRequest.module.scss';
import ServiceRequestForm from '@/components/services/ServiceRequestForm';
import { fetchServices } from '@/store/services';
import type { CreateServiceRequestPayload } from '@/types/services';
import {
  createServiceRequest,
  fetchMyServiceRequests,
} from '@/store/serviceRequests';
import type { RootState, AppDispatch } from '@/store';
import Button from '@/components/ui/button';
import SkeletonList from '@/components/ui/SkeletonList';
import { paths } from '@/routes/paths';

const ServiceRequest = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const servicesState = useSelector((state: RootState) => state.services);
  const requestsState = useSelector((state: RootState) => state.serviceRequests);
  const profile = useSelector((state: RootState) => state.userProfile.item);

  const initialServiceId = searchParams.get('serviceId') || undefined;
  const initialCustomName = searchParams.get('name') || undefined;

  useEffect(() => {
    if (servicesState.status === 'idle') {
      dispatch(fetchServices(undefined));
    }
  }, [dispatch, servicesState.status]);

  useEffect(() => {
    if (requestsState.mine.status === 'idle') {
      dispatch(fetchMyServiceRequests());
    }
  }, [dispatch, requestsState.mine.status]);

  const handleSubmit = (payload: CreateServiceRequestPayload) => {
    dispatch(createServiceRequest(payload));
  };

  const successMessage = requestsState.createStatus === 'succeeded' ? 'Your request has been submitted.' : undefined;

  const myRequests = Array.isArray(requestsState.mine.items) ? requestsState.mine.items : [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Raise a service request</h1>
        <p className={styles.subtitle}>
          Tell us what you need help with and the admin team will connect you with matching providers.
        </p>
      </div>

      <div className={styles.section}>
        <ServiceRequestForm
          services={servicesState.items}
          onSubmit={handleSubmit}
          submitting={requestsState.createStatus === 'loading'}
          error={requestsState.createError}
          successMessage={successMessage}
          initialServiceId={initialServiceId}
          initialPhone={profile?.phone ?? undefined}
          initialCustomName={initialCustomName}
        />
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.header}>
          <h2 className={styles.title}>My service requests</h2>
          <p className={styles.subtitle}>Track your requests and the admin responses.</p>
        </div>
        {requestsState.mine.status === 'loading' ? (
          <SkeletonList count={3} withAvatar />
        ) : requestsState.mine.status === 'failed' ? (
          <p>Failed to load your service requests.</p>
        ) : myRequests.length === 0 ? (
          <p>You have not raised any requests yet.</p>
        ) : (
          myRequests.map((request) => {
            const statusLabel = request.status
              ? request.status.charAt(0).toUpperCase() + request.status.slice(1)
              : 'Open';
            return (
              <div key={request._id} className={styles.requestCard}>
                <div>
                  <strong>{request.service?.name || request.customName || 'Service request'}</strong>
                </div>
                <div className={styles.status}>Status: {statusLabel}</div>
                {request.adminNotes ? (
                  <div className={styles.notes}>Admin notes: {request.adminNotes}</div>
                ) : null}
                {Array.isArray(request.assignedProviders) && request.assignedProviders.length > 0 ? (
                  <div className={styles.notes}>
                    Assigned providers:
                    <ul className={styles.providerList}>
                      {request.assignedProviders.map((provider) => (
                        <li key={provider._id}>{provider.name}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div className={styles.section}>
        <Button variant="secondary" onClick={() => navigate(paths.services.catalog())}>
          Back to services catalog
        </Button>
      </div>
    </div>
  );
};

export default ServiceRequest;
